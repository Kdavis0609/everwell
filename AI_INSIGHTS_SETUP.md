# EverWell AI-Powered Health Insights Setup

## Overview

EverWell now includes AI-powered health insights that provide personalized, motivational guidance based on your health data. The system calculates derived metrics (BMI, trends, averages) and generates daily AI summaries with actionable recommendations.

## Features

### Derived Metrics
- **BMI Calculation**: Automatic BMI calculation using weight and height
- **Waist-to-Height Ratio**: Body composition indicator
- **7/30-day Averages**: Rolling averages for weight, sleep, steps, water
- **Trend Analysis**: 30-day weight trend slopes
- **Daily Rollups**: Automatic calculation of today's derived features

### AI Insights
- **Daily Summaries**: Personalized health summaries (max 120 words)
- **Actionable Recommendations**: 3 specific, achievable next steps
- **Risk Flags**: Gentle observations about patterns (optional)
- **Non-Medical Focus**: Informational guidance only, not medical advice

### Dashboard Features
- **Trend Cards**: Visual indicators for weight, sleep, steps, water
- **Health Metrics**: BMI, waist-to-height ratio, averages
- **Recent Activity**: Past week's health data summary
- **Regenerate Button**: Manual AI insight generation

## Database Schema

### Tables Created

#### `derived_features`
```sql
- user_id (UUID, references auth.users)
- day (DATE, primary key with user_id)
- weight_lbs, waist_in, bmi, waist_to_height (NUMERIC)
- avg7_weight_lbs, avg30_weight_lbs (NUMERIC)
- trend_weight_30d (NUMERIC, slope)
- steps, sleep_hours, water_oz (NUMERIC/INTEGER)
- created_at (TIMESTAMPTZ)
```

#### `ai_insights`
```sql
- id (UUID, primary key)
- user_id (UUID, references auth.users)
- day (DATE, unique with user_id)
- summary (TEXT, AI-generated summary)
- actions (TEXT[], array of 3 actionable steps)
- risk_flags (TEXT[], optional observations)
- created_at (TIMESTAMPTZ)
```

### Functions Created
- `calculate_bmi(weight_lbs, height_in)` - BMI calculation
- `calculate_waist_to_height(waist_in, height_in)` - Ratio calculation
- `calculate_trend_slope(user_uuid, metric_column, days)` - Trend analysis
- `upsert_derived_features(user_uuid, target_date)` - Daily rollup

## Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI Configuration (Required for AI insights)
OPENAI_API_KEY=your_openai_api_key_here

# Cron Secret (Required for scheduled insights)
CRON_SECRET=your_secure_random_string_here

# Existing variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Getting OpenAI API Key

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in to your account
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key and add it to your `.env.local`

**Note**: The system uses GPT-3.5-turbo for cost efficiency. Estimated cost: ~$0.002 per insight generation.

### Setting CRON_SECRET

Generate a secure random string for the cron secret:

```bash
# On Unix/Linux/macOS
openssl rand -base64 32

# Or use a secure password generator
# Recommended: 32+ character random string
```

## Supabase Setup

### 1. Run the Migration

Execute the migration in your Supabase SQL Editor:

```sql
-- Copy and run the contents of:
-- supabase/migrations/20250102_ai_insights.sql
```

### 2. Verify Tables and Functions

Check that the following were created:
- Tables: `derived_features`, `ai_insights`
- Functions: `calculate_bmi`, `calculate_waist_to_height`, `calculate_trend_slope`, `upsert_derived_features`
- Indexes: Performance indexes on user_id and day columns
- RLS Policies: User can only access their own data

### 3. Test the Functions

Test the derived features calculation:

```sql
-- Test BMI calculation
SELECT calculate_bmi(150, 65); -- Should return ~25.0

-- Test waist-to-height ratio
SELECT calculate_waist_to_height(32, 65); -- Should return ~0.492

-- Test trend slope (requires data)
SELECT calculate_trend_slope('your-user-id', 'weight_lbs', 30);
```

## API Endpoints

### `/api/insights/generate`
**POST** - Generate AI insights for a user

**Request Body:**
```json
{
  "userId": "user-uuid",
  "insightsData": {
    "today": { /* derived features */ },
    "recent": [ /* recent data */ ],
    "trends": { /* calculated trends */ }
  }
}
```

**Response:**
```json
{
  "summary": "AI-generated summary...",
  "actions": ["Action 1", "Action 2", "Action 3"],
  "risk_flags": ["Optional observation"]
}
```

### `/api/cron/daily-insights`
**POST** - Generate insights for all users (cron job)

**Headers:**
```
Authorization: Bearer your_cron_secret
```

