#!/usr/bin/env node

/**
 * Simple OpenAI API Key Test Script
 * Tests if your OpenAI API key is working and has sufficient quota
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is not set');
  console.log('💡 Add this to your .env.local file:');
  console.log('   OPENAI_API_KEY=your-actual-api-key-here');
  process.exit(1);
}

if (OPENAI_API_KEY === 'your-api-key-here' || OPENAI_API_KEY.length < 10) {
  console.error('❌ OPENAI_API_KEY appears to be invalid or a placeholder');
  console.log('💡 Please set a valid OpenAI API key in your .env.local file');
  process.exit(1);
}

console.log('🔑 Testing OpenAI API key...');

async function testOpenAI() {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      console.log('✅ OpenAI API key is valid and working!');
      const data = await response.json();
      console.log(`📊 Available models: ${data.data.length}`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ OpenAI API key test failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${error.error?.message || 'Unknown error'}`);
      
      if (response.status === 401) {
        console.log('💡 Your API key is invalid. Please check your OpenAI API key.');
      } else if (response.status === 429) {
        console.log('💡 Rate limit exceeded. Please try again later.');
      } else if (response.status === 402) {
        console.log('💡 Payment required. Please check your OpenAI billing.');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error testing OpenAI API:', error.message);
    return false;
  }
}

// Test a simple completion
async function testCompletion() {
  try {
    console.log('🧠 Testing completion...');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Say "Hello, OpenAI is working!"' }
        ],
        max_tokens: 10
      })
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Completion test successful!');
      console.log(`💬 Response: ${data.choices[0]?.message?.content}`);
      return true;
    } else {
      const error = await response.json();
      console.error('❌ Completion test failed:');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${error.error?.message || 'Unknown error'}`);
      
      if (error.error?.code === 'insufficient_quota') {
        console.log('💡 Your OpenAI account has insufficient quota. Please check your billing.');
      }
      return false;
    }
  } catch (error) {
    console.error('❌ Network error testing completion:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting OpenAI API tests...\n');
  
  const modelsTest = await testOpenAI();
  console.log('');
  
  if (modelsTest) {
    await testCompletion();
  }
  
  console.log('\n📋 Summary:');
  if (modelsTest) {
    console.log('✅ Your OpenAI API key is working correctly');
    console.log('💡 You should be able to use AI features in your app');
  } else {
    console.log('❌ OpenAI API key has issues that need to be resolved');
    console.log('💡 Check the error messages above for guidance');
  }
}

main().catch(console.error);
