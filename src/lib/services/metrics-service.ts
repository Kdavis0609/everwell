import type { SupabaseClient } from '@supabase/supabase-js';
import { UserEnabledMetric, MetricValue, Measurement, MeasurementWithDefinition, UserPreferences, WeeklyProgress } from '@/lib/types';
import { logError } from '@/lib/errors';

export class MetricsService {
  static async getUserEnabledMetrics(sb: SupabaseClient): Promise<UserEnabledMetric[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getUserEnabledMetrics.session', sErr); throw sErr; }
    if (!session) { logError('getUserEnabledMetrics.auth', { message: 'No session' }); return []; }

    try {
      const { data, error } = await sb
        .rpc('get_user_enabled_metrics', { user_uuid: session.user.id });

      if (error) {
        logError('getUserEnabledMetrics.rpc', error, { userId: session.user.id });
        throw error;
      }

      return data || [];
    } catch (error) {
      // Fallback to direct query if RPC doesn't exist
      if (error instanceof Error && 
          error.message.includes('function get_user_enabled_metrics')) {
        logError('getUserEnabledMetrics.fallback', error, { userId: session.user.id });
        
        const { data, error: queryError } = await sb
          .from('user_metric_settings')
          .select(`
            metric_id,
            enabled,
            target_value,
            unit_override,
            metric_definitions!inner(
              slug,
              name,
              unit,
              input_kind,
              min_value,
              max_value,
              step_value,
              category,
              default_enabled,
              sort_order
            )
          `)
          .eq('user_id', session.user.id)
          .eq('enabled', true)
          .order('metric_definitions.sort_order');

        if (queryError) {
          logError('getUserEnabledMetrics.fallback.query', queryError, { userId: session.user.id });
          throw queryError;
        }

        return (data || []).map(row => {
          const metricDef = row.metric_definitions as any;
          return {
            id: row.metric_id,
            metric_id: row.metric_id,
            slug: metricDef.slug,
            name: metricDef.name,
            unit: metricDef.unit,
            unit_override: row.unit_override,
            input_kind: metricDef.input_kind,
            min_value: metricDef.min_value,
            max_value: metricDef.max_value,
            step_value: metricDef.step_value,
            category: metricDef.category,
            default_enabled: metricDef.default_enabled,
            sort_order: metricDef.sort_order,
            created_at: new Date().toISOString(),
            enabled: row.enabled,
            target_value: row.target_value
          };
        });
      }
      throw error;
    }
  }

  static async getMetricIdBySlug(sb: SupabaseClient, slug: string): Promise<string | null> {
    const { data, error } = await sb
      .from('metric_definitions')
      .select('id')
      .eq('slug', slug)
      .single();

    if (error) {
      logError('getMetricIdBySlug', error, { slug });
      return null;
    }

    return data?.id || null;
  }

