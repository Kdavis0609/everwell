const http = require('http');

async function testMiddleware() {
  console.log('🔍 Testing Middleware Protection...\n');

  const testRoutes = [
    '/profile',
    '/dashboard',
    '/login'
  ];

  for (const route of testRoutes) {
    try {
      console.log(`Testing ${route}...`);
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: route,
        method: 'GET',
        headers: {
          'User-Agent': 'test-script'
        }
      };

      const result = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          const isRedirect = res.statusCode >= 300 && res.statusCode < 400;
          const location = res.headers.location;
          
          resolve({
            statusCode: res.statusCode,
            isRedirect,
            location,
            headers: res.headers
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        req.end();
      });

      if (result.isRedirect) {
        console.log(`✅ ${route} - Redirects to: ${result.location} (Status: ${result.statusCode})`);
      } else {
        console.log(`📄 ${route} - Direct access allowed (Status: ${result.statusCode})`);
      }

    } catch (error) {
      console.log(`❌ ${route} - Error: ${error.message}`);
    }
  }

  console.log('\n💡 Expected behavior:');
  console.log('- /profile should redirect to /login (if not authenticated)');
  console.log('- /dashboard should redirect to /login (if not authenticated)');
  console.log('- /login should load directly');
}

testMiddleware().catch(console.error);
