// Test SendGrid API key directly
const https = require('https');

async function testSendGridAPI() {
  console.log('Testing SendGrid API key...');
  
  // You'll need to replace this with your actual API key
  const apiKey = process.env.SENDGRID_API_KEY;
  
  if (!apiKey) {
    console.error('❌ SENDGRID_API_KEY not found in environment variables');
    return;
  }

  const data = JSON.stringify({
    personalizations: [
      {
        to: [{ email: 'test@example.com' }]
      }
    ],
    from: { email: 'kevin@everwellhealth.us', name: 'EverWell' },
    subject: 'Test Email from SendGrid API',
    content: [
      {
        type: 'text/plain',
        value: 'This is a test email sent directly via SendGrid API.'
      }
    ]
  });

  const options = {
    hostname: 'api.sendgrid.com',
    port: 443,
    path: '/v3/mail/send',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`);
    
    let responseData = '';
    res.on('data', (chunk) => {
      responseData += chunk;
    });
    
    res.on('end', () => {
      if (res.statusCode === 202) {
        console.log('✅ SendGrid API key is working!');
      } else {
        console.log('❌ SendGrid API error:');
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

testSendGridAPI();
