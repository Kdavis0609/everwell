import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';

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

    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { ok: false, reason: 'no_openai_key', message: 'OpenAI API key not configured' },
        { status: 400 }
      );
    }

    // Try to fetch recent measurements for the logged-in user (7-30 days)
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

    let metricsChecked = 0;
    let processedData: Record<string, any> = {};

    if (measurementsError) {
      console.error('Error fetching measurements for selftest:', measurementsError);
      return NextResponse.json(
        { ok: false, reason: 'fetch_error', message: 'Failed to fetch measurements' },
        { status: 500 }
      );
    }

    if (measurements && measurements.length > 0) {
      // Process real measurements
      processedData = processMeasurementsForAI(measurements);
      metricsChecked = measurements.length;
    } else {
      // Synthesize minimal test data (non-PHI)
      processedData = {
        "2024-01-15": {
          "weight": { "value": 70.5, "unit": "kg", "name": "Weight" },
          "sleep_hours": { "value": 7.5, "unit": "hours", "name": "Sleep Hours" }
        },
        "2024-01-16": {
          "weight": { "value": 70.3, "unit": "kg", "name": "Weight" },
          "sleep_hours": { "value": 8.0, "unit": "hours", "name": "Sleep Hours" }
        }
      };
      metricsChecked = 2; // Synthetic data count
    }

    // Try to use the provider abstraction if it exists
    let provider = 'openai';
    let model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
    let result: any = null;

    try {
      // Check if provider abstraction exists
      const { getInsightsProvider } = await import('@/lib/ai');
      const insightsProvider = getInsightsProvider();
      
      const payload = {
        days: 30,
        dataByDate: processedData
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

      try {
        result = await insightsProvider.generateInsights(payload, { signal: controller.signal });
        clearTimeout(timeoutId);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }

    } catch (error) {
      // Fallback to direct OpenAI call if provider abstraction fails
      console.warn('Provider abstraction failed, falling back to direct OpenAI call:', error);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch(`${process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1'}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {
                role: 'system',
                content: `You are a supportive health coach analyzing daily health metrics. Your task is to provide personalized insights and recommendations.

IMPORTANT: Return JSON only, no prose, no markdown formatting.

Required JSON structure:
{
  "summary": "Brief summary of health patterns (max 120 words)",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "observations": ["observation 1", "observation 2"]
}

Guidelines:
- Keep tone encouraging and supportive
- Focus on lifestyle and wellness improvements
- Do not make medical claims or give medical advice
- Provide 3-6 specific, actionable recommendations
- Include 2-5 gentle observations about patterns
- Use clear, actionable language

Example response:
{
  "summary": "Your sleep patterns show consistent 7-8 hour nights, which is excellent for recovery. Weight tracking reveals a stable trend with minor fluctuations.",
  "recommendations": ["Maintain your consistent sleep schedule", "Consider adding 10 minutes of morning stretching", "Track water intake to ensure adequate hydration"],
  "observations": ["Sleep consistency is a strong foundation for health", "Weight stability suggests good metabolic balance"]
}`
              },
              {
                role: 'user',
                content: `Here are the user's daily health metrics for the past 30 days:

${JSON.stringify(processedData, null, 2)}

Please analyze this data and provide insights as requested. Return only valid JSON matching the required structure.`
              }
            ],
            temperature: 0.7,
            max_tokens: 600
          }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Invalid API key - please check your OpenAI configuration');
          } else if (response.status === 429) {
            throw new Error('Rate limit exceeded - please try again later');
          } else {
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
          }
        }

        const apiResult = await response.json();
        const content = apiResult.choices?.[0]?.message?.content;
        
        if (!content) {
          throw new Error('No content received from OpenAI');
        }

        // Parse and validate the response
        const trimmed = content.trim();
        const parsed = JSON.parse(trimmed);
        
        // Basic validation
        if (!parsed.summary || !Array.isArray(parsed.recommendations) || !Array.isArray(parsed.observations)) {
          throw new Error('Invalid response format from OpenAI');
        }

        result = parsed;

      } catch (fallbackError) {
        clearTimeout(timeoutId);
        
        if (fallbackError instanceof Error) {
          if (fallbackError.name === 'AbortError') {
            throw new Error('Request timeout - please try again');
          }
          throw fallbackError;
        }
        throw new Error('Unknown error during OpenAI call');
      }
    }

    return NextResponse.json({
      ok: true,
      metricsChecked,
      provider,
      model,
      result
    });

  } catch (error) {
    console.error('Selftest error:', error);
    
    let reason = 'unknown_error';
    let message = 'Unknown error occurred';

    if (error instanceof Error) {
      if (error.message.includes('not_authenticated')) {
        reason = 'not_authenticated';
        message = 'User not authenticated';
      } else if (error.message.includes('no_openai_key')) {
        reason = 'no_openai_key';
        message = 'OpenAI API key not configured';
      } else if (error.message.includes('Invalid API key')) {
        reason = 'invalid_api_key';
        message = 'Invalid OpenAI API key';
      } else if (error.message.includes('Rate limit')) {
        reason = 'rate_limit';
        message = 'Rate limit exceeded';
      } else if (error.message.includes('timeout')) {
        reason = 'timeout';
        message = 'Request timeout';
      } else if (error.message.includes('fetch_error')) {
        reason = 'fetch_error';
        message = 'Failed to fetch data';
      } else {
        message = error.message;
      }
    }

    return NextResponse.json(
      { ok: false, reason, message },
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
