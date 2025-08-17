'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { UserEnabledMetric } from '@/lib/types';
import { Activity, Scale, Droplets, Zap, Heart, Moon, Coffee, Target } from 'lucide-react';

interface MetricInputProps {
  metric: UserEnabledMetric;
  value: any;
  onChange: (value: any) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  error?: string;
}

const metricIcons: Record<string, React.ComponentType<any>> = {
  weight: Scale,
  sleep_hours: Moon,
  calories: Zap,
  protein: Target,
  water_intake: Droplets,
  blood_pressure: Heart,
  steps: Activity,
  caffeine: Coffee,
};

export function MetricInput({ metric, value, onChange, onFocus, onBlur, error }: MetricInputProps) {
  const [localValue, setLocalValue] = useState(value);

  const handleChange = (newValue: any) => {
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleFocus = () => {
    onFocus?.();
  };

  const handleBlur = () => {
    onBlur?.();
  };

  const getUnitDisplay = () => {
    switch (metric.slug) {
      case 'weight':
        return 'lbs';
      case 'sleep_hours':
        return 'h';
      case 'calories':
        return 'kcal';
      case 'protein':
        return 'g';
      case 'water_intake':
        return 'oz';
      case 'steps':
        return 'steps';
      case 'caffeine':
        return 'mg';
      default:
        return metric.unit || '';
    }
  };

  const IconComponent = metricIcons[metric.slug] || Activity;

  const renderInput = () => {
    switch (metric.input_kind) {
      case 'number':
      case 'integer':
        return (
          <div className="input-adornment">
            <Input
              type="number"
              value={localValue || ''}
              onChange={(e) => handleChange(e.target.value ? parseFloat(e.target.value) : null)}
              className={`text-right ${error ? 'border-red-500 focus:border-red-500' : ''}`}
              step={metric.input_kind === 'integer' ? '1' : '0.1'}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <div className="adornment">
              {getUnitDisplay()}
            </div>
          </div>
        );

      case 'text':
        return (
          <Textarea
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value || null)}
            placeholder={`Enter ${metric.name.toLowerCase()}`}
            rows={3}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        );

      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={localValue || false}
              onCheckedChange={handleChange}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <span className="text-sm text-muted-foreground">
              {localValue ? 'Yes' : 'No'}
            </span>
          </div>
        );

      case 'pair':
        if (metric.slug === 'blood_pressure') {
          return (
            <div className="grid grid-cols-2 gap-2">
              <div className="input-adornment">
                <Input
                  type="number"
                  value={localValue?.systolic || ''}
                  onChange={(e) => {
                    const systolic = e.target.value ? parseFloat(e.target.value) : null;
                    handleChange({
                      ...localValue,
                      systolic
                    });
                  }}
                  placeholder="Systolic"
                  className="text-right"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                <div className="adornment">mmHg</div>
              </div>
              <div className="input-adornment">
                <Input
                  type="number"
                  value={localValue?.diastolic || ''}
                  onChange={(e) => {
                    const diastolic = e.target.value ? parseFloat(e.target.value) : null;
                    handleChange({
                      ...localValue,
                      diastolic
                    });
                  }}
                  placeholder="Diastolic"
                  className="text-right"
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                />
                <div className="adornment">mmHg</div>
              </div>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={localValue?.[0] || ''}
              onChange={(e) => {
                const val1 = e.target.value ? parseFloat(e.target.value) : null;
                handleChange([val1, localValue?.[1]]);
              }}
              placeholder="Value 1"
              className="text-right"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <Input
              type="number"
              value={localValue?.[1] || ''}
              onChange={(e) => {
                const val2 = e.target.value ? parseFloat(e.target.value) : null;
                handleChange([localValue?.[0], val2]);
              }}
              placeholder="Value 2"
              className="text-right"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>
        );

      case 'scale':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>10</span>
            </div>
            <Slider
              value={[localValue || 5]}
              onValueChange={([val]: number[]) => handleChange(val)}
              max={10}
              min={1}
              step={1}
              className="w-full"
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
            <div className="text-center text-sm font-medium">
              {localValue || 5}/10
            </div>
          </div>
        );

      default:
        return (
          <Input
            value={localValue || ''}
            onChange={(e) => handleChange(e.target.value || null)}
            placeholder={`Enter ${metric.name.toLowerCase()}`}
            onFocus={handleFocus}
            onBlur={handleBlur}
          />
        );
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center space-x-2 text-sm font-medium">
        <IconComponent className="h-4 w-4 text-muted-foreground" />
        <span>{metric.name}</span>
      </Label>
      {renderInput()}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
}
