import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { ensureProfile } from '@/lib/services/profile-service';
import { getInsightsProvider } from '@/lib/ai';
import { InsightsUsageService } from '@/lib/ai/usage-service';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, reason: 'not_authenticated', message: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Ensure profile exists
    try {
      await ensureProfile(supabase);
    } catch (profileError) {
      console.error('Profile creation failed:', profileError);
      return NextResponse.json(
        { ok: false, reason: 'profile_error', message: 'Failed to create user profile' },
        { status: 500 }
      );
    }

    // Check usage limits
    const usageInfo = await InsightsUsageService.checkUsageLimit(supabase, user.id);
    if (!usageInfo.canGenerate) {
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'usage_limit_exceeded', 
          message: `Daily limit exceeded. You've used ${usageInfo.todayCount}/${usageInfo.dailyLimit} insights today.` 
        },
        { status: 429 }
      );
    }

    // Check if OpenAI API key is available (provider will handle this, but we check early for better UX)
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'no_openai_key', 
          message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' 
        },
        { status: 400 }
      );
    }

    // Fetch last 30 days of measurements
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: measurements, error: measurementsError } = await supabase
      .from('measurements')
      .select(`
        *,
        metric_definitions!inner(
          slug,
          name,
          unit,
          input_kind
        )
      `)
      .eq('user_id', user.id)
      .gte('measured_at', thirtyDaysAgo.toISOString())
      .order('measured_at', { ascending: true });

    if (measurementsError) {
      console.error('Error fetching measurements:', measurementsError);
      return NextResponse.json(
        { ok: false, reason: 'fetch_error', message: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    // Check if we have enough data (at least 5 days with measurements)
    const uniqueDays = new Set(measurements?.map((m: any) => m.measured_at.split('T')[0]) || []);
    if (uniqueDays.size < 5) {
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'not_enough_data', 
          message: 'Add a few more days of entries to generate insights. We need at least 5 days of data.' 
        },
        { status: 400 }
      );
    }

    // Process measurements into a structured format for AI
    const processedData = processMeasurementsForAI(measurements || []);
    const payload = {
      days: 30,
      dataByDate: processedData
    };

    // Check cache first
    const cachedInsights = await InsightsUsageService.getCachedInsights(supabase, user.id, payload);
    if (cachedInsights && cachedInsights.isValid) {
      console.log(`[insights] Cache hit for user ${user.id}`);
      return NextResponse.json({
        ok: true,
        insights: cachedInsights.content,
        plan: {
          focus_areas: cachedInsights.content.recommendations,
          weekly_goals: cachedInsights.content.recommendations.slice(0, 3)
        },
        cached: true,
        usage: {
          todayCount: usageInfo.todayCount,
          dailyLimit: usageInfo.dailyLimit
        }
      });
    }

    // Generate AI insights using the provider abstraction
    try {
      const provider = getInsightsProvider();
      const insights = await provider.generateInsights(payload);

      // Cache the result
      await InsightsUsageService.cacheInsights(supabase, user.id, payload, insights);

      // Increment usage count
      await InsightsUsageService.incrementUsage(supabase, user.id);

      // Clear old cache entries (background task)
      InsightsUsageService.clearOldCache(supabase, user.id).catch(error => {
        console.error('Failed to clear old cache:', error);
      });

      return NextResponse.json({
        ok: true,
        insights: insights,
        plan: {
          focus_areas: insights.recommendations,
          weekly_goals: insights.recommendations.slice(0, 3)
        },
        cached: false,
        usage: {
          todayCount: usageInfo.todayCount + 1,
          dailyLimit: usageInfo.dailyLimit
        }
      });
    } catch (error) {
      console.error('AI insights generation error:', error);
      
      // Handle specific provider errors
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          return NextResponse.json(
            { ok: false, reason: 'timeout', message: 'Request timed out. Please try again.' },
            { status: 408 }
          );
        }
        if (error.message.includes('API key')) {
          return NextResponse.json(
            { ok: false, reason: 'no_openai_key', message: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.' },
            { status: 400 }
          );
        }
        if (error.message.includes('rate limit')) {
          return NextResponse.json(
            { ok: false, reason: 'rate_limit', message: 'Rate limit exceeded. Please try again later.' },
            { status: 429 }
          );
        }
      }
      
      return NextResponse.json(
        { ok: false, reason: 'server_error', message: 'Failed to generate insights. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}

function processMeasurementsForAI(measurements: any[]) {
  // Group measurements by date and metric
  const dailyData: Record<string, any> = {};
  
  measurements.forEach(measurement => {
    const date = measurement.measured_at.split('T')[0];
    const slug = measurement.metric_definitions.slug;
    
    if (!dailyData[date]) {
      dailyData[date] = {};
    }
    
    // Convert measurement to appropriate value
    let value = null;
    if (measurement.value_numeric !== null) {
      value = measurement.value_numeric;
    } else if (measurement.value_text !== null) {
      value = measurement.value_text;
    } else if (measurement.value_bool !== null) {
      value = measurement.value_bool;
    }
    
    if (value !== null) {
      dailyData[date][slug] = {
        value,
        unit: measurement.metric_definitions.unit,
        name: measurement.metric_definitions.name
      };
    }
  });

  return dailyData;
}
