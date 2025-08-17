#!/usr/bin/env node

const { execSync } = require('child_process');

try {
  // Check Tailwind CSS
  console.log('🔍 Checking Tailwind CSS...');
  execSync('npm run check:tailwind', { stdio: 'inherit' });
  
  // Run smoke test with custom port
  console.log('🧪 Running Tailwind smoke test...');
  process.env.PLAYWRIGHT_PORT = '3030';
  execSync('playwright test tests/tailwind.smoke.spec.ts', { 
    stdio: 'inherit',
    env: { ...process.env, PLAYWRIGHT_PORT: '3030' }
  });
  
  console.log('✅ All Tailwind UI verification passed!');
} catch (error) {
  console.error('❌ Tailwind UI verification failed:', error.message);
  process.exit(1);
}
