'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { TrendChart } from './trend-chart';
import { UserEnabledMetric, MeasurementWithDefinition } from '@/lib/types';

interface ChartContainerProps {
  userId: string;
  enabledMetrics: UserEnabledMetric[];
}

interface ChartDataPoint {
  date: string;
  value: number;
}

export function ChartContainer({ userId, enabledMetrics }: ChartContainerProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>('weight_lbs');
  const [selectedRange, setSelectedRange] = useState<number>(30);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);

  // Filter metrics that are suitable for charts (numeric only)
  const chartableMetrics = useMemo(() => {
    return enabledMetrics.filter(metric => 
      metric.input_kind === 'number' || metric.input_kind === 'integer'
    );
  }, [enabledMetrics]);

  // Get the current metric's unit
  const currentMetricUnit = useMemo(() => {
    const metric = chartableMetrics.find(m => m.slug === selectedMetric);
    return metric?.unit || '';
  }, [selectedMetric, chartableMetrics]);

  // Get the current metric's display name
  const currentMetricName = useMemo(() => {
    const metric = chartableMetrics.find(m => m.slug === selectedMetric);
    return metric?.name || 'Unknown Metric';
  }, [selectedMetric, chartableMetrics]);

  // Load chart data when metric or range changes
  useEffect(() => {
    if (!userId || !selectedMetric) return;

    const loadChartData = async () => {
      setLoading(true);
      try {
        // Calculate the start date based on selected range
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - selectedRange);
        const startDateStr = startDate.toISOString().split('T')[0];

        // Fetch measurements for the selected metric and date range
        const { data: measurements, error } = await supabase
          .from('measurements')
          .select(`
            *,
            metric_definitions!inner(
              id,
              slug,
              name,
              unit
            )
          `)
          .eq('user_id', userId)
          .eq('metric_definitions.slug', selectedMetric)
          .gte('measured_at', `${startDateStr}T00:00:00`)
          .lte('measured_at', new Date().toISOString())
          .order('measured_at', { ascending: true });

        if (error) {
          console.error('Error fetching chart data:', error);
          setChartData([]);
          return;
        }

        // Transform the data for the chart
        const transformedData: ChartDataPoint[] = (measurements as MeasurementWithDefinition[])
          .filter(m => m.value_numeric !== null)
          .map(m => ({
            date: m.measured_at.split('T')[0],
            value: m.value_numeric!
          }));

        setChartData(transformedData);
      } catch (error) {
        console.error('Error loading chart data:', error);
        setChartData([]);
      } finally {
        setLoading(false);
      }
    };

    loadChartData();
  }, [userId, selectedMetric, selectedRange]);

  // Set initial metric if none selected and we have chartable metrics
  useEffect(() => {
    if (!selectedMetric && chartableMetrics.length > 0) {
      setSelectedMetric(chartableMetrics[0].slug);
    }
  }, [selectedMetric, chartableMetrics]);

  if (chartableMetrics.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No numeric metrics enabled. Enable metrics in settings to see charts.</p>
      </div>
    );
  }

  return (
    <TrendChart
      title={currentMetricName}
      data={chartData}
      metric={selectedMetric}
      unit={currentMetricUnit}
      onMetricChange={setSelectedMetric}
      onRangeChange={setSelectedRange}
      availableMetrics={chartableMetrics}
      currentRange={selectedRange}
      loading={loading}
    />
  );
}
