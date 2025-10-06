// ====================================================================
// ERROR HANDLER - Zentrale Fehlerbehandlung
// ====================================================================

class ErrorHandler {
  constructor() {
    this.errorQueue = [];
    this.retryQueue = [];
    this.maxRetries = 3;
    this.retryDelay = 1000; // Start mit 1 Sekunde
  }

  // ================================================================
  // ERROR LOGGING & REPORTING
  // ================================================================

  /**
   * Fehler behandeln und loggen
   * @param {Error} error - Der Fehler
   * @param {string} context - Kontext (z.B. 'Fahrzeug-Annahme')
   * @param {object} metadata - Zusätzliche Informationen
   */
  handle(error, context = 'Unbekannt', metadata = {}) {
    const errorInfo = {
      message: error.message || 'Unbekannter Fehler',
      code: error.code || 'UNKNOWN',
      context: context,
      timestamp: new Date().toISOString(),
      metadata: metadata,
      stack: error.stack
    };

    // In Console loggen
    console.error(`[${context}] ❌ Fehler:`, errorInfo);

    // Zur Error-Queue hinzufügen
    this.errorQueue.push(errorInfo);

    // User-freundliche Nachricht anzeigen
    this.showUserMessage(errorInfo);

    // Error an Analytics senden (falls aktiviert)
    this.sendToAnalytics(errorInfo);

    return errorInfo;
  }

  /**
   * User-freundliche Fehlermeldung anzeigen
   */
  showUserMessage(errorInfo) {
    const userMessage = this.getUserFriendlyMessage(errorInfo);

    // Toast Notification anzeigen (falls vorhanden)
    if (typeof showToast === 'function') {
      showToast(userMessage, 'error');
    } else {
      // Fallback: Alert
      console.warn('⚠️ ', userMessage);
    }
  }

  /**
   * User-freundliche Nachricht generieren
   */
  getUserFriendlyMessage(errorInfo) {
    const messages = {
      // Firebase Errors
      'permission-denied': '⚠️ Keine Berechtigung für diese Aktion',
      'not-found': '⚠️ Datensatz nicht gefunden',
      'already-exists': '⚠️ Datensatz existiert bereits',
      'resource-exhausted': '⚠️ Zu viele Anfragen. Bitte warten Sie einen Moment.',
      'unauthenticated': '⚠️ Bitte melden Sie sich an',
      'unavailable': '⚠️ Service vorübergehend nicht verfügbar',

      // Network Errors
      'network-request-failed': '⚠️ Netzwerkfehler. Prüfen Sie Ihre Internetverbindung.',
      'fetch-error': '⚠️ Verbindungsfehler. Bitte versuchen Sie es erneut.',

      // Storage Errors
      'quota-exceeded': '⚠️ Speicher voll! Bitte löschen Sie alte Einträge.',
      'storage-full': '⚠️ Gerätespeicher voll',

      // General
      'timeout': '⚠️ Zeitüberschreitung. Bitte versuchen Sie es erneut.',
      'UNKNOWN': '⚠️ Ein unerwarteter Fehler ist aufgetreten'
    };

    return messages[errorInfo.code] || messages['UNKNOWN'];
  }

  /**
   * Error an Analytics senden
   */
  sendToAnalytics(errorInfo) {
    try {
      if (typeof firebase !== 'undefined' && firebase.analytics) {
        firebase.analytics().logEvent('error_occurred', {
          error_code: errorInfo.code,
          error_context: errorInfo.context,
          error_message: errorInfo.message.substring(0, 100) // Max 100 chars
        });
      }
    } catch (e) {
      console.warn('Analytics logging fehlgeschlagen:', e);
    }
  }

  // ================================================================
  // RETRY LOGIC
  // ================================================================

