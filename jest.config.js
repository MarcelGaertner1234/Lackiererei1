/**
 * Jest Configuration for Fahrzeugannahme App
 * Session #15: Unit Tests für JS Utils
 *
 * @created 2026-01-13
 */

module.exports = {
  // Use jsdom environment to simulate browser globals (window, document)
  testEnvironment: 'jsdom',

  // Test file patterns
  testMatch: ['**/tests/unit/**/*.test.js'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/tests/archive/'
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'js/**/*.js',
    'listener-registry.js',
    '!js/**/*.backup*',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (start low, increase over time)
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50
    }
  },

  // Setup file for global mocks
  setupFilesAfterEnv: ['<rootDir>/tests/unit/setup.js'],

  // Module file extensions
  moduleFileExtensions: ['js', 'json'],

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Timeout for tests
  testTimeout: 10000
};
