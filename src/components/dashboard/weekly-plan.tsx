'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AIInsight } from '@/lib/types';
import { Calendar, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/loading-spinner';

interface WeeklyPlanCardProps {
  weeklyPlan: AIInsight | null;
  onRegenerate: () => Promise<void>;
  loading?: boolean;
}

export function WeeklyPlanCard({ weeklyPlan, onRegenerate, loading = false }: WeeklyPlanCardProps) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await onRegenerate();
      toast.success('Weekly plan updated!');
    } catch (error) {
      console.error('Error regenerating weekly plan:', error);
      toast.error('Failed to update weekly plan');
    } finally {
      setRegenerating(false);
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
          <CardDescription>Your personalized focus areas for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded mb-4"></div>
            </div>
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-muted rounded mb-1"></div>
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
          <CardDescription>Your personalized focus areas for this week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Generate your first weekly coaching plan based on your goals and progress
            </p>
            <Button 
              onClick={handleRegenerate} 
              disabled={regenerating}
              size="sm"
            >
              {regenerating ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Generating...
                </>
              ) : (
                <>
                  <Target className="mr-2 h-4 w-4" />
                  Generate Plan
                </>
              )}
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
            <CardDescription>Your personalized focus areas for this week</CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRegenerate}
            disabled={regenerating}
          >
            {regenerating ? (
              <>
                <LoadingSpinner className="mr-2 h-4 w-4" />
                Updating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Summary */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">{weeklyPlan.summary}</p>
          </div>

          {/* Action Items */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Focus Areas:</h4>
            {weeklyPlan.actions.map((action, index) => (
              <div key={index} className="flex items-start space-x-3">
                <Badge variant="secondary" className="mt-0.5 flex-shrink-0">
                  {index + 1}
                </Badge>
                <p className="text-sm">{action}</p>
              </div>
            ))}
          </div>

          {/* Risk Flags */}
          {weeklyPlan.risk_flags && weeklyPlan.risk_flags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-amber-700">Attention:</h4>
              {weeklyPlan.risk_flags.map((flag, index) => (
                <div key={index} className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p className="text-sm text-amber-700">{flag}</p>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <strong>Informational only.</strong> This plan is for general wellness guidance and is not medical advice.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
