/**
 * Unit Tests for listener-registry.js
 * Session #15 (2026-01-12)
 *
 * Tests für Memory Leak Prevention via Listener Registry
 */

// Mock window and document objects BEFORE requiring the module
global.window = {
    DEBUG: false,
    location: { href: '' },
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
};

global.document = global.document || {
    createElement: () => ({
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
    })
};

// Load the module
require('../../listener-registry');

describe('listener-registry.js', () => {
    let registry;

    beforeEach(() => {
        // Create fresh registry for each test
        registry = new window.listenerRegistry.constructor();
        // Clear any global state
        window.DEBUG = false;
    });

    // ================================================================
    // FirestoreListenerRegistry - Firestore Listeners
    // ================================================================

    describe('Firestore Listeners', () => {
        describe('register()', () => {
            test('returns unique listener ID', () => {
                const mockUnsubscribe = jest.fn();
                const id1 = registry.register(mockUnsubscribe, 'listener1');
                const id2 = registry.register(mockUnsubscribe, 'listener2');

                expect(id1).not.toBe(id2);
                expect(id1).toMatch(/^listener_\d+$/);
            });

            test('increments listener counter', () => {
                const mockUnsubscribe = jest.fn();
                const id1 = registry.register(mockUnsubscribe, 'test1');
                const id2 = registry.register(mockUnsubscribe, 'test2');

                // IDs should be sequential
                const num1 = parseInt(id1.split('_')[1]);
                const num2 = parseInt(id2.split('_')[1]);
                expect(num2).toBe(num1 + 1);
            });

            test('stores listener with description', () => {
                const mockUnsubscribe = jest.fn();
                registry.register(mockUnsubscribe, 'Test Listener');

                const active = registry.getActiveListeners();
                expect(active.length).toBe(1);
                expect(active[0].description).toBe('Test Listener');
            });

            test('uses default description if not provided', () => {
                const mockUnsubscribe = jest.fn();
                registry.register(mockUnsubscribe);

                const active = registry.getActiveListeners();
                expect(active[0].description).toBe('Unnamed listener');
            });
        });

        describe('unregister()', () => {
            test('calls unsubscribe function', () => {
                const mockUnsubscribe = jest.fn();
                const id = registry.register(mockUnsubscribe, 'test');

                registry.unregister(id);

                expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
            });

            test('removes listener from registry', () => {
                const mockUnsubscribe = jest.fn();
                const id = registry.register(mockUnsubscribe, 'test');

                expect(registry.getActiveListeners().length).toBe(1);
                registry.unregister(id);
                expect(registry.getActiveListeners().length).toBe(0);
            });

            test('returns true for existing listener', () => {
                const mockUnsubscribe = jest.fn();
                const id = registry.register(mockUnsubscribe, 'test');

                expect(registry.unregister(id)).toBe(true);
            });

            test('returns false for non-existing listener', () => {
                expect(registry.unregister('non_existing_id')).toBe(false);
            });
        });
    });

    // ================================================================
    // FirestoreListenerRegistry - DOM Listeners
    // ================================================================

    describe('DOM Listeners', () => {
        let mockElement;

        beforeEach(() => {
            mockElement = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            };
        });

        describe('registerDOM()', () => {
            test('returns unique DOM listener ID', () => {
                const handler = jest.fn();
                const id1 = registry.registerDOM(mockElement, 'click', handler, 'button1');
                const id2 = registry.registerDOM(mockElement, 'click', handler, 'button2');

                expect(id1).not.toBe(id2);
                expect(id1).toMatch(/^dom_\d+$/);
            });

            test('adds event listener to element', () => {
                const handler = jest.fn();
                registry.registerDOM(mockElement, 'click', handler, 'test');

                expect(mockElement.addEventListener).toHaveBeenCalledWith('click', handler);
            });

            test('stores DOM listener info', () => {
                const handler = jest.fn();
                registry.registerDOM(mockElement, 'scroll', handler, 'Window');

                const active = registry.getActiveListeners();
                const domListener = active.find(l => l.type === 'DOM');

                expect(domListener).toBeDefined();
                expect(domListener.eventName).toBe('scroll');
                expect(domListener.description).toBe('Window');
            });
        });

        describe('unregisterDOM()', () => {
            test('removes event listener from element', () => {
                const handler = jest.fn();
                const id = registry.registerDOM(mockElement, 'click', handler, 'test');

                registry.unregisterDOM(id);

                expect(mockElement.removeEventListener).toHaveBeenCalledWith('click', handler);
            });

            test('removes DOM listener from registry', () => {
                const handler = jest.fn();
                const id = registry.registerDOM(mockElement, 'click', handler, 'test');

                expect(registry.getActiveListeners().length).toBe(1);
                registry.unregisterDOM(id);
                expect(registry.getActiveListeners().length).toBe(0);
            });

            test('returns true for existing listener', () => {
                const handler = jest.fn();
                const id = registry.registerDOM(mockElement, 'click', handler, 'test');

                expect(registry.unregisterDOM(id)).toBe(true);
            });

            test('returns false for non-existing listener', () => {
                expect(registry.unregisterDOM('non_existing_dom_id')).toBe(false);
            });
        });
    });

    // ================================================================
    // unregisterAll()
    // ================================================================

    describe('unregisterAll()', () => {
        test('clears all Firestore listeners', () => {
            const mock1 = jest.fn();
            const mock2 = jest.fn();
            const mock3 = jest.fn();

            registry.register(mock1, 'test1');
            registry.register(mock2, 'test2');
            registry.register(mock3, 'test3');

            registry.unregisterAll();

            expect(mock1).toHaveBeenCalled();
            expect(mock2).toHaveBeenCalled();
            expect(mock3).toHaveBeenCalled();
            expect(registry.getActiveListeners().length).toBe(0);
        });

        test('clears all DOM listeners', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            };
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            registry.registerDOM(mockElement, 'click', handler1, 'btn1');
            registry.registerDOM(mockElement, 'scroll', handler2, 'window');

            registry.unregisterAll();

            expect(mockElement.removeEventListener).toHaveBeenCalledTimes(2);
            expect(registry.getActiveListeners().length).toBe(0);
        });

        test('handles mixed Firestore and DOM listeners', () => {
            const mockUnsubscribe = jest.fn();
            const mockElement = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            };
            const handler = jest.fn();

            registry.register(mockUnsubscribe, 'firestore');
            registry.registerDOM(mockElement, 'click', handler, 'dom');

            expect(registry.getActiveListeners().length).toBe(2);

            registry.unregisterAll();

            expect(registry.getActiveListeners().length).toBe(0);
            expect(mockUnsubscribe).toHaveBeenCalled();
            expect(mockElement.removeEventListener).toHaveBeenCalled();
        });

        test('handles errors gracefully', () => {
            const errorUnsubscribe = jest.fn(() => {
                throw new Error('Test error');
            });

            registry.register(errorUnsubscribe, 'error-listener');

            // Should not throw
            expect(() => registry.unregisterAll()).not.toThrow();
        });
    });

    // ================================================================
    // getActiveListeners()
    // ================================================================

    describe('getActiveListeners()', () => {
        test('returns empty array when no listeners', () => {
            expect(registry.getActiveListeners()).toEqual([]);
        });

        test('returns Firestore listeners with correct type', () => {
            registry.register(jest.fn(), 'test');

            const active = registry.getActiveListeners();
            expect(active[0].type).toBe('Firestore');
        });

        test('returns DOM listeners with correct type', () => {
            const mockElement = {
                addEventListener: jest.fn(),
                removeEventListener: jest.fn()
            };
            registry.registerDOM(mockElement, 'click', jest.fn(), 'test');

            const active = registry.getActiveListeners();
            expect(active[0].type).toBe('DOM');
        });

        test('includes registeredAt timestamp', () => {
            registry.register(jest.fn(), 'test');

            const active = registry.getActiveListeners();
            expect(active[0].registeredAt).toBeDefined();
            expect(new Date(active[0].registeredAt)).toBeInstanceOf(Date);
        });
    });

    // ================================================================
    // Global instance and helpers
    // ================================================================

    describe('Global exports', () => {
        test('window.listenerRegistry is defined', () => {
            expect(window.listenerRegistry).toBeDefined();
        });

        test('window.safeNavigate is defined', () => {
            expect(window.safeNavigate).toBeDefined();
            expect(typeof window.safeNavigate).toBe('function');
        });

        test('window.confirmAndNavigate is defined', () => {
            expect(window.confirmAndNavigate).toBeDefined();
            expect(typeof window.confirmAndNavigate).toBe('function');
        });
    });
});
