// ====================================================================
// FIRESTORE LISTENER REGISTRY - Memory Leak Prevention
// ====================================================================
// Verhindert Memory Leaks durch automatisches Cleanup von Firestore Listeners
// vor window.location.href Navigations

class FirestoreListenerRegistry {
  constructor() {
    this.listeners = new Map(); // Firestore listeners
    this.domListeners = new Map(); // DOM EventListeners
    this.listenerCounter = 0;
    this.domListenerCounter = 0;
    // 🚀 PERF: Debug logs only when DEBUG enabled
    if (window.DEBUG) console.log('🎧 Firestore Listener Registry initialized');
  }

  /**
   * Register a Firestore listener
   * @param {Function} unsubscribe - The unsubscribe function from onSnapshot()
   * @param {string} description - Optional description for debugging
   * @returns {string} listenerId - ID to unregister later
   */
  register(unsubscribe, description = 'Unnamed listener') {
    this.listenerCounter++;
    const listenerId = `listener_${this.listenerCounter}`;

    this.listeners.set(listenerId, {
      unsubscribe: unsubscribe,
      description: description,
      registeredAt: new Date().toISOString()
    });

    if (window.DEBUG) console.log(`🎧 Listener registered: ${listenerId} (${description})`);
    return listenerId;
  }

  /**
   * Unregister a specific listener
   * @param {string} listenerId - ID from register()
   */
  unregister(listenerId) {
    const listener = this.listeners.get(listenerId);
    if (listener) {
      listener.unsubscribe();
      this.listeners.delete(listenerId);
      if (window.DEBUG) console.log(`🔇 Listener unregistered: ${listenerId}`);
      return true;
    }
    if (window.DEBUG) console.warn(`⚠️ Listener not found: ${listenerId}`);
    return false;
  }

  /**
   * Register a DOM EventListener
   * @param {Element} element - The DOM element
   * @param {string} eventName - Event name (e.g., 'click', 'scroll')
   * @param {Function} handler - Event handler function
   * @param {string} description - Optional description for debugging
   * @returns {string} listenerId - ID to unregister later
   */
  registerDOM(element, eventName, handler, description = 'Unnamed DOM listener') {
    this.domListenerCounter++;
    const listenerId = `dom_${this.domListenerCounter}`;

    this.domListeners.set(listenerId, {
      element: element,
      eventName: eventName,
      handler: handler,
      description: description,
      registeredAt: new Date().toISOString()
    });

    // Actually add the event listener
    element.addEventListener(eventName, handler);

    if (window.DEBUG) console.log(`🖱️ DOM Listener registered: ${listenerId} (${eventName} on ${description})`);
    return listenerId;
  }

  /**
   * Unregister a specific DOM listener
   * @param {string} listenerId - ID from registerDOM()
   */
  unregisterDOM(listenerId) {
    const listener = this.domListeners.get(listenerId);
    if (listener) {
      listener.element.removeEventListener(listener.eventName, listener.handler);
      this.domListeners.delete(listenerId);
      if (window.DEBUG) console.log(`🔇 DOM Listener unregistered: ${listenerId}`);
      return true;
    }
    if (window.DEBUG) console.warn(`⚠️ DOM Listener not found: ${listenerId}`);
    return false;
  }

  /**
   * Unregister all listeners (call before page navigation)
   */
  unregisterAll() {
    if (window.DEBUG) console.log(`🔇 Unregistering ${this.listeners.size} Firestore + ${this.domListeners.size} DOM listeners...`);

    // Clean up Firestore listeners
    this.listeners.forEach((listener, id) => {
      try {
        listener.unsubscribe();
      } catch (error) {
        console.error(`❌ Error unsubscribing ${id}:`, error);
      }
    });

    // Clean up DOM listeners
    this.domListeners.forEach((listener, id) => {
      try {
        listener.element.removeEventListener(listener.eventName, listener.handler);
      } catch (error) {
        console.error(`❌ Error removing DOM listener ${id}:`, error);
      }
    });

    this.listeners.clear();
    this.domListeners.clear();
  }

  /**
   * Get info about active listeners (debugging)
   */
  getActiveListeners() {
    const active = [];
    this.listeners.forEach((listener, id) => {
      active.push({
        id: id,
        type: 'Firestore',
        description: listener.description,
        registeredAt: listener.registeredAt
      });
    });
    this.domListeners.forEach((listener, id) => {
      active.push({
        id: id,
        type: 'DOM',
        eventName: listener.eventName,
        description: listener.description,
        registeredAt: listener.registeredAt
      });
    });
    return active;
  }

  /**
   * Log active listeners (debugging)
   */
  logActiveListeners() {
    if (!window.DEBUG) return;
    const active = this.getActiveListeners();
    console.log(`🎧 Active listeners: ${active.length} (${this.listeners.size} Firestore + ${this.domListeners.size} DOM)`);
    active.forEach(listener => {
      if (listener.type === 'DOM') {
        console.log(`  - ${listener.id}: ${listener.eventName} on ${listener.description}`);
      } else {
        console.log(`  - ${listener.id}: ${listener.description}`);
      }
    });
  }
}

// ====================================================================
// SAFE NAVIGATION - Cleanup before redirect
// ====================================================================

// 🔧 FIX KB6 (2025-12-12): Global navigation lock for double-click prevention
let isNavigating = false;

/**
 * Navigate to a new page with automatic listener cleanup
 * @param {string} url - Target URL
 * @param {boolean} forceCleanup - Force cleanup even if no listeners
 */
function safeNavigate(url, forceCleanup = true) {
  // 🔧 FIX KB6 (2025-12-12): Double-click prevention
  if (isNavigating) {
    if (window.DEBUG) console.warn(`⚠️ safeNavigate: Navigation already in progress, ignoring duplicate call to ${url}`);
    return;
  }
  isNavigating = true;

  if (window.DEBUG) console.log(`🚀 Safe navigation to: ${url}`);

  // Cleanup all Firestore listeners
  if (window.listenerRegistry && forceCleanup) {
    window.listenerRegistry.unregisterAll();
  }

  // Navigate after cleanup
  setTimeout(() => {
    window.location.href = url;
  }, 100); // Small delay to ensure cleanup completes

  // Reset flag after a timeout (in case navigation fails)
  setTimeout(() => {
    isNavigating = false;
  }, 3000);
}

/**
 * Confirm navigation with listener cleanup (for user-triggered navigations)
 * @param {string} url - Target URL
 * @param {string} message - Confirmation message (optional)
 */
function confirmAndNavigate(url, message = 'Diese Seite verlassen?') {
  if (confirm(message)) {
    safeNavigate(url);
  }
}

// ====================================================================
// BEFOREUNLOAD HANDLER - Cleanup on page close/refresh
// ====================================================================

window.addEventListener('beforeunload', () => {
  if (window.listenerRegistry) {
    window.listenerRegistry.unregisterAll();
  }
});

// ====================================================================
// GLOBAL INSTANCE
// ====================================================================

window.listenerRegistry = new FirestoreListenerRegistry();
window.safeNavigate = safeNavigate;
window.confirmAndNavigate = confirmAndNavigate;

// 🚀 PERF: Usage instructions only logged in DEBUG mode
if (window.DEBUG) {
  console.log('✅ Listener Registry loaded');
  console.log('📖 Usage: window.listenerRegistry.register(unsubscribe, "description")');
}
