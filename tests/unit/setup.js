/**
 * Jest Setup File - Global Mocks and Configuration
 * Session #15: Unit Tests für JS Utils
 *
 * @created 2026-01-13
 */

// Mock window object for browser globals
global.window = global.window || {};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn()
};

// Mock DEBUG flag (disabled by default in tests)
global.window.DEBUG = false;

// Mock localStorage
const localStorageMock = {
  store: {},
  getItem: jest.fn((key) => localStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { localStorageMock.store[key] = value; }),
  removeItem: jest.fn((key) => { delete localStorageMock.store[key]; }),
  clear: jest.fn(() => { localStorageMock.store = {}; })
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  store: {},
  getItem: jest.fn((key) => sessionStorageMock.store[key] || null),
  setItem: jest.fn((key, value) => { sessionStorageMock.store[key] = value; }),
  removeItem: jest.fn((key) => { delete sessionStorageMock.store[key]; }),
  clear: jest.fn(() => { sessionStorageMock.store = {}; })
};
global.sessionStorage = sessionStorageMock;

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
  localStorageMock.store = {};
  sessionStorageMock.store = {};
});

// Clean up after all tests
afterAll(() => {
  jest.restoreAllMocks();
});
