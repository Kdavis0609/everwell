import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createSupabaseServer } from '@/lib/supabase/server';
import { InsightsService } from '@/lib/services/insights-service';
import { MetricsService } from '@/lib/services/metrics-service';
import { getBaseUrl } from '@/lib/utils/url';

// Initialize Resend only when API key is available
const getResend = () => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  return new Resend(apiKey);
};

export async function POST(request: NextRequest) {
  try {
    // Check for CRON_SECRET header for server-side runs
    const cronSecret = request.headers.get('CRON_SECRET');
    const isCronRequest = cronSecret === process.env.CRON_SECRET;

    if (!isCronRequest) {
      // For development/testing, get user from request body
      const { userId } = await request.json();
      if (!userId) {
        return NextResponse.json({ error: 'User ID is required for non-cron requests' }, { status: 400 });
      }
      await sendDailyEmail(userId);
    } else {
      // For production cron, send to all users with reminders enabled
      await sendDailyEmailsToAllUsers();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending daily email:', error);
    return NextResponse.json(
      { error: 'Failed to send daily email' },
      { status: 500 }
    );
  }
}

async function sendDailyEmail(userId: string) {
  const supabase = await createSupabaseServer();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('Failed to fetch user profile');
  }

  // Get user preferences to check if reminders are enabled
  const preferences = await MetricsService.getUserPreferences(supabase);
  if (!preferences.reminders?.daily_email) {
          // Daily email reminders disabled for user
    return;
  }

  // Get today's AI insights
  const today = new Date().toISOString().split('T')[0];
  const insights = await InsightsService.getAIInsight(supabase, today);

  // Get weekly progress
  const weeklyProgress = await MetricsService.getWeeklyProgress(supabase);

  // Get enabled metrics
  const enabledMetrics = await MetricsService.getUserEnabledMetrics(supabase);

  // Generate email content
  const emailContent = generateEmailContent({
    profile,
    insights,
    weeklyProgress,
    enabledMetrics
  });

  // Send email
  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: 'EverWell <noreply@everwell.com>',
    to: [profile.email],
    subject: 'Your Daily Health Reminder',
    html: emailContent.html,
    text: emailContent.text
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error('Failed to send email');
  }

      // Daily email sent successfully
}

async function sendDailyEmailsToAllUsers() {
  const supabase = await createSupabaseServer();

  // Get all users with daily email reminders enabled
  const { data: users, error } = await supabase
    .from('profiles')
    .select('user_id, email')
    .eq('reminders->daily_email', true);

  if (error) {
    throw new Error('Failed to fetch users with reminders enabled');
  }

  if (!users || users.length === 0) {
    // No users with daily email reminders enabled
    return;
  }

  // Send emails to all users
  for (const user of users) {
    try {
      await sendDailyEmail(user.user_id);
    } catch (error) {
      console.error(`Failed to send email to user ${user.user_id}:`, error);
      // Continue with other users even if one fails
    }
  }
}

function generateEmailContent({
  profile,
  insights,
  weeklyProgress,
  enabledMetrics
}: {
  profile: any;
  insights: any;
  weeklyProgress: any[];
  enabledMetrics: any[];
}) {
  const userName = profile.full_name || profile.email.split('@')[0];
  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Daily Health Reminder</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #10b981); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px; }
        .section { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #2563eb; }
        .insight { background: #f0f9ff; padding: 15px; border-radius: 6px; margin-bottom: 15px; border-left: 4px solid #0ea5e9; }
        .action { background: #fef3c7; padding: 12px; border-radius: 6px; margin-bottom: 10px; border-left: 4px solid #f59e0b; }
        .progress { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .progress-bar { background: #e5e7eb; height: 8px; border-radius: 4px; flex: 1; margin: 0 10px; }
        .progress-fill { background: #10b981; height: 100%; border-radius: 4px; }
        .cta { background: #2563eb; color: white; padding: 15px 25px; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
        .metric { margin-bottom: 15px; }
        .metric-name { font-weight: 600; margin-bottom: 5px; }
        .metric-value { color: #6b7280; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Good morning, ${userName}! 🌅</h1>
        <p>${today}</p>
      </div>

      ${insights ? `
        <div class="section">
          <h2>Today's Health Insights</h2>
          <div class="insight">
            <p><strong>Summary:</strong> ${insights.summary}</p>
          </div>
          ${insights.actions ? `
            <h3>Today's Focus Areas:</h3>
            ${insights.actions.map((action: string, index: number) => `
              <div class="action">
                <strong>${index + 1}.</strong> ${action}
              </div>
            `).join('')}
          ` : ''}
        </div>
      ` : `
        <div class="section">
          <h2>Ready to Track Your Health?</h2>
          <p>Start your day by logging your health metrics and get personalized insights to help you reach your goals.</p>
        </div>
      `}

      ${weeklyProgress.length > 0 ? `
        <div class="section">
          <h2>Weekly Progress</h2>
          ${weeklyProgress.map((progress: any) => `
            <div class="metric">
              <div class="metric-name">${progress.metric_name.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</div>
              <div class="progress">
                <span class="metric-value">${progress.current_avg ? progress.current_avg.toFixed(1) : 'No data'} / ${progress.target_value || 'No target'}</span>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${Math.min(100, progress.progress_percent || 0)}%"></div>
                </div>
                <span class="metric-value">${progress.progress_percent ? progress.progress_percent.toFixed(0) + '%' : 'N/A'}</span>
              </div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="section">
        <h2>Today's Metrics to Track</h2>
        <p>You have <strong>${enabledMetrics.length}</strong> metrics enabled:</p>
        <ul>
          ${enabledMetrics.map((metric: any) => `<li>${metric.name}</li>`).join('')}
        </ul>
      </div>

      <div style="text-align: center;">
        <a href="${getBaseUrl()}/dashboard" class="cta">
          Log Today's Metrics →
        </a>
      </div>

      <div class="footer">
        <p><strong>EverWell</strong> - Your personal health companion</p>
        <p>This email contains informational guidance only and is not medical advice.</p>
        <p><a href="${getBaseUrl()}/settings">Manage email preferences</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
Good morning, ${userName}!

${today}

${insights ? `
TODAY'S HEALTH INSIGHTS
${insights.summary}

Today's Focus Areas:
${insights.actions ? insights.actions.map((action: string, index: number) => `${index + 1}. ${action}`).join('\n') : 'No actions available'}
` : `
Ready to Track Your Health?
Start your day by logging your health metrics and get personalized insights to help you reach your goals.
`}

${weeklyProgress.length > 0 ? `
WEEKLY PROGRESS
${weeklyProgress.map((progress: any) => 
  `${progress.metric_name.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}: ${progress.current_avg ? progress.current_avg.toFixed(1) : 'No data'} / ${progress.target_value || 'No target'} (${progress.progress_percent ? progress.progress_percent.toFixed(0) + '%' : 'N/A'})`
).join('\n')}
` : ''}

TODAY'S METRICS TO TRACK
You have ${enabledMetrics.length} metrics enabled:
${enabledMetrics.map((metric: any) => `- ${metric.name}`).join('\n')}

    Log your metrics: ${getBaseUrl()}/dashboard

---
EverWell - Your personal health companion
This email contains informational guidance only and is not medical advice.
Manage email preferences: ${getBaseUrl()}/settings
  `;

  return { html, text };
}
