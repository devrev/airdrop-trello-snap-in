module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 110000, // Just under 2 minutes timeout
  slowTestThreshold: 60, // Mark tests as slow if they take more than 60 seconds
  maxWorkers: 1, // Run tests sequentially to avoid port conflicts
  forceExit: true, // Force exit after all tests complete
  detectOpenHandles: true, // Help identify open handles
};