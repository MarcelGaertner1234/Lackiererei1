// ====================================================================
// STORAGE MONITOR - LocalStorage Quota Management
// ====================================================================

class StorageMonitor {
  constructor() {
    this.warningThreshold = 0.85; // 85% Warning
    this.criticalThreshold = 0.95; // 95% Critical
    this.checkInterval = 60000; // Check every minute
    this.intervalId = null;
    this.warningShown = false; // Nur einmal warnen pro Session
  }

  // ================================================================
  // STORAGE USAGE CALCULATION
  // ================================================================

  /**
   * Geschätzte Storage-Nutzung berechnen
   * @returns {object} - { used, total, percentage }
   */
  async getStorageUsage() {
    try {
      // Modern Storage API (falls verfügbar)
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          total: estimate.quota || 0,
          percentage: estimate.quota ? (estimate.usage / estimate.quota) : 0,
          available: (estimate.quota || 0) - (estimate.usage || 0)
        };
      }

      // Fallback: LocalStorage-Size schätzen
      return this.estimateLocalStorageSize();
    } catch (error) {
      console.error('❌ Storage-Berechnung fehlgeschlagen:', error);
      return this.estimateLocalStorageSize();
    }
  }

  /**
   * LocalStorage-Größe schätzen (Fallback)
   */
  estimateLocalStorageSize() {
    let totalSize = 0;

    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }

    // Schätzung: Meiste Browser haben 5-10 MB Limit
    const estimatedQuota = 10 * 1024 * 1024; // 10 MB
    const usedBytes = totalSize * 2; // UTF-16 = 2 bytes per char

    return {
      used: usedBytes,
      total: estimatedQuota,
      percentage: usedBytes / estimatedQuota,
      available: estimatedQuota - usedBytes
    };
  }

  /**
   * Storage-Info lesbar formatieren
   */
  formatStorageInfo(info) {
    return {
      used: this.formatBytes(info.used),
      total: this.formatBytes(info.total),
      available: this.formatBytes(info.available),
      percentage: (info.percentage * 100).toFixed(1) + '%'
    };
  }

  /**
   * Bytes in lesbare Form (KB, MB, GB)
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ================================================================
  // MONITORING & ALERTS
  // ================================================================

  /**
   * Storage überwachen starten
   */
  startMonitoring() {
    console.log('📊 Storage-Monitoring gestartet');

    // Initial check
    this.checkStorage();

    // Regelmäßige Checks
    this.intervalId = setInterval(() => {
      this.checkStorage();
    }, this.checkInterval);
  }

  /**
   * Storage überwachen stoppen
   */
  stopMonitoring() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('📊 Storage-Monitoring gestoppt');
    }
  }

  /**
   * Storage prüfen und ggf. warnen
   */
  async checkStorage() {
    const usage = await this.getStorageUsage();
    const formatted = this.formatStorageInfo(usage);

    console.log(`📊 Storage: ${formatted.used} / ${formatted.total} (${formatted.percentage})`);

    // Warning-Level prüfen
    if (usage.percentage >= this.criticalThreshold) {
      this.showCriticalAlert(usage);
    } else if (usage.percentage >= this.warningThreshold) {
      this.showWarningAlert(usage);
    }

    // Event triggern für UI-Updates
    this.dispatchStorageEvent(usage);
  }

  /**
   * Critical Alert anzeigen
   */
  showCriticalAlert(usage) {
    const message = `🚨 SPEICHER KRITISCH!\n\n` +
      `Verwendet: ${this.formatBytes(usage.used)}\n` +
      `Verfügbar: ${this.formatBytes(usage.available)}\n\n` +
      `Bitte löschen Sie alte Fahrzeuge oder Fotos!`;

    if (typeof showToast === 'function') {
      showToast(message, 'error', 10000);
    } else {
      alert(message);
    }
  }

  /**
   * Warning Alert anzeigen
   */
  showWarningAlert(usage) {
    // Nur einmal pro Session warnen
    if (this.warningShown) return;

    const message = `⚠️ SPEICHER WIRD KNAPP (${(usage.percentage * 100).toFixed(0)}%)!\n\n` +
      `Verwendet: ${this.formatBytes(usage.used)} / ${this.formatBytes(usage.total)}\n` +
      `Verfügbar: ${this.formatBytes(usage.available)}\n\n` +
      `💡 EMPFEHLUNG:\n` +
      `Löschen Sie alte abgeschlossene Fahrzeuge\n` +
      `(älter als 6 Monate) in der Übersicht.\n\n` +
      `Möchten Sie zur Übersicht gehen?`;

    this.warningShown = true;

    if (typeof showToast === 'function') {
      showToast(message, 'warning', 10000);
    } else {
      const proceed = confirm(message);
      if (proceed && !window.location.href.includes('liste.html')) {
        window.location.href = 'liste.html';
      }
    }
  }

  /**
   * Storage Event dispatchen
   */
  dispatchStorageEvent(usage) {
    window.dispatchEvent(new CustomEvent('storageUpdate', {
      detail: usage
    }));
  }

  // ================================================================
  // STORAGE CLEANUP
  // ================================================================

  /**
   * Alte Fotos löschen (älter als X Tage)
   */
  async cleanupOldPhotos(daysOld = 30) {
    try {
      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let deletedCount = 0;

      // Alle Fahrzeug-Foto-Keys finden
      const keys = Object.keys(localStorage);
      const fotoKeys = keys.filter(key => key.startsWith('fahrzeugfotos_'));

      for (const key of fotoKeys) {
        try {
          // Fahrzeug-ID extrahieren
          const fahrzeugId = parseInt(key.replace('fahrzeugfotos_', ''));

          // Fahrzeug-Daten laden (aus Firestore oder LocalStorage)
          const fahrzeug = await this.getFahrzeug(fahrzeugId);

          // Prüfen ob alt genug
          if (fahrzeug && fahrzeug.id < cutoffDate) {
            localStorage.removeItem(key);
            deletedCount++;
            console.log(`🗑️ Alte Fotos gelöscht: ${key}`);
          }
        } catch (err) {
          console.warn(`⚠️ Fehler beim Löschen von ${key}:`, err);
        }
      }

      console.log(`✅ ${deletedCount} alte Foto-Collections gelöscht`);
      return deletedCount;
    } catch (error) {
      console.error('❌ Cleanup fehlgeschlagen:', error);
      return 0;
    }
  }

  /**
   * Fahrzeug laden (Helper)
   */
  async getFahrzeug(fahrzeugId) {
    try {
      // Versuche Firestore
      if (window.firebaseApp && window.firebaseApp.db) {
        const doc = await window.firebaseApp.db()
          .collection('fahrzeuge')
          .doc(String(fahrzeugId))
          .get();

        if (doc.exists) {
          return doc.data();
        }
      }

      // Fallback: LocalStorage
      const fahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');
      return fahrzeuge.find(f => String(f.id) === String(fahrzeugId)); // ✅ FIX 2025-11-17: Type-safe ID comparison
    } catch (error) {
      console.error('Fehler beim Laden des Fahrzeugs:', error);
      return null;
    }
  }

  /**
   * Abgeschlossene Fahrzeuge archivieren
   */
  async archiveCompletedVehicles(daysOld = 90) {
    try {
      const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
      let archivedCount = 0;

      // Alle abgeschlossenen Fahrzeuge finden
      const fahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');

      const toArchive = fahrzeuge.filter(f =>
        f.status === 'abgeschlossen' &&
        f.id < cutoffDate
      );

      if (toArchive.length === 0) {
        console.log('ℹ️ Keine Fahrzeuge zum Archivieren');
        return 0;
      }

      // Archiv-Array (separate Storage)
      const archive = JSON.parse(localStorage.getItem('fahrzeuge_archiv') || '[]');

      // Zu Archiv hinzufügen
      archive.push(...toArchive);
      localStorage.setItem('fahrzeuge_archiv', JSON.stringify(archive));

      // Aus Hauptliste entfernen
      const remaining = fahrzeuge.filter(f => !toArchive.includes(f));
      localStorage.setItem('fahrzeuge', JSON.stringify(remaining));

      // Fotos auch archivieren/löschen
      for (const fahrzeug of toArchive) {
        const fotoKey = `fahrzeugfotos_${fahrzeug.id}`;
        localStorage.removeItem(fotoKey); // Fotos löschen (Archiv ohne Fotos)
      }

      console.log(`📦 ${toArchive.length} Fahrzeuge archiviert`);
      return toArchive.length;
    } catch (error) {
      console.error('❌ Archivierung fehlgeschlagen:', error);
      return 0;
    }
  }

  /**
   * Storage optimieren (Komprimierung)
   */
  async optimizeStorage() {
    console.log('🔧 Storage-Optimierung gestartet...');

    const tasks = [
      { name: 'Alte Fotos löschen (>30 Tage)', fn: () => this.cleanupOldPhotos(30) },
      { name: 'Fahrzeuge archivieren (>90 Tage)', fn: () => this.archiveCompletedVehicles(90) }
    ];

    let totalSaved = 0;

    for (const task of tasks) {
      try {
        const result = await task.fn();
        console.log(`✅ ${task.name}: ${result} Einträge`);
        totalSaved += result;
      } catch (error) {
        console.error(`❌ ${task.name} fehlgeschlagen:`, error);
      }
    }

    // Finales Storage-Check
    const usage = await this.getStorageUsage();
    const formatted = this.formatStorageInfo(usage);

    console.log(`✅ Storage-Optimierung abgeschlossen`);
    console.log(`📊 Neuer Stand: ${formatted.used} / ${formatted.total} (${formatted.percentage})`);

    return {
      itemsProcessed: totalSaved,
      storage: formatted
    };
  }

  // ================================================================
  // UI INTEGRATION
  // ================================================================

  /**
   * Storage-Indicator in UI einfügen
   */
  createStorageIndicator(containerId = 'storage-indicator') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.warn('⚠️ Storage-Indicator Container nicht gefunden');
      return;
    }

    const indicator = document.createElement('div');
    indicator.id = 'storage-bar';
    indicator.style.cssText = `
      position: relative;
      background: #f0f0f0;
      border-radius: 10px;
      height: 30px;
      overflow: hidden;
      margin: 10px 0;
    `;

    const bar = document.createElement('div');
    bar.id = 'storage-bar-fill';
    bar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #4caf50, #8bc34a);
      transition: all 0.3s ease;
      width: 0%;
    `;

    const text = document.createElement('div');
    text.id = 'storage-bar-text';
    text.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 12px;
      font-weight: 600;
      color: #333;
    `;

    indicator.appendChild(bar);
    indicator.appendChild(text);
    container.appendChild(indicator);

    // Initial update
    this.updateStorageIndicator();

    // Listen to storage updates
    window.addEventListener('storageUpdate', (e) => {
      this.updateStorageIndicator(e.detail);
    });
  }

  /**
   * Storage-Indicator aktualisieren
   */
  async updateStorageIndicator(usage = null) {
    if (!usage) {
      usage = await this.getStorageUsage();
    }

    const bar = document.getElementById('storage-bar-fill');
    const text = document.getElementById('storage-bar-text');

    if (!bar || !text) return;

    const percentage = usage.percentage * 100;
    const formatted = this.formatStorageInfo(usage);

    // Bar-Farbe je nach Auslastung
    let color = '#4caf50'; // Grün
    if (usage.percentage >= this.criticalThreshold) {
      color = '#f44336'; // Rot
    } else if (usage.percentage >= this.warningThreshold) {
      color = '#ff9800'; // Orange
    }

    bar.style.width = percentage + '%';
    bar.style.background = color;
    text.textContent = `${formatted.used} / ${formatted.total} (${formatted.percentage})`;
  }
}

// ====================================================================
// GLOBAL INSTANCE
// ====================================================================

const storageMonitor = new StorageMonitor();

// Auto-Start Monitoring
window.addEventListener('load', () => {
  storageMonitor.startMonitoring();
});

// Export
window.storageMonitor = storageMonitor;

console.log('📊 Storage Monitor geladen');
