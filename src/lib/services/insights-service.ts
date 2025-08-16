import { supabase } from '@/lib/supabaseClient';
import { DerivedFeatures, AIInsight, AIInsightResponse, InsightsData } from '@/lib/types';

export class InsightsService {
  static async calculateDerivedFeatures(userId: string, targetDate: string = new Date().toISOString().split('T')[0]): Promise<void> {
    const { error } = await supabase.rpc('upsert_derived_features', {
      user_uuid: userId,
      target_date: targetDate
    });

    if (error) {
      console.error('Error calculating derived features:', error);
      throw new Error('Failed to calculate derived features');
    }
  }

  static async getDerivedFeatures(userId: string, days: number = 30): Promise<DerivedFeatures[]> {
    const { data, error } = await supabase
      .from('derived_features')
      .select('*')
      .eq('user_id', userId)
      .gte('day', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('day', { ascending: false });

    if (error) {
      console.error('Error fetching derived features:', error);
      throw new Error('Failed to fetch derived features');
    }

    return data || [];
  }

  static async getTodayDerivedFeatures(userId: string): Promise<DerivedFeatures | null> {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('derived_features')
      .select('*')
      .eq('user_id', userId)
      .eq('day', today)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching today\'s derived features:', error);
      throw new Error('Failed to fetch today\'s derived features');
    }

    return data;
  }

  static async getAIInsight(userId: string, day: string = new Date().toISOString().split('T')[0]): Promise<AIInsight | null> {
    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', userId)
      .eq('day', day)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching AI insight:', error);
      throw new Error('Failed to fetch AI insight');
    }

    return data;
  }

  static async saveAIInsight(userId: string, day: string, insight: AIInsightResponse): Promise<void> {
    const { error } = await supabase
      .from('ai_insights')
      .upsert({
        user_id: userId,
        day,
        summary: insight.summary,
        actions: insight.actions,
        risk_flags: insight.risk_flags
      }, { onConflict: 'user_id,day' });

    if (error) {
      console.error('Error saving AI insight:', error);
      throw new Error('Failed to save AI insight');
    }
  }

  static async getInsightsData(userId: string): Promise<InsightsData> {
    // Get today's derived features
    const today = await this.getTodayDerivedFeatures(userId);
    
    // Get recent derived features (last 7 days)
    const recent = await this.getDerivedFeatures(userId, 7);
    
    // Get today's AI insight
    const aiInsight = await this.getAIInsight(userId);
    
    // Calculate trends
    const trends = this.calculateTrends(recent);
    
    return {
      today,
      recent,
      aiInsight,
      trends
    };
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

  static async generateAIInsight(userId: string): Promise<AIInsightResponse> {
    try {
      // First, ensure we have the latest derived features
      await this.calculateDerivedFeatures(userId);
      
      // Get the data needed for AI generation
      const insightsData = await this.getInsightsData(userId);
      
      // Call the AI generation API
      const response = await fetch('/api/insights/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          insightsData
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI insight');
      }

      const insight = await response.json();
      
      // Save the insight
      await this.saveAIInsight(userId, new Date().toISOString().split('T')[0], insight);
      
      return insight;
    } catch (error) {
      console.error('Error generating AI insight:', error);
      throw new Error('Failed to generate AI insight');
    }
  }
}
