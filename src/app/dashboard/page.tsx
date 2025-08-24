'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { AppShell } from '@/components/app-shell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MetricInput } from '@/components/metrics/metric-input';
import { SubmitBar } from '@/components/submit-bar';
import { EmptyState } from '@/components/empty-state';
import { LoadingSpinner } from '@/components/loading-spinner';
import { WeeklyProgressCard } from '@/components/dashboard/weekly-progress';
import { WeeklyPlanCard } from '@/components/dashboard/weekly-plan';
import { HeroStats } from '@/components/dashboard/hero-stats';
import { ChartContainer } from '@/components/charts';
import { useMetricsSetup } from '@/lib/hooks/use-metrics-setup';
import { MetricsService } from '@/lib/services/metrics-service';
import { InsightsService } from '@/lib/services/insights-service';
import { ensureProfile, getProfile } from '@/lib/services/profile-service';
import { UserEnabledMetric, MetricValue, MeasurementWithDefinition, WeeklyProgress, AIInsight } from '@/lib/types';
import type { Profile } from '@/lib/types/profile';
import { TrendingUp, Plus, Activity, Settings, Clock } from 'lucide-react';
import Link from 'next/link';
import { MigrationRequired } from '@/components/migration-required';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logError } from '@/lib/errors';

export default function DashboardPage() {
  const { loading: setupLoading, hasConfiguredMetrics } = useMetricsSetup();
  const [loading, setLoading] = useState(true);


  const [profile, setProfile] = useState<Profile | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dynamic metrics state
  const [enabledMetrics, setEnabledMetrics] = useState<UserEnabledMetric[]>([]);
  const [form, setForm] = useState<Record<string, any>>({});
  const [recentMeasurements, setRecentMeasurements] = useState<MeasurementWithDefinition[]>([]);
  const [todaysMeasurements, setTodaysMeasurements] = useState<MeasurementWithDefinition[]>([]);

  // Weekly progress and plan state
  const [weeklyProgress, setWeeklyProgress] = useState<WeeklyProgress[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<AIInsight | null>(null);
  const [weeklyLoading, setWeeklyLoading] = useState(false);

  // Insights state
  const [insights, setInsights] = useState<any>(null);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState<string | null>(null);

  // Recent entries sorting state
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [entriesLimit, setEntriesLimit] = useState(10);
  const [selectedMetricFilter, setSelectedMetricFilter] = useState<string>('all');
  
  // Save state management
  const [hasChanges, setHasChanges] = useState(false);
  const [savedState, setSavedState] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Hero stats state
  const [heroStats, setHeroStats] = useState({
    weeklyAvg: null as number | null,
    weightDelta: null as number | null,
    sleepAvg: null as number | null,
    currentStreak: 0
  });

  // Load the current user, their profile, and enabled metrics
  useEffect(() => {
    let cancelled = false;
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.warn('Dashboard load timeout - forcing completion');
        setLoading(false);
      }
    }, 10000); // 10 second timeout
    
    const load = async () => {
      try {
        setLoading(true);
        setErr(null);

        const supabase = createSupabaseBrowser();
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData.user) {
          if (!cancelled) {
            setErr('Authentication error. Please try refreshing the page.');
            setLoading(false);
          }
          return;
        }

        const uid = userData.user.id;
        setUserId(uid);

        // Load user profile
        try {
          const profile = await getProfile(supabase);
          if (!cancelled && profile) {
            setProfile(profile);
          } else if (!cancelled) {
            console.warn('No profile returned, continuing without profile');
          }
        } catch (profileError) {
          // Don't fail the entire dashboard load for profile errors
          if (!cancelled) {
            console.warn('Profile loading failed, continuing without profile:', profileError);
          }
        }

        // Load enabled metrics and recent measurements
        try {
          await loadEnabledMetrics(supabase);
          await loadRecentMeasurements(supabase);
          await loadTodaysMeasurements(supabase);
          await loadWeeklyData(supabase);
          await calculateHeroStats(supabase);
        } catch (error) {
          if (!cancelled) {
            console.warn('Dashboard data loading error:', error);
            setErr('Failed to load dashboard data. Please try refreshing the page.');
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Dashboard load error:', error);
          setErr('Failed to load dashboard. Please try refreshing the page.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, []);

  const loadEnabledMetrics = async (supabase: any) => {
    try {
      const metrics = await MetricsService.getUserEnabledMetrics(supabase);
      setEnabledMetrics(metrics);
      
      // Initialize form values using metric.slug as keys
      const initialForm: Record<string, any> = {};
      metrics.forEach(metric => {
        initialForm[metric.slug || ''] = null;
      });
      setForm(initialForm);
    } catch (error) {
      console.warn('Error loading enabled metrics:', error);
      throw error;
    }
  };

  const loadRecentMeasurements = async (supabase: any) => {
    try {
      const measurements = await MetricsService.getRecentMeasurements(supabase, entriesLimit);
      // Apply current sort order
      const sorted = [...measurements].sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime();
        } else {
          return new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime();
        }
      });
      setRecentMeasurements(sorted);
    } catch (error) {
      console.warn('Error loading recent measurements:', error);
      throw error;
    }
  };

  const loadTodaysMeasurements = async (supabase: any) => {
    try {
      const measurements = await MetricsService.getTodaysMeasurements(supabase);
      setTodaysMeasurements(measurements);
      
      // WHY: Don't pre-fill form with today's measurements - start with blank fields
      // The form will be initialized with null values in loadEnabledMetrics
    } catch (error) {
      console.warn('Error loading today\'s measurements:', error);
      throw error;
    }
  };

  const loadWeeklyData = async (supabase: any) => {
    try {
      setWeeklyLoading(true);
      
      // Load weekly progress
      try {
        const progress = await MetricsService.getWeeklyProgress(supabase);
        setWeeklyProgress(progress);
      } catch (progressError) {
        console.warn('Weekly progress loading failed:', progressError);
        setWeeklyProgress([]); // WHY: Set empty array instead of breaking
      }
      
      // Load weekly plan (get last Monday's plan)
      try {
        const { data: lastMonday } = await supabase.rpc('get_last_monday');
        if (lastMonday) {
          const plan = await InsightsService.getAIInsight(supabase, lastMonday);
          setWeeklyPlan(plan);
        }
      } catch (planError) {
        console.warn('Weekly plan loading failed:', planError);
        // WHY: Weekly plan is optional - don't break the dashboard
      }
    } catch (error) {
      console.warn('Weekly data loading failed:', error);
      // WHY: Don't throw error for weekly data - it's optional
      setWeeklyProgress([]);
    } finally {
      setWeeklyLoading(false);
    }
  };

  const calculateHeroStats = async (supabase: any) => {
    if (!userId) return;
    
    try {
      // Get last 7 days of measurements
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const { data: measurements, error } = await supabase
        .from('measurements')
        .select(`
          measured_at,
          value_numeric,
          metric_definitions!inner(
            slug,
            name
          )
        `)
        .eq('user_id', userId)
        .gte('measured_at', startDate.toISOString())
        .lte('measured_at', endDate.toISOString())
        .order('measured_at', { ascending: true });

      if (error) {
        console.warn('Error fetching measurements for hero stats:', error);
        return;
      }

      if (!measurements || measurements.length === 0) {
        console.log('No measurements found for hero stats');
        return;
      }

      // Calculate weekly average (all numeric metrics)
      const numericValues = measurements
        .filter((m: any) => m.value_numeric !== null)
        .map((m: any) => m.value_numeric);
      const weeklyAvg = numericValues.length > 0 
        ? numericValues.reduce((sum: number, val: number) => sum + val, 0) / numericValues.length 
        : null;

      // Calculate weight delta (comparing first and last weight entries)
      const weightMeasurements = measurements
        .filter((m: any) => m.metric_definitions.slug === 'weight')
        .sort((a: any, b: any) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime());
      
      let weightDelta = null;
      if (weightMeasurements.length >= 2) {
        const firstWeight = weightMeasurements[0].value_numeric;
        const lastWeight = weightMeasurements[weightMeasurements.length - 1].value_numeric;
        weightDelta = lastWeight - firstWeight;
      }

      // Calculate sleep average
      const sleepMeasurements = measurements
        .filter((m: any) => m.metric_definitions.slug === 'sleep_hours')
        .map((m: any) => m.value_numeric);
      const sleepAvg = sleepMeasurements.length > 0 
        ? sleepMeasurements.reduce((sum: number, val: number) => sum + val, 0) / sleepMeasurements.length 
        : null;

      // Calculate current streak (consecutive days with any measurement)
      const uniqueDays = new Set(
        measurements.map((m: any) => m.measured_at.split('T')[0])
      );
      const sortedDays = Array.from(uniqueDays).sort().reverse();
      
      let currentStreak = 0;
      const today = new Date().toISOString().split('T')[0];
      let checkDate = today;
      
      for (let i = 0; i < 30; i++) { // Check up to 30 days back
        const dateStr = new Date(checkDate).toISOString().split('T')[0];
        if (sortedDays.includes(dateStr)) {
          currentStreak++;
          // Move to previous day
          const prevDate = new Date(checkDate);
          prevDate.setDate(prevDate.getDate() - 1);
          checkDate = prevDate.toISOString().split('T')[0];
        } else {
          break;
        }
      }

      setHeroStats({
        weeklyAvg,
        weightDelta,
        sleepAvg,
        currentStreak
      });
    } catch (error) {
      console.warn('Error calculating hero stats:', error);
    }
  };

  const handleMetricChange = (metricSlug: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [metricSlug]: value
    }));
    setHasChanges(true);
    setSavedState(false);
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
  };

  const handleInputBlur = () => {
    // Delay hiding the sticky bar to allow for save button clicks
    setTimeout(() => setIsInputFocused(false), 100);
  };

  const generateWeeklyPlan = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/plan/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // WHY: Include authentication cookies
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in again.');
        } else if (errorData.reason === 'not_enough_data') {
          throw new Error('Add a few more days of entries to generate a weekly plan. We need at least 5 days of data.');
        } else if (errorData.reason === 'no_openai_key') {
          throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.');
        } else {
          throw new Error(errorData.message || 'Failed to generate weekly plan');
        }
      }

      const plan = await response.json();
      
      // Get last Monday's date for storage
      const supabase = createSupabaseBrowser();
      const { data: lastMonday } = await supabase.rpc('get_last_monday');
      const planDate = lastMonday || new Date().toISOString().split('T')[0];
      
      // Save the plan
      await InsightsService.saveAIInsight(supabase, planDate, plan);
      
      // Update local state
      setWeeklyPlan({
        id: 'temp-id',
        user_id: userId,
        day: planDate,
        summary: plan.summary,
        actions: plan.actions,
        risk_flags: plan.risk_flags,
        created_at: new Date().toISOString()
      });
      
      return plan;
    } catch (error) {
      console.warn('Error generating weekly plan:', error);
      throw error;
    }
  };

  const generateInsights = async () => {
    if (!userId) return;
    
    setInsightsLoading(true);
    setInsightsError(null);
    
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // WHY: Include authentication cookies
      });

      const result = await response.json();

      if (!result.ok) {
        if (result.reason === 'not_authenticated') {
          setInsightsError('Authentication required. Please log in again.');
        } else if (result.reason === 'not_enough_data') {
          setInsightsError('Add a few more days of entries to generate insights. We need at least 5 days of data.');
        } else if (result.reason === 'no_openai_key') {
          setInsightsError('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.');
        } else if (result.reason === 'usage_limit_exceeded') {
          setInsightsError(result.message || 'Daily usage limit exceeded. Please try again tomorrow.');
        } else {
          setInsightsError(result.message || 'Failed to generate insights');
        }
        return;
      }

      setInsights(result);
      toast.success('Insights generated successfully!');
    } catch (error) {
      console.warn('Error generating insights:', error);
      setInsightsError('Failed to generate insights. Please try again.');
      toast.error('Failed to generate insights');
    } finally {
      setInsightsLoading(false);
    }
  };

  const saveMetrics = async () => {
    if (!userId) return;
    
    setSaving(true);
    setErr(null);
    setFieldErrors({});

    try {
      const supabase = createSupabaseBrowser();
      const measurements: MetricValue[] = enabledMetrics
        .map(metric => {
          const metricSlug = metric.slug || '';
          const value = form[metricSlug];
          if (value === null || value === undefined || value === '') {
            return null;
          }

          let measurement: MetricValue = {
            metric_id: metric.id,
            slug: metricSlug
          };

          switch (metric.input_kind) {
            case 'number':
            case 'integer':
              const numValue = parseFloat(value);
              if (isNaN(numValue)) {
                setFieldErrors(prev => ({ ...prev, [metricSlug]: 'Please enter a valid number' }));
                return null;
              }
              measurement.value_numeric = numValue;
              break;
            case 'text':
              measurement.value_text = value;
              break;
            case 'boolean':
              measurement.value_bool = Boolean(value);
              break;
            case 'pair':
              if (metricSlug === 'blood_pressure' && value && typeof value === 'object') {
                // Blood pressure is stored as {systolic: number, diastolic: number}
                measurement.value_numeric = value.systolic;
                measurement.value_text = value.diastolic.toString();
              } else if (Array.isArray(value) && value.length === 2) {
                // Generic pair handling for other pair types
                measurement.value_numeric = value[0];
                measurement.value_text = value[1].toString();
              }
              break;
            case 'scale':
              measurement.value_numeric = parseInt(value);
              break;
          }

          return measurement;
        })
        .filter(Boolean) as MetricValue[];

      if (measurements.length === 0) {
        toast.error('Please enter at least one metric value');
        return;
      }

      await MetricsService.saveTodayMeasurements(supabase, measurements);
      
      // Success notification with details
      const savedCount = measurements.length;
      const metricNames = measurements.map(m => {
        const metric = enabledMetrics.find(em => em.slug === m.slug);
        return metric?.name || m.slug;
      }).join(', ');
      
      toast.success(`Saved ${savedCount} metric${savedCount > 1 ? 's' : ''}: ${metricNames}`, {
        description: 'Your health data has been recorded successfully!',
        duration: 4000
      });
      
      // Clear form and reload data
      const initialForm: Record<string, any> = {};
      enabledMetrics.forEach(metric => {
        initialForm[metric.slug || ''] = null;
      });
      setForm(initialForm);
      setHasChanges(false);
      setSavedState(true);
      
      // Auto-hide saved state after 3 seconds
      setTimeout(() => setSavedState(false), 3000);
      
      await Promise.all([
        loadRecentMeasurements(supabase),
        loadTodaysMeasurements(supabase),
        loadWeeklyData(supabase),
        calculateHeroStats(supabase)
      ]);
    } catch (error) {
      console.warn('Error saving metrics:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save metrics';
      setErr(errorMessage);
      toast.error('Failed to save metrics', {
        description: errorMessage,
        duration: 5000
      });
    } finally {
      setSaving(false);
    }
  };

  // Show loading while checking metrics setup
  if (setupLoading || loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size={20} />
            <span className="text-gray-700">Loading...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Show error if no metrics configured
  if (!hasConfiguredMetrics) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto">
              <Settings className="w-8 h-8 text-primary-foreground" />
            </div>
            <h2 className="text-xl font-semibold">Setup Required</h2>
            <p className="text-gray-700 max-w-md">
              You need to configure which health metrics you'd like to track. 
              This will only take a moment.
            </p>
            <Button asChild>
              <Link href="/settings/metrics">
                Configure Metrics
              </Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  // Show migration required if database migration is needed
  if (err && err.includes('Database migration required')) {
    return (
      <AppShell>
        <MigrationRequired />
      </AppShell>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  // Get unique metrics from recent measurements for filtering
  const getAvailableMetricsForFilter = () => {
    const uniqueMetrics = new Map<string, string>();
    recentMeasurements.forEach(measurement => {
      const metricName = MetricsService.getMeasurementDisplayName(measurement);
      const metricSlug = measurement.metric_definitions.slug;
      if (metricSlug) { // Only add metrics with valid slugs
        uniqueMetrics.set(metricSlug, metricName);
      }
    });
    return Array.from(uniqueMetrics.entries()).map(([slug, name]) => ({ slug, name }));
  };

  // Filter and sort measurements
  const getFilteredAndSortedMeasurements = () => {
    let filtered = recentMeasurements;
    
    // Apply metric filter
    if (selectedMetricFilter !== 'all') {
      filtered = filtered.filter(measurement => 
        measurement.metric_definitions.slug === selectedMetricFilter
      );
    }
    
    // Apply sort order
    return filtered.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b.measured_at).getTime() - new Date(a.measured_at).getTime();
      } else {
        return new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime();
      }
    });
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <AppShell>
        <div className="px-6 py-6">
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner className="mr-2" />
            <span>Loading...</span>
          </div>
        </div>
      </AppShell>
    );
  }

  // Show error if not authenticated
  if (!userId) {
    return (
      <AppShell>
        <div className="px-6 py-6">
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-red-600 text-sm">Please log in to access the dashboard.</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 py-6">
        {err && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200">
            <p className="text-red-600 text-sm">{err}</p>
          </div>
        )}

        {!err && (
          <>
            {/* Hero Stats Overview */}
            <HeroStats 
              weeklyAvg={heroStats.weeklyAvg}
              weightDelta={heroStats.weightDelta}
              sleepAvg={heroStats.sleepAvg}
              currentStreak={heroStats.currentStreak}
            />

            <div className="space-y-6">
              {/* Weekly Progress and Plan Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <WeeklyProgressCard 
                  weeklyProgress={weeklyProgress} 
                  loading={weeklyLoading} 
                />
                <WeeklyPlanCard 
                  weeklyPlan={weeklyPlan}
                  onRegenerate={generateWeeklyPlan}
                  loading={weeklyLoading}
                />
              </div>

              {/* Main Content - Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Today's Metrics Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Activity className="h-5 w-5" />
                        <span>Today's Metrics</span>
                      </CardTitle>
                      <CardDescription>
                        Track your daily health data ({enabledMetrics.length} metrics enabled)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {enabledMetrics.length === 0 ? (
                        <EmptyState 
                          icon={Activity} 
                          title="No Metrics Configured"
                          message="Configure your metrics in settings to start tracking your health data."
                          variant="illustration"
                          action={
                            <Button asChild>
                              <Link href="/settings/metrics">
                                Configure Metrics
                              </Link>
                            </Button>
                          }
                        />
                      ) : (
                        <form onSubmit={(e) => { e.preventDefault(); saveMetrics(); }} className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {enabledMetrics.map((metric) => {
                              const metricKey = metric.slug || metric.id || `metric-${metric.id || 'unknown'}`;
                              return (
                                <div key={metricKey} className={metric.input_kind === 'text' ? 'md:col-span-2' : ''}>
                                  <MetricInput
                                    metric={metric}
                                    value={form[metric.slug || '']}
                                    onChange={(value) => handleMetricChange(metric.slug || '', value)}
                                    onFocus={handleInputFocus}
                                    onBlur={handleInputBlur}
                                    error={fieldErrors[metric.slug || '']}
                                  />
                                </div>
                              );
                            })}
                          </div>
                          <SubmitBar 
                            hasChanges={hasChanges} 
                            savedState={savedState} 
                            onSave={saveMetrics} 
                            isInputFocused={isInputFocused}
                          />
                        </form>
                      )}
                    </CardContent>
                  </Card>

                  {/* AI Insights Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5" />
                        <span>AI Health Insights</span>
                      </CardTitle>
                      <CardDescription>
                        Get personalized insights and recommendations based on your health data
                      </CardDescription>
                      {insights?.usage && (
                        <div className="text-xs text-gray-700">
                          Used {insights.usage.todayCount}/{insights.usage.dailyLimit} today
                          {insights.cached && <span className="ml-2 text-blue-600">(cached)</span>}
                        </div>
                      )}
                    </CardHeader>
                    <CardContent>
                      {insightsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <LoadingSpinner className="mr-2" />
                          <span>Generating insights...</span>
                        </div>
                      ) : insightsError ? (
                        <div className="space-y-4">
                          <div className="p-4 rounded-2xl bg-red-50 border border-red-200">
                            <p className="text-red-600 text-sm">{insightsError}</p>
                          </div>
                          <Button onClick={generateInsights} disabled={insightsLoading}>
                            Try Again
                          </Button>
                        </div>
                      ) : insights ? (
                        <div className="space-y-6">
                          {/* Summary */}
                          <div>
                            <h4 className="font-medium mb-2 text-gray-900">Summary</h4>
                            <p className="text-sm text-gray-700">{insights.insights.summary}</p>
                          </div>
                          
                          {/* Recommendations */}
                          {insights.insights.recommendations && insights.insights.recommendations.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-gray-900">Recommendations</h4>
                              <ul className="space-y-1">
                                {insights.insights.recommendations.map((rec: string, index: number) => (
                                  <li key={`rec-${index}-${rec.substring(0, 20).replace(/\s+/g, '-')}`} className="text-sm text-gray-700 flex items-start">
                                    <span className="mr-2">•</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {/* Observations */}
                          {insights.insights.observations && insights.insights.observations.length > 0 && (
                            <div>
                              <h4 className="font-medium mb-2 text-gray-900">Observations</h4>
                              <ul className="space-y-1">
                                {insights.insights.observations.map((obs: string, index: number) => (
                                  <li key={`obs-${index}-${obs.substring(0, 20).replace(/\s+/g, '-')}`} className="text-sm text-gray-700 flex items-start">
                                    <span className="mr-2">•</span>
                                    {obs}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          <Button onClick={generateInsights} disabled={insightsLoading}>
                            Regenerate Insights
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-gray-700 mb-4">
                            Generate AI-powered insights based on your health data patterns
                          </p>
                          <Button onClick={generateInsights} disabled={insightsLoading}>
                            Generate Insights
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Trend Charts Section */}
                  {userId && enabledMetrics.length > 0 && (
                    <ChartContainer 
                      userId={userId}
                      enabledMetrics={enabledMetrics}
                    />
                  )}

                  {/* Recent Entries Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Clock className="h-5 w-5" />
                        <span>Recent Entries</span>
                      </CardTitle>
                      <CardDescription>
                        Your latest health measurements
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {recentMeasurements.length === 0 ? (
                        <EmptyState 
                          icon={Clock} 
                          title="No Recent Entries"
                          message="Start tracking your health metrics to see your recent entries here."
                          variant="illustration"
                          action={
                            <Button onClick={() => document.getElementById('today-metrics')?.scrollIntoView({ behavior: 'smooth' })}>
                              Add Today's Metrics
                            </Button>
                          }
                        />
                      ) : (
                        <div className="space-y-4">
                          {/* Sort and Filter Controls */}
                          <div className="flex flex-wrap gap-2 items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Select value={sortOrder} onValueChange={(value: string) => setSortOrder(value as 'newest' | 'oldest')}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="newest">Newest First</SelectItem>
                                  <SelectItem value="oldest">Oldest First</SelectItem>
                                </SelectContent>
                              </Select>

                              <Select value={selectedMetricFilter} onValueChange={setSelectedMetricFilter}>
                                <SelectTrigger className="w-32 h-8 text-xs">
                                  <SelectValue placeholder="All Metrics" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="all">All Metrics</SelectItem>
                                  {getAvailableMetricsForFilter().map((metric) => (
                                    <SelectItem key={metric.slug || `filter-${metric.name}`} value={metric.slug}>
                                      {metric.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>

                              {selectedMetricFilter !== 'all' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => setSelectedMetricFilter('all')}
                                  className="h-8 text-xs"
                                >
                                  Clear Filter
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Entries List */}
                          <div className="max-h-96 overflow-y-auto space-y-2">
                            {getFilteredAndSortedMeasurements().slice(0, entriesLimit).map((measurement, index) => (
                              <div key={`${measurement.id}-${measurement.measured_at}-${index}`} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">
                                      {MetricsService.getMeasurementDisplayName(measurement)}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      {formatDate(measurement.measured_at)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-sm font-medium text-gray-900">
                                  {measurement.value_numeric} {measurement.metric_definitions.unit}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Load More Button */}
                          {getFilteredAndSortedMeasurements().length > entriesLimit && (
                            <div className="text-center pt-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setEntriesLimit(prev => prev + 10)}
                              >
                                Load More
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
