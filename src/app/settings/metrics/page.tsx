'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { MetricToggleList } from '@/components/metrics/metric-toggle-list';
import { MetricDefinition, UserMetricSetting } from '@/lib/types';
import { AppShell } from '@/components/app-shell';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/loading-spinner';

export default function MetricsSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [metrics, setMetrics] = useState<MetricDefinition[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<Record<string, boolean>>({});
  const [targetValues, setTargetValues] = useState<Record<string, number | null>>({});

  useEffect(() => {
    checkAuthAndLoadMetrics();
  }, []);

  const checkAuthAndLoadMetrics = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        router.push('/login');
        return;
      }

      await loadMetrics();
    } catch (error) {
      console.error('Auth check failed:', error);
      router.push('/login');
    }
  };

  const loadMetrics = async () => {
    try {
      // Load all metric definitions
      const { data: metricDefinitions, error: metricsError } = await supabase
        .from('metric_definitions')
        .select('*')
        .order('sort_order, name');

      if (metricsError) {
        console.error('Error loading metrics:', metricsError);
        // Check if this is a database migration issue
        if (metricsError.message.includes('relation "metric_definitions" does not exist')) {
          toast.error('Database migration required. Please run the metrics customization migration in Supabase.');
          setLoading(false);
          return;
        }
        toast.error('Failed to load metrics: ' + metricsError.message);
        setLoading(false);
        return;
      }

      setMetrics(metricDefinitions || []);

      // Load user's current settings
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userSettings, error: settingsError } = await supabase
        .from('user_metric_settings')
        .select('*')
        .eq('user_id', user.id);

      if (settingsError) {
        console.error('Error loading user settings:', settingsError);
        // Check if this is a database migration issue
        if (settingsError.message.includes('relation "user_metric_settings" does not exist')) {
          console.log('User settings table does not exist yet - using defaults');
          // Initialize with default values
          const selected: Record<string, boolean> = {};
          const targets: Record<string, number | null> = {};
          
          metricDefinitions?.forEach(metric => {
            selected[metric.id] = metric.default_enabled;
            targets[metric.id] = null;
          });
          
          setSelectedMetrics(selected);
          setTargetValues(targets);
          setLoading(false);
          return;
        }
        toast.error('Failed to load your settings: ' + settingsError.message);
        setLoading(false);
        return;
      }

      // Initialize selected metrics and target values
      const selected: Record<string, boolean> = {};
      const targets: Record<string, number | null> = {};

      metricDefinitions?.forEach(metric => {
        const userSetting = userSettings?.find(s => s.metric_id === metric.id);
        selected[metric.id] = userSetting?.enabled ?? metric.default_enabled;
        targets[metric.id] = userSetting?.target_value ?? null;
      });

      setSelectedMetrics(selected);
      setTargetValues(targets);
    } catch (error) {
      console.error('Error loading metrics:', error);
      toast.error('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleMetricToggle = (metricId: string, enabled: boolean) => {
    setSelectedMetrics(prev => ({
      ...prev,
      [metricId]: enabled
    }));
  };

  const handleTargetChange = (metricId: string, target: number | null) => {
    setTargetValues(prev => ({
      ...prev,
      [metricId]: target
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('User not authenticated');
        return;
      }

      // Prepare settings to save
      const settingsToSave: Partial<UserMetricSetting>[] = metrics.map(metric => ({
        user_id: user.id,
        metric_id: metric.id,
        enabled: selectedMetrics[metric.id] || false,
        target_value: targetValues[metric.id] || null
      }));

      // Upsert all settings
      const { error: upsertError } = await supabase
        .from('user_metric_settings')
        .upsert(settingsToSave, { onConflict: 'user_id,metric_id' });

      if (upsertError) {
        console.error('Error saving settings:', upsertError);
        toast.error('Failed to save settings');
        return;
      }

      toast.success('Settings saved successfully!');
      
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-muted-foreground">Loading metrics...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        <MetricToggleList
          metrics={metrics}
          selectedMetrics={selectedMetrics}
          targetValues={targetValues}
          onMetricToggle={handleMetricToggle}
          onTargetChange={handleTargetChange}
          onSave={handleSave}
          saving={saving}
        />
      </div>
    </AppShell>
  );
}
