'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, TrendingUp } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from 'recharts';
import { useMemo, useState, useEffect } from 'react';
import { ChartTooltip, useChartTooltip } from './ChartTooltip';

interface DataPoint {
  date: string;
  value: number;
  rollingAvg?: number;
  rawValue?: number; // Keep raw value for tooltip
}

interface TrendChartProps {
  title: string;
  data: DataPoint[];
  metric: string;
  unit: string;
  onMetricChange: (metric: string) => void;
  onRangeChange: (range: number) => void;
  availableMetrics: Array<{ id: string; name: string; slug: string }>;
  currentRange: number;
  loading?: boolean;
  annotations?: Array<{ date: string; type: 'target' | 'streak' | 'best' }>;
}

export function TrendChart({
  title,
  data,
  metric,
  unit,
  onMetricChange,
  onRangeChange,
  availableMetrics,
  currentRange,
  loading = false,
  annotations = []
}: TrendChartProps) {
  const [selectedRange, setSelectedRange] = useState(currentRange);
  const { tooltipState, showTooltip, hideTooltip } = useChartTooltip();

  // Sync selectedRange with currentRange prop
  useEffect(() => {
    setSelectedRange(currentRange);
  }, [currentRange]);

  const rangeOptions = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 90, label: '90d' }
  ];

  const handleRangeChange = (range: string) => {
    const rangeValue = parseInt(range);
    setSelectedRange(rangeValue);
    onRangeChange(rangeValue);
  };

  const formatDateForChart = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    try {
      // Filter out invalid data points first
      const validData = data.filter(point => 
        point && 
        point.value !== null && 
        point.value !== undefined && 
        !isNaN(point.value) &&
        typeof point.value === 'number'
      );
      
      if (validData.length === 0) return [];
      
      // Calculate rolling average (7-day window) and add annotations
      return validData.map((point, index) => {
        const startIndex = Math.max(0, index - 6);
        const window = validData.slice(startIndex, index + 1);
        const validValues = window.filter(p => p.value !== null && !isNaN(p.value));
        
        const rollingAvg = validValues.length > 0 
          ? validValues.reduce((sum, p) => sum + p.value, 0) / validValues.length
          : null;

        // Check for annotations
        const annotation = annotations.find(ann => ann.date === point.date);

        return {
          ...point,
          rollingAvg: rollingAvg !== null ? Number(rollingAvg.toFixed(1)) : null,
          annotation: annotation?.type || null
        };
      });
    } catch (error) {
      console.warn('Error processing chart data:', error);
      return [];
    }
  }, [data, annotations]);



  // Use fallback colors to avoid CSS variable issues
  const chartColors = {
    primary: '#2563EB',
    secondary: '#10B981',
    accent: '#8B5CF6',
    muted: '#6B7280',
    background: '#FFFFFF',
    grid: '#E5E7EB'
  };

  const handlePointHover = (event: React.MouseEvent | React.FocusEvent, point: any) => {
    const element = event.currentTarget as HTMLElement;
    
    // Get the metric name for the tooltip title
    const metricName = availableMetrics.find(m => m.slug === metric)?.name || metric;
    
    showTooltip({
      title: metricName,
      date: point.date,
      value: point.value,
      unit,
      color: chartColors.primary,
      align: 'top'
    }, element);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>{title}</span>
              </CardTitle>
              <CardDescription>Loading chart data...</CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              {/* Metric Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Metric:</label>
                <Select value={metric} onValueChange={onMetricChange} disabled>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMetrics.map((m) => (
                      <SelectItem key={`metric-${m.id}`} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Range Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Range:</label>
                <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange} disabled className="bg-muted/50">
                  {rangeOptions.map((option) => (
                    <ToggleGroupItem 
                      key={`range-${option.value}`} 
                      value={option.value.toString()} 
                      size="sm"
                      className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                    >
                      {option.label}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded-2xl"></div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>{title}</span>
              </CardTitle>
              <CardDescription>No data available for {metric} in the last {selectedRange} days</CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              {/* Metric Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Metric:</label>
                <Select value={metric} onValueChange={onMetricChange}>
                  <SelectTrigger className="w-32 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMetrics.map((m) => (
                      <SelectItem key={`metric-${m.id}`} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Range Selector */}
              <div className="flex items-center space-x-2">
                <label className="text-xs font-medium text-gray-700">Range:</label>
                  <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange} className="bg-muted/50">
                    {rangeOptions.map((option) => (
                      <ToggleGroupItem 
                        key={`range-${option.value}`} 
                        value={option.value.toString()} 
                        size="sm"
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-700">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="mb-2">No measurements recorded for {metric}</p>
              <p className="text-sm text-gray-700">
                Add some measurements in "Today's Metrics" to see trends
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5" />
              <span>{title}</span>
            </CardTitle>
            <CardDescription>Trend over the last {selectedRange} days</CardDescription>
          </div>
          <div className="flex items-center space-x-3">
            {/* Metric Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Metric:</label>
              <Select value={metric} onValueChange={onMetricChange}>
                <SelectTrigger className="w-32 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                                  <SelectContent>
                    {availableMetrics.map((m) => (
                      <SelectItem key={`metric-${m.id}`} value={m.slug}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
              </Select>
            </div>

            {/* Range Selector */}
            <div className="flex items-center space-x-2">
              <label className="text-xs font-medium text-gray-700">Range:</label>
                <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange} className="bg-muted/50">
                    {rangeOptions.map((option) => (
                      <ToggleGroupItem 
                        key={`range-${option.value}`} 
                        value={option.value.toString()} 
                        size="sm"
                        className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm"
                      >
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} strokeOpacity={0.3} />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDateForChart}
                tick={{ fontSize: 12 }}
                stroke={chartColors.muted}
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke={chartColors.muted}
                label={{ value: unit, angle: -90, position: 'insideLeft', fontSize: 12 }}
              />

              <Legend />
              
              {/* Daily Value Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={chartColors.primary} 
                strokeWidth={2}
                dot={{
                  r: 4,
                  stroke: chartColors.primary,
                  strokeWidth: 2,
                  fill: chartColors.background
                }}
                activeDot={{
                  r: 6,
                  stroke: chartColors.primary,
                  strokeWidth: 2,
                  fill: chartColors.primary,
                  onMouseEnter: (e: any, payload: any) => {
                    const element = e.currentTarget as HTMLElement;
                    const metricName = availableMetrics.find(m => m.slug === metric)?.name || metric;
                    showTooltip({
                      title: metricName,
                      date: payload.date,
                      value: payload.value,
                      unit,
                      color: chartColors.primary,
                      align: 'top'
                    }, element);
                  },
                  onMouseLeave: hideTooltip
                }}
                name="Daily Value"
              />
              
              {/* Rolling Average Line */}
              <Line 
                type="monotone" 
                dataKey="rollingAvg" 
                stroke={chartColors.secondary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={false}
                name="7-Day Average"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      
      {/* Professional tooltip */}
      <ChartTooltip
        {...tooltipState.data}
        isVisible={tooltipState.isVisible}
        referenceElement={tooltipState.referenceElement}
        onHide={hideTooltip}
      />
    </Card>
  );
}
