'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { MetricDefinition, CATEGORY_NAMES, CATEGORY_DESCRIPTIONS } from '@/lib/types';
import { Heart, Target, Settings } from 'lucide-react';

interface MetricToggleListProps {
  metrics: MetricDefinition[];
  selectedMetrics: Record<string, boolean>;
  targetValues: Record<string, number | null>;
  onMetricToggle: (metricId: string, enabled: boolean) => void;
  onTargetChange: (metricId: string, target: number | null) => void;
  onSave: () => void;
  saving?: boolean;
}

export function MetricToggleList({
  metrics,
  selectedMetrics,
  targetValues,
  onMetricToggle,
  onTargetChange,
  onSave,
  saving = false
}: MetricToggleListProps) {
  const [showTargets, setShowTargets] = useState(false);

  // Group metrics by category
  const metricsByCategory = metrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, MetricDefinition[]>);

  const selectAllRecommended = () => {
    metrics.forEach(metric => {
      if (metric.default_enabled) {
        onMetricToggle(metric.id, true);
      }
    });
  };

  const selectMinimal = () => {
    metrics.forEach(metric => {
      onMetricToggle(metric.id, metric.slug === 'weight_lbs' || metric.slug === 'notes');
    });
  };

  const selectAll = () => {
    metrics.forEach(metric => {
      onMetricToggle(metric.id, true);
    });
  };

  const clearAll = () => {
    metrics.forEach(metric => {
      onMetricToggle(metric.id, false);
    });
  };

  const getSelectedCount = () => {
    return Object.values(selectedMetrics).filter(Boolean).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center space-x-2 mb-4">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <Heart className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Customize Your Health Tracking</h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Choose which health metrics you'd like to track daily. You can always change these later in settings.
        </p>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Quick Setup</span>
          </CardTitle>
          <CardDescription>
            Choose a preset or customize your metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={selectMinimal}
              className="text-xs"
            >
              Minimal (Weight + Notes)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAllRecommended}
              className="text-xs"
            >
              Recommended
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="text-xs"
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Target Values Toggle */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4" />
              <Label htmlFor="show-targets" className="text-sm font-medium">
                Set target values for your metrics
              </Label>
            </div>
            <Switch
              id="show-targets"
              checked={showTargets}
              onCheckedChange={setShowTargets}
            />
          </div>
        </CardContent>
      </Card>

      {/* Metrics by Category */}
      <div className="space-y-6">
        {Object.entries(metricsByCategory).map(([category, categoryMetrics]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-lg">{CATEGORY_NAMES[category]}</CardTitle>
              <CardDescription>{CATEGORY_DESCRIPTIONS[category]}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {categoryMetrics.map((metric) => (
                  <div key={metric.id} className="flex items-start space-x-4 p-3 rounded-lg border">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`metric-${metric.id}`}
                            checked={selectedMetrics[metric.id] || false}
                            onCheckedChange={(checked) => onMetricToggle(metric.id, checked)}
                          />
                          <Label htmlFor={`metric-${metric.id}`} className="font-medium">
                            {metric.name}
                          </Label>
                        </div>
                        {metric.unit && (
                          <span className="text-sm text-muted-foreground">
                            {metric.unit}
                          </span>
                        )}
                      </div>
                      
                      {showTargets && selectedMetrics[metric.id] && metric.input_kind !== 'text' && metric.input_kind !== 'boolean' && (
                        <div className="ml-6 mt-2">
                          <Label htmlFor={`target-${metric.id}`} className="text-xs text-muted-foreground">
                            Target Value
                          </Label>
                          <Input
                            id={`target-${metric.id}`}
                            type="number"
                            min={metric.min_value || undefined}
                            max={metric.max_value || undefined}
                            step={metric.step_value || 0.1}
                            value={targetValues[metric.id] || ''}
                            onChange={(e) => {
                              const value = e.target.value ? parseFloat(e.target.value) : null;
                              onTargetChange(metric.id, value);
                            }}
                            className="mt-1 w-24"
                            placeholder="Target"
                          />
                          {metric.unit && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {metric.unit}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary and Save */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {getSelectedCount()} of {metrics.length} metrics selected
            </div>
            <Button
              onClick={onSave}
              disabled={saving || getSelectedCount() === 0}
              className="min-w-[120px]"
            >
              {saving ? 'Saving...' : 'Save & Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
