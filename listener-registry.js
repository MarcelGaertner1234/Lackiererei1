// ====================================================================
// FIRESTORE LISTENER REGISTRY - Memory Leak Prevention
// ====================================================================
// Verhindert Memory Leaks durch automatisches Cleanup von Firestore Listeners
// vor window.location.href Navigations

class FirestoreListenerRegistry {
  constructor() {
    this.listeners = new Map();
    this.listenerCounter = 0;
    console.log('🎧 Firestore Listener Registry initialized');
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
   * Unregister all listeners (call before page navigation)
   */
  unregisterAll() {
    console.log(`🔇 Unregistering ${this.listeners.size} listeners...`);

    this.listeners.forEach((listener, id) => {
      try {
        listener.unsubscribe();
        console.log(`✅ Unsubscribed: ${listener.description}`);
      } catch (error) {
        console.error(`❌ Error unsubscribing ${id}:`, error);
      }
    });

    this.listeners.clear();
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
    console.log(`🎧 Active listeners: ${active.length}`);
    active.forEach(listener => {
      console.log(`  - ${listener.id}: ${listener.description}`);
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
console.log('  const unsubscribe = db.collection("foo").onSnapshot(...);');
console.log('  const listenerId = window.listenerRegistry.register(unsubscribe, "Foo listener");');
console.log('  // Later: window.listenerRegistry.unregister(listenerId);');
console.log('  // Or before navigation: window.safeNavigate("page.html");');
