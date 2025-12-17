/**
 * Jest Configuration for Backend Testing
 */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.cjs'
  ],
  moduleFileExtensions: ['js', 'cjs', 'json'],
  collectCoverageFrom: [
    'server/**/*.js',
    '!server/**/__tests__/**',
    '!server/scripts/**',
    '!server/migrations/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  transform: {},
  // Handle ES modules
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.cjs'],
  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  // Force exit after tests
  forceExit: true,
  // Detect open handles
  detectOpenHandles: true
};
