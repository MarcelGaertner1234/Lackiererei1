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
    console.log('🎧 Firestore Listener Registry initialized');
    console.log('🖱️ DOM Listener Registry initialized');
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

    console.log(`🎧 Listener registered: ${listenerId} (${description})`);
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
      console.log(`🔇 Listener unregistered: ${listenerId}`);
      return true;
    }
    console.warn(`⚠️ Listener not found: ${listenerId}`);
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

    console.log(`🖱️ DOM Listener registered: ${listenerId} (${eventName} on ${description})`);
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
      console.log(`🔇 DOM Listener unregistered: ${listenerId}`);
      return true;
    }
    console.warn(`⚠️ DOM Listener not found: ${listenerId}`);
    return false;
  }

  /**
   * Unregister all listeners (call before page navigation)
   */
  unregisterAll() {
    console.log(`🔇 Unregistering ${this.listeners.size} Firestore listeners + ${this.domListeners.size} DOM listeners...`);

    // Clean up Firestore listeners
    this.listeners.forEach((listener, id) => {
      try {
        listener.unsubscribe();
        console.log(`✅ Unsubscribed Firestore: ${listener.description}`);
      } catch (error) {
        console.error(`❌ Error unsubscribing ${id}:`, error);
      }
    });

    // Clean up DOM listeners
    this.domListeners.forEach((listener, id) => {
      try {
        listener.element.removeEventListener(listener.eventName, listener.handler);
        console.log(`✅ Removed DOM listener: ${listener.description}`);
      } catch (error) {
        console.error(`❌ Error removing DOM listener ${id}:`, error);
      }
    });

    this.listeners.clear();
    this.domListeners.clear();
    console.log('✅ All listeners cleaned up');
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

/**
 * Navigate to a new page with automatic listener cleanup
 * @param {string} url - Target URL
 * @param {boolean} forceCleanup - Force cleanup even if no listeners
 */
function safeNavigate(url, forceCleanup = true) {
  console.log(`🚀 Safe navigation to: ${url}`);

  // Cleanup all Firestore listeners
  if (window.listenerRegistry && forceCleanup) {
    window.listenerRegistry.unregisterAll();
  }

  // Navigate after cleanup
  setTimeout(() => {
    window.location.href = url;
  }, 100); // Small delay to ensure cleanup completes
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
    console.log('🔄 Page unload detected - cleaning up listeners');
    window.listenerRegistry.unregisterAll();
  }
});

// ====================================================================
// GLOBAL INSTANCE
// ====================================================================

window.listenerRegistry = new FirestoreListenerRegistry();
window.safeNavigate = safeNavigate;
window.confirmAndNavigate = confirmAndNavigate;

console.log('✅ Listener Registry loaded');
console.log('📖 Usage:');
console.log('  // Firestore listeners:');
console.log('  const unsubscribe = db.collection("foo").onSnapshot(...);');
console.log('  const listenerId = window.listenerRegistry.register(unsubscribe, "Foo listener");');
console.log('  ');
console.log('  // DOM listeners:');
console.log('  const element = document.getElementById("myButton");');
console.log('  const handler = () => console.log("clicked!");');
console.log('  const domId = window.listenerRegistry.registerDOM(element, "click", handler, "My Button");');
console.log('  ');
console.log('  // Cleanup:');
console.log('  // window.listenerRegistry.unregister(listenerId);');
console.log('  // window.listenerRegistry.unregisterDOM(domId);');
console.log('  // window.safeNavigate("page.html"); // Auto-cleanup all listeners');
