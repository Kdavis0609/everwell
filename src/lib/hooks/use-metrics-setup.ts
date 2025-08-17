'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MetricsService } from '@/lib/services/metrics-service';
import { logError } from '@/lib/logError';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export function useMetricsSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasConfiguredMetrics, setHasConfiguredMetrics] = useState(false);

  useEffect(() => {
    checkMetricsSetup();
  }, []);

  const checkMetricsSetup = async () => {
    try {
      const { data: { user }, error: authError } = await createSupabaseBrowser().auth.getUser();
      
      if (authError || !user) {
        setLoading(false);
        return;
      }

      // Check if user has any enabled metrics
      const { data: userSettings, error: settingsError } = await createSupabaseBrowser()
        .from('user_metric_settings')
        .select('enabled')
        .eq('user_id', user.id)
        .eq('enabled', true)
        .limit(1);

      if (settingsError) {
        console.error('Error checking metrics setup:', settingsError);
        // Check if this is a database migration issue
        if (settingsError.message.includes('relation "user_metric_settings" does not exist')) {
          console.log('Database migration not run yet - treating as no metrics configured');
          setHasConfiguredMetrics(false);
          router.push('/settings/metrics');
        } else {
          // For other errors, just log and continue
          console.log('Error checking metrics setup, continuing...');
        }
        setLoading(false);
        return;
      }

      const hasEnabledMetrics = userSettings && userSettings.length > 0;
      setHasConfiguredMetrics(hasEnabledMetrics);

      // If no metrics are configured, redirect to setup
      if (!hasEnabledMetrics) {
        router.push('/settings/metrics');
      }
    } catch (error) {
      console.error('Error checking metrics setup:', error);
      // Don't redirect on error, just continue
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    hasConfiguredMetrics,
    checkMetricsSetup
  };
}
