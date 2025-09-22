module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 120000, // 120 seconds timeout as per requirements
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2017',
        module: 'commonjs',
        strict: true,
        esModuleInterop: true,
        resolveJsonModule: true,
        declaration: true
      }
    }]
  }
};