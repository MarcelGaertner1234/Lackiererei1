/**
 * Draft Auto-Save System für Partner-Formulare
 *
 * Speichert Formular-Daten automatisch in localStorage
 * und stellt sie bei Page-Reload wieder her.
 *
 * Verwendung:
 *   1. <script src="js/draft-saver.js"></script> einbinden
 *   2. window.DraftSaver.init('serviceTyp') aufrufen nach DOMContentLoaded
 *   3. window.DraftSaver.clearDraft() aufrufen nach erfolgreichem Submit
 *
 * @version 1.0.0
 * @date 2026-01-08
 */

window.DraftSaver = (function() {
    'use strict';

    // Configuration
    const CONFIG = {
        AUTO_SAVE_INTERVAL: 30000,  // 30 Sekunden
        STORAGE_PREFIX: 'partner_draft_',
        TOAST_DURATION: 4000,
        MAX_DRAFT_AGE_HOURS: 24     // Drafts älter als 24h werden gelöscht
    };

    // State
    let serviceTyp = null;
    let autoSaveTimer = null;
    let isInitialized = false;
    let lastSavedHash = null;

    /**
     * Generiert einen Hash aus den Formular-Daten für Change-Detection
     */
    function hashFormData(data) {
        return JSON.stringify(data).length + '_' + Object.keys(data).length;
    }

    /**
     * Holt den localStorage-Key für den aktuellen Service
     */
    function getStorageKey() {
        return CONFIG.STORAGE_PREFIX + serviceTyp;
    }

    /**
     * Sammelt alle Formular-Daten aus dem DOM
     */
    function collectFormData() {
        const data = {
            _savedAt: new Date().toISOString(),
            _serviceTyp: serviceTyp
        };

        // Text Inputs & Textareas
        document.querySelectorAll('input[type="text"], input[type="number"], input[type="email"], input[type="tel"], textarea').forEach(input => {
            if (input.id && input.value) {
                data[input.id] = input.value;
            }
        });

        // Radio Buttons - speichere den Wert des ausgewählten
        const radioGroups = new Set();
        document.querySelectorAll('input[type="radio"]').forEach(radio => {
            radioGroups.add(radio.name);
        });
        radioGroups.forEach(name => {
            const checked = document.querySelector(`input[name="${name}"]:checked`);
            if (checked) {
                data['radio_' + name] = checked.value;
            }
        });

        // Checkboxes
        document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            if (checkbox.id || checkbox.name) {
                const key = 'checkbox_' + (checkbox.id || checkbox.name);
                if (!data[key]) data[key] = [];
                if (checkbox.checked) {
                    data[key].push(checkbox.value || checkbox.id);
                }
            }
        });

        // Select Dropdowns
        document.querySelectorAll('select').forEach(select => {
            if (select.id && select.value) {
                data[select.id] = select.value;
            }
        });

        return data;
    }

    /**
     * Stellt Formular-Daten aus localStorage wieder her
     */
    function restoreFormData(data) {
        let restoredCount = 0;

        // Text Inputs & Textareas
        Object.keys(data).forEach(key => {
            if (key.startsWith('_') || key.startsWith('radio_') || key.startsWith('checkbox_')) {
                return; // Skip meta-fields
            }

            const element = document.getElementById(key);
            if (element && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT')) {
                if (element.type !== 'radio' && element.type !== 'checkbox') {
                    element.value = data[key];
                    restoredCount++;

                    // Trigger change event für eventuelle Listener
                    element.dispatchEvent(new Event('change', { bubbles: true }));
                    element.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
        });

        // Radio Buttons
        Object.keys(data).forEach(key => {
            if (key.startsWith('radio_')) {
                const name = key.replace('radio_', '');
                const value = data[key];
                const radio = document.querySelector(`input[name="${name}"][value="${value}"]`);
                if (radio) {
                    radio.checked = true;
                    restoredCount++;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });

        // Checkboxes
        Object.keys(data).forEach(key => {
            if (key.startsWith('checkbox_')) {
                const values = data[key];
                if (Array.isArray(values)) {
                    values.forEach(value => {
                        const checkbox = document.querySelector(`input[type="checkbox"][value="${value}"]`) ||
                                        document.getElementById(value);
                        if (checkbox) {
                            checkbox.checked = true;
                            restoredCount++;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    });
                }
            }
        });

        return restoredCount;
    }

    /**
     * Speichert den aktuellen Draft
     */
    function saveDraft() {
        if (!isInitialized) return false;

        try {
            const data = collectFormData();
            const currentHash = hashFormData(data);

            // Nur speichern wenn sich etwas geändert hat
            if (currentHash === lastSavedHash) {
                return false;
            }

            localStorage.setItem(getStorageKey(), JSON.stringify(data));
            lastSavedHash = currentHash;

            console.log(`📝 [DraftSaver] Draft gespeichert für ${serviceTyp}`);
            return true;
        } catch (error) {
            console.error('❌ [DraftSaver] Fehler beim Speichern:', error);
            return false;
        }
    }

    /**
     * Lädt einen gespeicherten Draft
     */
    function loadDraft() {
        try {
            const stored = localStorage.getItem(getStorageKey());
            if (!stored) return null;

            const data = JSON.parse(stored);

            // Prüfe ob Draft zu alt ist
            if (data._savedAt) {
                const savedAt = new Date(data._savedAt);
                const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

                if (hoursSinceSave > CONFIG.MAX_DRAFT_AGE_HOURS) {
                    console.log(`🗑️ [DraftSaver] Draft ist ${Math.round(hoursSinceSave)}h alt - wird gelöscht`);
                    clearDraft();
                    return null;
                }
            }

            return data;
        } catch (error) {
            console.error('❌ [DraftSaver] Fehler beim Laden:', error);
            return null;
        }
    }

    /**
     * Löscht den aktuellen Draft
     */
    function clearDraft() {
        try {
            localStorage.removeItem(getStorageKey());
            lastSavedHash = null;
            console.log(`🗑️ [DraftSaver] Draft gelöscht für ${serviceTyp}`);
            return true;
        } catch (error) {
            console.error('❌ [DraftSaver] Fehler beim Löschen:', error);
            return false;
        }
    }

    /**
     * Zeigt einen Toast (nutzt vorhandene showToast-Funktion falls verfügbar)
     */
    function showDraftToast(message, type = 'info') {
        // Versuche vorhandene showToast-Funktion zu nutzen
        if (typeof window.showToast === 'function') {
            window.showToast(message, type);
            return;
        }

        // Fallback: Eigener Toast
        const existingToast = document.querySelector('.draft-toast');
        if (existingToast) existingToast.remove();

        const toast = document.createElement('div');
        toast.className = 'draft-toast';
        toast.innerHTML = `
            <div style="
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: ${type === 'info' ? '#003366' : type === 'success' ? '#2e7d32' : '#d32f2f'};
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                z-index: 10000;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
                animation: slideUp 0.3s ease-out;
            ">
                <span>${type === 'info' ? '💾' : type === 'success' ? '✅' : '❌'}</span>
                <span>${message}</span>
            </div>
        `;

        // Animation Style
        if (!document.querySelector('#draft-toast-style')) {
            const style = document.createElement('style');
            style.id = 'draft-toast-style';
            style.textContent = `
                @keyframes slideUp {
                    from { transform: translateX(-50%) translateY(100%); opacity: 0; }
                    to { transform: translateX(-50%) translateY(0); opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, CONFIG.TOAST_DURATION);
    }

    /**
     * Startet den Auto-Save Timer
     */
    function startAutoSave() {
        stopAutoSave(); // Vorherigen Timer stoppen

        autoSaveTimer = setInterval(() => {
            saveDraft();
        }, CONFIG.AUTO_SAVE_INTERVAL);

        console.log(`⏱️ [DraftSaver] Auto-Save alle ${CONFIG.AUTO_SAVE_INTERVAL / 1000}s aktiviert`);
    }

    /**
     * Stoppt den Auto-Save Timer
     */
    function stopAutoSave() {
        if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
            autoSaveTimer = null;
        }
    }

    /**
     * Initialisiert den DraftSaver
     * @param {string} type - Der Service-Typ (z.B. 'reifen', 'lackier')
     * @param {Object} options - Optionale Konfiguration
     */
    function init(type, options = {}) {
        if (isInitialized) {
            console.warn('⚠️ [DraftSaver] Bereits initialisiert');
            return;
        }

        serviceTyp = type;
        isInitialized = true;

        // Optionale Konfiguration übernehmen
        if (options.autoSaveInterval) {
            CONFIG.AUTO_SAVE_INTERVAL = options.autoSaveInterval;
        }
        if (options.maxDraftAgeHours) {
            CONFIG.MAX_DRAFT_AGE_HOURS = options.maxDraftAgeHours;
        }

        // Versuche Draft zu laden
        const draft = loadDraft();
        if (draft) {
            // Kurze Verzögerung damit das DOM vollständig geladen ist
            setTimeout(() => {
                const restoredCount = restoreFormData(draft);
                if (restoredCount > 0) {
                    const savedAt = new Date(draft._savedAt);
                    const minutesAgo = Math.round((Date.now() - savedAt.getTime()) / (1000 * 60));

                    let timeText = '';
                    if (minutesAgo < 1) {
                        timeText = 'gerade eben';
                    } else if (minutesAgo < 60) {
                        timeText = `vor ${minutesAgo} Minute${minutesAgo > 1 ? 'n' : ''}`;
                    } else {
                        const hoursAgo = Math.round(minutesAgo / 60);
                        timeText = `vor ${hoursAgo} Stunde${hoursAgo > 1 ? 'n' : ''}`;
                    }

                    showDraftToast(`📝 Entwurf wiederhergestellt (${timeText})`, 'info');
                    console.log(`✅ [DraftSaver] ${restoredCount} Felder wiederhergestellt`);
                }
            }, 100);
        }

        // Auto-Save starten
        startAutoSave();

        // Speichern bei Fokus-Verlust (Tab-Wechsel)
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                saveDraft();
            }
        });

        // Speichern vor Page-Unload
        window.addEventListener('beforeunload', () => {
            saveDraft();
        });

        console.log(`✅ [DraftSaver] Initialisiert für Service: ${serviceTyp}`);
    }

    /**
     * Bereinigt alle alten Drafts (älter als MAX_DRAFT_AGE_HOURS)
     */
    function cleanupOldDrafts() {
        try {
            const keysToRemove = [];

            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(CONFIG.STORAGE_PREFIX)) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data._savedAt) {
                            const savedAt = new Date(data._savedAt);
                            const hoursSinceSave = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);

                            if (hoursSinceSave > CONFIG.MAX_DRAFT_AGE_HOURS) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (e) {
                        // Ungültige Daten - auch löschen
                        keysToRemove.push(key);
                    }
                }
            }

            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                console.log(`🗑️ [DraftSaver] Alten Draft gelöscht: ${key}`);
            });

            return keysToRemove.length;
        } catch (error) {
            console.error('❌ [DraftSaver] Fehler beim Cleanup:', error);
            return 0;
        }
    }

    // Public API
    return {
        init: init,
        saveDraft: saveDraft,
        loadDraft: loadDraft,
        clearDraft: clearDraft,
        stopAutoSave: stopAutoSave,
        startAutoSave: startAutoSave,
        cleanupOldDrafts: cleanupOldDrafts,

        // Für Debugging
        getConfig: () => ({ ...CONFIG }),
        isInitialized: () => isInitialized,
        getServiceTyp: () => serviceTyp
    };
})();

// Beim Laden alte Drafts bereinigen
document.addEventListener('DOMContentLoaded', function() {
    window.DraftSaver.cleanupOldDrafts();
});
