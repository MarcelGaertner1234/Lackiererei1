/**
 * DAMAGE-LABELER.JS - Schadensfoto Labeling Module
 *
 * AGI-VORBEREITUNG: UI und Logik fuer Schadenslabeling
 * Speichert strukturierte ML-Trainingsdaten in Firestore
 *
 * @version 1.0.0
 * @date 2025-12-11
 * @requires damage-codes.js
 */

(function() {
    'use strict';

    // ============================================================================
    // DAMAGE LABELER MODULE
    // ============================================================================

    window.DamageLabeler = {

        // State
        currentFahrzeugId: null,
        currentFotoIndex: null,
        currentFotoData: null,
        isModalOpen: false,

        // ========================================
        // INITIALIZATION
        // ========================================

        /**
         * Initialisiert das Labeler-Modul
         */
        init: function() {
            // Pruefen ob damage-codes.js geladen ist
            if (typeof window.DAMAGE_CODES === 'undefined') {
                console.error('[DamageLabeler] DAMAGE_CODES nicht gefunden! damage-codes.js laden!');
                return false;
            }

            // Modal HTML erstellen
            this.createModalHTML();

            // Event Listeners
            this.setupEventListeners();

            console.log('✅ [DamageLabeler] Initialisiert');
            return true;
        },

        // ========================================
        // MODAL UI
        // ========================================

        /**
         * Erstellt das Modal HTML
         */
        createModalHTML: function() {
            // Falls Modal bereits existiert, nicht neu erstellen
            if (document.getElementById('damageLabelModal')) {
                return;
            }

            const modalHTML = `
                <div id="damageLabelModal" class="damage-label-modal" style="display: none;">
                    <div class="damage-label-modal-content">
                        <div class="damage-label-header">
                            <h3>Schaden labeln (AGI-Training)</h3>
                            <button class="damage-label-close" onclick="DamageLabeler.closeModal()">&times;</button>
                        </div>

                        <div class="damage-label-body">
                            <!-- Foto Vorschau -->
                            <div class="damage-label-preview">
                                <img id="damageLabelPreview" src="" alt="Schadensfoto">
                            </div>

                            <!-- Labeling Form -->
                            <div class="damage-label-form">
                                <!-- Position -->
                                <div class="damage-label-group">
                                    <label>Position am Fahrzeug</label>
                                    <select id="labelPosition" class="damage-label-select">
                                        <option value="">-- Position waehlen --</option>
                                    </select>
                                </div>

                                <!-- Schadensart -->
                                <div class="damage-label-group">
                                    <label>Schadensart</label>
                                    <select id="labelSchadensart" class="damage-label-select">
                                        <option value="">-- Schadensart waehlen --</option>
                                    </select>
                                    <small id="labelSchadensartInfo" class="damage-label-info"></small>
                                </div>

                                <!-- Schweregrad -->
                                <div class="damage-label-group">
                                    <label>Schweregrad (1-5)</label>
                                    <div class="damage-label-severity">
                                        <input type="range" id="labelSchweregrad" min="1" max="5" value="3">
                                        <span id="labelSchweregradText">3 - Mittel</span>
                                    </div>
                                </div>

                                <!-- Groesse Schaetzung -->
                                <div class="damage-label-group">
                                    <label>Groesse (optional)</label>
                                    <input type="text" id="labelGroesse" placeholder="z.B. 10x5cm" class="damage-label-input">
                                </div>

                                <!-- Tiefe -->
                                <div class="damage-label-group">
                                    <label>Tiefe</label>
                                    <select id="labelTiefe" class="damage-label-select">
                                        <option value="oberflaechlich">Oberflaechlich</option>
                                        <option value="mittel" selected>Mittel</option>
                                        <option value="tief">Tief</option>
                                        <option value="durchgehend">Durchgehend (Loch)</option>
                                    </select>
                                </div>

                                <!-- Reparaturart -->
                                <div class="damage-label-group">
                                    <label>Empfohlene Reparatur</label>
                                    <select id="labelReparatur" class="damage-label-select">
                                        <option value="">-- Reparaturart waehlen --</option>
                                    </select>
                                </div>

                                <!-- Konfidenz -->
                                <div class="damage-label-group">
                                    <label>Sicherheit der Einschaetzung</label>
                                    <div class="damage-label-confidence">
                                        <label>
                                            <input type="radio" name="labelConfidence" value="sicher" checked>
                                            Sicher
                                        </label>
                                        <label>
                                            <input type="radio" name="labelConfidence" value="unsicher">
                                            Unsicher
                                        </label>
                                    </div>
                                </div>

                                <!-- Notizen -->
                                <div class="damage-label-group">
                                    <label>Notizen (optional)</label>
                                    <textarea id="labelNotizen" class="damage-label-textarea" placeholder="Zusaetzliche Infos..."></textarea>
                                </div>

                                <!-- Preis-Vorschau -->
                                <div class="damage-label-price-preview" id="labelPricePreview">
                                    <strong>Geschaetzte Kosten:</strong>
                                    <span id="labelPriceRange">---</span>
                                </div>
                            </div>
                        </div>

                        <div class="damage-label-footer">
                            <button class="damage-label-btn-cancel" onclick="DamageLabeler.closeModal()">Abbrechen</button>
                            <button class="damage-label-btn-save" onclick="DamageLabeler.saveLabel()">Label speichern</button>
                        </div>
                    </div>
                </div>
            `;

            // CSS einfuegen
            this.injectStyles();

            // Modal zum Body hinzufuegen
            document.body.insertAdjacentHTML('beforeend', modalHTML);

            // Dropdowns befuellen
            this.populateDropdowns();
        },

        /**
         * Fuegt CSS Styles ein
         */
        injectStyles: function() {
            if (document.getElementById('damageLabelStyles')) {
                return;
            }

            const styles = `
                <style id="damageLabelStyles">
                    .damage-label-modal {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0,0,0,0.7);
                        z-index: 10000;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }

                    .damage-label-modal-content {
                        background: white;
                        border-radius: 12px;
                        width: 95%;
                        max-width: 800px;
                        max-height: 90vh;
                        overflow-y: auto;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
                    }

                    .damage-label-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        padding: 16px 20px;
                        border-bottom: 1px solid #eee;
                        background: #f8f9fa;
                        border-radius: 12px 12px 0 0;
                    }

                    .damage-label-header h3 {
                        margin: 0;
                        font-size: 18px;
                        color: #333;
                    }

                    .damage-label-close {
                        background: none;
                        border: none;
                        font-size: 28px;
                        cursor: pointer;
                        color: #666;
                        padding: 0;
                        line-height: 1;
                    }

                    .damage-label-close:hover {
                        color: #d32f2f;
                    }

                    .damage-label-body {
                        display: flex;
                        gap: 20px;
                        padding: 20px;
                    }

                    @media (max-width: 768px) {
                        .damage-label-body {
                            flex-direction: column;
                        }
                    }

                    .damage-label-preview {
                        flex: 0 0 300px;
                    }

                    .damage-label-preview img {
                        width: 100%;
                        height: auto;
                        border-radius: 8px;
                        border: 2px solid #e0e0e0;
                    }

                    .damage-label-form {
                        flex: 1;
                        display: flex;
                        flex-direction: column;
                        gap: 12px;
                    }

                    .damage-label-group {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                    }

                    .damage-label-group label {
                        font-weight: 600;
                        font-size: 13px;
                        color: #555;
                    }

                    .damage-label-select,
                    .damage-label-input,
                    .damage-label-textarea {
                        padding: 10px 12px;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        font-size: 14px;
                        transition: border-color 0.2s;
                    }

                    .damage-label-select:focus,
                    .damage-label-input:focus,
                    .damage-label-textarea:focus {
                        border-color: #2196F3;
                        outline: none;
                    }

                    .damage-label-textarea {
                        min-height: 60px;
                        resize: vertical;
                    }

                    .damage-label-info {
                        font-size: 12px;
                        color: #888;
                        font-style: italic;
                    }

                    .damage-label-severity {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                    }

                    .damage-label-severity input[type="range"] {
                        flex: 1;
                        height: 8px;
                        -webkit-appearance: none;
                        background: linear-gradient(to right, #4CAF50, #FFEB3B, #f44336);
                        border-radius: 4px;
                    }

                    .damage-label-severity input[type="range"]::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        width: 20px;
                        height: 20px;
                        background: white;
                        border: 2px solid #333;
                        border-radius: 50%;
                        cursor: pointer;
                    }

                    .damage-label-confidence {
                        display: flex;
                        gap: 20px;
                    }

                    .damage-label-confidence label {
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-weight: normal;
                        cursor: pointer;
                    }

                    .damage-label-price-preview {
                        background: #e3f2fd;
                        padding: 12px;
                        border-radius: 6px;
                        font-size: 14px;
                        margin-top: 8px;
                    }

                    .damage-label-footer {
                        display: flex;
                        justify-content: flex-end;
                        gap: 12px;
                        padding: 16px 20px;
                        border-top: 1px solid #eee;
                        background: #f8f9fa;
                        border-radius: 0 0 12px 12px;
                    }

                    .damage-label-btn-cancel {
                        padding: 10px 20px;
                        background: #f5f5f5;
                        border: 1px solid #ddd;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                    }

                    .damage-label-btn-cancel:hover {
                        background: #eee;
                    }

                    .damage-label-btn-save {
                        padding: 10px 20px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 14px;
                        font-weight: 600;
                    }

                    .damage-label-btn-save:hover {
                        background: #43A047;
                    }

                    .damage-label-btn-save:disabled {
                        background: #ccc;
                        cursor: not-allowed;
                    }

                    /* Labeling Button fuer Fotos */
                    .foto-label-btn {
                        position: absolute;
                        bottom: 8px;
                        right: 8px;
                        background: rgba(0,0,0,0.6);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        padding: 4px 8px;
                        font-size: 11px;
                        cursor: pointer;
                        opacity: 0;
                        transition: opacity 0.2s;
                    }

                    .foto-card:hover .foto-label-btn,
                    .foto-preview:hover .foto-label-btn {
                        opacity: 1;
                    }

                    .foto-label-btn:hover {
                        background: rgba(33, 150, 243, 0.9);
                    }

                    .foto-label-btn.labeled {
                        background: rgba(76, 175, 80, 0.8);
                        opacity: 1;
                    }

                    /* Label Badge */
                    .foto-label-badge {
                        position: absolute;
                        top: 8px;
                        left: 8px;
                        background: #4CAF50;
                        color: white;
                        font-size: 10px;
                        padding: 2px 6px;
                        border-radius: 10px;
                    }
                </style>
            `;

            document.head.insertAdjacentHTML('beforeend', styles);
        },

        /**
         * Befuellt die Dropdown-Menues aus DAMAGE_CODES
         */
        populateDropdowns: function() {
            // Position Dropdown
            const positionSelect = document.getElementById('labelPosition');
            if (positionSelect) {
                positionSelect.innerHTML = '<option value="">-- Position waehlen --</option>';

                // Gruppiert nach Zone
                const zones = {};
                for (const [code, pos] of Object.entries(window.DAMAGE_CODES.positions)) {
                    if (!zones[pos.zone]) zones[pos.zone] = [];
                    zones[pos.zone].push({ code, ...pos });
                }

                for (const [zone, positions] of Object.entries(zones)) {
                    const zoneName = window.DAMAGE_CODES.zones[zone]?.name || zone;
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = zoneName;

                    positions.forEach(pos => {
                        const option = document.createElement('option');
                        option.value = pos.code;
                        option.textContent = pos.name;
                        optgroup.appendChild(option);
                    });

                    positionSelect.appendChild(optgroup);
                }
            }

            // Schadensart Dropdown
            const schadensartSelect = document.getElementById('labelSchadensart');
            if (schadensartSelect) {
                schadensartSelect.innerHTML = '<option value="">-- Schadensart waehlen --</option>';

                // Gruppiert nach Kategorie
                const categories = {};
                for (const [code, type] of Object.entries(window.DAMAGE_CODES.damageTypes)) {
                    if (!categories[type.category]) categories[type.category] = [];
                    categories[type.category].push({ code, ...type });
                }

                const categoryNames = {
                    'mechanisch': 'Mechanische Schaeden',
                    'oberflaeche': 'Oberflaechenschaeden',
                    'lack': 'Lackschaeden',
                    'korrosion': 'Korrosion / Rost',
                    'strukturell': 'Strukturelle Schaeden',
                    'glas': 'Glasschaeden',
                    'sonstiges': 'Sonstige'
                };

                for (const [category, types] of Object.entries(categories)) {
                    const optgroup = document.createElement('optgroup');
                    optgroup.label = categoryNames[category] || category;

                    types.forEach(type => {
                        const option = document.createElement('option');
                        option.value = type.code;
                        option.textContent = type.name;
                        optgroup.appendChild(option);
                    });

                    schadensartSelect.appendChild(optgroup);
                }
            }

            // Reparaturart Dropdown
            const reparaturSelect = document.getElementById('labelReparatur');
            if (reparaturSelect) {
                reparaturSelect.innerHTML = '<option value="">-- Reparaturart waehlen --</option>';

                for (const [code, method] of Object.entries(window.DAMAGE_CODES.repairMethods)) {
                    const option = document.createElement('option');
                    option.value = code;
                    option.textContent = `${method.name} (${method.skillRequired})`;
                    reparaturSelect.appendChild(option);
                }
            }
        },

        /**
         * Richtet Event Listeners ein
         */
        setupEventListeners: function() {
            // Schweregrad Slider
            const slider = document.getElementById('labelSchweregrad');
            if (slider) {
                slider.addEventListener('input', () => {
                    this.updateSchweregradText();
                    this.updatePricePreview();
                });
            }

            // Schadensart aendert sich
            const schadensartSelect = document.getElementById('labelSchadensart');
            if (schadensartSelect) {
                schadensartSelect.addEventListener('change', () => {
                    this.updateSchadensartInfo();
                    this.updateRepairOptions();
                    this.updatePricePreview();
                });
            }

            // ESC zum Schliessen
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.isModalOpen) {
                    this.closeModal();
                }
            });
        },

        /**
         * Aktualisiert den Schweregrad-Text
         */
        updateSchweregradText: function() {
            const slider = document.getElementById('labelSchweregrad');
            const text = document.getElementById('labelSchweregradText');

            if (slider && text) {
                const value = parseInt(slider.value);
                const severityData = window.DAMAGE_CODES.severityLevels[value];
                text.textContent = `${value} - ${severityData?.name || ''}`;
            }
        },

        /**
         * Zeigt Info zur ausgewaehlten Schadensart
         */
        updateSchadensartInfo: function() {
            const select = document.getElementById('labelSchadensart');
            const info = document.getElementById('labelSchadensartInfo');

            if (select && info) {
                const code = select.value;
                const damage = window.DAMAGE_CODES.damageTypes[code];

                if (damage) {
                    info.textContent = `${damage.description} | ca. ${damage.avgRepairTime} Min | ca. ${damage.avgCost} EUR`;
                } else {
                    info.textContent = '';
                }
            }
        },

        /**
         * Aktualisiert Reparatur-Optionen basierend auf Schadensart
         */
        updateRepairOptions: function() {
            const schadensartSelect = document.getElementById('labelSchadensart');
            const reparaturSelect = document.getElementById('labelReparatur');

            if (!schadensartSelect || !reparaturSelect) return;

            const schadensart = schadensartSelect.value;

            if (schadensart) {
                const methods = window.findRepairMethods(schadensart);

                // Markiere passende Optionen
                Array.from(reparaturSelect.options).forEach(option => {
                    const isRecommended = methods.some(m => m.code === option.value);
                    if (isRecommended && option.value) {
                        option.textContent = option.textContent.replace(' (empfohlen)', '') + ' (empfohlen)';
                        option.style.fontWeight = 'bold';
                    } else {
                        option.textContent = option.textContent.replace(' (empfohlen)', '');
                        option.style.fontWeight = 'normal';
                    }
                });

                // Auto-select erste empfohlene Methode
                if (methods.length > 0 && !reparaturSelect.value) {
                    reparaturSelect.value = methods[0].code;
                }
            }
        },

        /**
         * Aktualisiert die Preis-Vorschau
         */
        updatePricePreview: function() {
            const schadensartSelect = document.getElementById('labelSchadensart');
            const slider = document.getElementById('labelSchweregrad');
            const priceRange = document.getElementById('labelPriceRange');

            if (!schadensartSelect || !slider || !priceRange) return;

            const schadensart = schadensartSelect.value;
            const severity = parseInt(slider.value);

            if (schadensart) {
                const estimate = window.estimateRepairCost(schadensart, severity);
                if (estimate) {
                    priceRange.textContent = `${estimate.minPrice} - ${estimate.maxPrice} EUR (ca. ${estimate.estimatedTime} Min)`;
                }
            } else {
                priceRange.textContent = '---';
            }
        },

        // ========================================
        // MODAL CONTROL
        // ========================================

        /**
         * Oeffnet das Labeling Modal fuer ein Foto
         * @param {string} fahrzeugId - Fahrzeug ID
         * @param {number} fotoIndex - Index des Fotos
         * @param {Object} fotoData - Foto-Daten (url, schadenLabels, etc.)
         */
        openModal: function(fahrzeugId, fotoIndex, fotoData) {
            this.currentFahrzeugId = fahrzeugId;
            this.currentFotoIndex = fotoIndex;
            this.currentFotoData = fotoData;

            // Preview Bild setzen
            const preview = document.getElementById('damageLabelPreview');
            if (preview) {
                preview.src = fotoData.url || fotoData;
            }

            // Falls bereits gelabelt, Felder befuellen
            if (fotoData.schadenLabels) {
                this.fillFormWithExistingLabels(fotoData.schadenLabels);
            } else {
                this.resetForm();
            }

            // Modal anzeigen
            const modal = document.getElementById('damageLabelModal');
            if (modal) {
                modal.style.display = 'flex';
                this.isModalOpen = true;
            }
        },

        /**
         * Schliesst das Modal
         */
        closeModal: function() {
            const modal = document.getElementById('damageLabelModal');
            if (modal) {
                modal.style.display = 'none';
                this.isModalOpen = false;
            }

            this.currentFahrzeugId = null;
            this.currentFotoIndex = null;
            this.currentFotoData = null;
        },

        /**
         * Setzt das Formular zurueck
         */
        resetForm: function() {
            document.getElementById('labelPosition').value = '';
            document.getElementById('labelSchadensart').value = '';
            document.getElementById('labelSchweregrad').value = 3;
            document.getElementById('labelGroesse').value = '';
            document.getElementById('labelTiefe').value = 'mittel';
            document.getElementById('labelReparatur').value = '';
            document.getElementById('labelNotizen').value = '';
            // ✅ FIX BUG-S1 (2026-01-11): Null-safe querySelector
            const radioBtn = document.querySelector('input[name="labelConfidence"][value="sicher"]');
            if (radioBtn) radioBtn.checked = true;

            this.updateSchweregradText();
            this.updatePricePreview();
        },

        /**
         * Befuellt Formular mit existierenden Labels
         * @param {Object} labels - Existierende Label-Daten
         */
        fillFormWithExistingLabels: function(labels) {
            if (labels.position) document.getElementById('labelPosition').value = labels.position;
            if (labels.schadensart) document.getElementById('labelSchadensart').value = labels.schadensart;
            if (labels.schweregrad) document.getElementById('labelSchweregrad').value = labels.schweregrad;
            if (labels.groesseSchaetzung) document.getElementById('labelGroesse').value = labels.groesseSchaetzung;
            if (labels.tiefe) document.getElementById('labelTiefe').value = labels.tiefe;
            if (labels.reparaturart) document.getElementById('labelReparatur').value = labels.reparaturart;
            if (labels.notizen) document.getElementById('labelNotizen').value = labels.notizen;

            const confidence = labels.confidence || 'sicher';
            // ✅ FIX BUG-S2 (2026-01-11): Null-safe querySelector
            const confidenceBtn = document.querySelector(`input[name="labelConfidence"][value="${confidence}"]`);
            if (confidenceBtn) confidenceBtn.checked = true;

            this.updateSchweregradText();
            this.updateSchadensartInfo();
            this.updatePricePreview();
        },

        // ========================================
        // SAVE & FIRESTORE
        // ========================================

        /**
         * Speichert das Label in Firestore
         */
        saveLabel: async function() {
            // Validierung
            const position = document.getElementById('labelPosition').value;
            const schadensart = document.getElementById('labelSchadensart').value;
            const schweregrad = parseInt(document.getElementById('labelSchweregrad').value);

            if (!position) {
                alert('Bitte Position waehlen!');
                return;
            }

            if (!schadensart) {
                alert('Bitte Schadensart waehlen!');
                return;
            }

            // Label-Objekt erstellen
            const schadenLabels = {
                position: position,
                schadensart: schadensart,
                schweregrad: schweregrad,
                groesseSchaetzung: document.getElementById('labelGroesse').value || null,
                tiefe: document.getElementById('labelTiefe').value,
                reparaturart: document.getElementById('labelReparatur').value || null,
                notizen: document.getElementById('labelNotizen').value || null
            };

            // Validieren
            const validation = window.validateDamageLabel(schadenLabels);
            if (!validation.valid) {
                alert('Validierungsfehler:\n' + validation.errors.join('\n'));
                return;
            }

            // Metadaten
            const labelData = {
                schadenLabels: schadenLabels,
                // ✅ FIX BUG-S4 (2026-01-11): Firestore Timestamp statt toISOString
                labeledAt: firebase.firestore.Timestamp.now(),
                labeledBy: this.getCurrentUserId(),
                confidence: document.querySelector('input[name="labelConfidence"]:checked')?.value || 'medium',
                damageCode: window.generateDamageCode(position, schadensart, schweregrad)
            };

            // In Firestore speichern
            try {
                await this.saveLabelToFirestore(labelData);

                console.log('✅ [DamageLabeler] Label gespeichert:', labelData);

                // UI aktualisieren
                if (typeof window.showToast === 'function') {
                    window.showToast('Label gespeichert!', 'success');
                }

                this.closeModal();

                // Event feuern fuer UI-Update
                window.dispatchEvent(new CustomEvent('damageLabelSaved', {
                    detail: {
                        fahrzeugId: this.currentFahrzeugId,
                        fotoIndex: this.currentFotoIndex,
                        labelData: labelData
                    }
                }));

            } catch (error) {
                console.error('❌ [DamageLabeler] Fehler beim Speichern:', error);
                alert('Fehler beim Speichern: ' + error.message);
            }
        },

        /**
         * Speichert Label in Firestore
         * @param {Object} labelData - Label-Daten zum Speichern
         */
        saveLabelToFirestore: async function(labelData) {
            if (!this.currentFahrzeugId) {
                throw new Error('Keine Fahrzeug-ID');
            }

            // Warten auf Firebase
            if (typeof window.firebaseInitialized !== 'undefined') {
                await window.firebaseInitialized;
            }

            // Fahrzeug-Collection mit Multi-Tenant Support
            const collection = window.getCollection ? window.getCollection('fahrzeuge') : firebase.firestore().collection('fahrzeuge');

            // Fahrzeug-Dokument holen
            const fahrzeugRef = collection.doc(this.currentFahrzeugId);
            const fahrzeugDoc = await fahrzeugRef.get();

            if (!fahrzeugDoc.exists) {
                throw new Error('Fahrzeug nicht gefunden');
            }

            const fahrzeugData = fahrzeugDoc.data();

            // Schaedensfotos-Array aktualisieren
            let schaedensfotos = fahrzeugData.schaedensfotos || [];

            if (this.currentFotoIndex !== null && schaedensfotos[this.currentFotoIndex]) {
                // Existierendes Foto aktualisieren
                if (typeof schaedensfotos[this.currentFotoIndex] === 'string') {
                    // Nur URL - in Objekt umwandeln
                    schaedensfotos[this.currentFotoIndex] = {
                        url: schaedensfotos[this.currentFotoIndex],
                        ...labelData
                    };
                } else {
                    // Bereits Objekt - Labels hinzufuegen
                    schaedensfotos[this.currentFotoIndex] = {
                        ...schaedensfotos[this.currentFotoIndex],
                        ...labelData
                    };
                }
            }

            // Update in Firestore
            await fahrzeugRef.update({
                schaedensfotos: schaedensfotos,
                updatedAt: new Date().toISOString()
            });
        },

        /**
         * Holt aktuelle User-ID
         * @returns {string} - User ID oder 'anonymous'
         */
        getCurrentUserId: function() {
            // Firebase Auth
            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                return firebase.auth().currentUser.uid;
            }

            // AuthManager
            if (window.authManager && window.authManager.getCurrentUser) {
                const user = window.authManager.getCurrentUser();
                if (user) return user.uid || user.email || 'anonymous';
            }

            return 'anonymous';
        },

        // ========================================
        // UTILITY: Add Labeling Buttons to Photos
        // ========================================

        /**
         * Fuegt Labeling-Buttons zu allen Fotos auf der Seite hinzu
         * @param {string} containerSelector - CSS Selector fuer Container
         * @param {string} fahrzeugId - Fahrzeug ID
         */
        addLabelButtonsToPhotos: function(containerSelector, fahrzeugId) {
            const container = document.querySelector(containerSelector);
            if (!container) return;

            const fotos = container.querySelectorAll('.foto-card, .foto-preview, .schadensfoto');

            fotos.forEach((foto, index) => {
                // Skip wenn bereits Button vorhanden
                if (foto.querySelector('.foto-label-btn')) return;

                // Position relative setzen
                foto.style.position = 'relative';

                // Button erstellen
                const btn = document.createElement('button');
                btn.className = 'foto-label-btn';
                btn.textContent = 'Labeln';
                btn.onclick = (e) => {
                    e.stopPropagation();
                    const fotoUrl = foto.querySelector('img')?.src || foto.style.backgroundImage?.replace(/url\(['"]?(.+?)['"]?\)/, '$1');
                    this.openModal(fahrzeugId, index, { url: fotoUrl });
                };

                foto.appendChild(btn);
            });
        }
    };

    // ============================================================================
    // AUTO-INITIALIZE
    // ============================================================================

    // Init wenn DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.DamageLabeler.init();
        });
    } else {
        window.DamageLabeler.init();
    }

    console.log('✅ [DamageLabeler] Modul geladen');

})();
