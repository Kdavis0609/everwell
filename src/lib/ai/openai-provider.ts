import { InsightsProvider, InsightsPayload, InsightsResult, ProviderConfig } from './types';
import { parseInsightsResponse } from './schema';
import { logLLM } from './log';

/**
 * OpenAI Provider for AI Insights Generation
 * 
 * Implements the InsightsProvider interface using OpenAI's Chat Completions API.
 * Uses gpt-4o-mini by default for fast, cost-effective insights generation.
 */
export class OpenAIInsightsProvider implements InsightsProvider {
  private config: ProviderConfig;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.config = {
      apiKey,
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      baseUrl: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
      timeout: 25000 // 25 seconds
    };
  }

  async generateInsights(payload: InsightsPayload, opts?: { signal?: AbortSignal }): Promise<InsightsResult> {
    const startTime = Date.now();
    const controller = new AbortController();
    
    // Set up timeout
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
    
    // Combine with external signal if provided
    if (opts?.signal) {
      opts.signal.addEventListener('abort', () => controller.abort());
    }

    try {
      const systemPrompt = this.buildSystemPrompt();
      const userPrompt = this.buildUserPrompt(payload);
      const promptChars = systemPrompt.length + userPrompt.length;

      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 600
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      const latencyMs = Date.now() - startTime;
      const parsed = parseInsightsResponse(content);

      // Log the event
      logLLM({
        provider: 'openai',
        model: this.config.model,
        promptChars,
        latencyMs,
        parsed: true
      });

      return parsed;

    } catch (error) {
      const latencyMs = Date.now() - startTime;
      
      // Log error event
      logLLM({
        provider: 'openai',
        model: this.config.model,
        promptChars: 0,
        latencyMs,
        parsed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please try again');
        }
        if (error.message.includes('401')) {
          throw new Error('Invalid API key - please check your OpenAI configuration');
        }
        if (error.message.includes('429')) {
          throw new Error('Rate limit exceeded - please try again later');
        }
      }

      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private buildSystemPrompt(): string {
    return `You are a supportive health coach analyzing daily health metrics. Your task is to provide personalized insights and recommendations.

IMPORTANT: Return JSON only, no prose, no markdown formatting.

Required JSON structure:
{
  "summary": "Brief summary of health patterns (max 120 words)",
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "observations": ["observation 1", "observation 2"]
}

Guidelines:
- Keep tone encouraging and supportive
- Focus on lifestyle and wellness improvements
- Do not make medical claims or give medical advice
- Provide 3-6 specific, actionable recommendations
- Include 2-5 gentle observations about patterns
- Use clear, actionable language

Example response:
{
  "summary": "Your sleep patterns show consistent 7-8 hour nights, which is excellent for recovery. Weight tracking reveals a stable trend with minor fluctuations.",
  "recommendations": ["Maintain your consistent sleep schedule", "Consider adding 10 minutes of morning stretching", "Track water intake to ensure adequate hydration"],
  "observations": ["Sleep consistency is a strong foundation for health", "Weight stability suggests good metabolic balance"]
}`;
  }

  private buildUserPrompt(payload: InsightsPayload): string {
    return `Here are the user's daily health metrics for the past ${payload.days} days:

${JSON.stringify(payload.dataByDate, null, 2)}

Please analyze this data and provide insights as requested. Return only valid JSON matching the required structure.`;
  }
}
