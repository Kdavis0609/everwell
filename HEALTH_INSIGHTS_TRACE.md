# AI Health Insights Generation Flow - Complete Trace

## High-Level Summary

The AI Health Insights feature generates personalized health recommendations using OpenAI's GPT-3.5-turbo model. The flow starts from a "Generate Insights" button in the dashboard, fetches 30 days of user health metrics from Supabase, processes them into a structured format, sends them to OpenAI with a health coach prompt, and displays the results in the UI. Authentication is enforced at multiple levels through Supabase session management and Next.js middleware.

## Call Flow (Client → Server → LLM → Client)

### 1. **UI Button Trigger**
- **File**: `src/app/dashboard/page.tsx:786`
- **Function**: `generateInsights` (lines 374-410)
- **Trigger**: Button click with text "Generate Insights"

```typescript
<Button onClick={generateInsights} disabled={insightsLoading}>
  Generate Insights
</Button>
```

### 2. **Client-Side API Call**
- **File**: `src/app/dashboard/page.tsx:381-387`
- **Method**: `fetch('/api/insights')`
- **Headers**: `Content-Type: application/json`
- **Credentials**: `include` (for authentication cookies)

```typescript
const response = await fetch('/api/insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
});
```

### 3. **Server-Side API Handler**
- **File**: `src/app/api/insights/route.ts`
- **Function**: `POST` handler (lines 5-95)
- **Authentication**: Supabase session check via `supabase.auth.getUser()`

### 4. **Data Fetching**
- **File**: `src/app/api/insights/route.ts:42-58`
- **Query**: Supabase measurements table with 30-day range
- **Join**: `metric_definitions` for metadata

```typescript
const { data: measurements, error: measurementsError } = await supabase
  .from('measurements')
  .select(`
    *,
    metric_definitions!inner(
      slug, name, unit, input_kind
    )
  `)
  .eq('user_id', user.id)
  .gte('measured_at', thirtyDaysAgo.toISOString())
  .order('measured_at', { ascending: true });
```

### 5. **Data Processing**
- **File**: `src/app/api/insights/route.ts:100-130`
- **Function**: `processMeasurementsForAI()`
- **Output**: Daily data grouped by date and metric

### 6. **LLM Call**
- **File**: `src/app/api/insights/route.ts:157-175`
- **Provider**: OpenAI GPT-3.5-turbo
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **API Key**: `process.env.OPENAI_API_KEY`

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ],
    temperature: 0.7,
    max_tokens: 500
  }),
});
```

### 7. **Response Processing**
- **File**: `src/app/api/insights/route.ts:177-210`
- **Parsing**: JSON response from OpenAI
- **Fallback**: Default response if parsing fails

### 8. **Client Response Handling**
- **File**: `src/app/dashboard/page.tsx:389-410`
- **State Update**: `setInsights(result)`
- **UI Update**: Display insights in dashboard card

## Auth & Error Handling

### Authentication Points
1. **Middleware Level**: `middleware.ts:95-105` - Protects all `/api/` routes
2. **API Route Level**: `src/app/api/insights/route.ts:9-16` - Supabase session check
3. **Client Level**: `src/app/dashboard/page.tsx:375` - User ID check

### "User not authenticated" Origin
- **File**: `src/app/api/insights/route.ts:12`
- **Condition**: `authError || !user` from `supabase.auth.getUser()`
- **Response**: `{ ok: false, reason: 'not_authenticated', message: 'User not authenticated' }`

### Error Handling Flow
1. **Not Enough Data**: Requires minimum 5 days of measurements
2. **Missing OpenAI Key**: `OPENAI_API_KEY` environment variable check
3. **API Errors**: OpenAI API failures with fallback responses
4. **Network Errors**: Client-side catch blocks with user-friendly messages

## Data Sources Used for Insights

### Metrics Fetched
- **Source**: `measurements` table in Supabase
- **Time Range**: Last 30 days
- **Join**: `metric_definitions` for metadata
- **Fields**: All measurement types (numeric, text, boolean)
- **User Filter**: `user_id` from authenticated session

### Data Processing
- **File**: `src/app/api/insights/route.ts:100-130`
- **Grouping**: By date and metric slug
- **Structure**: Daily data with metric name, unit, and value
- **Format**: JSON object for AI prompt

### Example Data Structure
```json
{
  "2024-01-15": {
    "weight": { "value": 70.5, "unit": "kg", "name": "Weight" },
    "sleep_hours": { "value": 7.5, "unit": "hours", "name": "Sleep Hours" }
  }
}
```

## LLM Provider Details

### Provider Configuration
- **Library**: Native `fetch()` to OpenAI API
- **Model**: `gpt-3.5-turbo`
- **Environment Variable**: `OPENAI_API_KEY`
- **Endpoint**: `https://api.openai.com/v1/chat/completions`

