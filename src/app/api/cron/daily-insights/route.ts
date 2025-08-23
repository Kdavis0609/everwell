import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { InsightsService } from '@/lib/services/insights-service';
import { logError } from '@/lib/errors';

const CRON_SECRET = process.env.CRON_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createSupabaseServer();
    
    // Get all users (in production, you might want to filter active users)
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('user_id');

    if (usersError) {
      logError('daily-insights.users', usersError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const results = [];
    const today = new Date().toISOString().split('T')[0];

    // Process each user
    for (const user of users || []) {
      try {
        // Calculate derived features
        await InsightsService.calculateDerivedFeatures(supabase, today);
        
        // Generate AI insight
        const insight = await InsightsService.generateAIInsight(supabase);
        
        results.push({
          userId: user.user_id,
          status: 'success',
          insight: insight.summary.substring(0, 50) + '...'
        });
      } catch (error) {
        logError('daily-insights.user-process', error, { userId: user.user_id });
        results.push({
          userId: user.user_id,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Daily insights generation completed',
      processed: results.length,
      results
    });

  } catch (error) {
    logError('daily-insights.unexpected', error);
    return NextResponse.json(
      { error: 'Failed to process daily insights' },
      { status: 500 }
    );
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  // For development/testing, allow GET without auth
  if (process.env.NODE_ENV === 'development') {
    return POST(request);
  }
  
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
