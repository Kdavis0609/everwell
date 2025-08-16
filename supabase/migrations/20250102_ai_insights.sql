-- EverWell: AI-Powered Health Insights Migration
-- This migration adds derived metrics and AI-generated insights

-- 1. Create derived_features table for computed metrics
CREATE TABLE IF NOT EXISTS public.derived_features (
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    weight_lbs NUMERIC NULL,
    waist_in NUMERIC NULL,
    bmi NUMERIC NULL,
    waist_to_height NUMERIC NULL,
    avg7_weight_lbs NUMERIC NULL,
    avg30_weight_lbs NUMERIC NULL,
    trend_weight_30d NUMERIC NULL, -- slope
    steps INTEGER NULL,
    sleep_hours NUMERIC NULL,
    water_oz NUMERIC NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, day)
);

-- 2. Create ai_insights table for AI-generated summaries
CREATE TABLE IF NOT EXISTS public.ai_insights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    day DATE NOT NULL,
    summary TEXT NOT NULL,
    actions TEXT[] NOT NULL,
    risk_flags TEXT[] NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, day)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_derived_features_user_day ON public.derived_features(user_id, day DESC);
CREATE INDEX IF NOT EXISTS idx_derived_features_user_date_range ON public.derived_features(user_id, day);
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_day ON public.ai_insights(user_id, day DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.derived_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for derived_features
CREATE POLICY "Users can manage their own derived features" ON public.derived_features
    FOR ALL USING (user_id = auth.uid());

-- 6. Create RLS policies for ai_insights
CREATE POLICY "Users can manage their own AI insights" ON public.ai_insights
    FOR ALL USING (user_id = auth.uid());

-- 7. Create function to calculate BMI
CREATE OR REPLACE FUNCTION calculate_bmi(weight_lbs NUMERIC, height_in NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF weight_lbs IS NULL OR height_in IS NULL OR height_in = 0 THEN
        RETURN NULL;
    END IF;
    RETURN (weight_lbs / (height_in * height_in)) * 703;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 8. Create function to calculate waist-to-height ratio
CREATE OR REPLACE FUNCTION calculate_waist_to_height(waist_in NUMERIC, height_in NUMERIC)
RETURNS NUMERIC AS $$
BEGIN
    IF waist_in IS NULL OR height_in IS NULL OR height_in = 0 THEN
        RETURN NULL;
    END IF;
    RETURN waist_in / height_in;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 9. Create function to calculate trend slope (30-day)
CREATE OR REPLACE FUNCTION calculate_trend_slope(user_uuid UUID, metric_column TEXT, days INTEGER DEFAULT 30)
RETURNS NUMERIC AS $$
DECLARE
    slope NUMERIC;
BEGIN
    EXECUTE format('
        SELECT COALESCE(
            (COUNT(*) * SUM(x * y) - SUM(x) * SUM(y)) / 
            (COUNT(*) * SUM(x * x) - SUM(x) * SUM(x)), 0
        )
        FROM (
            SELECT 
                ROW_NUMBER() OVER (ORDER BY day) - 1 as x,
                %I as y
            FROM derived_features 
            WHERE user_id = $1 
            AND day >= CURRENT_DATE - INTERVAL ''%s days''
            AND %I IS NOT NULL
            ORDER BY day
        ) as points
    ', metric_column, days, metric_column)
    INTO slope
    USING user_uuid;
    
    RETURN slope;
END;
$$ LANGUAGE plpgsql;

-- 10. Create function to upsert derived features for a user
CREATE OR REPLACE FUNCTION upsert_derived_features(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID AS $$
DECLARE
    user_height NUMERIC;
    user_weight NUMERIC;
    user_waist NUMERIC;
    user_steps INTEGER;
    user_sleep NUMERIC;
    user_water NUMERIC;
    avg7_weight NUMERIC;
    avg30_weight NUMERIC;
    trend_weight NUMERIC;
BEGIN
    -- Get user's height from profile
    SELECT height_in INTO user_height 
    FROM profiles 
    WHERE id = user_uuid;
    
    -- Get today's measurements
    SELECT 
        m.value_numeric INTO user_weight
    FROM measurements m
    JOIN metric_definitions md ON m.metric_id = md.id
    WHERE m.user_id = user_uuid 
    AND md.slug = 'weight_lbs'
    AND DATE(m.measured_at) = target_date;
    
    SELECT 
        m.value_numeric INTO user_waist
    FROM measurements m
    JOIN metric_definitions md ON m.metric_id = md.id
    WHERE m.user_id = user_uuid 
    AND md.slug = 'waist_in'
    AND DATE(m.measured_at) = target_date;
    
    SELECT 
        m.value_numeric INTO user_steps
    FROM measurements m
    JOIN metric_definitions md ON m.metric_id = md.id
    WHERE m.user_id = user_uuid 
    AND md.slug = 'steps'
    AND DATE(m.measured_at) = target_date;
    
    SELECT 
        m.value_numeric INTO user_sleep
    FROM measurements m
    JOIN metric_definitions md ON m.metric_id = md.id
    WHERE m.user_id = user_uuid 
    AND md.slug = 'sleep_hours'
    AND DATE(m.measured_at) = target_date;
    
    SELECT 
        m.value_numeric INTO user_water
    FROM measurements m
    JOIN metric_definitions md ON m.metric_id = md.id
    WHERE m.user_id = user_uuid 
    AND md.slug = 'water_oz'
    AND DATE(m.measured_at) = target_date;
    
    -- Calculate averages
    SELECT AVG(weight_lbs) INTO avg7_weight
    FROM derived_features 
    WHERE user_id = user_uuid 
    AND day >= target_date - INTERVAL '7 days'
    AND day < target_date
    AND weight_lbs IS NOT NULL;
    
    SELECT AVG(weight_lbs) INTO avg30_weight
    FROM derived_features 
    WHERE user_id = user_uuid 
    AND day >= target_date - INTERVAL '30 days'
    AND day < target_date
    AND weight_lbs IS NOT NULL;
    
    -- Calculate trend (will be calculated after insert)
    trend_weight := calculate_trend_slope(user_uuid, 'weight_lbs', 30);
    
    -- Upsert derived features
    INSERT INTO derived_features (
        user_id, day, weight_lbs, waist_in, bmi, waist_to_height,
        avg7_weight_lbs, avg30_weight_lbs, trend_weight_30d,
        steps, sleep_hours, water_oz
    ) VALUES (
        user_uuid, target_date, user_weight, user_waist,
        calculate_bmi(user_weight, user_height),
        calculate_waist_to_height(user_waist, user_height),
        avg7_weight, avg30_weight, trend_weight,
        user_steps, user_sleep, user_water
    )
    ON CONFLICT (user_id, day) DO UPDATE SET
        weight_lbs = EXCLUDED.weight_lbs,
        waist_in = EXCLUDED.waist_in,
        bmi = EXCLUDED.bmi,
        waist_to_height = EXCLUDED.waist_to_height,
        avg7_weight_lbs = EXCLUDED.avg7_weight_lbs,
        avg30_weight_lbs = EXCLUDED.avg30_weight_lbs,
        trend_weight_30d = EXCLUDED.trend_weight_30d,
        steps = EXCLUDED.steps,
        sleep_hours = EXCLUDED.sleep_hours,
        water_oz = EXCLUDED.water_oz,
        created_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
