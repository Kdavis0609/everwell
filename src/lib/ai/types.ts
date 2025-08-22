/**
 * AI Insights Provider Types
 * 
 * This module defines the interfaces and types for the AI insights provider abstraction.
 * The provider pattern allows easy switching between different LLM providers (OpenAI, Azure, etc.)
 * while maintaining a consistent API for generating health insights.
 */

export type InsightsPayload = {
  /** Number of days of data being analyzed */
  days: number;
  /** Health metrics data grouped by date */
  dataByDate: Record<string, any>;
}

export type InsightsResult = {
  /** Brief summary of health patterns (max 120 words) */
  summary: string;
  /** 3-6 specific, actionable recommendations for the next week */
  recommendations: string[];
  /** 2-5 gentle observations about patterns (if any concerning trends) */
  observations: string[];
}

export interface InsightsProvider {
  /**
   * Generate AI-powered health insights from user metrics data
   * 
   * @param payload - The health data to analyze
   * @param opts - Optional configuration including AbortSignal for timeouts
   * @returns Promise resolving to structured insights
   */
  generateInsights(payload: InsightsPayload, opts?: { signal?: AbortSignal }): Promise<InsightsResult>;
}

/**
 * Provider configuration options
 */
export interface ProviderConfig {
  /** API key for the provider */
  apiKey: string;
  /** Model name to use */
  model: string;
  /** Base URL for API calls */
  baseUrl: string;
  /** Request timeout in milliseconds */
  timeout?: number;
}
