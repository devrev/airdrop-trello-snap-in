/**
 * This script runs tests sequentially to avoid connection issues
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get all test files
const testFiles = fs.readdirSync(__dirname)
  .filter(file => file.endsWith('.test.ts'))
  .map(file => path.join(__dirname, file));

console.log('Running tests sequentially:');
testFiles.forEach((file, index) => {
  console.log(`\n[${index + 1}/${testFiles.length}] Running test: ${path.basename(file)}`);
  try {
    // Run each test file individually
    execSync(`npx jest ${file} --forceExit --detectOpenHandles`, { 
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_OPTIONS: '--max-old-space-size=4096' // Increase memory limit
      }
    });
  } catch (error) {
    console.error(`Test failed: ${path.basename(file)}`);
    // Continue with next test even if this one fails
  }
});