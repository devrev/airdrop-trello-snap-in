module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  verbose: true,
  forceExit: true,      // Force Jest to exit after all tests complete
  detectOpenHandles: true,  // Help identify open handles
  setupFilesAfterEnv: ['./jest.setup.js'], // Ensure setup file is loaded 
  testPathIgnorePatterns: ['/node_modules/'],
  maxWorkers: 1         // Run tests sequentially to avoid port conflicts
};