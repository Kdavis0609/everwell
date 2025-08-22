/**
 * AI Provider Utilities
 * 
 * Utility functions for payload hashing, cache management, and usage tracking.
 */

import { InsightsPayload } from './types';

/**
 * Generate a hash for the payload to use as cache key
 * 
 * @param payload - The insights payload to hash
 * @returns SHA-256 hash of the payload
 */
export async function hashPayload(payload: InsightsPayload): Promise<string> {
  const payloadString = JSON.stringify(payload, Object.keys(payload).sort());
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Check if cache entry is still valid (within TTL)
 * 
 * @param createdAt - When the cache entry was created
 * @param ttlHours - Time to live in hours (default: 24)
 * @returns True if cache is still valid
 */
export function isCacheValid(createdAt: string, ttlHours: number = 24): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const ttlMs = ttlHours * 60 * 60 * 1000;
  return (now.getTime() - created.getTime()) < ttlMs;
}

/**
 * Get today's date in UTC for cache keys
 * 
 * @returns Today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Default daily usage limits
 */
export const USAGE_LIMITS = {
  FREE_TIER: 5,
  PREMIUM_TIER: 50,
  UNLIMITED: -1
} as const;

/**
 * Check if a usage count exceeds the limit
 * 
 * @param currentUsage - Current usage count
 * @param limit - Daily limit (-1 for unlimited)
 * @returns True if limit exceeded
 */
export function isUsageLimitExceeded(currentUsage: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  return currentUsage >= limit;
}
