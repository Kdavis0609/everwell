// EverWell: Configurable Health Metrics Types

export interface MetricDefinition {
  id: string;
  slug: string;
  name: string;
  unit: string | null;
  input_kind: 'number' | 'integer' | 'pair' | 'scale' | 'boolean' | 'text';
  min_value: number | null;
  max_value: number | null;
  step_value: number | null;
  category: string;
  default_enabled: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserMetricSetting {
  user_id: string;
  metric_id: string;
  enabled: boolean;
  target_value: number | null;
  unit_override: string | null;
  created_at: string;
}

export interface UserEnabledMetric extends MetricDefinition {
  target_value: number | null;
  unit_override: string | null;
}

export interface Measurement {
  id: string;
  user_id: string;
  metric_id: string;
  value_numeric: number | null;
  value_text: string | null;
  value_bool: boolean | null;
  measured_at: string;
}

export interface MeasurementWithDefinition extends Measurement {
  metric_definitions: MetricDefinition;
}

export interface MetricValue {
  metric_id: string;
  slug: string;
  value_numeric?: number;
  value_text?: string;
  value_bool?: boolean;
}

export interface BloodPressureValue {
  systolic: number;
  diastolic: number;
}

export interface ScaleValue {
  value: number;
  label: string;
}

// Scale options for 1-5 ratings
export const SCALE_OPTIONS: ScaleValue[] = [
  { value: 1, label: 'Very Low' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Very High' }
];

// Category display names
export const CATEGORY_NAMES: Record<string, string> = {
  'Body': 'Body Measurements',
  'Vitals': 'Vital Signs',
  'Activity': 'Physical Activity',
  'Sleep': 'Sleep & Recovery',
  'Nutrition': 'Nutrition & Hydration',
  'Wellbeing': 'Mental Wellbeing'
};

// Category descriptions
export const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  'Body': 'Physical measurements and body composition',
  'Vitals': 'Key health indicators and vital signs',
  'Activity': 'Exercise and daily movement tracking',
  'Sleep': 'Sleep duration and quality metrics',
  'Nutrition': 'Food intake and hydration tracking',
  'Wellbeing': 'Mental health and emotional state'
};

// User Preferences Types
export interface UserPreferences {
  user_id: string;
  timezone: string;
  reminders: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Weekly Progress Types
export interface WeeklyProgress {
  metric_name: string;
  current_avg: number | null;
  target_value: number | null;
  progress_percent: number | null;
}

// AI Insights Types
export interface DerivedFeatures {
  user_id: string;
  day: string;
  weight_lbs: number | null;
  waist_in: number | null;
  bmi: number | null;
  waist_to_height: number | null;
  avg7_weight_lbs: number | null;
  avg30_weight_lbs: number | null;
  trend_weight_30d: number | null;
  steps: number | null;
  sleep_hours: number | null;
  water_oz: number | null;
  created_at: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  day: string;
  summary: string;
  actions: string[];
  risk_flags: string[] | null;
  created_at: string;
}

export interface AIInsightResponse {
  summary: string;
  actions: string[];
  risk_flags: string[];
}

export interface InsightsData {
  today: DerivedFeatures | null;
  recent: DerivedFeatures[];
  aiInsight: AIInsight | null;
  trends: {
    weight_7d_avg: number | null;
    weight_30d_avg: number | null;
    weight_trend: number | null;
    sleep_7d_avg: number | null;
    water_7d_avg: number | null;
    steps_7d_avg: number | null;
  };
}
