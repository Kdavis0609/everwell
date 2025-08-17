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
import { ChartContainer } from '@/components/charts';
import { useMetricsSetup } from '@/lib/hooks/use-metrics-setup';
import { MetricsService } from '@/lib/services/metrics-service';
import { InsightsService } from '@/lib/services/insights-service';
import { ensureProfile, getProfile } from '@/lib/services/profile-service';
import { UserEnabledMetric, MetricValue, MeasurementWithDefinition, WeeklyProgress, AIInsight } from '@/lib/types';
import type { Profile } from '@/lib/types/profile';
import { TrendingUp, Plus, Activity, Settings } from 'lucide-react';
import Link from 'next/link';
import { MigrationRequired } from '@/components/migration-required';

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

  // Load the current user, their profile, and enabled metrics
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr(null);

      const supabase = createSupabaseBrowser();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setErr('Not signed in. Redirecting to login…');
        setTimeout(() => (window.location.href = '/login'), 800);
        setLoading(false);
        return;
      }

      const uid = userData.user.id;
      setUserId(uid);

      // Load user profile
      try {
        let profile = await getProfile(supabase);
        
        if (!profile) {
          // No profile found - create one automatically
          console.log('No profile found for user, creating one automatically');
          await ensureProfile(supabase);
          profile = await getProfile(supabase);
        }
        
        setProfile(profile);
      } catch (error) {
        console.error('Profile loading error:', error);
        toast.error('Failed to load user profile. Please try refreshing the page.');
      }

      // Load enabled metrics and recent measurements
      try {
        await Promise.all([
          loadEnabledMetrics(supabase),
          loadRecentMeasurements(supabase),
          loadTodaysMeasurements(supabase),
          loadWeeklyData(supabase)
        ]);
      } catch (error) {
        console.error('Error loading metrics data:', error);
        // Check if this is a database migration issue
        if (error instanceof Error && error.message.includes('relation "metric_definitions" does not exist')) {
          setErr('Database migration required. Please run the metrics customization migration in Supabase.');
        } else {
          setErr('Failed to load metrics data. Please try refreshing the page.');
        }
      }

      setLoading(false);
    };

    load();
  }, []);

  const loadEnabledMetrics = async (supabase: any) => {
    try {
      const metrics = await MetricsService.getUserEnabledMetrics(supabase);
      setEnabledMetrics(metrics);
      
      // Initialize form values using metric.slug as keys
      const initialForm: Record<string, any> = {};
      metrics.forEach(metric => {
        initialForm[metric.slug] = null;
      });
      setForm(initialForm);
    } catch (error) {
      console.error('Error loading enabled metrics:', error);
      throw error;
    }
  };

  const loadRecentMeasurements = async (supabase: any) => {
    try {
      const measurements = await MetricsService.getRecentMeasurements(supabase, 10);
      setRecentMeasurements(measurements);
    } catch (error) {
      console.error('Error loading recent measurements:', error);
      throw error;
    }
  };

  const loadTodaysMeasurements = async (supabase: any) => {
    try {
      const measurements = await MetricsService.getTodaysMeasurements(supabase);
      setTodaysMeasurements(measurements);
      
      // Pre-fill form with today's measurements
      const todayValues: Record<string, any> = {};
      measurements.forEach(measurement => {
        // Handle blood pressure specially - reconstruct object from stored values
        if (measurement.metric_definitions.slug === 'blood_pressure' && measurement.value_numeric !== null && measurement.value_text !== null) {
          todayValues[measurement.metric_definitions.slug] = {
            systolic: measurement.value_numeric,
            diastolic: parseFloat(measurement.value_text)
          };
        } else if (measurement.value_numeric !== null) {
          todayValues[measurement.metric_definitions.slug] = measurement.value_numeric;
        } else if (measurement.value_text !== null) {
          todayValues[measurement.metric_definitions.slug] = measurement.value_text;
        } else if (measurement.value_bool !== null) {
          todayValues[measurement.metric_definitions.slug] = measurement.value_bool;
        }
      });
      setForm(prev => ({ ...prev, ...todayValues }));
    } catch (error) {
      console.error('Error loading today\'s measurements:', error);
      throw error;
    }
  };

  const loadWeeklyData = async (supabase: any) => {
    try {
      setWeeklyLoading(true);
      
      // Load weekly progress
      const progress = await MetricsService.getWeeklyProgress(supabase);
      setWeeklyProgress(progress);
      
      // Load weekly plan (get last Monday's plan)
      const { data: lastMonday } = await supabase.rpc('get_last_monday');
      if (lastMonday) {
        const plan = await InsightsService.getAIInsight(supabase, lastMonday);
        setWeeklyPlan(plan);
      }
    } catch (error) {
      console.error('Error loading weekly data:', error);
      // Don't throw error for weekly data - it's optional
    } finally {
      setWeeklyLoading(false);
    }
  };

  const handleMetricChange = (metricSlug: string, value: any) => {
    setForm(prev => ({
      ...prev,
      [metricSlug]: value
    }));
  };

  const generateWeeklyPlan = async () => {
    if (!userId) return;
    
    try {
      const response = await fetch('/api/plan/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate weekly plan');
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
      console.error('Error generating weekly plan:', error);
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
      });

      const result = await response.json();

      if (!result.ok) {
        if (result.reason === 'not_enough_data') {
          setInsightsError('Add a few more days of entries to generate insights. We need at least 5 days of data.');
        } else if (result.reason === 'no_openai_key') {
          setInsightsError('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.');
        } else {
          setInsightsError(result.message || 'Failed to generate insights');
        }
        return;
      }

      setInsights(result);
      toast.success('Insights generated successfully!');
    } catch (error) {
      console.error('Error generating insights:', error);
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

    try {
      const supabase = createSupabaseBrowser();
      const measurements: MetricValue[] = enabledMetrics
        .map(metric => {
          const value = form[metric.slug];
          if (value === null || value === undefined || value === '') {
            return null;
          }

          let measurement: MetricValue = {
            metric_id: metric.id,
            slug: metric.slug
          };

          switch (metric.input_kind) {
            case 'number':
            case 'integer':
              measurement.value_numeric = parseFloat(value);
              break;
            case 'text':
              measurement.value_text = value;
              break;
            case 'boolean':
              measurement.value_bool = Boolean(value);
              break;
            case 'pair':
              if (metric.slug === 'blood_pressure' && value && typeof value === 'object') {
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
      
      toast.success('Today\'s metrics saved successfully!');
      
      // Clear form and reload data
      const initialForm: Record<string, any> = {};
      enabledMetrics.forEach(metric => {
        initialForm[metric.slug] = null;
      });
      setForm(initialForm);
      
      await Promise.all([
        loadRecentMeasurements(supabase),
        loadTodaysMeasurements(supabase),
        loadWeeklyData(supabase)
      ]);
    } catch (error) {
      console.error('Error saving metrics:', error);
      setErr(error instanceof Error ? error.message : 'Failed to save metrics');
      toast.error('Failed to save metrics');
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
            <span className="text-muted-foreground">Loading...</span>
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
            <p className="text-muted-foreground max-w-md">
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

  return (
    <AppShell>
      {err && (
        <div className="mb-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-destructive text-sm">{err}</p>
        </div>
      )}

      {!err && (
        <div className="space-y-6">
          {/* Weekly Progress and Plan Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            </CardHeader>
            <CardContent>
              {insightsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner className="mr-2" />
                  <span>Generating insights...</span>
                </div>
              ) : insightsError ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-destructive text-sm">{insightsError}</p>
                  </div>
                  <Button onClick={generateInsights} disabled={insightsLoading}>
                    Try Again
                  </Button>
                </div>
              ) : insights ? (
                <div className="space-y-6">
                  {/* Summary */}
                  <div>
                    <h4 className="font-medium mb-2">Summary</h4>
                    <p className="text-sm text-muted-foreground">{insights.insights.summary}</p>
                  </div>
                  
                  {/* Recommendations */}
                  {insights.insights.recommendations && insights.insights.recommendations.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Recommendations</h4>
                      <ul className="space-y-1">
                        {insights.insights.recommendations.map((rec: string, index: number) => (
                          <li key={`rec-${index}-${rec.substring(0, 20)}`} className="text-sm text-muted-foreground flex items-start">
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
                      <h4 className="font-medium mb-2">Observations</h4>
                      <ul className="space-y-1">
                        {insights.insights.observations.map((obs: string, index: number) => (
                          <li key={`obs-${index}-${obs.substring(0, 20)}`} className="text-sm text-muted-foreground flex items-start">
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
                  <p className="text-muted-foreground mb-4">
                    Generate personalized insights based on your health data
                  </p>
                  <Button onClick={generateInsights} disabled={insightsLoading}>
                    Generate Insights
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Trend Charts Section */}
          {userId && enabledMetrics.length > 0 && (
            <ChartContainer 
              userId={userId}
              enabledMetrics={enabledMetrics}
            />
          )}

          {/* Today's Metrics and Recent Entries Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Today's Metrics Card */}
            <div className="lg:col-span-8">
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
                      message="No metrics enabled. Configure your metrics in settings." 
                    />
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); saveMetrics(); }} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {enabledMetrics.map((metric) => {
                          return (
                            <div key={metric.slug ?? metric.id} className={metric.input_kind === 'text' ? 'md:col-span-2' : ''}>
                              <MetricInput
                                key={metric.slug ?? metric.id}
                                metric={metric}
                                value={form[metric.slug]}
                                onChange={(value) => handleMetricChange(metric.slug, value)}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <SubmitBar>
                        <Button type="submit" disabled={saving}>
                          {saving ? (
                            <>
                              <LoadingSpinner className="mr-2" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Save Today's Metrics
                            </>
                          )}
                        </Button>
                      </SubmitBar>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Right: Recent Measurements */}
            <div className="lg:col-span-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <TrendingUp className="h-5 w-5" />
                    <span>Recent Entries</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {recentMeasurements.length === 0 ? (
                    <EmptyState 
                      icon={Activity} 
                      message="No measurements logged yet. Start tracking your health today!" 
                    />
                  ) : (
                    <div className="space-y-3">
                      {recentMeasurements.map((measurement) => (
                        <div key={measurement.id} className="p-3 rounded-lg border">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="font-medium text-sm">
                                {MetricsService.getMeasurementDisplayName(measurement)}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {MetricsService.formatMeasurementValue(measurement)}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(measurement.measured_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
