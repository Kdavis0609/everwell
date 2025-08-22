/**
 * AI Provider Resolver
 * 
 * This module provides a factory function to get the appropriate AI insights provider.
 * Currently defaults to OpenAI, but can be easily extended to support other providers.
 */

import { InsightsProvider } from './types';
import { OpenAIInsightsProvider } from './openai-provider';

/**
 * Get the configured AI insights provider
 * 
 * Currently returns OpenAI provider. In the future, this can be extended to:
 * - Check environment variables for provider preference
 * - Support Azure OpenAI, OpenRouter, Anthropic, etc.
 * - Implement provider fallback logic
 * 
 * @returns Configured insights provider
 */
export function getInsightsProvider(): InsightsProvider {
  // For now, return OpenAI provider
  // TODO: Add provider selection logic based on environment variables
  // Example: process.env.AI_PROVIDER === 'azure' ? new AzureProvider() : new OpenAIProvider()
  return new OpenAIInsightsProvider();
}

// Re-export types for convenience
export type { InsightsProvider, InsightsPayload, InsightsResult } from './types';
export { OpenAIInsightsProvider } from './openai-provider';