  /**
   * Operation mit Retry-Logic ausführen
   * @param {Function} operation - Die Funktion die ausgeführt werden soll
   * @param {string} context - Kontext
   * @param {number} maxRetries - Max. Anzahl Versuche
   */
  async retryOperation(operation, context = 'Operation', maxRetries = this.maxRetries) {
    let lastError = null;
    let delay = this.retryDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${context}] Versuch ${attempt}/${maxRetries}...`);
        const result = await operation();
        console.log(`[${context}] ✅ Erfolgreich`);
        return { success: true, data: result };
      } catch (error) {
        lastError = error;
        console.warn(`[${context}] Versuch ${attempt} fehlgeschlagen:`, error.message);

        // Nicht retryable Errors sofort werfen
        if (!this.isRetryable(error)) {
          break;
        }

        // Warten vor nächstem Versuch (exponential backoff)
        if (attempt < maxRetries) {
          await this.sleep(delay);
          delay *= 2; // Verdoppeln für exponential backoff
        }
      }
    }

    // Alle Versuche fehlgeschlagen
    this.handle(lastError, context, { attempts: maxRetries });
    return { success: false, error: lastError };
  }

  /**
   * Prüfe ob Fehler retry-fähig ist
   */
  isRetryable(error) {
    const retryableCodes = [
      'unavailable',
      'resource-exhausted',
      'network-request-failed',
      'fetch-error',
      'timeout'
    ];

    return retryableCodes.includes(error.code) ||
           error.message?.includes('network') ||
           error.message?.includes('timeout');
  }

  /**
   * Warten (für Retry-Delay)
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ================================================================
  // OFFLINE QUEUE
  // ================================================================

  /**
   * Operation zur Offline-Queue hinzufügen
   */
  addToOfflineQueue(operation, operationName = 'Operation') {
    const queueItem = {
      id: Date.now(),
      operation: operation,
      name: operationName,
      timestamp: new Date().toISOString(),
      retries: 0
    };

    this.retryQueue.push(queueItem);
    this.saveOfflineQueue();

    console.log(`📦 ${operationName} zur Offline-Queue hinzugefügt`);
    return queueItem.id;
  }

  /**
   * Offline-Queue verarbeiten (wenn online)
   */
  async processOfflineQueue() {
    if (this.retryQueue.length === 0) {
      console.log('ℹ️ Offline-Queue ist leer');
      return;
    }

    console.log(`🔄 Verarbeite ${this.retryQueue.length} Einträge aus Offline-Queue...`);

    const queue = [...this.retryQueue];
    this.retryQueue = [];

    for (const item of queue) {
      try {
        await item.operation();
        console.log(`✅ ${item.name} erfolgreich verarbeitet`);
      } catch (error) {
        console.error(`❌ ${item.name} fehlgeschlagen:`, error);
        item.retries++;

        // Max. 3 Versuche
        if (item.retries < 3) {
          this.retryQueue.push(item);
        } else {
          console.error(`❌ ${item.name} nach 3 Versuchen aufgegeben`);
        }
      }
    }

    this.saveOfflineQueue();
  }

  /**
   * Offline-Queue speichern (LocalStorage)
   */
  saveOfflineQueue() {
    try {
      const queueData = this.retryQueue.map(item => ({
        id: item.id,
        name: item.name,
        timestamp: item.timestamp,
        retries: item.retries
        // operation kann nicht serialisiert werden!
      }));

      localStorage.setItem('offline_queue', JSON.stringify(queueData));
    } catch (error) {
      console.warn('⚠️ Offline-Queue konnte nicht gespeichert werden:', error);
    }
  }

  /**
   * Offline-Queue laden (LocalStorage)
   */
  loadOfflineQueue() {
    try {
      const queueData = localStorage.getItem('offline_queue');
      if (queueData) {
        const items = JSON.parse(queueData);
        console.log(`📦 ${items.length} Einträge aus Offline-Queue geladen`);
        return items;
      }
    } catch (error) {
      console.warn('⚠️ Offline-Queue konnte nicht geladen werden:', error);
    }
    return [];
  }

  // ================================================================
  // NETWORK STATUS
  // ================================================================

  /**
   * Network-Status überwachen
   */
  monitorNetworkStatus() {
    window.addEventListener('online', () => {
      console.log('✅ Internetverbindung wiederhergestellt');
      this.showUserMessage({
        code: 'network-restored',
        message: '✅ Online - Synchronisiere Daten...'
      });
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      console.log('⚠️ Keine Internetverbindung');
      this.showUserMessage({
        code: 'network-lost',
        message: '⚠️ Offline - Änderungen werden gespeichert und später synchronisiert'
      });
    });
  }

  /**
   * Prüfe ob online
   */
  isOnline() {
    return navigator.onLine;
  }
}

// ====================================================================
// TOAST NOTIFICATIONS
// ====================================================================

function showToast(message, type = 'info', duration = 3000) {
  // Toast erstellen falls nicht vorhanden
  let toastContainer = document.getElementById('toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
    `;
    document.body.appendChild(toastContainer);
  }

  // Toast Element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  // Styles
  const colors = {
    error: '#f44336',
    warning: '#ff9800',
    success: '#4caf50',
    info: '#2196F3'
  };

  toast.style.cssText = `
    background: ${colors[type] || colors.info};
    color: white;
    padding: 15px 20px;
    border-radius: 10px;
    margin-bottom: 10px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    max-width: 350px;
  `;

  // Hinzufügen
  toastContainer.appendChild(toast);

  // Auto-Remove
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// CSS Animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// ====================================================================
// GLOBAL ERROR HANDLER
// ====================================================================

const errorHandler = new ErrorHandler();

// Global error listener
window.addEventListener('error', (event) => {
  errorHandler.handle(event.error, 'Global Error', {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno
  });
});

// Unhandled Promise Rejections
window.addEventListener('unhandledrejection', (event) => {
  errorHandler.handle(
    new Error(event.reason),
    'Unhandled Promise Rejection'
  );
});

// Network Status Monitor
errorHandler.monitorNetworkStatus();

// Export
window.errorHandler = errorHandler;
window.showToast = showToast;

console.log("🛡️ Error Handler geladen");
