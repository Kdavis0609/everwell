'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, RefreshCw } from 'lucide-react';
import { AIInsight } from '@/lib/types';

interface WeeklyPlanCardProps {
  weeklyPlan: AIInsight | null;
  onRegenerate: () => Promise<void>;
  loading?: boolean;
}

export function WeeklyPlanCard({ weeklyPlan, onRegenerate, loading = false }: WeeklyPlanCardProps) {
  const handleRegenerate = async () => {
    try {
      await onRegenerate();
    } catch (error) {
      console.error('Error regenerating weekly plan:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Weekly Plan</span>
          </CardTitle>
          <CardDescription>Your personalized coaching plan</CardDescription>
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

  if (!weeklyPlan) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Weekly Plan</span>
          </CardTitle>
          <CardDescription>Your personalized coaching plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-600 mb-4">
              Generate your first weekly coaching plan based on your goals and progress
            </p>
            <Button onClick={handleRegenerate} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate Plan
            </Button>
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
              <Calendar className="h-5 w-5" />
              <span>Weekly Plan</span>
            </CardTitle>
            <CardDescription>Your personalized coaching plan</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRegenerate} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Regenerate
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 rounded-2xl bg-gray-50">
            <p className="text-sm text-gray-700">{weeklyPlan.summary}</p>
          </div>
          
          {/* Focus Areas */}
          {weeklyPlan.actions && weeklyPlan.actions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Focus Areas:</h4>
              <div className="space-y-2">
                {weeklyPlan.actions.map((action, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <span className="text-xs text-gray-500 mt-1">•</span>
                    <p className="text-sm text-gray-700">{action}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
