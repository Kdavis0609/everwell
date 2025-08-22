#!/usr/bin/env node

/**
 * Test Usage Tracking and Caching
 * 
 * This script tests the usage tracking and caching functionality.
 * Run with: node scripts/test-usage-cache.ts
 */

import { createClient } from '@supabase/supabase-js';

async function testUsageAndCache() {
  console.log('🧪 Testing Usage Tracking and Caching...\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    console.log('💡 Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Test 1: Check if tables exist
    console.log('📋 Testing table existence...');
    
    const { data: usageTable, error: usageError } = await supabase
      .from('insights_usage')
      .select('*')
      .limit(1);
    
    if (usageError) {
      console.error('❌ insights_usage table error:', usageError);
    } else {
      console.log('✅ insights_usage table exists');
    }

    const { data: cacheTable, error: cacheError } = await supabase
      .from('insights_cache')
      .select('*')
      .limit(1);
    
    if (cacheError) {
      console.error('❌ insights_cache table error:', cacheError);
    } else {
      console.log('✅ insights_cache table exists');
    }

    // Test 2: Test RPC functions
    console.log('\n🔧 Testing RPC functions...');
    
    const testUserId = '00000000-0000-0000-0000-000000000000';
    
    // Test increment function
    const { error: incrementError } = await supabase.rpc('increment_insights_usage', {
      user_uuid: testUserId
    });
    
    if (incrementError) {
      console.error('❌ increment_insights_usage error:', incrementError);
    } else {
      console.log('✅ increment_insights_usage function works');
    }

    // Test get usage function
    const { data: usageCount, error: getUsageError } = await supabase.rpc('get_today_insights_usage', {
      user_uuid: testUserId
    });
    
    if (getUsageError) {
      console.error('❌ get_today_insights_usage error:', getUsageError);
    } else {
      console.log(`✅ get_today_insights_usage works: ${usageCount}`);
    }

    // Test limit check function
    const { data: limitExceeded, error: limitError } = await supabase.rpc('has_exceeded_daily_limit', {
      user_uuid: testUserId,
      daily_limit: 10
    });
    
    if (limitError) {
      console.error('❌ has_exceeded_daily_limit error:', limitError);
    } else {
      console.log(`✅ has_exceeded_daily_limit works: ${limitExceeded}`);
    }

    console.log('\n🎉 Usage tracking and caching tests completed!');
    console.log('\n📝 Next steps:');
    console.log('1. Run the migration: supabase db push');
    console.log('2. Test the insights API with a real user');
    console.log('3. Check cache hits in the console logs');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUsageAndCache();
