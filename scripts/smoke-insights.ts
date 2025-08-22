#!/usr/bin/env node

/**
 * Smoke Test for AI Insights Provider
 * 
 * This script tests the AI provider with a minimal payload to ensure it's working correctly.
 * Run with: node scripts/smoke-insights.ts
 */

// Simple mock data for testing
const mockPayload = {
  days: 7,
  dataByDate: {
    "2024-01-15": {
      "weight": { "value": 70.5, "unit": "kg", "name": "Weight" },
      "sleep_hours": { "value": 7.5, "unit": "hours", "name": "Sleep Hours" }
    },
    "2024-01-16": {
      "weight": { "value": 70.3, "unit": "kg", "name": "Weight" },
      "sleep_hours": { "value": 8.0, "unit": "hours", "name": "Sleep Hours" }
    },
    "2024-01-17": {
      "weight": { "value": 70.4, "unit": "kg", "name": "Weight" },
      "sleep_hours": { "value": 7.0, "unit": "hours", "name": "Sleep Hours" }
    }
  }
};

async function runSmokeTest() {
  console.log('🧪 Running AI Insights Provider Smoke Test...\n');

  try {
    // Check environment
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY environment variable is required');
      console.log('💡 Set it with: export OPENAI_API_KEY=your-key-here');
      process.exit(1);
    }

    console.log('✅ Environment check passed');

    // Import the provider (this will test the import)
    const { getInsightsProvider } = await import('../src/lib/ai/index.js');
    
    console.log('✅ Provider import successful');

    // Create provider instance
    const provider = getInsightsProvider();
    console.log('✅ Provider instance created');

    // Test with mock data
    console.log('\n📊 Testing with mock data...');
    console.log('Payload:', JSON.stringify(mockPayload, null, 2));

    const startTime = Date.now();
    const result = await provider.generateInsights(mockPayload);
    const duration = Date.now() - startTime;

    console.log('\n✅ AI Insights generated successfully!');
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log('\n📝 Result:');
    console.log(JSON.stringify(result, null, 2));

    // Validate result structure
    if (result.summary && Array.isArray(result.recommendations) && Array.isArray(result.observations)) {
      console.log('\n✅ Result structure validation passed');
    } else {
      console.log('\n❌ Result structure validation failed');
      process.exit(1);
    }

    console.log('\n🎉 Smoke test completed successfully!');

  } catch (error) {
    console.error('\n❌ Smoke test failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run the test
runSmokeTest();