**Response:**
```json
{
  "message": "Daily insights generation completed",
  "processed": 5,
  "results": [
    {
      "userId": "user-id",
      "status": "success",
      "insight": "Summary preview..."
    }
  ]
}
```

## Vercel Cron Setup

### 1. Create Vercel Cron Job

Add this to your `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-insights",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Schedule Options:**
- `0 6 * * *` - Daily at 6:00 AM UTC
- `0 9 * * *` - Daily at 9:00 AM UTC
- `0 */12 * * *` - Every 12 hours
- `0 6 * * 1` - Weekly on Monday at 6:00 AM

### 2. Set Environment Variables in Vercel

In your Vercel dashboard:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - `OPENAI_API_KEY` = your OpenAI API key
   - `CRON_SECRET` = your secure cron secret
   - `NEXT_PUBLIC_SITE_URL` = https://www.everwellhealth.us

### 3. Deploy and Test

```bash
# Deploy to Vercel
vercel --prod

# Test the cron endpoint manually
curl -X POST https://your-app.vercel.app/api/cron/daily-insights \
  -H "Authorization: Bearer your_cron_secret"
```

## Usage

### Manual Insight Generation

1. Navigate to `/insights` page
2. Click **Generate Insights** button
3. Wait for AI processing (usually 2-5 seconds)
4. Review your personalized summary and actions

### Automatic Daily Insights

The system automatically:
1. Calculates derived features for all users
2. Generates AI insights for users with recent data
3. Stores results in the database
4. Makes insights available on the insights page

### Data Requirements

For meaningful insights, users should have:
- **Weight data**: For BMI and trend calculations
- **Height in profile**: For BMI and waist-to-height ratios
- **Recent measurements**: Last 7-30 days of data
- **Multiple metrics**: Weight, steps, sleep, water for comprehensive insights

## Testing

### Run the Tests

```bash
# Run insights tests
npm test tests/insights.spec.ts

# Run all tests
npm test
```

### Manual Testing

1. **Test API Endpoint:**
```bash
curl -X POST http://localhost:3000/api/insights/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user-id", "insightsData": {...}}'
```

2. **Test Cron Endpoint:**
```bash
curl -X POST http://localhost:3000/api/cron/daily-insights \
  -H "Authorization: Bearer your_cron_secret"
```

3. **Test UI:**
- Visit `/insights` page
- Generate insights manually
- Verify all sections display correctly

## Troubleshooting

### Common Issues

1. **"OpenAI API key not configured"**
   - Check `OPENAI_API_KEY` environment variable
   - Verify the key is valid and has credits

2. **"Failed to generate AI insight"**
   - Check OpenAI API response in browser dev tools
   - Verify user has sufficient data for insights
   - Check network connectivity

3. **"Cron job failing"**
   - Verify `CRON_SECRET` is set correctly
   - Check Vercel cron logs
   - Ensure environment variables are set in production

4. **"No derived features calculated"**
   - Run the Supabase migration
   - Check that users have measurement data
   - Verify the `upsert_derived_features` function exists

### Debug Mode

Enable debug logging:

```typescript
// In your Supabase client config
const supabase = createSupabaseClient(url, anon, {
  auth: {
    debug: true
  }
});
```

### Monitoring

Monitor the system with:

1. **Vercel Function Logs**: Check cron job execution
2. **Supabase Logs**: Monitor database operations
3. **OpenAI Usage**: Track API usage and costs
4. **User Feedback**: Monitor insight quality and relevance

## Security Considerations

### Data Privacy
- All insights are user-specific (RLS enforced)
- No user data is shared with other users
- OpenAI API calls include only necessary data

### API Security
- Cron endpoint protected with secret token
- User authentication required for all operations
- Input validation on all API endpoints

### Cost Management
- GPT-3.5-turbo used for cost efficiency
- Insights cached in database to reduce API calls
- Optional: Add rate limiting for manual generation

## Performance Optimization

### Database
- Indexes on user_id and day columns
- Efficient queries with proper joins
- Batch processing for cron jobs

### Caching
- Insights stored in database
- Derived features calculated once per day
- Client-side caching for UI performance

### API Optimization
- Async processing for AI generation
- Error handling and retries
- Graceful degradation when services unavailable

## Future Enhancements

### Potential Features
- **Weekly Email Summaries**: Email insights to users
- **Goal Tracking**: AI insights based on user goals
- **Seasonal Patterns**: Long-term trend analysis
- **Integration**: Connect with fitness trackers
- **Customization**: User preferences for insight style

### Advanced AI Features
- **Multi-modal Insights**: Text + visual summaries
- **Predictive Analytics**: Future trend predictions
- **Personalized Coaching**: Adaptive insight style
- **Goal Achievement**: Progress toward specific goals
