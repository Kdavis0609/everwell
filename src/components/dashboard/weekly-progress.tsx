'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { WeeklyProgress } from '@/lib/types';
import { Target, TrendingUp } from 'lucide-react';

interface WeeklyProgressCardProps {
  weeklyProgress: WeeklyProgress[];
  loading?: boolean;
}

export function WeeklyProgressCard({ weeklyProgress, loading = false }: WeeklyProgressCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>This Week</span>
          </CardTitle>
          <CardDescription>Your progress toward weekly goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const metricsWithTargets = weeklyProgress.filter(p => p.target_value !== null);

  if (metricsWithTargets.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>This Week</span>
          </CardTitle>
          <CardDescription>Your progress toward weekly goals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Set target values in your metric settings to see weekly progress
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getMetricDisplayName = (metricName: string): string => {
    const nameMap: Record<string, string> = {
      'weight_lbs': 'Weight',
      'steps': 'Steps',
      'sleep_hours': 'Sleep',
      'water_oz': 'Water',
      'waist_in': 'Waist',
      'bmi': 'BMI'
    };
    return nameMap[metricName] || metricName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getMetricUnit = (metricName: string): string => {
    const unitMap: Record<string, string> = {
      'weight_lbs': 'lbs',
      'steps': 'steps',
      'sleep_hours': 'hrs',
      'water_oz': 'oz',
      'waist_in': 'in',
      'bmi': ''
    };
    return unitMap[metricName] || '';
  };

  const getProgressColor = (progress: number): string => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-yellow-500';
    if (progress >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>This Week</span>
        </CardTitle>
        <CardDescription>Your progress toward weekly goals</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metricsWithTargets.map((progress) => {
            const displayName = getMetricDisplayName(progress.metric_name);
            const unit = getMetricUnit(progress.metric_name);
            const currentValue = progress.current_avg;
            const targetValue = progress.target_value;
            const progressPercent = progress.progress_percent || 0;

            return (
              <div key={progress.metric_name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{displayName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {currentValue !== null ? `${currentValue.toFixed(1)}` : 'No data'} / {targetValue}{unit}
                  </div>
                </div>
                <Progress 
                  value={progressPercent} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground">
                  {progressPercent > 0 ? `${progressPercent.toFixed(0)}% of weekly target` : 'No data this week'}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
