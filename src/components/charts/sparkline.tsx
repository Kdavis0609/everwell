'use client';

import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface SparklineProps {
  data: Array<{ date: string; value: number }>;
  color?: string;
  height?: number;
  width?: number;
  showTooltip?: boolean;
  annotations?: Array<{ date: string; type: 'target' | 'streak' | 'best' }>;
}

export function Sparkline({ 
  data, 
  color, 
  height = 40, 
  width = 100,
  showTooltip = false,
  annotations = []
}: SparklineProps) {
  // Use CSS variable for default color if none provided
  const defaultColor = typeof window !== 'undefined' 
    ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--chart-1').trim()})`
    : '#2563EB';
  
  const lineColor = color || defaultColor;
  if (!data || data.length === 0) {
    return (
      <div 
        className="bg-muted rounded animate-pulse" 
        style={{ height, width }}
      />
    );
  }

  // Normalize data to fit in the sparkline height
  const values = data.map(d => d.value).filter(v => v !== null && !isNaN(v));
  if (values.length === 0) {
    return (
      <div 
        className="bg-muted rounded animate-pulse" 
        style={{ height, width }}
      />
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const normalizedData = data.map((point, index) => ({
    ...point,
    normalizedValue: point.value !== null && !isNaN(point.value) 
      ? ((point.value - min) / range) * (height - 8) + 4
      : null,
    isAnnotated: annotations.some(ann => ann.date === point.date)
  }));

  const tooltipContent = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const annotation = annotations.find(ann => ann.date === data.date);
      
      return (
        <div className="bg-background border border-border rounded-lg p-2 shadow-lg">
          <p className="text-xs font-medium">{data.date}</p>
          <p className="text-xs text-muted-foreground">
            {data.value !== null ? data.value.toFixed(1) : 'No data'}
          </p>
          {annotation && (
            <p className="text-xs text-primary font-medium">
              {annotation.type === 'target' && '🎯 Target hit'}
              {annotation.type === 'streak' && '🔥 Streak'}
              {annotation.type === 'best' && '⭐ Best'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative" style={{ height, width }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={normalizedData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="normalizedValue"
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
            activeDot={false}
            connectNulls={false}
          />
          {/* Annotation dots */}
          {normalizedData.map((point, index) => 
            point.isAnnotated && point.normalizedValue !== null ? (
              <circle
                key={`annotation-${point.date}-${index}`}
                cx={index * (width / (normalizedData.length - 1))}
                cy={height - point.normalizedValue}
                r={2}
                fill={lineColor}
                stroke="white"
                strokeWidth={1}
              />
            ) : null
          )}
          {showTooltip && (
            <Tooltip 
              content={tooltipContent}
              cursor={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
