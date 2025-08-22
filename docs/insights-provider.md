# AI Insights Provider Documentation

## Overview

The AI Insights Provider system provides a clean abstraction for generating health insights using various LLM providers. Currently supports OpenAI with plans to add Azure OpenAI, OpenRouter, and other providers.

## Architecture

### Provider Pattern

The system uses a provider pattern with a common interface:

```typescript
interface InsightsProvider {
  generateInsights(payload: InsightsPayload, opts?: { signal?: AbortSignal }): Promise<InsightsResult>;
}
```

### Current Providers

- **OpenAI**: Uses GPT-4o-mini by default (fast, cost-effective)
- **Future**: Azure OpenAI, OpenRouter, Anthropic, etc.

## Configuration

### Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional (with defaults)
OPENAI_MODEL=gpt-4o-mini
OPENAI_BASE_URL=https://api.openai.com/v1
```

### Model Selection

The default model is `gpt-4o-mini` which provides:
- Fast response times (~1-2 seconds)
- Good reasoning capabilities
- Cost-effective pricing
- Reliable JSON output

To use a different model, set `OPENAI_MODEL`:
```bash
OPENAI_MODEL=gpt-4o  # More capable but slower
OPENAI_MODEL=gpt-3.5-turbo  # Faster but less capable
```

## Output Schema

The provider returns structured insights in this format:

```typescript
{
  summary: string;           // Brief health patterns summary (max 120 words)
  recommendations: string[]; // 3-6 actionable recommendations
  observations: string[];    // 2-5 gentle pattern observations
}
```

### Validation

All responses are validated using Zod schema validation:
- Ensures required fields are present
- Validates array lengths (3-6 recommendations, 2-5 observations)
- Provides safe fallback if validation fails

## Error Handling

### Common Error Scenarios

1. **Missing API Key**
   ```
   Error: OPENAI_API_KEY environment variable is required
   Response: { ok: false, reason: 'no_openai_key', message: '...' }
   ```

2. **Invalid API Key**
   ```
   Error: OpenAI API error: 401 Unauthorized
   Response: { ok: false, reason: 'no_openai_key', message: '...' }
   ```

3. **Rate Limiting**
   ```
   Error: OpenAI API error: 429 Too Many Requests
   Response: { ok: false, reason: 'rate_limit', message: '...' }
   ```

4. **Timeout**
   ```
   Error: Request timeout - please try again
   Response: { ok: false, reason: 'timeout', message: '...' }
   ```

5. **Invalid JSON Response**
   ```
   Behavior: Returns safe fallback response
   Logs: Error details to console
   ```

6. **Usage Limit Exceeded**
   ```
   Error: Daily limit exceeded. You've used 5/5 insights today.
   Response: { ok: false, reason: 'usage_limit_exceeded', message: '...' }
   ```

### Fallback Behavior

When the AI provider fails to return valid JSON, the system returns a conservative fallback:

```json
{
  "summary": "Your health data shows consistent tracking. Keep up the great work!",
  "recommendations": [
    "Continue tracking your daily metrics",
    "Set small, achievable goals for the week", 
    "Stay consistent with your routine"
  ],
  "observations": [
    "Consistent tracking is a great foundation for health improvement",
    "Small, daily actions lead to meaningful long-term results"
  ]
}
```

## Observability

### Development Logging

In development mode, the provider logs detailed information:

```
[ai] provider=openai model=gpt-4o-mini promptChars=12345 latencyMs=842 parsed=true
```

### Logged Information

- **Provider**: Which AI provider was used
- **Model**: Specific model name
- **PromptChars**: Total characters in the prompt
- **LatencyMs**: Request duration in milliseconds
- **Parsed**: Whether JSON parsing succeeded
- **Error**: Error details if parsing failed

## Adding New Providers

### Step 1: Create Provider Class

```typescript
// src/lib/ai/azure-provider.ts
import { InsightsProvider, InsightsPayload, InsightsResult } from './types';

export class AzureOpenAIProvider implements InsightsProvider {
  async generateInsights(payload: InsightsPayload, opts?: { signal?: AbortSignal }): Promise<InsightsResult> {
    // Implementation here
  }
}
```

### Step 2: Update Provider Resolver

```typescript
// src/lib/ai/index.ts
export function getInsightsProvider(): InsightsProvider {
  const provider = process.env.AI_PROVIDER || 'openai';
  
  switch (provider) {
    case 'azure':
      return new AzureOpenAIProvider();
    case 'openai':
    default:
      return new OpenAIInsightsProvider();
  }
}
```

### Step 3: Add Environment Variables

```bash
AI_PROVIDER=azure
AZURE_OPENAI_API_KEY=your-key
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
AZURE_OPENAI_DEPLOYMENT=your-deployment
```

## Testing

### Manual Testing

1. Set environment variables
2. Ensure user has ≥5 days of measurements
3. Click "Generate Insights" in dashboard
4. Check console for `[ai]` log lines
5. Verify insights appear in UI

### Unit Testing

```bash
npm test tests/insights.provider.spec.ts
```

### Smoke Testing

```bash
node scripts/smoke-insights.ts
```

## Troubleshooting

### "User not authenticated" Error

- Check if user is logged in
- Verify Supabase session cookies are being sent
- Check middleware configuration

### "No OpenAI API key" Error

- Set `OPENAI_API_KEY` environment variable
- Restart development server
- Verify key is valid

### "Request timeout" Error

- Check network connectivity
- Verify OpenAI API is accessible
- Consider reducing prompt size

### "Rate limit exceeded" Error

- Wait a few minutes before retrying
- Consider implementing exponential backoff
- Check OpenAI usage dashboard

### Invalid JSON Response

- Check console for raw response
- Verify prompt structure
- Consider adjusting temperature or model

## Performance Considerations

### Timeouts

- Default timeout: 25 seconds
- Configurable via provider config
- AbortController for cancellation

### Token Limits

- Max tokens: 600 (configurable)
- Temperature: 0.7 (balanced creativity)
- Prompt optimization for cost efficiency

### Caching

The system implements intelligent caching to reduce costs and improve performance:

- **Cache Key**: SHA-256 hash of the metrics payload
- **TTL**: 24 hours (configurable)
- **Storage**: PostgreSQL with automatic cleanup
- **Cache Hit**: Returns instantly without LLM call
- **Cache Miss**: Generates new insights and caches result

### Usage Tracking

Per-user daily usage tracking with configurable limits:

- **Free Tier**: 5 insights per day
- **Premium Tier**: 50 insights per day (configurable)
- **Unlimited**: No limits (for admin users)
- **Tracking**: Daily, weekly, and monthly statistics
- **API Endpoint**: `/api/insights/usage` for usage stats
