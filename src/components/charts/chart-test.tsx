'use client';

import { TrendChart } from './trend-chart';

// Mock data for testing
const mockData = [
  { date: '2024-01-01', value: 180 },
  { date: '2024-01-02', value: 179.5 },
  { date: '2024-01-03', value: 179 },
  { date: '2024-01-04', value: 178.5 },
  { date: '2024-01-05', value: 178 },
  { date: '2024-01-06', value: 177.5 },
  { date: '2024-01-07', value: 177 },
  { date: '2024-01-08', value: 176.5 },
  { date: '2024-01-09', value: 176 },
  { date: '2024-01-10', value: 175.5 },
  { date: '2024-01-11', value: 175 },
  { date: '2024-01-12', value: 174.5 },
  { date: '2024-01-13', value: 174 },
  { date: '2024-01-14', value: 173.5 },
  { date: '2024-01-15', value: 173 },
];

const mockMetrics = [
  { id: '1', name: 'Weight', slug: 'weight_lbs' },
  { id: '2', name: 'Sleep', slug: 'sleep_hours' },
  { id: '3', name: 'Water', slug: 'water_oz' },
  { id: '4', name: 'Steps', slug: 'steps' },
];

export function ChartTest() {
  const handleMetricChange = (metric: string) => {
    console.log('Metric changed to:', metric);
  };

  const handleRangeChange = (range: number) => {
    console.log('Range changed to:', range);
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Chart Test Component</h2>
      <div className="max-w-4xl">
        <TrendChart
          title="Weight Trend"
          data={mockData}
          metric="weight_lbs"
          unit="lbs"
          onMetricChange={handleMetricChange}
          onRangeChange={handleRangeChange}
          availableMetrics={mockMetrics}
          currentRange={30}
        />
      </div>
    </div>
  );
}
