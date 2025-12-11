/**
 * work-timer.js - Arbeitszeit-Tracking Widget fuer AGI Training
 *
 * Erfasst exakte Arbeitszeiten pro Schadenstyp fuer ML-Preisvorhersage.
 * Speichert: Dauer, Mitarbeiter, Skill-Level, Material, Werkzeuge
 *
 * @version 1.0.0
 * @date 2025-12-11
 */

window.WorkTimer = (function() {
    'use strict';

    // ========================================
    // KONFIGURATION
    // ========================================

    const CONFIG = {
        autoSaveInterval: 30000,  // Auto-save alle 30 Sekunden
        minDuration: 60,          // Mindestdauer in Sekunden (1 Min)
        maxDuration: 28800,       // Maximaldauer in Sekunden (8 Stunden)
    };

    // Arbeitsarten (fuer ML-Kategorisierung)
    const WORK_TYPES = {
        'VORBEREITUNG': { name: 'Vorbereitung', icon: 'tools', category: 'prep' },
        'DEMONTAGE': { name: 'Demontage', icon: 'wrench', category: 'mechanical' },
        'AUSBEULEN': { name: 'Ausbeulen/PDR', icon: 'hammer', category: 'bodywork' },
        'SPACHTELN': { name: 'Spachteln', icon: 'palette', category: 'bodywork' },
        'SCHLEIFEN': { name: 'Schleifen', icon: 'disc', category: 'prep' },
        'GRUNDIEREN': { name: 'Grundieren', icon: 'spray-can', category: 'paint' },
        'LACKIEREN': { name: 'Lackieren', icon: 'paint-bucket', category: 'paint' },
        'KLARLACK': { name: 'Klarlack', icon: 'droplet', category: 'paint' },
        'POLIEREN': { name: 'Polieren', icon: 'sparkles', category: 'finish' },
        'MONTAGE': { name: 'Montage', icon: 'settings', category: 'mechanical' },
        'QUALITAETSKONTROLLE': { name: 'Qualitaetskontrolle', icon: 'check-circle', category: 'qa' },
        'SONSTIGES': { name: 'Sonstiges', icon: 'more-horizontal', category: 'other' }
    };

    // Material-Katalog
    const MATERIALS = {
        'SPACHTELMASSE': { name: 'Spachtelmasse', unit: 'kg', avgPrice: 15 },
        'FUELLER': { name: 'Fueller', unit: 'liter', avgPrice: 25 },
        'BASISLACK': { name: 'Basislack', unit: 'liter', avgPrice: 45 },
        'KLARLACK': { name: 'Klarlack', unit: 'liter', avgPrice: 35 },
        'SCHLEIFPAPIER': { name: 'Schleifpapier', unit: 'stueck', avgPrice: 2 },
        'ABDECKMATERIAL': { name: 'Abdeckmaterial', unit: 'm2', avgPrice: 5 },
        'VERDÜNNER': { name: 'Verduenner', unit: 'liter', avgPrice: 12 },
        'POLITUR': { name: 'Politur', unit: 'ml', avgPrice: 0.05 },
        'ERSATZTEIL': { name: 'Ersatzteil', unit: 'stueck', avgPrice: 0 }
    };

    // Skill-Level (fuer ML-Normalisierung)
    const SKILL_LEVELS = {
        'AZUBI': { name: 'Azubi', factor: 1.5 },
        'GESELLE': { name: 'Geselle', factor: 1.0 },
        'MEISTER': { name: 'Meister', factor: 0.8 },
        'SPEZIALIST': { name: 'Spezialist', factor: 0.7 }
    };

    // ========================================
    // STATE
    // ========================================

    let state = {
        isRunning: false,
        isPaused: false,
        startTime: null,
        pauseTime: null,
        totalPausedMs: 0,
        currentFahrzeugId: null,
        currentSchadensCode: null,
        workType: null,
        materials: [],
        notes: '',
        autoSaveTimer: null
    };

    // ========================================
    // TIMER FUNKTIONEN
    // ========================================

    function start(fahrzeugId, schadensCode, workType) {
        if (state.isRunning) {
            console.warn('Timer laeuft bereits');
            return false;
        }

        state.isRunning = true;
        state.isPaused = false;
        state.startTime = Date.now();
        state.totalPausedMs = 0;
        state.currentFahrzeugId = fahrzeugId;
        state.currentSchadensCode = schadensCode || 'ALLGEMEIN';
        state.workType = workType || 'SONSTIGES';
        state.materials = [];
        state.notes = '';

        // Auto-Save starten
        state.autoSaveTimer = setInterval(autoSave, CONFIG.autoSaveInterval);

        updateUI();
        console.log('Timer gestartet fuer Fahrzeug:', fahrzeugId);
        return true;
    }

    function pause() {
        if (!state.isRunning || state.isPaused) return false;

        state.isPaused = true;
        state.pauseTime = Date.now();
        updateUI();
        return true;
    }

    function resume() {
        if (!state.isRunning || !state.isPaused) return false;

        state.totalPausedMs += Date.now() - state.pauseTime;
        state.isPaused = false;
        state.pauseTime = null;
        updateUI();
        return true;
    }

    async function stop() {
        if (!state.isRunning) return null;

        // Timer stoppen
        if (state.autoSaveTimer) {
            clearInterval(state.autoSaveTimer);
        }

        const endTime = Date.now();
        const durationMs = state.isPaused
            ? (state.pauseTime - state.startTime - state.totalPausedMs)
            : (endTime - state.startTime - state.totalPausedMs);

        const durationSeconds = Math.round(durationMs / 1000);

        // Nur speichern wenn Mindestdauer erreicht
        if (durationSeconds < CONFIG.minDuration) {
            console.warn('Arbeitszeit zu kurz, nicht gespeichert');
            resetState();
            return null;
        }

        // Daten zusammenstellen
        const workData = {
            fahrzeugId: state.currentFahrzeugId,
            schadensCode: state.currentSchadensCode,
            workType: state.workType,
            startzeit: new Date(state.startTime).toISOString(),
            endzeit: new Date(endTime).toISOString(),
            dauerSekunden: durationSeconds,
            dauerMinuten: Math.round(durationSeconds / 60),
            pausenSekunden: Math.round(state.totalPausedMs / 1000),
            materials: state.materials,
            notes: state.notes,
            mitarbeiterId: getCurrentMitarbeiterId(),
            skillLevel: getCurrentSkillLevel(),
            werkstattId: window.werkstattId || 'unknown',
            createdAt: new Date().toISOString()
        };

        // In Firestore speichern
        const docId = await saveToFirestore(workData);
        workData.id = docId;

        resetState();
        updateUI();

        return workData;
    }

    function resetState() {
        state.isRunning = false;
        state.isPaused = false;
        state.startTime = null;
        state.pauseTime = null;
        state.totalPausedMs = 0;
        state.currentFahrzeugId = null;
        state.currentSchadensCode = null;
        state.workType = null;
        state.materials = [];
        state.notes = '';
        if (state.autoSaveTimer) {
            clearInterval(state.autoSaveTimer);
            state.autoSaveTimer = null;
        }
    }

    // ========================================
    // FIRESTORE INTEGRATION
    // ========================================

    async function saveToFirestore(workData) {
        try {
            await window.firebaseInitialized;
            const db = firebase.firestore();
            const collectionName = window.getCollectionName
                ? window.getCollectionName('arbeitszeiten')
                : `arbeitszeiten_${window.werkstattId || 'default'}`;

            const docRef = await db.collection(collectionName).add(workData);
            console.log('Arbeitszeit gespeichert:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Fehler beim Speichern der Arbeitszeit:', error);
            // Fallback: LocalStorage
            saveToLocalStorage(workData);
            return null;
        }
    }

    function saveToLocalStorage(workData) {
        try {
            const key = `worktime_${Date.now()}`;
            localStorage.setItem(key, JSON.stringify(workData));
            console.log('Arbeitszeit lokal gespeichert:', key);
        } catch (e) {
            console.error('LocalStorage Fehler:', e);
        }
    }

    function autoSave() {
        if (!state.isRunning) return;

        // Zwischenspeichern in SessionStorage
        const snapshot = {
            ...state,
            timestamp: Date.now()
        };
        sessionStorage.setItem('workTimerState', JSON.stringify(snapshot));
    }

    function restoreState() {
        try {
            const saved = sessionStorage.getItem('workTimerState');
            if (saved) {
                const snapshot = JSON.parse(saved);
                // Nur wiederherstellen wenn weniger als 1 Stunde alt
                if (Date.now() - snapshot.timestamp < 3600000) {
                    Object.assign(state, snapshot);
                    if (state.isRunning) {
                        state.autoSaveTimer = setInterval(autoSave, CONFIG.autoSaveInterval);
                    }
                    return true;
                }
            }
        } catch (e) {
            console.error('Fehler beim Wiederherstellen:', e);
        }
        return false;
    }

    // ========================================
    // HELPER FUNKTIONEN
    // ========================================

    function getCurrentMitarbeiterId() {
        // Versuche Mitarbeiter-ID aus verschiedenen Quellen zu holen
        if (window.currentUser && window.currentUser.uid) {
            return window.currentUser.uid;
        }
        if (window.selectedMitarbeiterId) {
            return window.selectedMitarbeiterId;
        }
        const sessionUser = sessionStorage.getItem('currentMitarbeiterId');
        if (sessionUser) {
            return sessionUser;
        }
        return 'unknown';
    }

    function getCurrentSkillLevel() {
        // Versuche Skill-Level aus Mitarbeiter-Daten zu holen
        if (window.currentUserSkillLevel) {
            return window.currentUserSkillLevel;
        }
        const sessionSkill = sessionStorage.getItem('mitarbeiterSkillLevel');
        if (sessionSkill) {
            return sessionSkill;
        }
        return 'GESELLE';  // Default
    }

    function getElapsedTime() {
        if (!state.isRunning) return 0;

        const now = state.isPaused ? state.pauseTime : Date.now();
        return now - state.startTime - state.totalPausedMs;
    }

    function formatTime(ms) {
        const totalSeconds = Math.floor(ms / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function addMaterial(materialType, amount) {
        if (!MATERIALS[materialType]) {
            console.warn('Unbekannter Materialtyp:', materialType);
            return false;
        }

        state.materials.push({
            type: materialType,
            name: MATERIALS[materialType].name,
            amount: parseFloat(amount) || 0,
            unit: MATERIALS[materialType].unit,
            estimatedCost: (parseFloat(amount) || 0) * MATERIALS[materialType].avgPrice
        });
        return true;
    }

    function setNotes(notes) {
        state.notes = notes || '';
    }

    function setWorkType(workType) {
        if (WORK_TYPES[workType]) {
            state.workType = workType;
            return true;
        }
        return false;
    }

    // ========================================
    // UI RENDERING
    // ========================================

    function createTimerWidget(containerId) {
        const container = document.getElementById(containerId);
        if (!container) {
            console.error('Container nicht gefunden:', containerId);
            return null;
        }

        container.innerHTML = `
            <div class="work-timer-widget" id="workTimerWidget">
                <div class="timer-header">
                    <span class="timer-icon">⏱️</span>
                    <span class="timer-title">Arbeitszeit-Tracking</span>
                    <span class="timer-status" id="timerStatus">Bereit</span>
                </div>

                <div class="timer-display" id="timerDisplay">00:00</div>

                <div class="timer-controls">
                    <button class="timer-btn timer-btn-start" id="timerStart" onclick="WorkTimer.start()">
                        ▶ Start
                    </button>
                    <button class="timer-btn timer-btn-pause" id="timerPause" onclick="WorkTimer.togglePause()" style="display:none;">
                        ⏸ Pause
                    </button>
                    <button class="timer-btn timer-btn-stop" id="timerStop" onclick="WorkTimer.stopAndSave()" style="display:none;">
                        ⏹ Speichern
                    </button>
                </div>

                <div class="timer-details" id="timerDetails" style="display:none;">
                    <div class="timer-field">
                        <label>Arbeitsart:</label>
                        <select id="timerWorkType" onchange="WorkTimer.setWorkType(this.value)">
                            ${Object.entries(WORK_TYPES).map(([key, val]) =>
                                `<option value="${key}">${val.name}</option>`
                            ).join('')}
                        </select>
                    </div>

                    <div class="timer-field">
                        <label>Notizen:</label>
                        <textarea id="timerNotes" rows="2" placeholder="Besonderheiten, Schwierigkeiten..."
                            onchange="WorkTimer.setNotes(this.value)"></textarea>
                    </div>

                    <div class="timer-materials" id="timerMaterials">
                        <label>Material hinzufuegen:</label>
                        <div class="material-input">
                            <select id="materialType">
                                ${Object.entries(MATERIALS).map(([key, val]) =>
                                    `<option value="${key}">${val.name} (${val.unit})</option>`
                                ).join('')}
                            </select>
                            <input type="number" id="materialAmount" placeholder="Menge" step="0.1" min="0">
                            <button onclick="WorkTimer.addMaterialFromUI()">+</button>
                        </div>
                        <ul id="materialList"></ul>
                    </div>
                </div>
            </div>
        `;

        // CSS hinzufuegen falls nicht vorhanden
        if (!document.getElementById('workTimerStyles')) {
            const styles = document.createElement('style');
            styles.id = 'workTimerStyles';
            styles.textContent = getTimerStyles();
            document.head.appendChild(styles);
        }

        // UI-Update-Loop starten
        setInterval(updateTimerDisplay, 1000);

        return container.querySelector('#workTimerWidget');
    }

    function getTimerStyles() {
        return `
            .work-timer-widget {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border-radius: 12px;
                padding: 16px;
                color: white;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                margin: 10px 0;
            }

            .timer-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .timer-icon { font-size: 20px; }
            .timer-title { flex: 1; font-weight: 600; }

            .timer-status {
                font-size: 12px;
                padding: 3px 8px;
                border-radius: 12px;
                background: rgba(255,255,255,0.1);
            }

            .timer-status.running { background: #22c55e; }
            .timer-status.paused { background: #f59e0b; }

            .timer-display {
                font-size: 48px;
                font-weight: 700;
                text-align: center;
                font-family: 'SF Mono', Monaco, monospace;
                letter-spacing: 2px;
                margin: 16px 0;
                text-shadow: 0 0 20px rgba(34, 197, 94, 0.5);
            }

            .timer-controls {
                display: flex;
                gap: 8px;
                justify-content: center;
                margin-bottom: 16px;
            }

            .timer-btn {
                padding: 10px 20px;
                border: none;
                border-radius: 8px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                font-size: 14px;
            }

            .timer-btn-start { background: #22c55e; color: white; }
            .timer-btn-start:hover { background: #16a34a; }

            .timer-btn-pause { background: #f59e0b; color: white; }
            .timer-btn-pause:hover { background: #d97706; }

            .timer-btn-stop { background: #ef4444; color: white; }
            .timer-btn-stop:hover { background: #dc2626; }

            .timer-details {
                background: rgba(255,255,255,0.05);
                border-radius: 8px;
                padding: 12px;
                margin-top: 12px;
            }

            .timer-field {
                margin-bottom: 12px;
            }

            .timer-field label {
                display: block;
                font-size: 12px;
                color: rgba(255,255,255,0.7);
                margin-bottom: 4px;
            }

            .timer-field select,
            .timer-field textarea,
            .timer-field input {
                width: 100%;
                padding: 8px;
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 6px;
                background: rgba(255,255,255,0.1);
                color: white;
                font-size: 14px;
            }

            .timer-field select option {
                background: #1a1a2e;
            }

            .material-input {
                display: flex;
                gap: 8px;
                margin-bottom: 8px;
            }

            .material-input select { flex: 2; }
            .material-input input { flex: 1; }
            .material-input button {
                padding: 8px 12px;
                background: #3b82f6;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }

            #materialList {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            #materialList li {
                display: flex;
                justify-content: space-between;
                padding: 6px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                font-size: 13px;
            }

            /* Dark Mode Anpassungen */
            [data-theme="dark"] .work-timer-widget {
                background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
            }
        `;
    }

    function updateUI() {
        const widget = document.getElementById('workTimerWidget');
        if (!widget) return;

        const statusEl = widget.querySelector('#timerStatus');
        const startBtn = widget.querySelector('#timerStart');
        const pauseBtn = widget.querySelector('#timerPause');
        const stopBtn = widget.querySelector('#timerStop');
        const detailsEl = widget.querySelector('#timerDetails');

        if (state.isRunning) {
            statusEl.textContent = state.isPaused ? 'Pausiert' : 'Laeuft';
            statusEl.className = 'timer-status ' + (state.isPaused ? 'paused' : 'running');

            startBtn.style.display = 'none';
            pauseBtn.style.display = 'inline-block';
            pauseBtn.textContent = state.isPaused ? '▶ Weiter' : '⏸ Pause';
            stopBtn.style.display = 'inline-block';
            detailsEl.style.display = 'block';
        } else {
            statusEl.textContent = 'Bereit';
            statusEl.className = 'timer-status';

            startBtn.style.display = 'inline-block';
            pauseBtn.style.display = 'none';
            stopBtn.style.display = 'none';
            detailsEl.style.display = 'none';
        }
    }

    function updateTimerDisplay() {
        const displayEl = document.getElementById('timerDisplay');
        if (!displayEl) return;

        if (state.isRunning) {
            displayEl.textContent = formatTime(getElapsedTime());
        }
    }

    function updateMaterialList() {
        const listEl = document.getElementById('materialList');
        if (!listEl) return;

        listEl.innerHTML = state.materials.map((m, i) => `
            <li>
                <span>${m.name}: ${m.amount} ${m.unit}</span>
                <span>~€${m.estimatedCost.toFixed(2)}</span>
            </li>
        `).join('');
    }

    function addMaterialFromUI() {
        const typeEl = document.getElementById('materialType');
        const amountEl = document.getElementById('materialAmount');

        if (typeEl && amountEl && amountEl.value) {
            addMaterial(typeEl.value, amountEl.value);
            amountEl.value = '';
            updateMaterialList();
        }
    }

    // ========================================
    // MODAL FUER TIMER-START
    // ========================================

    function openStartModal(fahrzeugId, schadensCode) {
        // Modal erstellen
        const existingModal = document.getElementById('workTimerModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'workTimerModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>⏱️ Arbeitszeit starten</h3>
                    <button class="modal-close" onclick="document.getElementById('workTimerModal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>Arbeitsart auswählen:</label>
                        <select id="modalWorkType" class="form-control">
                            ${Object.entries(WORK_TYPES).map(([key, val]) =>
                                `<option value="${key}">${val.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                    ${schadensCode ? `
                        <div class="form-group">
                            <label>Schadensposition:</label>
                            <input type="text" class="form-control" value="${schadensCode}" readonly>
                        </div>
                    ` : ''}
                    <div class="form-group">
                        <label>Skill-Level:</label>
                        <select id="modalSkillLevel" class="form-control">
                            ${Object.entries(SKILL_LEVELS).map(([key, val]) =>
                                `<option value="${key}" ${key === 'GESELLE' ? 'selected' : ''}>${val.name}</option>`
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('workTimerModal').remove()">Abbrechen</button>
                    <button class="btn btn-primary" onclick="WorkTimer.confirmStart('${fahrzeugId}', '${schadensCode || ''}')">
                        ▶ Timer starten
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Modal-Styles falls nicht vorhanden
        if (!document.getElementById('workTimerModalStyles')) {
            const styles = document.createElement('style');
            styles.id = 'workTimerModalStyles';
            styles.textContent = `
                #workTimerModal.modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.7);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 10000;
                }
                #workTimerModal .modal-content {
                    background: white;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                }
                #workTimerModal .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px 20px;
                    background: #1a1a2e;
                    color: white;
                }
                #workTimerModal .modal-header h3 { margin: 0; }
                #workTimerModal .modal-close {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 24px;
                    cursor: pointer;
                }
                #workTimerModal .modal-body { padding: 20px; }
                #workTimerModal .form-group { margin-bottom: 16px; }
                #workTimerModal .form-group label {
                    display: block;
                    margin-bottom: 6px;
                    font-weight: 500;
                }
                #workTimerModal .form-control {
                    width: 100%;
                    padding: 10px;
                    border: 1px solid #ddd;
                    border-radius: 6px;
                    font-size: 14px;
                }
                #workTimerModal .modal-footer {
                    display: flex;
                    gap: 10px;
                    justify-content: flex-end;
                    padding: 16px 20px;
                    background: #f5f5f5;
                }
                #workTimerModal .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 6px;
                    font-weight: 600;
                    cursor: pointer;
                }
                #workTimerModal .btn-secondary { background: #6b7280; color: white; }
                #workTimerModal .btn-primary { background: #22c55e; color: white; }

                [data-theme="dark"] #workTimerModal .modal-content { background: #1a1a2e; color: white; }
                [data-theme="dark"] #workTimerModal .form-control { background: #2d2d44; border-color: #3d3d5c; color: white; }
                [data-theme="dark"] #workTimerModal .modal-footer { background: #16213e; }
            `;
            document.head.appendChild(styles);
        }
    }

    function confirmStart(fahrzeugId, schadensCode) {
        const workType = document.getElementById('modalWorkType')?.value || 'SONSTIGES';
        const skillLevel = document.getElementById('modalSkillLevel')?.value || 'GESELLE';

        sessionStorage.setItem('mitarbeiterSkillLevel', skillLevel);

        start(fahrzeugId, schadensCode, workType);

        document.getElementById('workTimerModal')?.remove();
    }

    function togglePause() {
        if (state.isPaused) {
            resume();
        } else {
            pause();
        }
    }

    async function stopAndSave() {
        const data = await stop();
        if (data) {
            // Erfolgs-Feedback
            if (typeof showToast === 'function') {
                showToast(`Arbeitszeit gespeichert: ${data.dauerMinuten} Minuten`, 'success');
            } else {
                alert(`Arbeitszeit gespeichert: ${data.dauerMinuten} Minuten`);
            }
        }
        return data;
    }

    // ========================================
    // STATISTIK-FUNKTIONEN (fuer ML-Export)
    // ========================================

    async function getWorkTimeStats(fahrzeugId) {
        try {
            await window.firebaseInitialized;
            const db = firebase.firestore();
            const collectionName = window.getCollectionName
                ? window.getCollectionName('arbeitszeiten')
                : `arbeitszeiten_${window.werkstattId || 'default'}`;

            let query = db.collection(collectionName);
            if (fahrzeugId) {
                query = query.where('fahrzeugId', '==', fahrzeugId);
            }

            const snapshot = await query.get();
            const records = [];

            snapshot.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });

            // Statistiken berechnen
            const stats = {
                totalRecords: records.length,
                totalMinutes: records.reduce((sum, r) => sum + (r.dauerMinuten || 0), 0),
                byWorkType: {},
                bySchadensCode: {},
                avgDurationByType: {}
            };

            records.forEach(r => {
                // Nach Arbeitsart
                if (!stats.byWorkType[r.workType]) {
                    stats.byWorkType[r.workType] = { count: 0, totalMinutes: 0 };
                }
                stats.byWorkType[r.workType].count++;
                stats.byWorkType[r.workType].totalMinutes += r.dauerMinuten || 0;

                // Nach Schadenscode
                if (r.schadensCode && r.schadensCode !== 'ALLGEMEIN') {
                    if (!stats.bySchadensCode[r.schadensCode]) {
                        stats.bySchadensCode[r.schadensCode] = { count: 0, totalMinutes: 0 };
                    }
                    stats.bySchadensCode[r.schadensCode].count++;
                    stats.bySchadensCode[r.schadensCode].totalMinutes += r.dauerMinuten || 0;
                }
            });

            // Durchschnitte berechnen
            Object.entries(stats.byWorkType).forEach(([type, data]) => {
                stats.avgDurationByType[type] = Math.round(data.totalMinutes / data.count);
            });

            return stats;
        } catch (error) {
            console.error('Fehler beim Laden der Statistiken:', error);
            return null;
        }
    }

    // ========================================
    // PUBLIC API
    // ========================================

    return {
        // Timer-Kontrolle
        start,
        pause,
        resume,
        stop,
        togglePause,
        stopAndSave,

        // Daten-Eingabe
        addMaterial,
        addMaterialFromUI,
        setNotes,
        setWorkType,

        // UI
        createTimerWidget,
        openStartModal,
        confirmStart,
        updateUI,

        // Status
        isRunning: () => state.isRunning,
        isPaused: () => state.isPaused,
        getElapsedTime,
        formatTime,
        getState: () => ({ ...state }),

        // Statistiken
        getWorkTimeStats,

        // Restore
        restoreState,

        // Konstanten
        WORK_TYPES,
        MATERIALS,
        SKILL_LEVELS
    };
})();

// Bei Seitenlade pruefen ob Timer wiederhergestellt werden soll
document.addEventListener('DOMContentLoaded', function() {
    if (WorkTimer.restoreState()) {
        console.log('Timer-Status wiederhergestellt');
        WorkTimer.updateUI();
    }
});
