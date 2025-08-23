#!/usr/bin/env node

/**
 * Check Console Errors Script
 * Scans the codebase for potential console error sources
 */

const fs = require('fs');
const path = require('path');

function findConsoleErrors(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      findConsoleErrors(filePath, results);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.jsx')) {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        if (line.includes('console.error')) {
          results.push({
            file: filePath,
            line: index + 1,
            content: line.trim()
          });
        }
      });
    }
  }
  
  return results;
}

function main() {
  console.log('🔍 Scanning for console.error statements...\n');
  
  const errors = findConsoleErrors('./src');
  
  console.log(`📊 Found ${errors.length} console.error statements:\n`);
  
  if (errors.length === 0) {
    console.log('✅ No console.error statements found!');
    return;
  }
  
  errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.file}:${error.line}`);
    console.log(`   ${error.content}`);
    console.log('');
  });
  
  console.log('💡 Consider replacing console.error with console.warn for non-critical errors');
  console.log('💡 Or use proper error logging services for production');
}

main();
