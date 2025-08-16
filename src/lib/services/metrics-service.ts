import { supabase } from '@/lib/supabaseClient';
import { UserEnabledMetric, MetricValue, Measurement, MeasurementWithDefinition, UserPreferences, WeeklyProgress } from '@/lib/types';

export class MetricsService {
  static async getUserEnabledMetrics(userId: string): Promise<UserEnabledMetric[]> {
    const { data, error } = await supabase
      .rpc('get_user_enabled_metrics', { user_uuid: userId });

    if (error) {
      console.error('Error fetching user metrics:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "metric_definitions" does not exist') || 
          error.message.includes('function get_user_enabled_metrics')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to fetch user metrics: ' + error.message);
    }

    return data || [];
  }

  static async saveTodayMeasurements(userId: string, measurements: MetricValue[]): Promise<void> {
    const today = new Date().toISOString();
    
    const measurementsToInsert: Partial<Measurement>[] = measurements
      .filter(m => {
        // Filter out empty values
        return m.value_numeric !== undefined || 
               m.value_text !== undefined || 
               m.value_bool !== undefined;
      })
      .map(m => ({
        user_id: userId,
        metric_id: m.metric_id,
        value_numeric: m.value_numeric ?? null,
        value_text: m.value_text ?? null,
        value_bool: m.value_bool ?? null,
        measured_at: today
      }));

    if (measurementsToInsert.length === 0) {
      throw new Error('No valid measurements to save');
    }

    const { error } = await supabase
      .from('measurements')
      .insert(measurementsToInsert);

    if (error) {
      console.error('Error saving measurements:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "measurements" does not exist')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to save measurements: ' + error.message);
    }
  }

  static async getRecentMeasurements(userId: string, limit: number = 14): Promise<MeasurementWithDefinition[]> {
    const { data, error } = await supabase
      .from('measurements')
      .select(`
        *,
        metric_definitions!inner(
          id,
          slug,
          name,
          unit,
          input_kind
        )
      `)
      .eq('user_id', userId)
      .order('measured_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent measurements:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "measurements" does not exist') || 
          error.message.includes('relation "metric_definitions" does not exist')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to fetch recent measurements: ' + error.message);
    }

    return data || [];
  }

  static async getTodaysMeasurements(userId: string): Promise<MeasurementWithDefinition[]> {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('measurements')
      .select(`
        *,
        metric_definitions!inner(
          id,
          slug,
          name,
          unit,
          input_kind
        )
      `)
      .eq('user_id', userId)
      .gte('measured_at', `${today}T00:00:00`)
      .lte('measured_at', `${today}T23:59:59`);

    if (error) {
      console.error('Error fetching today\'s measurements:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "measurements" does not exist') || 
          error.message.includes('relation "metric_definitions" does not exist')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to fetch today\'s measurements: ' + error.message);
    }

    return data || [];
  }

  static async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .rpc('get_or_create_user_preferences', { user_uuid: userId });

    if (error) {
      console.error('Error fetching user preferences:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "user_preferences" does not exist') || 
          error.message.includes('function get_or_create_user_preferences')) {
        throw new Error('Database migration required. Please run the goals and planning migration in Supabase.');
      }
      throw new Error('Failed to fetch user preferences: ' + error.message);
    }

    return data;
  }

  static async updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<void> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "user_preferences" does not exist')) {
        throw new Error('Database migration required. Please run the goals and planning migration in Supabase.');
      }
      throw new Error('Failed to update user preferences: ' + error.message);
    }
  }

  static async getWeeklyProgress(userId: string, targetDate?: Date): Promise<WeeklyProgress[]> {
    const date = targetDate || new Date();
    const dateString = date.toISOString().split('T')[0];
    
    // Try RPC function first
    const { data: rpcData, error: rpcErr } = await supabase
      .rpc('get_weekly_progress', { 
        user_uuid: userId, 
        target_date: dateString 
      });

    if (!rpcErr && rpcData) {
      // Transform RPC data to WeeklyProgress format
      const metricGroups = new Map<string, any[]>();
      
      rpcData.forEach((row: any) => {
        const slug = row.metric_slug;
        if (!metricGroups.has(slug)) {
          metricGroups.set(slug, []);
        }
        metricGroups.get(slug)!.push(row);
      });

      // Convert to WeeklyProgress format
      const weeklyProgress: WeeklyProgress[] = [];
      for (const [slug, measurements] of metricGroups) {
        const numericValues = measurements
          .map((m: any) => m.value)
          .filter((v: any) => v !== null && v !== undefined);
        
        const currentAvg = numericValues.length > 0 
          ? numericValues.reduce((sum: number, val: number) => sum + val, 0) / numericValues.length 
          : null;

        weeklyProgress.push({
          metric_name: slug.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
          current_avg: currentAvg,
          target_value: null, // Would need to fetch from user_metric_settings
          progress_percent: null
        });
      }

      return weeklyProgress;
    }

    console.warn('RPC get_weekly_progress failed, using fallback:', rpcErr?.message);

    // Fallback: simple last-7-days select (less aggregated but unblocks UI)
    const start = new Date(dateString);
    start.setDate(start.getDate() - 6);
    const startISO = start.toISOString();

    const { data, error } = await supabase
      .from('measurements')
      .select('metric_slug, value_numeric, value_text, value_bool, created_at')
      .eq('user_id', userId)
      .gte('created_at', startISO)
      .lte('created_at', new Date(dateString).toISOString())
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fallback weekly progress query failed:', error);
      throw new Error('Failed to fetch weekly progress: ' + error.message);
    }

    // Transform the raw data into a WeeklyProgress-like format
    const weeklyData = data || [];
    const metricGroups = new Map<string, any[]>();
    
    weeklyData.forEach(measurement => {
      const slug = measurement.metric_slug;
      if (!metricGroups.has(slug)) {
        metricGroups.set(slug, []);
      }
      metricGroups.get(slug)!.push(measurement);
    });

    // Convert to WeeklyProgress format
    const weeklyProgress: WeeklyProgress[] = [];
    for (const [slug, measurements] of metricGroups) {
      const numericValues = measurements
        .map(m => m.value_numeric)
        .filter(v => v !== null && v !== undefined);
      
      const currentAvg = numericValues.length > 0 
        ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length 
        : null;

      weeklyProgress.push({
        metric_name: slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        current_avg: currentAvg,
        target_value: null, // Would need to fetch from user_metric_settings
        progress_percent: null
      });
    }

    return weeklyProgress;
  }

  static async updateMetricTarget(userId: string, metricId: string, targetValue: number | null): Promise<void> {
    const { error } = await supabase
      .from('user_metric_settings')
      .update({ target_value: targetValue })
      .eq('user_id', userId)
      .eq('metric_id', metricId);

    if (error) {
      console.error('Error updating metric target:', error);
      // Check if this is a database migration issue
      if (error.message.includes('relation "user_metric_settings" does not exist')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to update metric target: ' + error.message);
    }
  }

  static formatMeasurementValue(measurement: MeasurementWithDefinition): string {
    if (measurement.value_numeric !== null) {
      const unit = measurement.metric_definitions?.unit || '';
      return `${measurement.value_numeric}${unit}`;
    }
    
    if (measurement.value_text !== null) {
      return measurement.value_text;
    }
    
    if (measurement.value_bool !== null) {
      return measurement.value_bool ? 'Yes' : 'No';
    }
    
    return 'N/A';
  }

  static getMeasurementDisplayName(measurement: MeasurementWithDefinition): string {
    return measurement.metric_definitions?.name || 'Unknown Metric';
  }
}
