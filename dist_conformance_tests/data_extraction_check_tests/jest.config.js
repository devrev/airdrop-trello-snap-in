module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  testTimeout: 120000,
  collectCoverageFrom: [
    '**/*.ts',
    '!**/*.test.ts',
  ],
};