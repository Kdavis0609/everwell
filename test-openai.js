// Test OpenAI API key directly
const https = require('https');

async function testOpenAI() {
  console.log('Testing OpenAI API key...');
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    return;
  }

  const data = JSON.stringify({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: "Hello, this is a test message."
      }
    ],
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

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 200) {
        console.log('✅ OpenAI API key is working!');
        const result = JSON.parse(responseData);
        console.log('Response:', result.choices[0].message.content);
      } else {
        console.log('❌ OpenAI API error:');
        console.log(responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error('❌ Request error:', error.message);
  });

  req.write(data);
  req.end();
}

testOpenAI();
