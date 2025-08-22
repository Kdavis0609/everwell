import { z } from 'zod';

/**
 * Zod schema for validating AI insights responses
 * 
 * This ensures the LLM returns properly structured JSON that matches our expected format.
 */

export const InsightsResultSchema = z.object({
  summary: z.string().min(1, 'Summary is required'),
  recommendations: z.array(z.string().min(1, 'Recommendation cannot be empty')).min(3, 'At least 3 recommendations required').max(6, 'Maximum 6 recommendations allowed'),
  observations: z.array(z.string().min(1, 'Observation cannot be empty')).min(2, 'At least 2 observations required').max(5, 'Maximum 5 observations allowed')
});

export type ValidatedInsightsResult = z.infer<typeof InsightsResultSchema>;

/**
 * Safe fallback response when AI parsing fails
 */
export const FALLBACK_INSIGHTS: ValidatedInsightsResult = {
  summary: 'Your health data shows consistent tracking. Keep up the great work!',
  recommendations: [
    'Continue tracking your daily metrics',
    'Set small, achievable goals for the week',
    'Stay consistent with your routine'
  ],
  observations: [
    'Consistent tracking is a great foundation for health improvement',
    'Small, daily actions lead to meaningful long-term results'
  ]
};

/**
 * Parse and validate AI response with safe fallback
 * 
 * @param content - Raw content from LLM
 * @returns Validated insights result or fallback
 */
export function parseInsightsResponse(content: string): ValidatedInsightsResult {
  try {
    // Trim whitespace and parse JSON
    const trimmed = content.trim();
    const parsed = JSON.parse(trimmed);
    
    // Validate with Zod schema
    return InsightsResultSchema.parse(parsed);
  } catch (error) {
    console.error('Failed to parse AI insights response:', error);
    console.error('Raw content:', content);
    return FALLBACK_INSIGHTS;
  }
}
