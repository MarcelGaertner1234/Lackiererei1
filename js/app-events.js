/**
 * ============================================
 * APP EVENTS - System-wide Event Bus
 * ============================================
 *
 * Provides a centralized event system for communication between components.
 * When KI-Agent Tools make changes (create, update, delete), they dispatch
 * events that UI components can listen to for real-time updates.
 *
 * Architecture: Event-Driven Architecture
 * Pattern: Publisher-Subscriber (Pub/Sub)
 * Language: German (event names and logs)
 */

// ============================================
// EVENT NAMES
// ============================================

/**
 * Available system events
 * Convention: {entity}{Action} (e.g., fahrzeugCreated, terminUpdated)
 */
const APP_EVENTS = {
    // Fahrzeug Events
    FAHRZEUG_CREATED: 'fahrzeugCreated',
    FAHRZEUG_UPDATED: 'fahrzeugUpdated',
    FAHRZEUG_DELETED: 'fahrzeugDeleted',
    FAHRZEUG_STATUS_CHANGED: 'fahrzeugStatusChanged',

    // Termin Events
    TERMIN_CREATED: 'terminCreated',
    TERMIN_UPDATED: 'terminUpdated',
    TERMIN_DELETED: 'terminDeleted',

    // Kunde Events
    KUNDE_CREATED: 'kundeCreated',
    KUNDE_UPDATED: 'kundeUpdated',
    KUNDE_DELETED: 'kundeDeleted',

    // Material Events
    MATERIAL_BESTELLT: 'materialBestellt',
    MATERIAL_UPDATED: 'materialUpdated',

    // System Events
    DATA_REFRESH_NEEDED: 'dataRefreshNeeded',
    NOTIFICATION_SHOW: 'notificationShow'
};

// ============================================
// EVENT BUS
// ============================================

/**
 * Central event bus for app-wide communication
 */
class AppEventBus {
    constructor() {
        this.listeners = {};
        this.eventLog = [];
        this.maxLogSize = 100;

        console.log('✅ App Event Bus initialized');
    }

