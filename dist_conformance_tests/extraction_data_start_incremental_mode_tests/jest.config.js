module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
  testTimeout: 120000,
  moduleResolution: 'node',
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  target: 'es2017',
  module: 'commonjs',
  strict: true,
  declaration: true,
  resolveJsonModule: true
};