module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['./jest.setup.js'], 
  // Add forceExit to ensure tests don't hang
  forceExit: true,
  detectOpenHandles: true
};