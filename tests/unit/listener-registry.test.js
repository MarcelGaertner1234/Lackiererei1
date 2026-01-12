/**
 * Unit Tests for listener-registry.js
 * Session #15: Unit Tests für JS Utils
 *
 * Tests Firestore listener registration, memory leak prevention
 *
 * @created 2026-01-13
 */

// Load the module
const { FirestoreListenerRegistry } = require('../../listener-registry');

describe('listener-registry.js', () => {

  let registry;

  beforeEach(() => {
    // Create a fresh instance for each test
    registry = new FirestoreListenerRegistry();
  });

  // ============================================
  // Constructor
  // ============================================
  describe('Constructor', () => {
    test('initializes with empty listeners map', () => {
      expect(registry.listeners.size).toBe(0);
    });

    test('initializes with empty domListeners map', () => {
      expect(registry.domListeners.size).toBe(0);
    });

    test('initializes listener counter to 0', () => {
      expect(registry.listenerCounter).toBe(0);
    });
  });

  // ============================================
  // register()
  // ============================================
  describe('register()', () => {

    test('returns unique listener ID', () => {
      const mockUnsubscribe = jest.fn();
      const id1 = registry.register(mockUnsubscribe, 'listener1');
      const id2 = registry.register(mockUnsubscribe, 'listener2');
      expect(id1).not.toBe(id2);
    });

    test('ID format is listener_N', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      expect(id).toMatch(/^listener_\d+$/);
    });

    test('increments listener counter', () => {
      const mockUnsubscribe = jest.fn();
      registry.register(mockUnsubscribe, 'test1');
      registry.register(mockUnsubscribe, 'test2');
      expect(registry.listenerCounter).toBe(2);
    });

    test('stores listener in map', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      expect(registry.listeners.has(id)).toBe(true);
    });

    test('stores description with listener', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'My Description');
      const listener = registry.listeners.get(id);
      expect(listener.description).toBe('My Description');
    });

    test('uses default description if not provided', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe);
      const listener = registry.listeners.get(id);
      expect(listener.description).toBe('Unnamed listener');
    });
  });

  // ============================================
  // unregister()
  // ============================================
  describe('unregister()', () => {

    test('calls unsubscribe function', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      registry.unregister(id);
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });

    test('removes listener from map', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      expect(registry.listeners.size).toBe(1);
      registry.unregister(id);
      expect(registry.listeners.size).toBe(0);
    });

    test('returns true on successful unregister', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      const result = registry.unregister(id);
      expect(result).toBe(true);
    });

    test('returns false for non-existent ID', () => {
      const result = registry.unregister('nonexistent_id');
      expect(result).toBe(false);
    });
  });

  // ============================================
  // unregisterAll()
  // ============================================
  describe('unregisterAll()', () => {

    test('calls all unsubscribe functions', () => {
      const mock1 = jest.fn();
      const mock2 = jest.fn();
      const mock3 = jest.fn();
      registry.register(mock1, 'test1');
      registry.register(mock2, 'test2');
      registry.register(mock3, 'test3');

      registry.unregisterAll();

      expect(mock1).toHaveBeenCalledTimes(1);
      expect(mock2).toHaveBeenCalledTimes(1);
      expect(mock3).toHaveBeenCalledTimes(1);
    });

    test('clears listeners map', () => {
      const mockUnsubscribe = jest.fn();
      registry.register(mockUnsubscribe, 'test1');
      registry.register(mockUnsubscribe, 'test2');
      expect(registry.listeners.size).toBe(2);

      registry.unregisterAll();
      expect(registry.listeners.size).toBe(0);
    });

    test('handles errors in unsubscribe gracefully', () => {
      const throwingUnsubscribe = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalUnsubscribe = jest.fn();
      registry.register(throwingUnsubscribe, 'thrower');
      registry.register(normalUnsubscribe, 'normal');

      // Should not throw
      expect(() => registry.unregisterAll()).not.toThrow();
      // Second unsubscribe should still be called
      expect(normalUnsubscribe).toHaveBeenCalled();
    });
  });

  // ============================================
  // getActiveListeners()
  // ============================================
  describe('getActiveListeners()', () => {

    test('returns empty array when no listeners', () => {
      const active = registry.getActiveListeners();
      expect(active).toEqual([]);
    });

    test('returns array of active listener info', () => {
      const mockUnsubscribe = jest.fn();
      registry.register(mockUnsubscribe, 'test');
      const active = registry.getActiveListeners();
      expect(active).toHaveLength(1);
      expect(active[0].type).toBe('Firestore');
      expect(active[0].description).toBe('test');
    });

    test('includes listener ID in result', () => {
      const mockUnsubscribe = jest.fn();
      const id = registry.register(mockUnsubscribe, 'test');
      const active = registry.getActiveListeners();
      expect(active[0].id).toBe(id);
    });

    test('includes registration timestamp', () => {
      const mockUnsubscribe = jest.fn();
      registry.register(mockUnsubscribe, 'test');
      const active = registry.getActiveListeners();
      expect(active[0].registeredAt).toBeDefined();
    });
  });

  // ============================================
  // DOM Listeners
  // ============================================
  describe('DOM Listeners', () => {

    test('registerDOM adds event listener', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      const mockHandler = jest.fn();

      registry.registerDOM(mockElement, 'click', mockHandler, 'test');
      expect(mockElement.addEventListener).toHaveBeenCalledWith('click', mockHandler);
    });

    test('unregisterDOM removes event listener', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      const mockHandler = jest.fn();

      const id = registry.registerDOM(mockElement, 'click', mockHandler, 'test');
      registry.unregisterDOM(id);
      expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', mockHandler);
    });

    test('unregisterAll cleans up DOM listeners', () => {
      const mockElement = {
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      };
      const mockHandler = jest.fn();

      registry.registerDOM(mockElement, 'click', mockHandler, 'test');
      registry.unregisterAll();
      expect(mockElement.removeEventListener).toHaveBeenCalled();
      expect(registry.domListeners.size).toBe(0);
    });
  });

});
