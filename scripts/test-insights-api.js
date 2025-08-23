#!/usr/bin/env node

/**
 * Test Insights API Endpoint
 * Tests the /api/insights endpoint to identify issues
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testInsightsAPI() {
  console.log('🧪 Testing Insights API...\n');
  
  try {
    // Test 1: Check if server is running
    console.log('1️⃣ Testing server connectivity...');
    const healthResponse = await fetch(`${BASE_URL}/api/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   OK: ${healthResponse.ok}`);
    
    if (!healthResponse.ok) {
      const errorText = await healthResponse.text();
      console.log(`   Error: ${errorText}`);
      
      if (healthResponse.status === 401) {
        console.log('   💡 This is expected - you need to be authenticated');
        console.log('   💡 Try logging in first, then test the insights feature in the app');
      }
    } else {
      const result = await healthResponse.json();
      console.log(`   Response: ${JSON.stringify(result, null, 2)}`);
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
    console.log('💡 Make sure your server is running on port 3000');
  }
  
  console.log('\n📋 Test Summary:');
  console.log('✅ If you see a 401 error, that means the API is working but needs authentication');
  console.log('❌ If you see a network error, make sure your server is running');
  console.log('💡 To test with authentication, log into the app and try the insights feature');
}

testInsightsAPI().catch(console.error);
