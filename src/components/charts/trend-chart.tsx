'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar, TrendingUp } from 'lucide-react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useMemo, useState } from 'react';

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
    
    // Filter out invalid data points first
    const validData = data.filter(point => 
      point.value !== null && 
      point.value !== undefined && 
      !isNaN(point.value)
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
  }, [data, annotations]);

  // Get colors from CSS variables
  const getComputedColor = (variable: string) => {
    if (typeof window !== 'undefined') {
      return getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    }
    return '';
  };

  const chartColors = {
    primary: `hsl(${getComputedColor('--chart-1')})`,
    secondary: `hsl(${getComputedColor('--chart-2')})`,
    accent: `hsl(${getComputedColor('--chart-4')})`,
    muted: `hsl(${getComputedColor('--muted-foreground')})`,
    background: `hsl(${getComputedColor('--background')})`,
    grid: `hsl(${getComputedColor('--muted')})`
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
                <label className="text-xs font-medium text-muted-foreground">Metric:</label>
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
                <label className="text-xs font-medium text-muted-foreground">Range:</label>
                <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange} disabled>
                  {rangeOptions.map((option) => (
                    <ToggleGroupItem key={`range-${option.value}`} value={option.value.toString()} size="sm">
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
                <label className="text-xs font-medium text-muted-foreground">Metric:</label>
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
                <label className="text-xs font-medium text-muted-foreground">Range:</label>
                                  <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange}>
                    {rangeOptions.map((option) => (
                      <ToggleGroupItem key={`range-${option.value}`} value={option.value.toString()} size="sm">
                        {option.label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-gray-600">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="mb-2">No measurements recorded for {metric}</p>
              <p className="text-sm text-muted-foreground">
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
              <label className="text-xs font-medium text-muted-foreground">Metric:</label>
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
              <label className="text-xs font-medium text-muted-foreground">Range:</label>
                                <ToggleGroup type="single" value={selectedRange.toString()} onValueChange={handleRangeChange}>
                    {rangeOptions.map((option) => (
                      <ToggleGroupItem key={`range-${option.value}`} value={option.value.toString()} size="sm">
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
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                        <p className="font-medium text-foreground">{formatDateForChart(label as string)}</p>
                        {payload.map((entry: any, index: number) => {
                          if (entry.name === 'Daily Value' && entry.value !== null && entry.value !== undefined && !isNaN(entry.value)) {
                            return (
                              <p key={`daily-${index}-${entry.value}`} className="text-primary">
                                Daily Value: {entry.value} {unit}
                              </p>
                            );
                          }
                          if (entry.name === '7-Day Average' && entry.value !== null && entry.value !== undefined && !isNaN(entry.value)) {
                            return (
                              <p key={`avg-${index}-${entry.value}`} className="text-secondary">
                                7-Day Average: {entry.value} {unit}
                              </p>
                            );
                          }
                          return null;
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              
              {/* Daily Value Line */}
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={chartColors.primary} 
                strokeWidth={2}
                dot={(props) => {
                  const { cx, cy, payload } = props;
                  if (payload.value !== null && payload.value !== undefined && !isNaN(payload.value)) {
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4}
                        stroke={chartColors.primary}
                        strokeWidth={2}
                        fill={chartColors.background}
                      />
                    );
                  }
                  return <circle cx={0} cy={0} r={0} />; // Return empty circle instead of null
                }}
                activeDot={{ r: 6, stroke: chartColors.primary, strokeWidth: 2, fill: chartColors.primary }}
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
    </Card>
  );
}
