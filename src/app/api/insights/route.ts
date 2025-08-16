import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { ok: false, reason: 'not_authenticated', message: 'User not authenticated' },
        { status: 401 }
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
    const uniqueDays = new Set(measurements?.map(m => m.measured_at.split('T')[0]) || []);
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

    // Generate AI insights
    const insights = await generateAIInsights(processedData);

    return NextResponse.json({
      ok: true,
      insights: insights.insights,
      plan: insights.plan
    });

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

async function generateAIInsights(data: Record<string, any>) {
  const systemPrompt = `You are a supportive health coach. Analyze the provided daily health metrics and provide:

1. A brief summary (max 120 words) of the user's health patterns
2. 3 specific, actionable recommendations for the next week
3. 1-2 gentle observations about patterns (if any concerning trends)

Keep the tone encouraging and supportive. Do not make medical claims or give medical advice. Focus on lifestyle and wellness improvements.

Format your response as JSON:
{
  "summary": "brief summary here",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "observations": ["observation 1", "observation 2"]
}`;

  const userPrompt = `Here are the user's daily health metrics for the past 30 days:

${JSON.stringify(data, null, 2)}

Please analyze this data and provide insights as requested.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    const parsed = JSON.parse(content);
    return {
      insights: {
        summary: parsed.summary || 'No summary available',
        recommendations: parsed.recommendations || [],
        observations: parsed.observations || []
      },
      plan: {
        focus_areas: parsed.recommendations || [],
        weekly_goals: parsed.recommendations?.slice(0, 3) || []
      }
    };
  } catch (parseError) {
    console.error('Failed to parse OpenAI response:', parseError);
    // Fallback to a simple response
    return {
      insights: {
        summary: 'Your health data shows consistent tracking. Keep up the great work!',
        recommendations: [
          'Continue tracking your daily metrics',
          'Set small, achievable goals for the week',
          'Stay consistent with your routine'
        ],
        observations: []
      },
      plan: {
        focus_areas: ['Consistency', 'Goal Setting', 'Routine'],
        weekly_goals: ['Track daily', 'Set goals', 'Stay consistent']
      }
    };
  }
}