    /**
     * Dispatch an event to all listeners
     * @param {string} eventName - Name of the event
     * @param {Object} data - Event data
     */
    dispatch(eventName, data = {}) {
        const event = new CustomEvent(eventName, {
            detail: {
                ...data,
                timestamp: Date.now(),
                eventName: eventName
            }
        });

        // Log event
        this.logEvent(eventName, data);

        // Dispatch via window
        window.dispatchEvent(event);

        console.log(`📢 Event dispatched: ${eventName}`, data);
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Name of the event to listen for
     * @param {Function} callback - Function to call when event occurs
     * @returns {Function} Unsubscribe function
     */
    on(eventName, callback) {
        const listener = (event) => {
            try {
                callback(event.detail);
            } catch (error) {
                console.error(`❌ Error in event listener for ${eventName}:`, error);
            }
        };

        window.addEventListener(eventName, listener);

        // Store listener for potential cleanup
        if (!this.listeners[eventName]) {
            this.listeners[eventName] = [];
        }
        this.listeners[eventName].push(listener);

        console.log(`👂 Event listener registered: ${eventName}`);

        // Return unsubscribe function
        return () => {
            window.removeEventListener(eventName, listener);
            const index = this.listeners[eventName].indexOf(listener);
            if (index > -1) {
                this.listeners[eventName].splice(index, 1);
            }
            console.log(`🔕 Event listener removed: ${eventName}`);
        };
    }

    /**
     * Subscribe to an event (once)
     * Automatically unsubscribes after first trigger
     * @param {string} eventName - Name of the event
     * @param {Function} callback - Function to call
     */
    once(eventName, callback) {
        const unsubscribe = this.on(eventName, (data) => {
            callback(data);
            unsubscribe();
        });
    }

    /**
     * Remove all listeners for an event
     * @param {string} eventName - Name of the event
     */
    off(eventName) {
        if (this.listeners[eventName]) {
            this.listeners[eventName].forEach(listener => {
                window.removeEventListener(eventName, listener);
            });
            delete this.listeners[eventName];
            console.log(`🔕 All listeners removed for: ${eventName}`);
        }
    }

    /**
     * Log event for debugging
     * @param {string} eventName - Event name
     * @param {Object} data - Event data
     */
    logEvent(eventName, data) {
        const logEntry = {
            eventName,
            data,
            timestamp: Date.now(),
            dateTime: new Date().toISOString()
        };

        this.eventLog.push(logEntry);

        // Keep log size manageable
        if (this.eventLog.length > this.maxLogSize) {
            this.eventLog.shift();
        }
    }

    /**
     * Get event log (for debugging)
     * @param {number} limit - Max number of entries to return
     * @returns {Array} Event log entries
     */
    getLog(limit = 20) {
        return this.eventLog.slice(-limit);
    }

    /**
     * Clear event log
     */
    clearLog() {
        this.eventLog = [];
        console.log('🗑️ Event log cleared');
    }

    /**
     * Get all active listeners (for debugging)
     * @returns {Object} Active listeners by event name
     */
    getActiveListeners() {
        const active = {};
        Object.keys(this.listeners).forEach(eventName => {
            active[eventName] = this.listeners[eventName].length;
        });
        return active;
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

// Create global event bus
window.appEvents = new AppEventBus();

// Expose event names
window.APP_EVENTS = APP_EVENTS;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Convenience function: Dispatch fahrzeug created event
 * @param {Object} fahrzeug - Vehicle data
 */
window.appEvents.fahrzeugCreated = (fahrzeug) => {
    window.appEvents.dispatch(APP_EVENTS.FAHRZEUG_CREATED, {
        fahrzeug,
        action: 'created'
    });
};

/**
 * Convenience function: Dispatch fahrzeug updated event
 * @param {string} fahrzeugId - Vehicle ID
 * @param {Object} updates - Updated fields
 */
window.appEvents.fahrzeugUpdated = (fahrzeugId, updates) => {
    window.appEvents.dispatch(APP_EVENTS.FAHRZEUG_UPDATED, {
        fahrzeugId,
        updates,
        action: 'updated'
    });
};

/**
 * Convenience function: Dispatch termin created event
 * @param {Object} termin - Appointment data
 */
window.appEvents.terminCreated = (termin) => {
    window.appEvents.dispatch(APP_EVENTS.TERMIN_CREATED, {
        termin,
        action: 'created'
    });
};

/**
 * Convenience function: Dispatch termin updated event
 * @param {string} terminId - Appointment ID
 * @param {Object} updates - Updated fields
 */
window.appEvents.terminUpdated = (terminId, updates) => {
    window.appEvents.dispatch(APP_EVENTS.TERMIN_UPDATED, {
        terminId,
        updates,
        action: 'updated'
    });
};

/**
 * Convenience function: Dispatch kunde created event
 * @param {Object} kunde - Customer data
 */
window.appEvents.kundeCreated = (kunde) => {
    window.appEvents.dispatch(APP_EVENTS.KUNDE_CREATED, {
        kunde,
        action: 'created'
    });
};

/**
 * Convenience function: Dispatch material bestellt event
 * @param {Object} data - Material order data (includes requestId, description, etc.)
 */
window.appEvents.materialBestellt = (data) => {
    window.appEvents.dispatch(APP_EVENTS.MATERIAL_BESTELLT, {
        ...data,
        action: 'bestellt'
    });
};

/**
 * Convenience function: Dispatch material updated event
 * @param {Object} data - Update data (includes requestId, updates)
 */
window.appEvents.materialUpdated = (data) => {
    window.appEvents.dispatch(APP_EVENTS.MATERIAL_UPDATED, {
        ...data,
        action: 'updated'
    });
};

/**
 * Convenience function: Trigger UI refresh
 * @param {string} component - Component name to refresh
 */
window.appEvents.refreshUI = (component) => {
    window.appEvents.dispatch(APP_EVENTS.DATA_REFRESH_NEEDED, {
        component,
        action: 'refresh'
    });
};

// ============================================
// DEBUGGING HELPERS
// ============================================

// Expose debugging functions globally
window.debugEvents = {
    /**
     * Show event log in console
     */
    showLog() {
        console.table(window.appEvents.getLog());
    },

    /**
     * Show active listeners
     */
    showListeners() {
        console.table(window.appEvents.getActiveListeners());
    },

    /**
     * Listen to all events (for debugging)
     */
    listenAll() {
        Object.values(APP_EVENTS).forEach(eventName => {
            window.appEvents.on(eventName, (data) => {
                console.log(`🔔 Event: ${eventName}`, data);
            });
        });
        console.log('👂 Listening to ALL events');
    },

    /**
     * Test event dispatch
     */
    test() {
        console.log('🧪 Testing event system...');
        window.appEvents.dispatch('testEvent', { test: true });
        console.log('✅ Test event dispatched');
    }
};

console.log('✅ App Events loaded successfully');
console.log('📢 Available events:', Object.keys(APP_EVENTS).length);
console.log('🔍 Debug commands: window.debugEvents.showLog(), window.debugEvents.showListeners()');
