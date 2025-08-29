const https = require('https');

function debugKeyComparison() {
  console.log('🔍 Debugging API key comparison...');
  
  const localKey = process.env.OPENAI_API_KEY;
  if (!localKey) {
    console.error('❌ No local API key found');
    return;
  }

  console.log(`📏 Local key length: ${localKey.length}`);
  console.log(`🔑 Local key prefix: ${localKey.substring(0, 20)}...`);
  console.log(`🔑 Local key suffix: ...${localKey.substring(localKey.length - 10)}`);
  
  // Check for hidden characters
  console.log('\n🔍 Character analysis:');
  console.log(`- Contains spaces: ${localKey.includes(' ')}`);
  console.log(`- Contains tabs: ${localKey.includes('\t')}`);
  console.log(`- Contains newlines: ${localKey.includes('\n')}`);
  console.log(`- Contains carriage returns: ${localKey.includes('\r')}`);
  
  // Show hex representation of first and last few characters
  console.log('\n🔍 Hex analysis:');
  console.log(`- First 10 chars hex: ${Buffer.from(localKey.substring(0, 10)).toString('hex')}`);
  console.log(`- Last 10 chars hex: ${Buffer.from(localKey.substring(localKey.length - 10)).toString('hex')}`);
  
  // Test the key directly
  console.log('\n🧪 Testing local key...');
  testKey(localKey, 'Local');
}

function testKey(apiKey, label) {
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

  const req = https.request(options, (res) => {
    let responseData = '';
    
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      try {
        const parsed = JSON.parse(responseData);
        console.log(`\n📊 ${label} Key Test Results:`);
        console.log(`- Status: ${res.statusCode}`);
        console.log(`- Success: ${res.statusCode === 200 ? '✅' : '❌'}`);
        
        if (res.statusCode === 200) {
          console.log(`- Response: ${parsed.choices?.[0]?.message?.content || 'No content'}`);
        } else if (parsed.error) {
          console.log(`- Error: ${parsed.error.message || parsed.error}`);
          console.log(`- Error Type: ${parsed.error.type || 'Unknown'}`);
        }
      } catch (parseError) {
        console.log(`❌ Failed to parse ${label} response:`, responseData);
      }
    });
  });

  req.on('error', (error) => {
    console.error(`❌ ${label} request error:`, error.message);
  });

  req.write(data);
  req.end();
}

debugKeyComparison();
