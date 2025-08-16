-- EverWell: Configurable Health Metrics Migration
-- This migration adds support for user-configurable health metrics

-- 1. Create metric_definitions table
CREATE TABLE IF NOT EXISTS public.metric_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    input_kind TEXT NOT NULL CHECK (input_kind IN ('number', 'integer', 'pair', 'scale', 'boolean', 'text')),
    min_value NUMERIC,
    max_value NUMERIC,
    step_value NUMERIC,
    category TEXT NOT NULL,
    default_enabled BOOLEAN DEFAULT false,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create user_metric_settings table
CREATE TABLE IF NOT EXISTS public.user_metric_settings (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metric_definitions(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    target_value NUMERIC NULL,
    unit_override TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, metric_id)
);

-- 3. Create measurements table
CREATE TABLE IF NOT EXISTS public.measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    metric_id UUID REFERENCES metric_definitions(id) ON DELETE CASCADE,
    value_numeric NUMERIC NULL,
    value_text TEXT NULL,
    value_bool BOOLEAN NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT one_kind CHECK (
        (value_numeric IS NOT NULL)::int +
        (value_text IS NOT NULL)::int +
        (value_bool IS NOT NULL)::int = 1
    )
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_metric_settings_user_id ON public.user_metric_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_measurements_user_metric_date ON public.measurements(user_id, metric_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_measurements_user_date ON public.measurements(user_id, measured_at DESC);

-- 5. Enable Row Level Security
ALTER TABLE public.metric_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_metric_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for metric_definitions (read-only for all authenticated users)
CREATE POLICY "Users can view all metric definitions" ON public.metric_definitions
    FOR SELECT USING (auth.role() = 'authenticated');

-- 7. Create RLS policies for user_metric_settings
CREATE POLICY "Users can manage their own metric settings" ON public.user_metric_settings
    FOR ALL USING (user_id = auth.uid());

-- 8. Create RLS policies for measurements
CREATE POLICY "Users can manage their own measurements" ON public.measurements
    FOR ALL USING (user_id = auth.uid());

-- 9. Seed metric_definitions with comprehensive health metrics
INSERT INTO public.metric_definitions (slug, name, unit, input_kind, min_value, max_value, step_value, category, default_enabled, sort_order) VALUES
-- Body Metrics (default enabled)
('weight_lbs', 'Weight', 'lbs', 'number', 50, 600, 0.5, 'Body', true, 10),
('waist_in', 'Waist', 'inches', 'number', 20, 80, 0.5, 'Body', true, 20),
('body_fat_pct', 'Body Fat %', '%', 'number', 3, 60, 0.1, 'Body', false, 30),
('bmi', 'BMI', '', 'number', 10, 60, 0.1, 'Body', false, 40),

-- Vitals
('resting_hr', 'Resting Heart Rate', 'bpm', 'integer', 30, 220, 1, 'Vitals', false, 50),
('blood_pressure', 'Blood Pressure', 'mmHg', 'pair', NULL, NULL, NULL, 'Vitals', false, 60),
('spo2_pct', 'Blood Oxygen', '%', 'integer', 50, 100, 1, 'Vitals', false, 70),
('fasting_glucose_mgdl', 'Fasting Glucose', 'mg/dL', 'integer', 50, 400, 1, 'Vitals', false, 80),

-- Activity
('steps', 'Daily Steps', 'count', 'integer', 0, 100000, 1, 'Activity', false, 90),
('exercise_minutes', 'Exercise Minutes', 'min', 'integer', 0, 480, 1, 'Activity', false, 100),

-- Sleep
('sleep_hours', 'Sleep Hours', 'h', 'number', 0, 16, 0.1, 'Sleep', false, 110),
('sleep_quality', 'Sleep Quality', '', 'scale', 1, 5, 1, 'Sleep', false, 120),

-- Nutrition
('water_oz', 'Water Intake', 'oz', 'number', 0, 300, 1, 'Nutrition', false, 130),
('calories_kcal', 'Calories', 'kcal', 'integer', 0, 8000, 1, 'Nutrition', false, 140),
('protein_g', 'Protein', 'g', 'integer', 0, 400, 1, 'Nutrition', false, 150),

-- Wellbeing (default enabled for notes)
('notes', 'Daily Notes', '', 'text', NULL, NULL, NULL, 'Wellbeing', true, 160),
('mood', 'Mood', '', 'scale', 1, 5, 1, 'Wellbeing', false, 170),
('stress', 'Stress Level', '', 'scale', 1, 5, 1, 'Wellbeing', false, 180),
('energy', 'Energy Level', '', 'scale', 1, 5, 1, 'Wellbeing', false, 190);

-- 10. Create helper function to get user's enabled metrics
CREATE OR REPLACE FUNCTION get_user_enabled_metrics(user_uuid UUID)
RETURNS TABLE (
    metric_id UUID,
    slug TEXT,
    name TEXT,
    unit TEXT,
    input_kind TEXT,
    min_value NUMERIC,
    max_value NUMERIC,
    step_value NUMERIC,
    category TEXT,
    target_value NUMERIC,
    unit_override TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        md.id,
        md.slug,
        md.name,
        COALESCE(ums.unit_override, md.unit) as unit,
        md.input_kind,
        md.min_value,
        md.max_value,
        md.step_value,
        md.category,
        ums.target_value,
        ums.unit_override
    FROM public.metric_definitions md
    INNER JOIN public.user_metric_settings ums ON md.id = ums.metric_id
    WHERE ums.user_id = user_uuid AND ums.enabled = true
    ORDER BY md.sort_order, md.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create function to initialize user's default metrics
CREATE OR REPLACE FUNCTION initialize_user_metrics(user_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.user_metric_settings (user_id, metric_id, enabled)
    SELECT user_uuid, id, default_enabled
    FROM public.metric_definitions
    WHERE id NOT IN (
        SELECT metric_id 
        FROM public.user_metric_settings 
        WHERE user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger to initialize metrics for new users
CREATE OR REPLACE FUNCTION handle_new_user_metrics()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM initialize_user_metrics(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_metrics') THEN
        CREATE TRIGGER on_auth_user_created_metrics
            AFTER INSERT ON auth.users
            FOR EACH ROW
            EXECUTE FUNCTION handle_new_user_metrics();
    END IF;
END
$$;
