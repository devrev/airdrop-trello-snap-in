module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'es2017',
        module: 'commonjs',
        esModuleInterop: true,
        strict: true,
        declaration: true,
        resolveJsonModule: true,
      }
    }]
  },
  testTimeout: 120000,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};