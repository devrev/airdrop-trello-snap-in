module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000,
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['./jest.setup.js'],
  forceExit: true, // Force Jest to exit after all tests complete
  detectOpenHandles: true // Help identify open handles preventing Jest from exiting
};