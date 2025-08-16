# EverWell Configurable Metrics System

## Overview

The EverWell application now supports user-configurable health metrics, allowing each user to choose which health data they want to track daily.

## Database Migration

### Running the Migration

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Migration**
   - Copy the contents of `supabase/migrations/20250101_metrics_customization.sql`
   - Paste into SQL Editor
   - Click **Run**

3. **Verify Migration**
   - Check **Table Editor** to see new tables:
     - `metric_definitions` - Available metrics catalog
     - `user_metric_settings` - User preferences
     - `measurements` - Actual measurement data

### Tables Created

#### `metric_definitions`
- Catalog of all available health metrics
- Includes input types, units, validation rules
- Pre-seeded with 17 common health metrics

#### `user_metric_settings`
- User preferences for which metrics to track
- Target values and unit overrides
- Links users to their enabled metrics

#### `measurements`
- Actual measurement data
- Supports numeric, text, and boolean values
- One measurement per metric per day

## User Flow

### First-Time Setup
1. User signs in
2. System checks if they have configured metrics
3. If not, redirects to `/settings/metrics`
4. User selects which metrics to track
5. User sets optional target values
6. Redirected to dashboard with dynamic form

### Daily Usage
1. User visits dashboard
2. Sees form with only their enabled metrics
3. Enters values for today
4. Saves all measurements in one action
5. Recent measurements displayed in sidebar

## Available Metrics

### Body Measurements
- **Weight** (lbs) - Default enabled
- **Waist** (inches) - Default enabled
- **Body Fat %** (%)
- **BMI** (calculated)

### Vital Signs
- **Resting Heart Rate** (bpm)
- **Blood Pressure** (mmHg) - Systolic/Diastolic pair
- **Blood Oxygen** (%)
- **Fasting Glucose** (mg/dL)

### Physical Activity
- **Daily Steps** (count)
- **Exercise Minutes** (min)

### Sleep & Recovery
- **Sleep Hours** (h)
- **Sleep Quality** (1-5 scale)

### Nutrition & Hydration
- **Water Intake** (oz)
- **Calories** (kcal)
- **Protein** (g)

### Mental Wellbeing
- **Daily Notes** (text) - Default enabled
- **Mood** (1-5 scale)
- **Stress Level** (1-5 scale)
- **Energy Level** (1-5 scale)

## Input Types

### Number
- Decimal values with step increments
- Examples: Weight, Body Fat %, Sleep Hours

### Integer
- Whole numbers only
- Examples: Steps, Heart Rate, Calories

### Pair
- Two related numeric values
- Example: Blood Pressure (Systolic/Diastolic)

### Scale
- 1-5 rating with labels
- Examples: Mood, Stress, Sleep Quality

### Boolean
- Yes/No toggle
- Examples: Exercise completed, Medication taken

### Text
- Free-form text input
- Example: Daily Notes

## Customization

### Adding New Metrics
1. Add to `metric_definitions` table
2. Set appropriate `input_kind`, `unit`, validation rules
3. Set `default_enabled` for new users
4. Update TypeScript types if needed

### Modifying Default Metrics
```sql
-- Enable a metric by default for new users
UPDATE metric_definitions 
SET default_enabled = true 
WHERE slug = 'steps';

-- Change validation rules
UPDATE metric_definitions 
SET min_value = 0, max_value = 50000 
WHERE slug = 'steps';
```

### User-Specific Overrides
Users can:
- Enable/disable any metric
- Set personal target values
- Override units (e.g., kg instead of lbs)

## Technical Implementation

### Components
- `MetricInput` - Dynamic input based on metric type
- `MetricToggleList` - Setup wizard interface
- `MetricsService` - Data operations
- `useMetricsSetup` - Authentication and setup check

### Data Flow
1. User authenticates
2. System checks `user_metric_settings`
3. If no settings exist, redirect to setup
4. Dashboard loads enabled metrics dynamically
5. Form renders appropriate inputs for each metric
6. Save creates one measurement per filled field

### Security
- Row Level Security (RLS) enabled on all tables
- Users can only access their own data
- Metric definitions are read-only for authenticated users

## Testing

Run the metrics configuration tests:
```bash
npm test tests/metrics-config.spec.ts
```

## Troubleshooting

### Common Issues

1. **"No metrics enabled" error**
   - User hasn't completed setup wizard
   - Check `user_metric_settings` table

2. **Migration fails**
   - Ensure you have admin access to Supabase
   - Check for existing table conflicts

3. **Form not loading**
   - Verify RLS policies are correct
   - Check browser console for errors

### Debug Queries

```sql
-- Check user's enabled metrics
SELECT * FROM get_user_enabled_metrics('user-uuid-here');

-- View all metric definitions
SELECT * FROM metric_definitions ORDER BY sort_order;

-- Check user settings
SELECT * FROM user_metric_settings WHERE user_id = 'user-uuid-here';
```
