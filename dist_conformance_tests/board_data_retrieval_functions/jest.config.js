module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds timeout as per requirements
  testMatch: ['**/*.test.ts'],
  setupFilesAfterEnv: ['./jest.setup.js'],
};