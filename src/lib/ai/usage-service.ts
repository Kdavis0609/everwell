/**
 * AI Insights Usage and Cache Service
 * 
 * Manages usage tracking and caching for AI insights to optimize costs and performance.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { InsightsPayload, InsightsResult } from './types';
import { hashPayload, isCacheValid, getTodayDate, USAGE_LIMITS, isUsageLimitExceeded } from './utils';
import { logError } from '@/lib/logError';

export interface UsageInfo {
  todayCount: number;
  dailyLimit: number;
  canGenerate: boolean;
}

export interface CacheEntry {
  content: InsightsResult;
  createdAt: string;
  isValid: boolean;
}

export class InsightsUsageService {
  /**
   * Check if user can generate insights (usage limit check)
   */
  static async checkUsageLimit(sb: SupabaseClient, userId: string): Promise<UsageInfo> {
    try {
      // Function may not exist in database, so we'll use a fallback approach
      const todayCount = 0; // Default to 0 since we can't track usage yet
      const dailyLimit = USAGE_LIMITS.FREE_TIER;
      const canGenerate = true; // Always allow for now

      return {
        todayCount,
        dailyLimit,
        canGenerate
      };
    } catch (error) {
      logError('checkUsageLimit.catch', error, { userId });
      // On error, allow generation but log the issue
      return {
        todayCount: 0,
        dailyLimit: USAGE_LIMITS.FREE_TIER,
        canGenerate: true
      };
    }
  }

  /**
   * Increment usage count for today
   */
  static async incrementUsage(sb: SupabaseClient, userId: string): Promise<void> {
    try {
      // Function may not exist in database, so we'll skip usage tracking for now
      console.log('Usage tracking not available - skipping increment');
    } catch (error) {
      logError('incrementUsage.catch', error, { userId });
    }
  }

  /**
   * Get cached insights if available and valid
   */
  static async getCachedInsights(
    sb: SupabaseClient, 
    userId: string, 
    payload: InsightsPayload
  ): Promise<CacheEntry | null> {
    try {
      const payloadHash = await hashPayload(payload);
      const cacheDate = getTodayDate();

      const { data: cacheEntry, error } = await sb
        .from('insights_cache')
        .select('content, created_at')
        .eq('user_id', userId)
        .eq('cache_date', cacheDate)
        .eq('payload_hash', payloadHash)
        .single();

      if (error || !cacheEntry) {
        return null;
      }

      const isValid = isCacheValid(cacheEntry.created_at, 24); // 24 hour TTL

      return {
        content: cacheEntry.content as InsightsResult,
        createdAt: cacheEntry.created_at,
        isValid
      };
    } catch (error) {
      logError('getCachedInsights.catch', error, { userId });
      return null;
    }
  }

  /**
   * Store insights in cache
   */
  static async cacheInsights(
    sb: SupabaseClient,
    userId: string,
    payload: InsightsPayload,
    result: InsightsResult
  ): Promise<void> {
    try {
      const payloadHash = await hashPayload(payload);
      const cacheDate = getTodayDate();

      const { error } = await sb
        .from('insights_cache')
        .upsert({
          user_id: userId,
          cache_date: cacheDate,
          payload_hash: payloadHash,
          content: result
        }, {
          onConflict: 'user_id,cache_date,payload_hash'
        });

      if (error) {
        logError('cacheInsights.upsert', error, { userId });
      }
    } catch (error) {
      logError('cacheInsights.catch', error, { userId });
    }
  }

  /**
   * Clear old cache entries (older than 7 days)
   */
  static async clearOldCache(sb: SupabaseClient, userId: string): Promise<void> {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const cutoffDate = sevenDaysAgo.toISOString().split('T')[0];

      const { error } = await sb
        .from('insights_cache')
        .delete()
        .eq('user_id', userId)
        .lt('cache_date', cutoffDate);

      if (error) {
        logError('clearOldCache.delete', error, { userId });
      }
    } catch (error) {
      logError('clearOldCache.catch', error, { userId });
    }
  }

  /**
   * Get user's usage statistics
   */
  static async getUsageStats(sb: SupabaseClient, userId: string): Promise<{
    todayCount: number;
    weeklyCount: number;
    monthlyCount: number;
  }> {
    try {
      const today = getTodayDate();
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);

      const { data: usage, error } = await sb
        .from('insights_usage')
        .select('day, count')
        .eq('user_id', userId)
        .gte('day', monthAgo.toISOString().split('T')[0])
        .order('day', { ascending: false });

      if (error) {
        logError('getUsageStats.select', error, { userId });
        return { todayCount: 0, weeklyCount: 0, monthlyCount: 0 };
      }

      const todayCount = usage?.find(u => u.day === today)?.count || 0;
      const weeklyCount = usage
        ?.filter(u => u.day >= weekAgo.toISOString().split('T')[0])
        ?.reduce((sum, u) => sum + u.count, 0) || 0;
      const monthlyCount = usage
        ?.filter(u => u.day >= monthAgo.toISOString().split('T')[0])
        ?.reduce((sum, u) => sum + u.count, 0) || 0;

      return { todayCount, weeklyCount, monthlyCount };
    } catch (error) {
      logError('getUsageStats.catch', error, { userId });
      return { todayCount: 0, weeklyCount: 0, monthlyCount: 0 };
    }
  }
}
