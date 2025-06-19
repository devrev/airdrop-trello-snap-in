module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 30000,
  verbose: true,
  globals: { 'ts-jest': { tsconfig: 'tsconfig.json' } }
};