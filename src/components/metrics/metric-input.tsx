'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { UserEnabledMetric, SCALE_OPTIONS, BloodPressureValue } from '@/lib/types';
import { Heart, TrendingUp, TrendingDown } from 'lucide-react';

interface MetricInputProps {
  metric: UserEnabledMetric;
  value: any;
  onChange: (value: any) => void;
  error?: string;
}

// Local state type for blood pressure inputs (strings for empty state)
interface BloodPressureInputState {
  systolic: string;
  diastolic: string;
}

export function MetricInput({ metric, value, onChange, error }: MetricInputProps) {
  // Local state for blood pressure inputs
  const [bloodPressure, setBloodPressure] = useState<BloodPressureInputState>({ systolic: '', diastolic: '' });

  // Sync blood pressure local state with parent value
  useEffect(() => {
    if (metric.input_kind === 'pair' && metric.slug === 'blood_pressure') {
      if (value && typeof value === 'object' && 'systolic' in value && 'diastolic' in value) {
        setBloodPressure({
          systolic: value.systolic?.toString() || '',
          diastolic: value.diastolic?.toString() || ''
        });
      } else {
        setBloodPressure({ systolic: '', diastolic: '' });
      }
    }
  }, [value, metric.input_kind, metric.slug]);

  const handleBloodPressureChange = (field: 'systolic' | 'diastolic', inputValue: string) => {
    const newValue = { ...bloodPressure, [field]: inputValue };
    setBloodPressure(newValue);
    
    // Only call onChange if both values are present
    if (newValue.systolic && newValue.diastolic) {
      onChange({
        systolic: parseFloat(newValue.systolic),
        diastolic: parseFloat(newValue.diastolic)
      });
    } else {
      onChange(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const raw = e.target.value;
    let processedValue: any;

    switch (metric.input_kind) {
      case 'number':
      case 'integer':
        processedValue = raw === '' ? null : parseFloat(raw);
        break;
      case 'text':
        processedValue = raw === '' ? null : raw;
        break;
      case 'scale':
        processedValue = raw === '' ? null : parseInt(raw);
        break;
      default:
        processedValue = raw === '' ? null : raw;
    }

    onChange(processedValue);
  };

  const handleSwitchChange = (checked: boolean) => {
    onChange(checked);
  };

  const handleScaleChange = (scaleValue: number) => {
    onChange(scaleValue);
  };

  // Render different input types
  switch (metric.input_kind) {
    case 'text':
      return (
        <div className="space-y-2">
          <Label htmlFor={`metric-${metric.slug}`} className="text-sm font-medium">
            {metric.name}
          </Label>
          <Textarea
            id={`metric-${metric.slug}`}
            placeholder={`Enter ${metric.name.toLowerCase()}`}
            value={value || ''}
            onChange={handleInputChange}
            className="min-h-[80px]"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between">
          <Label htmlFor={`metric-${metric.slug}`} className="text-sm font-medium">
            {metric.name}
          </Label>
          <Switch
            id={`metric-${metric.slug}`}
            checked={value || false}
            onCheckedChange={handleSwitchChange}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    case 'pair':
      if (metric.slug === 'blood_pressure') {
        return (
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center space-x-2">
              <Heart className="h-4 w-4" />
              <span>{metric.name}</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor={`systolic-${metric.slug}`} className="text-xs text-muted-foreground">
                  Systolic
                </Label>
                <Input
                  id={`systolic-${metric.slug}`}
                  type="number"
                  placeholder="120"
                  value={bloodPressure.systolic}
                  onChange={(e) => handleBloodPressureChange('systolic', e.target.value)}
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor={`diastolic-${metric.slug}`} className="text-xs text-muted-foreground">
                  Diastolic
                </Label>
                <Input
                  id={`diastolic-${metric.slug}`}
                  type="number"
                  placeholder="80"
                  value={bloodPressure.diastolic}
                  onChange={(e) => handleBloodPressureChange('diastolic', e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        );
      }
      // Fall through to default case for other pair types
      break;

    case 'scale':
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium">{metric.name}</Label>
          <div className="grid grid-cols-5 gap-1">
            {SCALE_OPTIONS.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={value === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleScaleChange(option.value)}
                className="h-8 text-xs"
              >
                {option.label}
              </Button>
            ))}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={`metric-${metric.slug}`} className="text-sm font-medium">
            {metric.name}
          </Label>
          <div className="relative">
            <Input
              id={`metric-${metric.slug}`}
              type={metric.input_kind === 'number' || metric.input_kind === 'integer' ? 'number' : 'text'}
              step={metric.input_kind === 'number' ? 'any' : metric.input_kind === 'integer' ? '1' : undefined}
              placeholder={`Enter ${metric.name.toLowerCase()}`}
              value={value || ''}
              onChange={handleInputChange}
            />
            {metric.unit && (
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                {metric.unit}
              </span>
            )}
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      );
  }
}
