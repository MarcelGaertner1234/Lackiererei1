/**
 * Jest Configuration - Unit Tests for JS Utilities
 * Session #15 (2026-01-12)
 *
 * Diese Konfiguration testet reine JavaScript-Funktionen
 * ohne Browser oder Firebase-Abhängigkeiten.
 */

module.exports = {
  // Node.js environment (no browser)
  testEnvironment: 'node',

  // Test file patterns
  testMatch: ['**/tests/unit/**/*.test.js'],

  // Coverage collection
  collectCoverageFrom: [
    'js/service-types.js',
    'js/utils/*.js',
    'listener-registry.js',
    'error-handler.js',
    '!js/**/*.backup*',
    '!**/node_modules/**'
  ],

  // Coverage output
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],

  // Coverage thresholds (80% minimum)
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // Verbose output
  verbose: true,

  // Timeout for slow tests
  testTimeout: 5000,

  // Clear mocks between tests
  clearMocks: true,

  // Transform settings (ES modules)
  transform: {},

  // Module name mapping for imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
