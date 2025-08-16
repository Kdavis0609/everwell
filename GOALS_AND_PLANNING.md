# Goals and Weekly Planning Setup

This document covers the setup and usage of EverWell's per-metric goals and weekly coaching plan features.

## Overview

The goals and planning system adds:
- **Per-metric target values** - Set specific goals for each health metric
- **Weekly progress tracking** - Visual progress bars showing current vs target performance
- **AI-powered weekly plans** - Personalized coaching plans with 3 focus areas
- **User preferences** - Timezone and reminder settings for future use

## Database Setup

### 1. Run the Migration

Execute the SQL migration in your Supabase project:

```sql
-- Copy and run the contents of supabase/migrations/20250103_goals_and_planning.sql
```

This migration creates:
- `user_preferences` table for timezone and reminder settings
- Adds `target_value` column to `user_metric_settings`
- Creates RLS policies for data security
- Adds helper functions for weekly progress calculation

### 2. Verify the Setup

Check that the following are created in your Supabase dashboard:

**Tables:**
- `user_preferences` (with RLS enabled)
- `user_metric_settings` (should have new `target_value` column)

**Functions:**
- `get_or_create_user_preferences(user_uuid UUID)`
- `get_weekly_progress(user_uuid UUID, target_date DATE)`
- `get_last_monday(target_date DATE)`

**Policies:**
- Users can only read/write their own preferences
- Users can only read/write their own metric settings

## Features

### Per-Metric Goals

1. **Setting Targets**: In `/settings/metrics`, toggle "Set target values" to show target input fields
2. **Supported Metrics**: Targets work for numeric metrics (weight, steps, sleep, water, etc.)
3. **Validation**: Targets respect the metric's min/max values and step increments

### Weekly Progress Tracking

1. **Progress Bars**: Visual representation of current weekly average vs target
2. **Smart Calculations**: 
   - Weight: Progress calculated as (target - current) / target * 100
   - Other metrics: Progress calculated as current / target * 100
3. **Data Requirements**: Shows progress only when both target and weekly data exist

### Weekly Coaching Plans

1. **AI Generation**: Plans are generated using OpenAI GPT-3.5-turbo
2. **Focus Areas**: Each plan includes 3 specific, actionable focus areas
3. **Data-Driven**: Plans consider user profile, goals, and recent progress
4. **Storage**: Plans are stored with the date of the last Monday

## API Endpoints

### `/api/plan/weekly`

**Method**: POST  
**Body**: `{ userId: string }`  
**Response**: Weekly plan object with summary, actions, and risk_flags

**Features:**
- Analyzes weekly progress against goals
- Considers user profile and recent data
- Generates personalized focus areas
- Stores plan in `ai_insights` table

## Environment Variables

No new environment variables are required. The system uses existing:
- `OPENAI_API_KEY` - For weekly plan generation

## Usage Instructions

### For Users

1. **Set Goals**: Go to Settings → Metrics → Toggle "Set target values"
2. **View Progress**: Check the "This Week" card on the dashboard
3. **Generate Plans**: Click "Generate Plan" in the Weekly Plan card
4. **Track Progress**: Save daily metrics to see progress updates

### For Developers

**Loading Weekly Data:**
```typescript
import { MetricsService } from '@/lib/services/metrics-service';

// Get weekly progress
const progress = await MetricsService.getWeeklyProgress(userId);

// Get user preferences
const preferences = await MetricsService.getUserPreferences(userId);
```

**Generating Weekly Plans:**
```typescript
// Generate new plan
const response = await fetch('/api/plan/weekly', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId })
});
const plan = await response.json();
```

## Data Flow

1. **User sets targets** → Stored in `user_metric_settings.target_value`
2. **User saves daily metrics** → Triggers derived features calculation
3. **Weekly progress calculated** → Uses last 7 days of derived features
4. **AI generates plan** → Analyzes progress and creates focus areas
5. **Plan stored** → Saved in `ai_insights` with Monday's date

## Error Handling

The system gracefully handles:
- Missing target values (shows "Set targets" message)
- No weekly data (shows "No data this week")
- Database migration issues (shows setup instructions)
- AI generation failures (shows fallback plan)

## Future Enhancements

Potential improvements:
- **Reminder System**: Use `user_preferences.reminders` for goal notifications
- **Goal Streaks**: Track consecutive days meeting targets
- **Goal Adjustments**: AI-suggested target modifications
- **Weekly Reports**: Email summaries of progress and plans
- **Goal Sharing**: Social features for goal accountability

## Troubleshooting

**Progress not showing:**
- Ensure targets are set in metric settings
- Check that daily metrics have been saved for the week
- Verify the migration was run successfully

**Weekly plan not generating:**
- Check OpenAI API key is set
- Ensure user has some measurement history
- Verify the `/api/plan/weekly` endpoint is accessible

**Database errors:**
- Run the migration: `supabase/migrations/20250103_goals_and_planning.sql`
- Check RLS policies are enabled
- Verify function permissions

## Security

- All data is protected by Row Level Security (RLS)
- Users can only access their own preferences and progress
- AI prompts include non-medical disclaimers
- No sensitive data is logged or exposed
