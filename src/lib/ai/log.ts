/**
 * AI Provider Logging Utilities
 * 
 * Provides structured logging for AI insights generation with development-only output.
 */

export interface LLMEvent {
  provider: string;
  model: string;
  promptChars: number;
  latencyMs: number;
  parsed: boolean;
  error?: string;
}

/**
 * Log LLM events for observability (development only)
 * 
 * @param event - The LLM event to log
 * @param data - Additional data to include
 */
export function logLLM(event: LLMEvent, data?: Record<string, any>) {
  if (process.env.NODE_ENV === 'development') {
    const logData = {
      ...event,
      ...data,
      timestamp: new Date().toISOString()
    };
    
    console.info(`[ai] provider=${event.provider} model=${event.model} promptChars=${event.promptChars} latencyMs=${event.latencyMs} parsed=${event.parsed}`, logData);
  }
}
