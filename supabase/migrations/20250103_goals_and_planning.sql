-- Add user preferences table for timezone and reminders
CREATE TABLE IF NOT EXISTS public.user_preferences (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    timezone text DEFAULT 'UTC',
    reminders jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add target_value column to user_metric_settings
ALTER TABLE public.user_metric_settings 
ADD COLUMN IF NOT EXISTS target_value numeric;

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid() = user_id);

-- Function to get or create user preferences
CREATE OR REPLACE FUNCTION get_or_create_user_preferences(user_uuid UUID)
RETURNS public.user_preferences AS $$
DECLARE
    user_prefs public.user_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO user_prefs 
    FROM public.user_preferences 
    WHERE user_id = user_uuid;
    
    -- If not found, create default preferences
    IF user_prefs IS NULL THEN
        INSERT INTO public.user_preferences (user_id, timezone, reminders)
        VALUES (user_uuid, 'UTC', '{}'::jsonb)
        RETURNING * INTO user_prefs;
    END IF;
    
    RETURN user_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get weekly progress data
CREATE OR REPLACE FUNCTION get_weekly_progress(user_uuid UUID, target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    metric_name text,
    current_avg numeric,
    target_value numeric,
    progress_percent numeric
) AS $$
BEGIN
    RETURN QUERY
    WITH weekly_data AS (
        SELECT 
            ums.metric_name,
            ums.target_value,
            AVG(df.weight_lbs) as weight_avg,
            AVG(df.steps) as steps_avg,
            AVG(df.sleep_hours) as sleep_avg,
            AVG(df.water_oz) as water_avg
        FROM public.user_metric_settings ums
        LEFT JOIN public.derived_features df ON df.user_id = ums.user_id 
            AND df.day >= target_date - INTERVAL '7 days'
            AND df.day < target_date
        WHERE ums.user_id = user_uuid AND ums.enabled = true
        GROUP BY ums.metric_name, ums.target_value
    )
    SELECT 
        wd.metric_name,
        CASE 
            WHEN wd.metric_name = 'weight_lbs' THEN wd.weight_avg
            WHEN wd.metric_name = 'steps' THEN wd.steps_avg
            WHEN wd.metric_name = 'sleep_hours' THEN wd.sleep_avg
            WHEN wd.metric_name = 'water_oz' THEN wd.water_avg
            ELSE NULL
        END as current_avg,
        wd.target_value,
        CASE 
            WHEN wd.target_value IS NULL OR wd.target_value = 0 THEN NULL
            WHEN wd.metric_name = 'weight_lbs' THEN 
                CASE WHEN wd.weight_avg IS NOT NULL THEN 
                    LEAST(100, GREATEST(0, (wd.target_value - wd.weight_avg) / wd.target_value * 100))
                ELSE NULL END
            WHEN wd.metric_name = 'steps' THEN 
                CASE WHEN wd.steps_avg IS NOT NULL THEN 
                    LEAST(100, GREATEST(0, wd.steps_avg / wd.target_value * 100))
                ELSE NULL END
            WHEN wd.metric_name = 'sleep_hours' THEN 
                CASE WHEN wd.sleep_avg IS NOT NULL THEN 
                    LEAST(100, GREATEST(0, wd.sleep_avg / wd.target_value * 100))
                ELSE NULL END
            WHEN wd.metric_name = 'water_oz' THEN 
                CASE WHEN wd.water_avg IS NOT NULL THEN 
                    LEAST(100, GREATEST(0, wd.water_avg / wd.target_value * 100))
                ELSE NULL END
            ELSE NULL
        END as progress_percent
    FROM weekly_data wd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get last Monday's date
CREATE OR REPLACE FUNCTION get_last_monday(target_date DATE DEFAULT CURRENT_DATE)
RETURNS DATE AS $$
BEGIN
    RETURN target_date - (EXTRACT(DOW FROM target_date)::integer * INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
