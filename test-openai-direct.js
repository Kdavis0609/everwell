const https = require('https');

async function testOpenAIDirect() {
  console.log('🔍 Testing OpenAI API key directly...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment');
    return;
  }

  console.log(`📝 API Key present: ${apiKey ? 'Yes' : 'No'}`);
  console.log(`🔑 API Key prefix: ${apiKey.substring(0, 10)}...`);
  console.log(`📏 API Key length: ${apiKey.length}`);

  const data = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Say 'Hello World' only" }],
    max_tokens: 10
  });

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`📊 Status Code: ${res.statusCode}`);
        console.log(`📋 Response Headers:`, res.headers);
        
        try {
          const parsed = JSON.parse(responseData);
          console.log(`📄 Response:`, JSON.stringify(parsed, null, 2));
          
          if (res.statusCode === 200) {
            console.log('✅ API Key is valid and working!');
            console.log(`💬 Response: ${parsed.choices?.[0]?.message?.content || 'No content'}`);
          } else {
            console.log('❌ API Key test failed');
            if (parsed.error) {
              console.log(`🚨 Error: ${parsed.error.message || parsed.error}`);
            }
          }
        } catch (parseError) {
          console.log('❌ Failed to parse response:', responseData);
        }
        
        resolve();
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request error:', error.message);
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

// Run the test
testOpenAIDirect().catch(console.error);
