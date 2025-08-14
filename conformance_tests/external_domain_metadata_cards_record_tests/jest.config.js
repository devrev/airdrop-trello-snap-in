module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  testMatch: ['**/*.test.ts'], 
  verbose: true,
  forceExit: true, // Force Jest to exit after all tests complete
  maxWorkers: 1  // Run tests sequentially to avoid interference
};