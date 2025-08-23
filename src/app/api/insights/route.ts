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

    // Check if OpenAI API key is available
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

    // Check if API key is valid (not empty or placeholder)
    if (process.env.OPENAI_API_KEY === 'your-api-key-here' || process.env.OPENAI_API_KEY.length < 10) {
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'invalid_openai_key', 
          message: 'OpenAI API key is invalid or not properly configured.' 
        },
        { status: 400 }
      );
    }

    // Fetch last 30 days of measurements
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    let measurements = [];
    try {
      const { data: measurementsData, error: measurementsError } = await supabase
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
      
      measurements = measurementsData || [];
    } catch (measurementsError) {
      console.error('Exception fetching measurements:', measurementsError);
      return NextResponse.json(
        { ok: false, reason: 'fetch_error', message: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    // Check if we have enough data (at least 5 days with measurements)
    const uniqueDays = new Set(measurements?.map((m: any) => m.measured_at?.split('T')[0]).filter(Boolean) || []);
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
    let processedData;
    try {
      processedData = processMeasurementsForAI(measurements || []);
    } catch (processError) {
      console.error('Error processing measurements for AI:', processError);
      return NextResponse.json(
        { ok: false, reason: 'process_error', message: 'Failed to process measurement data' },
        { status: 500 }
      );
    }
    
    const payload = {
      days: 30,
      dataByDate: processedData
    };

    // Check cache first (table may not exist yet)
    let cachedInsights = null;
    try {
      cachedInsights = await InsightsUsageService.getCachedInsights(supabase, user.id, payload);
      if (cachedInsights && cachedInsights.isValid) {
        // Cache hit for user
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
    } catch (cacheError) {
      console.warn('Cache check failed, continuing without cache:', cacheError);
    }

    // Generate AI insights using the provider abstraction
    try {
      let provider;
      try {
        provider = getInsightsProvider();
      } catch (providerError) {
        console.error('Failed to initialize AI provider:', providerError);
        return NextResponse.json(
          { 
            ok: false, 
            reason: 'provider_error', 
            message: 'AI provider initialization failed. Please check your OpenAI API configuration.' 
          },
          { status: 500 }
        );
      }
      
      const insights = await provider.generateInsights(payload);

      // Cache the result (may fail if table doesn't exist)
      try {
        await InsightsUsageService.cacheInsights(supabase, user.id, payload, insights);
      } catch (cacheError) {
        console.warn('Failed to cache insights:', cacheError);
      }

      // Increment usage count (may fail if table doesn't exist)
      try {
        await InsightsUsageService.incrementUsage(supabase, user.id);
      } catch (usageError) {
        console.warn('Failed to increment usage:', usageError);
      }

      // Clear old cache entries (background task)
      try {
        await InsightsUsageService.clearOldCache(supabase, user.id);
      } catch (clearError) {
        console.warn('Failed to clear old cache:', clearError);
      }

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
      console.warn('AI insights generation error:', error);
      
             // Handle specific provider errors
       if (error instanceof Error) {
         if (error.message.includes('timeout')) {
           return NextResponse.json(
             { ok: false, reason: 'timeout', message: 'Request timed out. Please try again.' },
             { status: 408 }
           );
         }
         if (error.message.includes('API key') || error.message.includes('authentication')) {
           return NextResponse.json(
             { ok: false, reason: 'no_openai_key', message: 'OpenAI API key is invalid or not configured properly.' },
             { status: 400 }
           );
         }
         if (error.message.includes('rate limit') || error.message.includes('quota')) {
           return NextResponse.json(
             { ok: false, reason: 'quota_exceeded', message: 'OpenAI quota exceeded. Please check your billing or upgrade your plan.' },
             { status: 429 }
           );
         }
         if (error.message.includes('insufficient_quota')) {
           return NextResponse.json(
             { ok: false, reason: 'quota_exceeded', message: 'OpenAI quota exceeded. Please check your billing or upgrade your plan.' },
             { status: 429 }
           );
         }
       }
      
                   // If OpenAI is unavailable, return a helpful fallback response
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'openai_unavailable', 
          message: 'AI insights are temporarily unavailable. Please check your OpenAI API key and billing status, or try again later.' 
        },
        { status: 503 }
      );
    }

    // If we get here, something unexpected happened
    console.warn('Unexpected error in insights generation');
    return NextResponse.json(
      { 
        ok: false, 
        reason: 'unknown_error', 
        message: 'An unexpected error occurred. Please try again later.' 
      },
      { status: 500 }
    );
  } catch (error) {
    console.warn('Insights API error:', error);
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
    // Skip invalid measurements
    if (!measurement?.measured_at || !measurement?.metric_definitions?.slug) {
      console.warn('Skipping invalid measurement:', measurement);
      return;
    }
    
    const date = measurement.measured_at.split('T')[0];
    const slug = measurement.metric_definitions.slug;
    
    if (!dailyData[date]) {
      dailyData[date] = {};
    }
    
    // Convert measurement to appropriate value
    let value = null;
    if (measurement.value_numeric !== null && measurement.value_numeric !== undefined) {
      value = measurement.value_numeric;
    } else if (measurement.value_text !== null && measurement.value_text !== undefined) {
      value = measurement.value_text;
    } else if (measurement.value_bool !== null && measurement.value_bool !== undefined) {
      value = measurement.value_bool;
    }
    
    if (value !== null) {
      dailyData[date][slug] = {
        value,
        unit: measurement.metric_definitions.unit || null,
        name: measurement.metric_definitions.name || slug
      };
    }
  });

  return dailyData;
}
