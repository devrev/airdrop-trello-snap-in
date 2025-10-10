module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds as per requirements
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
};