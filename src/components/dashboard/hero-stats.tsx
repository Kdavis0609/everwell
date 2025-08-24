'use client';

import { Card, CardContent } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Flame, Scale, Moon, Activity } from 'lucide-react';

interface HeroStatsProps {
  weeklyAvg: number | null;
  weightDelta: number | null;
  sleepAvg: number | null;
  currentStreak: number;
}

export function HeroStats({ weeklyAvg, weightDelta, sleepAvg, currentStreak }: HeroStatsProps) {
  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '—';
    return `${value.toFixed(1)} ${unit}`;
  };

  const formatDelta = (delta: number | null) => {
    if (delta === null) return '—';
    const sign = delta > 0 ? '+' : '';
    const color = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-700';
    const icon = delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />;
    
    return (
      <span className={`flex items-center space-x-1 ${color}`}>
        {icon}
        <span>{sign}{delta.toFixed(1)} lbs</span>
      </span>
    );
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {/* Weekly Average */}
      <Card className="hover:translate-y-[-1px] transition-transform duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-medium">This Week's Avg</p>
              <p className="text-lg font-semibold text-foreground">
                {formatValue(weeklyAvg, '')}
              </p>
            </div>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight Delta */}
      <Card className="hover:translate-y-[-1px] transition-transform duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-medium">Weight Δ</p>
              <p className="text-lg font-semibold text-foreground">
                {formatDelta(weightDelta)}
              </p>
            </div>
            <div className="w-8 h-8 bg-teal-100 dark:bg-teal-900/20 rounded-lg flex items-center justify-center">
              <Scale className="h-4 w-4 text-teal-600 dark:text-teal-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sleep Average */}
      <Card className="hover:translate-y-[-1px] transition-transform duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-medium">Sleep Avg</p>
              <p className="text-lg font-semibold text-foreground">
                {formatValue(sleepAvg, 'h')}
              </p>
            </div>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <Moon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Streak */}
      <Card className="hover:translate-y-[-1px] transition-transform duration-200 cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-700 font-medium">Streak</p>
              <p className="text-lg font-semibold text-foreground">
                {currentStreak} days
              </p>
            </div>
            <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
