import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';
import { InsightsService } from '@/lib/services/insights-service';
import { MetricsService } from '@/lib/services/metrics-service';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY environment variable is required');
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    
    // Get user profile for context
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
    }

    // Get weekly progress data
    const weeklyProgress = await MetricsService.getWeeklyProgress(userId);
    
    // Get last 7 days of derived features
    const { data: derivedFeatures, error: derivedError } = await supabase
      .from('derived_features')
      .select('*')
      .eq('user_id', userId)
      .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .lte('day', new Date().toISOString().split('T')[0])
      .order('day', { ascending: true });

    if (derivedError) {
      console.error('Error fetching derived features:', derivedError);
      return NextResponse.json({ error: 'Failed to fetch weekly data' }, { status: 500 });
    }

    // Generate weekly plan using AI
    const weeklyPlan = await generateWeeklyPlan({
      profile,
      weeklyProgress,
      derivedFeatures: derivedFeatures || []
    });

    // Get last Monday's date for storage
    const { data: lastMonday } = await supabase
      .rpc('get_last_monday');

    // Store the weekly plan in ai_insights
    await InsightsService.saveAIInsight(
      userId, 
      lastMonday || new Date().toISOString().split('T')[0], 
      weeklyPlan
    );

    return NextResponse.json(weeklyPlan);
  } catch (error) {
    console.error('Error generating weekly plan:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly plan' }, 
      { status: 500 }
    );
  }
}

async function generateWeeklyPlan(data: {
  profile: any;
  weeklyProgress: any[];
  derivedFeatures: any[];
}) {
  const systemPrompt = `You are a supportive health coach creating a weekly focus plan. Your role is to:

1. **Analyze weekly progress** - Review the user's performance against their goals
2. **Identify key focus areas** - Pick 3 specific areas that need attention this week
3. **Provide actionable guidance** - Give clear, achievable steps for each focus area
4. **Stay encouraging** - Frame everything positively and motivationally
5. **Be specific** - Avoid vague advice, give concrete actions

**IMPORTANT DISCLAIMERS:**
- This is informational guidance only, not medical advice
- Always consult healthcare professionals for medical concerns
- Focus on general wellness and healthy habits
- Avoid specific medical recommendations or diagnoses

**Output Format (JSON):**
{
  "summary": "Brief overview of the week's focus areas (max 100 words)",
  "actions": [
    "Specific focus area 1 with actionable steps",
    "Specific focus area 2 with actionable steps", 
    "Specific focus area 3 with actionable steps"
  ],
  "risk_flags": [
    "Any concerning patterns that warrant attention (optional)"
  ]
}`;

  const userPrompt = `Generate a weekly health focus plan for this user based on their recent progress and goals.

**User Profile:**
- Age: ${data.profile?.age || 'Not specified'}
- Sex: ${data.profile?.sex || 'Not specified'}
- Height: ${data.profile?.height_in || 'Not specified'} inches
- Goals: ${data.profile?.goals || 'Not specified'}

**Weekly Progress Summary:**
${data.weeklyProgress.map(p => 
  `- ${p.metric_name}: ${p.current_avg ? p.current_avg.toFixed(1) : 'No data'} / ${p.target_value || 'No target'} (${p.progress_percent ? p.progress_percent.toFixed(0) + '%' : 'N/A'})`
).join('\n')}

**Last 7 Days Data:**
${data.derivedFeatures.map(df => 
  `- ${df.day}: Weight ${df.weight_lbs || 'N/A'}lbs, Steps ${df.steps || 'N/A'}, Sleep ${df.sleep_hours || 'N/A'}hrs, Water ${df.water_oz || 'N/A'}oz`
).join('\n')}

**Focus Areas to Address:**
- Identify which metrics are below target
- Consider patterns in the data
- Suggest specific improvements for the coming week

Generate a weekly plan with 3 focused action items that will help the user make progress toward their goals.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 600
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const result = await response.json();
  const content = result.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    // Try to parse JSON from the response
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                     content.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } else {
      // Fallback: try to extract JSON from the entire response
      return JSON.parse(content);
    }
  } catch (parseError) {
    console.error('Error parsing AI response:', parseError);
    console.error('Raw response:', content);
    
    // Fallback response
    return {
      summary: "Based on your weekly progress, here are three key areas to focus on this week.",
      actions: [
        "Review your daily tracking consistency and set reminders for any missed days",
        "Focus on the metric that's furthest from your target and create a specific action plan",
        "Celebrate your progress and identify one new healthy habit to add this week"
      ],
      risk_flags: []
    };
  }
}
