const https = require('https');

// Replace this with your new API key
const NEW_API_KEY = 'YOUR_NEW_API_KEY_HERE';

async function testNewKey() {
  console.log('🧪 Testing new OpenAI API key...');
  
  if (NEW_API_KEY === 'YOUR_NEW_API_KEY_HERE') {
    console.error('❌ Please replace NEW_API_KEY with your actual new key');
    return;
  }

  console.log(`📏 New key length: ${NEW_API_KEY.length}`);
  console.log(`🔑 New key prefix: ${NEW_API_KEY.substring(0, 20)}...`);

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
      'Authorization': `Bearer ${NEW_API_KEY}`,
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
        
        try {
          const parsed = JSON.parse(responseData);
          
          if (res.statusCode === 200) {
            console.log('✅ New API key is valid and working!');
            console.log(`💬 Response: ${parsed.choices?.[0]?.message?.content || 'No content'}`);
          } else {
            console.log('❌ New API key test failed');
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

testNewKey().catch(console.error);
