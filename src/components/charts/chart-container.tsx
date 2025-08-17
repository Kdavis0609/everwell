'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendChart } from './trend-chart';
import { TrendingUp, Activity } from 'lucide-react';
import { UserEnabledMetric } from '@/lib/types';
import { MetricsService } from '@/lib/services/metrics-service';
import { createSupabaseBrowser } from '@/lib/supabase/client';

interface ChartContainerProps {
  userId: string;
  enabledMetrics: UserEnabledMetric[];
}

export function ChartContainer({ userId, enabledMetrics }: ChartContainerProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const [selectedRange, setSelectedRange] = useState(7); // Default to 7 days
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [annotations, setAnnotations] = useState<Array<{ date: string; type: 'target' | 'streak' | 'best' }>>([]);
  const [userSelectedMetric, setUserSelectedMetric] = useState(false); // Track if user manually selected

  // Set initial metric
  useEffect(() => {
    if (enabledMetrics.length > 0 && !selectedMetric && !userSelectedMetric) {
      setSelectedMetric(enabledMetrics[0].slug);
    }
  }, [enabledMetrics, selectedMetric, userSelectedMetric]);

  // Load chart data when metric or range changes
  useEffect(() => {
    if (selectedMetric && userId) {
      loadChartData();
    }
  }, [selectedMetric, selectedRange, userId]);

  const handleMetricChange = (metricSlug: string) => {
    setUserSelectedMetric(true); // Mark as user selection
    setSelectedMetric(metricSlug);
  };

  const loadChartData = async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowser();
      
      const data = await MetricsService.getChartData(supabase, selectedMetric, selectedRange);
      
      // Only auto-switch if this is the initial load and no data exists
      // Don't auto-switch if user manually selected a metric
      if (data.length === 0 && enabledMetrics.length > 1 && !userSelectedMetric) {
        // Find first metric with data for initial load
        for (const metric of enabledMetrics) {
          const metricData = await MetricsService.getChartData(supabase, metric.slug, selectedRange);
          if (metricData.length > 0) {
            setSelectedMetric(metric.slug);
            setChartData(metricData);
            
            // Generate annotations
            const newAnnotations = generateAnnotations(metricData, metric.slug);
            setAnnotations(newAnnotations);
            setLoading(false);
            return;
          }
        }
      }
      
      setChartData(data);
      
      // Generate annotations
      const newAnnotations = generateAnnotations(data, selectedMetric);
      setAnnotations(newAnnotations);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
      setAnnotations([]);
    } finally {
      setLoading(false);
    }
  };

  const generateAnnotations = (data: any[], metricSlug: string) => {
    const annotations: Array<{ date: string; type: 'target' | 'streak' | 'best' }> = [];
    
    if (data.length === 0) return annotations;

    // Find best day
    const bestValue = Math.max(...data.map(d => d.value).filter(v => v !== null && !isNaN(v)));
    const bestDay = data.find(d => d.value === bestValue);
    if (bestDay) {
      annotations.push({
        date: bestDay.date,
        type: 'best'
      });
    }

    // Find target hits (assuming target is 80% of best value for demo)
    const targetValue = bestValue * 0.8;
    data.forEach(point => {
      if (point.value >= targetValue) {
        annotations.push({
          date: point.date,
          type: 'target'
        });
      }
    });

    // Find streaks (3+ consecutive days above average)
    const avgValue = data.reduce((sum, d) => sum + (d.value || 0), 0) / data.length;
    let streakCount = 0;
    data.forEach(point => {
      if (point.value >= avgValue) {
        streakCount++;
        if (streakCount >= 3) {
          annotations.push({
            date: point.date,
            type: 'streak'
          });
        }
      } else {
        streakCount = 0;
      }
    });

    return annotations;
  };

  const getMetricUnit = (metricSlug: string) => {
    const metric = enabledMetrics.find(m => m.slug === metricSlug);
    return metric?.unit || '';
  };

  if (enabledMetrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Trends</span>
          </CardTitle>
          <CardDescription>No metrics enabled for tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-600">
            <Activity className="h-12 w-12 mx-auto mb-3" />
            <p>Enable metrics in settings to see trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <TrendChart
      title="Health Trends"
      data={chartData}
      metric={selectedMetric}
      unit={getMetricUnit(selectedMetric)}
      onMetricChange={handleMetricChange}
      onRangeChange={setSelectedRange}
      availableMetrics={enabledMetrics}
      currentRange={selectedRange}
      loading={loading}
      annotations={annotations}
    />
  );
}
