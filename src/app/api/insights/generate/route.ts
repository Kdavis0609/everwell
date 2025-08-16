import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseClient';
import { InsightsData } from '@/lib/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set');
}

export async function POST(request: NextRequest) {
  try {
    const { userId, insightsData } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    // Get user profile for context
    const supabase = createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Prepare the prompt data
    const promptData = preparePromptData(insightsData, profile);
    
    // Generate AI insight
    const insight = await generateAIInsight(promptData);

    return NextResponse.json(insight);
  } catch (error) {
    console.error('Error generating AI insight:', error);
    return NextResponse.json(
      { error: 'Failed to generate AI insight' },
      { status: 500 }
    );
  }
}

function preparePromptData(insightsData: InsightsData, profile: any) {
  const today = insightsData.today;
  const recent = insightsData.recent;
  const trends = insightsData.trends;

  // Format today's metrics
  const todayMetrics = today ? [
    `Weight: ${today.weight_lbs ? `${today.weight_lbs} lbs` : 'Not recorded'}`,
    `BMI: ${today.bmi ? today.bmi.toFixed(1) : 'Not calculated'}`,
    `Steps: ${today.steps ? today.steps.toLocaleString() : 'Not recorded'}`,
    `Sleep: ${today.sleep_hours ? `${today.sleep_hours} hours` : 'Not recorded'}`,
    `Water: ${today.water_oz ? `${today.water_oz} oz` : 'Not recorded'}`
  ].join(', ') : 'No metrics recorded today';

  // Format recent trends
  const recentTrends = [
    `7-day weight avg: ${trends.weight_7d_avg ? `${trends.weight_7d_avg.toFixed(1)} lbs` : 'Not available'}`,
    `7-day sleep avg: ${trends.sleep_7d_avg ? `${trends.sleep_7d_avg.toFixed(1)} hours` : 'Not available'}`,
    `7-day water avg: ${trends.water_7d_avg ? `${trends.water_7d_avg.toFixed(0)} oz` : 'Not available'}`,
    `7-day steps avg: ${trends.steps_7d_avg ? trends.steps_7d_avg.toLocaleString() : 'Not available'}`
  ].join(', ');

  // Format weight trend
  const weightTrend = trends.weight_trend 
    ? trends.weight_trend > 0 
      ? `Weight trending up (+${trends.weight_trend.toFixed(2)} lbs/day)`
      : trends.weight_trend < 0
        ? `Weight trending down (${trends.weight_trend.toFixed(2)} lbs/day)`
        : 'Weight stable'
    : 'No weight trend data';

  // Format last 3 days
  const last3Days = recent.slice(0, 3).map(day => {
    const date = new Date(day.day).toLocaleDateString();
    const weight = day.weight_lbs ? `${day.weight_lbs} lbs` : 'No data';
    const steps = day.steps ? day.steps.toLocaleString() : 'No data';
    return `${date}: Weight ${weight}, Steps ${steps}`;
  }).join('; ');

  return {
    age: profile?.age || 'Not specified',
    sex: profile?.sex || 'Not specified',
    height_in: profile?.height_in || 'Not specified',
    goals: profile?.goals || 'General wellness',
    today_metrics: todayMetrics,
    recent_trends: recentTrends,
    weight_trend: weightTrend,
    last_3_days: last3Days
  };
}

async function generateAIInsight(promptData: any) {
  const systemPrompt = `You are a supportive health coach providing motivational, non-clinical guidance. Your role is to:

1. **Be encouraging and positive** - Focus on progress and achievements
2. **Provide actionable advice** - Give specific, achievable next steps
3. **Stay non-medical** - No diagnoses, treatments, or medical recommendations
4. **Be concise** - Keep summaries under 120 words
5. **Personalize** - Consider the user's goals and patterns
6. **Focus on habits** - Emphasize sustainable lifestyle changes

**IMPORTANT DISCLAIMERS:**
- This is informational guidance only, not medical advice
- Always consult healthcare professionals for medical concerns
- Focus on general wellness and healthy habits
- Avoid specific medical recommendations or diagnoses

**Tone Guidelines:**
- Warm and supportive
- Data-informed but not clinical
- Celebratory of progress
- Constructive about areas for improvement
- Action-oriented and practical`;

  const userPrompt = `Generate a daily health insight for this user based on their data.

**User Profile:**
- Age: ${promptData.age}
- Sex: ${promptData.sex}
- Height: ${promptData.height_in} inches
- Goals: ${promptData.goals}

**Today's Metrics:**
${promptData.today_metrics}

**Recent Trends (7-day averages):**
${promptData.recent_trends}

**30-day Weight Trend:**
${promptData.weight_trend}

**Last 3 Days Summary:**
${promptData.last_3_days}

**Context:**
- Focus on positive progress and achievable next steps
- Consider the user's goals and patterns
- Provide specific, actionable advice
- Keep the tone encouraging and supportive
- Remember this is informational guidance only, not medical advice

**Output Format (JSON):**
\`\`\`json
{
  "summary": "A concise, encouraging summary of today's health status and progress (max 120 words)",
  "actions": [
    "Specific, actionable step 1",
    "Specific, actionable step 2", 
    "Specific, actionable step 3"
  ],
  "risk_flags": [
    "Any concerning patterns that warrant attention (optional)"
  ]
}
\`\`\`

**Guidelines:**
- Summary should be motivational and highlight progress
- Actions should be specific and achievable today/tomorrow
- Risk flags should be gentle observations, not alarming
- Keep everything non-medical and informational`;

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
      max_tokens: 500
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  // Extract JSON from the response
  const jsonMatch = content.match(/```json\s*(\{[\s\S]*?\})\s*```/);
  if (!jsonMatch) {
    throw new Error('No JSON found in OpenAI response');
  }

  try {
    const insight = JSON.parse(jsonMatch[1]);
    
    // Validate the response
    if (!insight.summary || !insight.actions || !Array.isArray(insight.actions)) {
      throw new Error('Invalid insight format');
    }

    return {
      summary: insight.summary,
      actions: insight.actions.slice(0, 3), // Ensure max 3 actions
      risk_flags: insight.risk_flags || []
    };
  } catch (parseError) {
    console.error('Error parsing OpenAI response:', parseError);
    throw new Error('Failed to parse AI response');
  }
}
