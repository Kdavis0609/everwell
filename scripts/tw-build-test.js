// WHY: Test Tailwind compilation independently of Next.js
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Testing Tailwind CSS compilation...');

try {
  // Test Tailwind CLI compilation
  execSync('npx tailwindcss -i ./src/app/globals.css -o ./test-output.css --minify', { 
    stdio: 'inherit' 
  });
  
  // Check if output file was created and has content
  if (fs.existsSync('./test-output.css')) {
    const stats = fs.statSync('./test-output.css');
    console.log(`✅ Tailwind compilation successful! Output file size: ${stats.size} bytes`);
    
    if (stats.size > 1000) {
      console.log('✅ Output file is large enough to contain Tailwind utilities');
    } else {
      console.log('⚠️  Output file is small - may indicate compilation issues');
    }
    
    // Clean up
    fs.unlinkSync('./test-output.css');
  } else {
    console.log('❌ Output file was not created');
  }
} catch (error) {
  console.error('❌ Tailwind compilation failed:', error.message);
  process.exit(1);
}
