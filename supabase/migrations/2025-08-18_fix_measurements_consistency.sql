-- Fix measurements table consistency
-- This migration ensures the measurements table uses consistent column names and constraints

-- Ensure measurements table has the correct structure
CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metric_definitions(id) ON DELETE CASCADE,
    value_numeric NUMERIC NULL,
    value_text TEXT NULL,
    value_bool BOOLEAN NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT one_kind CHECK (
        (value_numeric IS NOT NULL)::int +
        (value_text IS NOT NULL)::int +
        (value_bool IS NOT NULL)::int = 1
    )
);

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='measurements' AND column_name='created_at')
    THEN ALTER TABLE public.measurements ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(); END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='measurements' AND column_name='updated_at')
    THEN ALTER TABLE public.measurements ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); END IF;
END$$;

-- Create unique constraint for upsert operations (user_id, measured_at, metric_id)
DROP INDEX IF EXISTS measurements_user_metric_date_unique;
CREATE UNIQUE INDEX measurements_user_metric_date_unique 
ON public.measurements(user_id, measured_at, metric_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_measurements_user_metric_date ON public.measurements(user_id, metric_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON public.measurements(user_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_metric_id ON public.measurements(metric_id);

-- Enable RLS
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can manage their own measurements" ON public.measurements;
CREATE POLICY "Users can manage their own measurements" ON public.measurements
    FOR ALL USING (user_id = auth.uid());

-- Create or update the upsert_derived_features function
CREATE OR REPLACE FUNCTION upsert_derived_features(user_uuid UUID, target_date DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Calculate derived features for the target date
  -- This is a placeholder - implement actual calculations based on your needs
  
  -- Example: Calculate BMI if weight and height are available
  INSERT INTO derived_features (
    user_id, 
    day, 
    bmi,
    weight_trend,
    sleep_avg_7d,
    steps_avg_7d,
    water_avg_7d
  )
  SELECT 
    user_uuid,
    target_date,
    -- BMI calculation (placeholder)
    CASE 
      WHEN weight.value_numeric IS NOT NULL AND height.value_numeric IS NOT NULL 
      THEN (weight.value_numeric * 703) / (height.value_numeric * height.value_numeric)
      ELSE NULL 
    END as bmi,
    -- Weight trend (placeholder)
    NULL as weight_trend,
    -- 7-day averages (placeholders)
    NULL as sleep_avg_7d,
    NULL as steps_avg_7d,
    NULL as water_avg_7d
  FROM measurements weight
  LEFT JOIN measurements height ON height.user_id = weight.user_id 
    AND height.metric_id = (SELECT id FROM metric_definitions WHERE slug = 'height_in')
    AND height.measured_at::date = target_date
  WHERE weight.user_id = user_uuid
    AND weight.metric_id = (SELECT id FROM metric_definitions WHERE slug = 'weight_lbs')
    AND weight.measured_at::date = target_date
  ON CONFLICT (user_id, day) DO UPDATE SET
    bmi = EXCLUDED.bmi,
    weight_trend = EXCLUDED.weight_trend,
    sleep_avg_7d = EXCLUDED.sleep_avg_7d,
    steps_avg_7d = EXCLUDED.steps_avg_7d,
    water_avg_7d = EXCLUDED.water_avg_7d,
    updated_at = NOW();
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION upsert_derived_features(UUID, DATE) TO authenticated;

-- Create or update the get_weekly_progress function
CREATE OR REPLACE FUNCTION get_weekly_progress(target_date DATE, user_uuid UUID)
RETURNS TABLE (
  metric_slug TEXT,
  metric_name TEXT,
  current_avg NUMERIC,
  target_value NUMERIC,
  progress_percent NUMERIC
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH week_dates AS (
    SELECT generate_series(
      date_trunc('week', target_date)::date,
      (date_trunc('week', target_date) + interval '6 days')::date,
      interval '1 day'
    )::date as day
  ),
  weekly_measurements AS (
    SELECT 
      md.slug as metric_slug,
      md.name as metric_name,
      AVG(m.value_numeric) as current_avg,
      ums.target_value
    FROM week_dates wd
    LEFT JOIN measurements m ON m.user_id = user_uuid 
      AND m.measured_at::date = wd.day
    LEFT JOIN metric_definitions md ON m.metric_id = md.id
    LEFT JOIN user_metric_settings ums ON ums.user_id = user_uuid 
      AND ums.metric_id = md.id
    WHERE m.value_numeric IS NOT NULL
    GROUP BY md.slug, md.name, ums.target_value
  )
  SELECT 
    metric_slug,
    metric_name,
    current_avg,
    target_value,
    CASE 
      WHEN target_value IS NOT NULL AND target_value > 0 
      THEN (current_avg / target_value) * 100
      ELSE NULL 
    END as progress_percent
  FROM weekly_measurements
  WHERE current_avg IS NOT NULL;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_weekly_progress(DATE, UUID) TO authenticated;