  static async saveTodayMeasurements(
    sb: SupabaseClient,
    dayISOOrMeasurements?: string | MetricValue[], 
    entries?: Array<{ metric_slug: string; value: number }>
  ): Promise<{ count: number }> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('saveTodayMeasurements.session', sErr); throw sErr; }
    if (!session) { logError('saveTodayMeasurements.auth', { message: 'No session' }); return { count: 0 }; }
    
    // If entries are provided, use the simplified format
    if (entries && entries.length > 0) {
      const today = (dayISOOrMeasurements as string) || new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
      
      // Look up metric IDs for all slugs
      const metricIds = await Promise.all(
        entries.map(async (e) => {
          const metricId = await this.getMetricIdBySlug(sb, e.metric_slug);
          if (!metricId) {
            logError('saveTodayMeasurements.metricLookup', { message: 'Could not find metric ID' }, { slug: e.metric_slug });
            return null;
          }
          return { metricId, value: e.value };
        })
      );

      const validEntries = metricIds.filter(Boolean) as Array<{ metricId: string; value: number }>;
      
      const rows = validEntries.map((e) => ({
        user_id: session.user.id,
        measured_at: `${today}T00:00:00Z`,
        metric_id: e.metricId,
        value_numeric: e.value,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }));

      // upsert by uniqueness constraint (user_id, measured_at, metric_id)
      const { data, error } = await sb
        .from('measurements')
        .upsert(rows, { onConflict: 'user_id,measured_at,metric_id' })
        .select('user_id, measured_at, metric_id, value_numeric');

      if (error) {
        logError('saveTodayMeasurements.upsert', error, { rowsCount: rows.length, userId: session.user.id });
        throw error;
      }
      return { count: data?.length ?? 0 };
    }

    // Legacy support for MetricValue[] format
    if (!dayISOOrMeasurements || !Array.isArray(dayISOOrMeasurements)) {
      return { count: 0 };
    }
    
    const measurements = dayISOOrMeasurements as MetricValue[];
    const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'
    
    if (measurements.length === 0) return { count: 0 };
    
    // Look up metric IDs for measurements that only have slugs
    const measurementsWithIds = await Promise.all(
      measurements
        .filter(m => {
          // Filter out empty values
          return m.value_numeric !== undefined || 
                 m.value_text !== undefined || 
                 m.value_bool !== undefined;
        })
        .map(async (m) => {
          // If we have metric_id, use it; otherwise look up by slug
          let metricId: string | null = m.metric_id;
          if (!metricId && m.slug) {
            metricId = await this.getMetricIdBySlug(sb, m.slug);
          }
          
          if (!metricId) {
            logError('saveTodayMeasurements.metricLookup', { message: 'Could not find metric ID' }, { slug: m.slug, metric_id: m.metric_id });
            return null;
          }

          const base = {
            user_id: session.user.id,
            metric_id: metricId,
            value_numeric: m.value_numeric ?? null,
            value_text: m.value_text ?? null,
            value_bool: m.value_bool ?? null,
            measured_at: `${today}T00:00:00Z`
          };

          return base;
        })
    );

    const measurementsToInsert = measurementsWithIds.filter(Boolean) as Partial<Measurement>[];

    if (measurementsToInsert.length === 0) {
      return { count: 0 };
    }

    const { error } = await sb
      .from('measurements')
      .insert(measurementsToInsert);

    if (error) {
      logError('saveTodayMeasurements.insert', error, { userId: session.user.id, count: measurementsToInsert.length });
      // Check if this is a database migration issue
      if (error.message.includes('relation "measurements" does not exist')) {
        throw new Error('Database migration required. Please run the metrics customization migration in Supabase.');
      }
      throw new Error('Failed to save measurements: ' + error.message);
    }

    return { count: measurementsToInsert.length };
  }

  static async getRecentMeasurements(sb: SupabaseClient, days: number = 7): Promise<MeasurementWithDefinition[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getRecentMeasurements.session', sErr); throw sErr; }
    if (!session) { logError('getRecentMeasurements.auth', { message: 'No session' }); return []; }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await sb
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
      .eq('user_id', session.user.id)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: false });

    if (error) {
      logError('getRecentMeasurements', error, { userId: session.user.id, days });
      throw error;
    }

    return data || [];
  }

  static async getTodaysMeasurements(sb: SupabaseClient): Promise<MeasurementWithDefinition[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getTodaysMeasurements.session', sErr); throw sErr; }
    if (!session) { logError('getTodaysMeasurements.auth', { message: 'No session' }); return []; }

    const today = new Date().toISOString().split('T')[0];
    
    try {
      const { data, error } = await sb
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
        .eq('user_id', session.user.id)
        .gte('measured_at', `${today}T00:00:00`)
        .lte('measured_at', `${today}T23:59:59`)
        .order('measured_at', { ascending: true });

      if (error) {
        logError('getTodaysMeasurements', error, { userId: session.user.id, today });
        throw error;
      }

      return data || [];
    } catch (error) {
      logError('getTodaysMeasurements', error, { userId: session.user.id, today });
      throw error;
    }
  }

  static async getChartData(sb: SupabaseClient, metricSlug: string, days: number = 7): Promise<Array<{ date: string; value: number }>> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getChartData.session', sErr); throw sErr; }
    if (!session) { logError('getChartData.auth', { message: 'No session' }); return []; }

    try {
      // Calculate date range - use a wider range to ensure we get data
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.max(days, 30)); // At least 30 days back

      const { data, error } = await sb
        .from('measurements')
        .select(`
          measured_at,
          value_numeric,
          metric_definitions!inner(
            slug
          )
        `)
        .eq('user_id', session.user.id)
        .eq('metric_definitions.slug', metricSlug)
        .gte('measured_at', startDate.toISOString())
        .lte('measured_at', endDate.toISOString())
        .order('measured_at', { ascending: true });

      if (error) {
        logError('getChartData', error, { userId: session.user.id, metricSlug, days });
        throw error;
      }

      // Transform data for chart
      const transformedData = (data || []).map(measurement => ({
        date: measurement.measured_at.split('T')[0],
        value: measurement.value_numeric || 0
      }));

      return transformedData;
    } catch (error) {
      logError('getChartData', error, { userId: session.user.id, metricSlug, days });
      throw error;
    }
  }

  static async getUserPreferences(sb: SupabaseClient): Promise<UserPreferences> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getUserPreferences.session', sErr); throw sErr; }
    if (!session) { logError('getUserPreferences.auth', { message: 'No session' }); return { 
      user_id: '', 
      timezone: 'UTC', 
      reminders: { daily_email: false }, 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString() 
    }; }

    try {
      const { data, error } = await sb
        .rpc('get_or_create_user_preferences', { user_uuid: session.user.id });

      if (error) {
        logError('getUserPreferences.rpc', error, { userId: session.user.id });
        throw error;
      }

      return data || { reminders: { daily_email: false } };
    } catch (error) {
      // Fallback to direct query if RPC doesn't exist
      if (error instanceof Error && 
          error.message.includes('function get_or_create_user_preferences')) {
        logError('getUserPreferences.fallback', error, { userId: session.user.id });
        
        const { data, error: queryError } = await sb
          .from('user_preferences')
          .select('*')
          .eq('user_id', session.user.id)
          .single();

        if (queryError && queryError.code !== 'PGRST116') {
          logError('getUserPreferences.fallback.query', queryError, { userId: session.user.id });
          throw queryError;
        }

        return data || { reminders: { daily_email: false } };
      }
      throw error;
    }
  }

  static async updateUserPreferences(sb: SupabaseClient, preferences: Partial<UserPreferences>): Promise<void> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('updateUserPreferences.session', sErr); throw sErr; }
    if (!session) { logError('updateUserPreferences.auth', { message: 'No session' }); return; }

    const { error } = await sb
      .from('user_preferences')
      .upsert({
        user_id: session.user.id,
        ...preferences,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      logError('updateUserPreferences', error, { userId: session.user.id });
      throw error;
    }
  }

  /** Utility to build YYYY-MM-DD in local time */
  private static toDate(d: Date) {
    return d.toISOString().slice(0, 10);
  }

  static async getWeeklyProgress(sb: SupabaseClient): Promise<WeeklyProgress[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getWeeklyProgress.session', sErr); throw sErr; }
    if (!session) { logError('getWeeklyProgress.auth', { message: 'No session' }); return []; }

    try {
      const { data, error } = await sb.rpc('get_weekly_progress', {
        target_date: new Date().toISOString().slice(0, 10),
        user_uuid: session.user.id
      });

      if (!error && data) return data;
      // WHY: Don't log RPC errors as they might be expected (function doesn't exist)
      // if (error) logError('getWeeklyProgress.rpc', error, { userId: session.user.id });
    } catch (e) {
      // WHY: Don't log RPC catch errors as they might be expected (function doesn't exist)
      // logError('getWeeklyProgress.rpc.catch', e as any, { userId: session.user.id });
    }

    // Fallback: pull raw measurements + metrics and aggregate in JS
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    try {
      const { data: measurements, error: err1 } = await sb
        .from('measurements')
        .select(`
          measured_at,
          metric_id,
          value_numeric,
          value_text,
          value_bool,
          metric_definitions!inner(
            slug,
            name,
            unit
          )
        `)
        .eq('user_id', session.user.id)
        .gte('measured_at', startDate.toISOString())
        .lte('measured_at', endDate.toISOString())
        .order('measured_at', { ascending: true });

      if (err1) {
        logError('getWeeklyProgress.select.measurements', err1, { userId: session.user.id });
        return [];
      }

      // Aggregate by metric_slug
      const byMetric = new Map<string, any>();
      for (const row of measurements || []) {
        const metricDef = row.metric_definitions as any;
        const metricSlug = metricDef.slug;
        const bucket = byMetric.get(metricSlug) ?? { 
          metric_slug: metricSlug, 
          metric_name: metricDef.name,
          values: [] as any[] 
        };
        
        const value = row.value_numeric ?? row.value_text ?? row.value_bool;
        if (value !== null) {
          bucket.values.push({ 
            date: row.measured_at.split('T')[0], 
            value 
          });
        }
        
        byMetric.set(metricSlug, bucket);
      }

      // Convert to WeeklyProgress format
      const weeklyProgress: WeeklyProgress[] = [];
      for (const [metricSlug, bucket] of byMetric) {
        if (bucket.values.length > 0) {
          const numericValues = bucket.values
            .map((v: any) => typeof v.value === 'number' ? v.value : null)
            .filter((v: any) => v !== null) as number[];
          
          const currentAvg = numericValues.length > 0 
            ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length 
            : null;

          weeklyProgress.push({
            metric_name: bucket.metric_name,
            current_avg: currentAvg,
            target_value: null, // We don't have target values in this fallback
            progress_percent: null
          });
        }
      }

      return weeklyProgress;
    } catch (error) {
      logError('getWeeklyProgress.fallback', error, { userId: session.user.id });
      return [];
    }
  }

  static async updateMetricTarget(sb: SupabaseClient, metricSlug: string, targetValue: number | null): Promise<void> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('updateMetricTarget.session', sErr); throw sErr; }
    if (!session) { logError('updateMetricTarget.auth', { message: 'No session' }); return; }

    // Get metric ID from slug
    const metricId = await this.getMetricIdBySlug(sb, metricSlug);
    if (!metricId) {
      logError('updateMetricTarget.metricLookup', { message: 'Could not find metric ID' }, { slug: metricSlug });
      throw new Error(`Metric not found: ${metricSlug}`);
    }

    const { error } = await sb
      .from('user_metric_settings')
      .upsert({
        user_id: session.user.id,
        metric_id: metricId,
        target_value: targetValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,metric_id' });

    if (error) {
      logError('updateMetricTarget', error, { userId: session.user.id, metricSlug, targetValue });
      throw error;
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

  static async getMeasurementsWithMetrics(sb: SupabaseClient, days: number = 30): Promise<MeasurementWithDefinition[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getMeasurementsWithMetrics.session', sErr); throw sErr; }
    if (!session) { logError('getMeasurementsWithMetrics.auth', { message: 'No session' }); return []; }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await sb
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
      .eq('user_id', session.user.id)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: true });

    if (error) {
      logError('getMeasurementsWithMetrics', error, { userId: session.user.id, days });
      throw error;
    }

    return data || [];
  }

  static async getWeeklyMeasurements(sb: SupabaseClient): Promise<MeasurementWithDefinition[]> {
    const { data: { session }, error: sErr } = await sb.auth.getSession();
    if (sErr) { logError('getWeeklyMeasurements.session', sErr); throw sErr; }
    if (!session) { logError('getWeeklyMeasurements.auth', { message: 'No session' }); return []; }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);

    const { data, error } = await sb
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
      .eq('user_id', session.user.id)
      .gte('measured_at', startDate.toISOString())
      .order('measured_at', { ascending: true });

    if (error) {
      logError('getWeeklyMeasurements', error, { userId: session.user.id });
      throw error;
    }

    return data || [];
  }
}