### Prompt Structure
- **System Prompt**: Health coach persona with JSON output format
- **User Prompt**: 30 days of health data in JSON format
- **Temperature**: 0.7 (balanced creativity)
- **Max Tokens**: 500 (concise responses)

### Expected Response Format
```json
{
  "summary": "brief summary here",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "observations": ["observation 1", "observation 2"]
}
```

## Request/Response Contract

### Client Request
```typescript
// POST /api/insights
{
  // No body required - all data fetched server-side
}
```

### Server Response (Success)
```typescript
{
  ok: true,
  insights: {
    summary: string,
    recommendations: string[],
    observations: string[]
  },
  plan: {
    focus_areas: string[],
    weekly_goals: string[]
  }
}
```

### Server Response (Error)
```typescript
{
  ok: false,
  reason: 'not_authenticated' | 'not_enough_data' | 'no_openai_key' | 'fetch_error' | 'server_error',
  message: string
}
```

## How to Test Locally

### Prerequisites
1. Set `OPENAI_API_KEY` environment variable
2. Ensure user is authenticated in Supabase
3. Have at least 5 days of health measurements

### Using curl
```bash
# Test the insights API directly
curl -X POST http://localhost:3000/api/insights \
  -H "Content-Type: application/json" \
  -H "Cookie: your-supabase-session-cookie" \
  -d '{}'
```

### Using fetch (browser console)
```javascript
// Test from browser console (must be authenticated)
fetch('/api/insights', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include'
})
.then(r => r.json())
.then(console.log);
```

### Environment Variables Required
```bash
OPENAI_API_KEY=sk-your-openai-api-key-here
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Paths Index

### Core Files
- `src/app/dashboard/page.tsx` - Main dashboard with insights UI
- `src/app/api/insights/route.ts` - API endpoint for insights generation
- `src/lib/services/metrics-service.ts` - Metrics data access
- `src/lib/services/insights-service.ts` - Insights service utilities
- `src/lib/types.ts` - TypeScript interfaces
- `middleware.ts` - Authentication middleware

### Supporting Files
- `src/lib/supabase/server.ts` - Supabase server client
- `src/lib/supabase/client.ts` - Supabase browser client
- `src/lib/services/profile-service.ts` - User profile management
- `tests/insights.spec.ts` - Test coverage for insights feature

### Configuration Files
- `AI_INSIGHTS_SETUP.md` - Setup documentation
- `GOALS_AND_PLANNING.md` - Feature documentation

## Open Questions

1. **Alternative API Route**: There's also `/api/insights/generate` route that may be used by the insights service - investigate if this is an alternative or deprecated endpoint.

2. **Derived Features**: The insights service references `derived_features` table and RPC functions - determine if this is used for enhanced insights or separate functionality.

3. **Caching**: No explicit caching mechanism found - investigate if insights are cached or regenerated on each request.

4. **Rate Limiting**: No rate limiting found - consider if this should be implemented for OpenAI API cost control.
