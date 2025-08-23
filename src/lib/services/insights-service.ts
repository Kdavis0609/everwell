import type { SupabaseClient } from '@supabase/supabase-js';
import { DerivedFeatures, AIInsight, AIInsightResponse, InsightsData } from '@/lib/types';
import { logError } from '@/lib/logError';

export class InsightsService {
  static async calculateDerivedFeatures(sb: SupabaseClient, targetDate: string = new Date().toISOString().split('T')[0]): Promise<void> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('calculateDerivedFeatures.session', sErr); throw sErr; }
    if (!session) { logError('calculateDerivedFeatures.auth', { message: 'No session' }); throw new Error('No session'); }

    try {
      const { error } = await sb.rpc('upsert_derived_features', {
        user_uuid: session.user.id,
        target_date: targetDate
      });

      if (error) {
        console.warn('Derived features RPC function may not exist:', error);
        // Don't throw error, just log warning
        return;
      }
    } catch (error) {
      console.warn('Error calling derived features RPC:', error);
      // Don't throw error, just log warning
      return;
    }
  }

  static async getDerivedFeatures(sb: SupabaseClient, days: number = 30): Promise<DerivedFeatures[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getDerivedFeatures.session', sErr); throw sErr; }
    if (!session) { logError('getDerivedFeatures.auth', { message: 'No session' }); return []; }

    try {
      const { data, error } = await sb
        .from('derived_features')
        .select('*')
        .eq('user_id', session.user.id)
        .gte('day', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('day', { ascending: false });

      if (error) {
        console.warn('Derived features table may not exist:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.warn('Error accessing derived_features table:', error);
      return [];
    }
  }

  static async getTodayDerivedFeatures(sb: SupabaseClient): Promise<DerivedFeatures | null> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getTodayDerivedFeatures.session', sErr); throw sErr; }
    if (!session) { logError('getTodayDerivedFeatures.auth', { message: 'No session' }); return null; }

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await sb
        .from('derived_features')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('day', today)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Today derived features table may not exist:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error accessing today derived features:', error);
      return null;
    }
  }

  static async getAIInsight(sb: SupabaseClient, day: string = new Date().toISOString().split('T')[0]): Promise<AIInsight | null> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getAIInsight.session', sErr); throw sErr; }
    if (!session) { logError('getAIInsight.auth', { message: 'No session' }); return null; }

    try {
      const { data, error } = await sb
        .from('ai_insights')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('day', day)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('AI insights table may not exist:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Error accessing AI insights table:', error);
      return null;
    }
  }

  static async saveAIInsight(sb: SupabaseClient, day: string, insight: AIInsightResponse): Promise<void> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('saveAIInsight.session', sErr); throw sErr; }
    if (!session) { logError('saveAIInsight.auth', { message: 'No session' }); throw new Error('No session'); }

    try {
      const { error } = await sb
        .from('ai_insights')
        .upsert({
          user_id: session.user.id,
          day,
          summary: insight.summary,
          actions: insight.actions,
          risk_flags: insight.risk_flags
        }, { onConflict: 'user_id,day' });

      if (error) {
        console.warn('AI insights table may not exist:', error);
        // Don't throw error, just log warning
        return;
      }
    } catch (error) {
      console.warn('Error saving AI insight:', error);
      // Don't throw error, just log warning
      return;
    }
  }

  static async getInsightsData(sb: SupabaseClient): Promise<InsightsData> {
    try {
      // Get today's derived features
      const today = await this.getTodayDerivedFeatures(sb);
      
      // Get recent derived features (last 7 days)
      const recent = await this.getDerivedFeatures(sb, 7);
      
      // Get today's AI insight
      const aiInsight = await this.getAIInsight(sb);
      
      // Calculate trends
      const trends = this.calculateTrends(recent);
      
      return {
        today,
        recent,
        aiInsight,
        trends
      };
    } catch (error) {
      console.warn('Error loading insights data, returning empty state:', error);
      // Return empty state if tables don't exist or other errors occur
      return {
        today: null,
        recent: [],
        aiInsight: null,
        trends: {
          weight_7d_avg: null,
          weight_30d_avg: null,
          weight_trend: null,
          sleep_7d_avg: null,
          water_7d_avg: null,
          steps_7d_avg: null,
        }
      };
    }
  }

  private static calculateTrends(recent: DerivedFeatures[]) {
    const weightValues = recent
      .filter(d => d.weight_lbs !== null)
      .map(d => d.weight_lbs!);
    
    const sleepValues = recent
      .filter(d => d.sleep_hours !== null)
      .map(d => d.sleep_hours!);
    
    const waterValues = recent
      .filter(d => d.water_oz !== null)
      .map(d => d.water_oz!);
    
    const stepsValues = recent
      .filter(d => d.steps !== null)
      .map(d => d.steps!);

    return {
      weight_7d_avg: weightValues.length > 0 ? weightValues.reduce((a, b) => a + b, 0) / weightValues.length : null,
      weight_30d_avg: null, // Will be calculated by the database function
      weight_trend: recent[0]?.trend_weight_30d || null,
      sleep_7d_avg: sleepValues.length > 0 ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : null,
      water_7d_avg: waterValues.length > 0 ? waterValues.reduce((a, b) => a + b, 0) / waterValues.length : null,
      steps_7d_avg: stepsValues.length > 0 ? stepsValues.reduce((a, b) => a + b, 0) / stepsValues.length : null,
    };
  }

  static async generateAIInsight(sb: SupabaseClient): Promise<AIInsightResponse> {
    try {
      // First, ensure we have the latest derived features (don't fail if this doesn't work)
      try {
        await this.calculateDerivedFeatures(sb);
      } catch (error) {
        console.warn('Could not calculate derived features:', error);
      }
      
      // Get the data needed for AI generation
      const insightsData = await this.getInsightsData(sb);
      
      // Call the AI generation API
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          insightsData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI insight');
      }

      const insight = await response.json();
      
      // Save the insight (don't fail if this doesn't work)
      try {
        await this.saveAIInsight(sb, new Date().toISOString().split('T')[0], insight);
      } catch (error) {
        console.warn('Could not save AI insight:', error);
      }
      
      return insight;
    } catch (error) {
      logError('generateAIInsight', error);
      throw new Error('Failed to generate AI insight');
    }
  }
}
