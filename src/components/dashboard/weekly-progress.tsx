'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, TrendingUp } from 'lucide-react';
import { WeeklyProgress } from '@/lib/types';
import { Sparkline } from '@/components/charts/sparkline';
import { useState } from 'react';

// Helper function to determine unit based on metric name
function getMetricUnit(metricName: string): string {
  const name = metricName.toLowerCase();
  if (name.includes('weight')) return 'lbs';
  if (name.includes('sleep')) return 'hrs';
  if (name.includes('water')) return 'oz';
  if (name.includes('steps')) return '';
  if (name.includes('waist')) return 'in';
  if (name.includes('bmi')) return '';
  return '';
}

interface WeeklyProgressCardProps {
  weeklyProgress: WeeklyProgress[];
  loading?: boolean;
}

export function WeeklyProgressCard({ weeklyProgress, loading = false }: WeeklyProgressCardProps) {
  const [aggregationType, setAggregationType] = useState<'avg' | 'median'>('avg');

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>This Week</span>
          </CardTitle>
          <CardDescription>Your progress towards weekly goals</CardDescription>
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

  if (weeklyProgress.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>This Week</span>
          </CardTitle>
          <CardDescription>Your progress towards weekly goals</CardDescription>
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

  const getAggregatedValue = (progress: WeeklyProgress) => {
    if (aggregationType === 'avg') {
      return progress.current_avg;
    } else {
      // For median, we'd need the raw data points
      // For now, fall back to average
      return progress.current_avg;
    }
  };

  const getSparklineData = (progress: WeeklyProgress) => {
    // This would come from the actual daily data
    // For now, create mock data based on the progress
    const baseValue = progress.current_avg || 0;
    const targetValue = progress.target_value || 0;
    
    // Generate 7 days of data with some variation
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some realistic variation
      const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
      const value = baseValue * (1 + variation);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, value)
      });
    }
    
    return data;
  };

  const getAnnotations = (progress: WeeklyProgress) => {
    const annotations = [];
    const data = getSparklineData(progress);
    const targetValue = progress.target_value || 0;
    
    // Find days where target was hit
    data.forEach((point, index) => {
      if (point.value >= targetValue * 0.9) { // 90% of target
        annotations.push({
          date: point.date,
          type: 'target' as const
        });
      }
    });
    
    // Find best day
    const bestValue = Math.max(...data.map(d => d.value));
    const bestDay = data.find(d => d.value === bestValue);
    if (bestDay) {
      annotations.push({
        date: bestDay.date,
        type: 'best' as const
      });
    }
    
    return annotations;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>This Week</span>
            </CardTitle>
            <CardDescription>Your progress towards weekly goals</CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-xs font-medium text-muted-foreground">Aggregation:</label>
            <Select value={aggregationType} onValueChange={(value: 'avg' | 'median') => setAggregationType(value)}>
              <SelectTrigger className="w-20 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="avg">Avg</SelectItem>
                <SelectItem value="median">Median</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {weeklyProgress.map((progress, index) => {
            const displayName = progress.metric_name;
            const currentValue = getAggregatedValue(progress);
            const targetValue = progress.target_value;
            const progressPercent = progress.progress_percent;
            const sparklineData = getSparklineData(progress);
            const annotations = getAnnotations(progress);
            const unit = getMetricUnit(progress.metric_name);

            return (
              <div key={index} className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">{displayName}</span>
                  <div className="text-xs text-muted-foreground">
                    {currentValue !== null ? `${currentValue.toFixed(1)}` : 'No data'} / {targetValue}
                  </div>
                </div>
                
                {/* Sparkline */}
                <div className="flex items-center space-x-3">
                  <Sparkline 
                    data={sparklineData}
                    height={32}
                    width={80}
                    showTooltip={true}
                    annotations={annotations}
                    title={displayName}
                    unit={unit}
                    target={targetValue}
                    color={progressPercent && progressPercent > 80 
                      ? '#10B981'
                      : '#2563EB'
                    }
                  />
                  <div className="flex-1">
                    {progressPercent !== null && progressPercent > 0 ? (
                      <div className="space-y-1">
                        <Progress value={Math.min(progressPercent, 100)} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          {progressPercent.toFixed(0)}% of weekly target
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        No data this week
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
