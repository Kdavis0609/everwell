'use client';

import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { ChartTooltip, useChartTooltip } from './ChartTooltip';

interface SparklineProps {
  data: Array<{ date: string; value: number }>;
  color?: string;
  height?: number;
  width?: number;
  showTooltip?: boolean;
  annotations?: Array<{ date: string; type: 'target' | 'streak' | 'best' }>;
  title?: string;
  unit?: string;
  target?: number | null;
}

export function Sparkline({ 
  data, 
  color, 
  height = 40, 
  width = 100,
  showTooltip = false,
  annotations = [],
  title,
  unit,
  target
}: SparklineProps) {
  // Use fallback color to avoid CSS variable issues
  const defaultColor = '#2563EB';
  
  const lineColor = color || defaultColor;
  const { tooltipState, showTooltip: showTooltipHook, hideTooltip } = useChartTooltip();
  
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

  const handlePointHover = (event: React.MouseEvent | React.FocusEvent, point: any) => {
    if (!showTooltip) return;
    
    const element = event.currentTarget as HTMLElement;
    
    // Ensure the element is properly positioned and visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Ensure the point has valid data
    if (point.value === null || point.value === undefined || isNaN(point.value)) return;
    
    const annotation = annotations.find(ann => ann.date === point.date);
    
    showTooltipHook({
      title,
      date: point.date,
      value: point.value,
      unit,
      target,
      color: lineColor,
      align: 'top'
    }, element);
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
          {/* Interactive points for tooltip */}
          {showTooltip && normalizedData.map((point, index) => 
            point.normalizedValue !== null ? (
              <circle
                key={`tooltip-${point.date}-${index}`}
                cx={index * (width / (normalizedData.length - 1))}
                cy={height - point.normalizedValue}
                r={6}
                fill="transparent"
                stroke="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={(e) => handlePointHover(e, point)}
                onMouseLeave={hideTooltip}
                onFocus={(e) => handlePointHover(e, point)}
                onBlur={hideTooltip}
                role="button"
                tabIndex={0}
                aria-label={`${title || 'Data point'} on ${point.date}: ${point.value}`}
              />
            ) : null
          )}
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
        </LineChart>
      </ResponsiveContainer>
      
      {/* Professional tooltip */}
      <ChartTooltip
        {...tooltipState.data}
        isVisible={tooltipState.isVisible}
        referenceElement={tooltipState.referenceElement}
        onHide={hideTooltip}
      />
    </div>
  );
}
