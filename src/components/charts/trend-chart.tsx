'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

interface DataPoint {
  date: string;
  value: number;
  rollingAvg?: number;
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
  loading = false
}: TrendChartProps) {
  const [selectedRange, setSelectedRange] = useState(currentRange);

  const rangeOptions = [
    { value: 7, label: '7d' },
    { value: 30, label: '30d' },
    { value: 90, label: '90d' }
  ];

  const handleRangeChange = (range: number) => {
    setSelectedRange(range);
    onRangeChange(range);
  };

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    // Calculate rolling average (7-day window)
    return data.map((point, index) => {
      const startIndex = Math.max(0, index - 6);
      const window = data.slice(startIndex, index + 1);
      const validValues = window.filter(p => p.value !== null && !isNaN(p.value));
      
      const rollingAvg = validValues.length > 0 
        ? validValues.reduce((sum, p) => sum + p.value, 0) / validValues.length
        : null;

      return {
        ...point,
        rollingAvg: rollingAvg !== null ? Number(rollingAvg.toFixed(1)) : null
      };
    });
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatTooltip = (value: number, name: string) => {
    if (name === 'value') return [`${value} ${unit}`, 'Daily Value'];
    if (name === 'rollingAvg') return [`${value} ${unit}`, '7-Day Average'];
    return [value, name];
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>Loading chart data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse bg-muted rounded"></div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>{title}</span>
          </CardTitle>
          <CardDescription>No data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No measurements recorded</p>
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
          <div className="flex items-center space-x-2">
            {/* Metric Selector */}
            <Select value={metric} onValueChange={onMetricChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map((m) => (
                  <SelectItem key={m.id} value={m.slug}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Range Selector */}
            <div className="flex border rounded-md">
              {rangeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={selectedRange === option.value ? "default" : "ghost"}
                  size="sm"
                  onClick={() => handleRangeChange(option.value)}
                  className="px-2 py-1 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatDate}
                tick={{ fontSize: 12 }}
                stroke="#888888"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                stroke="#888888"
                label={{ value: unit, angle: -90, position: 'insideLeft', fontSize: 12 }}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelFormatter={formatDate}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb" 
                strokeWidth={2}
                dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#2563eb', strokeWidth: 2 }}
                name="Daily Value"
              />
              <Line 
                type="monotone" 
                dataKey="rollingAvg" 
                stroke="#10b981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="7-Day Average"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
