import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server';
import { InsightsUsageService } from '@/lib/ai/usage-service';

export async function GET(request: NextRequest) {
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

    // Get usage statistics
    const usageStats = await InsightsUsageService.getUsageStats(supabase, user.id);
    const usageInfo = await InsightsUsageService.checkUsageLimit(supabase, user.id);

    return NextResponse.json({
      ok: true,
      usage: {
        today: usageStats.todayCount,
        weekly: usageStats.weeklyCount,
        monthly: usageStats.monthlyCount,
        dailyLimit: usageInfo.dailyLimit,
        canGenerate: usageInfo.canGenerate,
        remaining: Math.max(0, usageInfo.dailyLimit - usageStats.todayCount)
      }
    });

  } catch (error) {
    console.error('Usage API error:', error);
    return NextResponse.json(
      { ok: false, reason: 'server_error', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
