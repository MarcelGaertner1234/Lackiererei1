/**
 * KVA Feedback Module - AGI Training Sprint 3
 *
 * Sammelt Feedback-Daten ueber Abweichungen zwischen
 * Kostenvoranschlag (KVA) und tatsaechlichen Kosten.
 *
 * Diese Daten werden fuer ML-Training verwendet um
 * zukuenftige Preisvorhersagen zu verbessern.
 *
 * @module KVAFeedback
 * @version 1.0.0
 * @date 2025-12-11
 */

(function() {
    'use strict';

    // ============================================
    // CONSTANTS
    // ============================================

    /**
     * Gruende fuer Kostenabweichungen (ML-Kategorien)
     */
    const ABWEICHUNGS_GRUENDE = {
        'MEHR_ARBEIT': {
            name: 'Mehr Arbeitszeit',
            icon: 'clock',
            impact: 'negativ',
            description: 'Arbeit dauerte laenger als geschaetzt'
        },
        'WENIGER_ARBEIT': {
            name: 'Weniger Arbeitszeit',
            icon: 'clock',
            impact: 'positiv',
            description: 'Arbeit war schneller als geschaetzt'
        },
        'MEHR_MATERIAL': {
            name: 'Mehr Material',
            icon: 'package',
            impact: 'negativ',
            description: 'Mehr Material benoetigt als geplant'
        },
        'WENIGER_MATERIAL': {
            name: 'Weniger Material',
            icon: 'package',
            impact: 'positiv',
            description: 'Weniger Material benoetigt als geplant'
        },
        'ZUSATZSCHADEN': {
            name: 'Zusaetzlicher Schaden',
            icon: 'alert-triangle',
            impact: 'negativ',
            description: 'Versteckter Schaden entdeckt'
        },
        'PREISAENDERUNG': {
            name: 'Preisaenderung',
            icon: 'dollar-sign',
            impact: 'neutral',
            description: 'Ersatzteilpreise geaendert'
        },
        'KOMPLEXITAET': {
            name: 'Komplexitaet unterschaetzt',
            icon: 'layers',
            impact: 'negativ',
            description: 'Reparatur war komplexer als erwartet'
        },
        'EINFACHER': {
            name: 'Einfacher als erwartet',
            icon: 'check-circle',
            impact: 'positiv',
            description: 'Reparatur war einfacher als erwartet'
        },
        'KUNDENRABATT': {
            name: 'Kundenrabatt',
            icon: 'percent',
            impact: 'neutral',
            description: 'Nachtraeglicher Rabatt gewaehrt'
        },
        'SONSTIGES': {
            name: 'Sonstiges',
            icon: 'more-horizontal',
            impact: 'neutral',
            description: 'Andere Gruende'
        }
    };

    /**
     * Abweichungs-Kategorien fuer ML-Training
     */
    const ABWEICHUNGS_KATEGORIEN = {
        'EXAKT': { min: -2, max: 2, label: 'Exakt (+/- 2%)', color: '#4CAF50' },
        'LEICHT_UNTER': { min: -10, max: -2, label: 'Leicht unter (-2% bis -10%)', color: '#8BC34A' },
        'LEICHT_UEBER': { min: 2, max: 10, label: 'Leicht ueber (+2% bis +10%)', color: '#FFC107' },
        'DEUTLICH_UNTER': { min: -25, max: -10, label: 'Deutlich unter (-10% bis -25%)', color: '#00BCD4' },
        'DEUTLICH_UEBER': { min: 10, max: 25, label: 'Deutlich ueber (+10% bis +25%)', color: '#FF9800' },
        'STARK_UNTER': { min: -100, max: -25, label: 'Stark unter (> -25%)', color: '#2196F3' },
        'STARK_UEBER': { min: 25, max: 100, label: 'Stark ueber (> +25%)', color: '#f44336' }
    };

    // ============================================
    // STATE
    // ============================================

    let currentFeedback = {
        fahrzeugId: null,
        kpiKostenvoranschlag: 0,
        kpiTatsaechlicheKosten: 0,
        kpiAbweichung: 0,
        kpiAbweichungProzent: 0,
        kpiGrundAbweichung: null,
        kpiLernnotiz: '',
        abweichungsKategorie: null
    };

    // ============================================
    // CORE FUNCTIONS
    // ============================================

    /**
     * Berechnet Abweichung zwischen KVA und tatsaechlichen Kosten
     * @param {number} kva - Kostenvoranschlag
     * @param {number} actual - Tatsaechliche Kosten
     * @returns {Object} { abweichung, prozent, kategorie }
     */
    function calculateDeviation(kva, actual) {
        if (!kva || kva <= 0) {
            return { abweichung: 0, prozent: 0, kategorie: 'EXAKT' };
        }

        const abweichung = actual - kva;
        const prozent = ((actual - kva) / kva) * 100;

        // Kategorie bestimmen
        let kategorie = 'EXAKT';
        for (const [key, range] of Object.entries(ABWEICHUNGS_KATEGORIEN)) {
            if (prozent >= range.min && prozent < range.max) {
                kategorie = key;
                break;
            }
        }

        return {
            abweichung: Math.round(abweichung * 100) / 100,
            prozent: Math.round(prozent * 100) / 100,
            kategorie: kategorie
        };
    }

    /**
     * Initialisiert Feedback-Formular mit Fahrzeugdaten
     * @param {string} fahrzeugId - Fahrzeug ID
     * @param {Object} fahrzeugData - Fahrzeug-Datensatz
     */
    function initFeedback(fahrzeugId, fahrzeugData) {
        currentFeedback.fahrzeugId = fahrzeugId;
        currentFeedback.kpiKostenvoranschlag = fahrzeugData.kostenvoranschlag || fahrzeugData.kpiKostenvoranschlag || 0;
        currentFeedback.kpiTatsaechlicheKosten = 0;
        currentFeedback.kpiAbweichung = 0;
        currentFeedback.kpiAbweichungProzent = 0;
        currentFeedback.kpiGrundAbweichung = null;
        currentFeedback.kpiLernnotiz = '';
        currentFeedback.abweichungsKategorie = null;

        console.log('[AGI Sprint 3] Feedback initialisiert fuer Fahrzeug:', fahrzeugId);
        console.log('  KVA:', currentFeedback.kpiKostenvoranschlag);

        return currentFeedback;
    }

    /**
     * Aktualisiert Feedback mit tatsaechlichen Kosten
     * @param {number} actualCosts - Tatsaechliche Kosten
     */
    function updateActualCosts(actualCosts) {
        currentFeedback.kpiTatsaechlicheKosten = actualCosts;

        const deviation = calculateDeviation(
            currentFeedback.kpiKostenvoranschlag,
            actualCosts
        );

        currentFeedback.kpiAbweichung = deviation.abweichung;
        currentFeedback.kpiAbweichungProzent = deviation.prozent;
        currentFeedback.abweichungsKategorie = deviation.kategorie;

        console.log('[AGI Sprint 3] Kosten aktualisiert:', {
            kva: currentFeedback.kpiKostenvoranschlag,
            actual: actualCosts,
            abweichung: deviation.abweichung,
            prozent: deviation.prozent + '%',
            kategorie: deviation.kategorie
        });

        return currentFeedback;
    }

    /**
     * Setzt Abweichungsgrund
     * @param {string} grund - Abweichungsgrund aus ABWEICHUNGS_GRUENDE
     */
    function setDeviationReason(grund) {
        if (ABWEICHUNGS_GRUENDE[grund]) {
            currentFeedback.kpiGrundAbweichung = grund;
            console.log('[AGI Sprint 3] Abweichungsgrund:', ABWEICHUNGS_GRUENDE[grund].name);
        }
        return currentFeedback;
    }

    /**
     * Setzt Lernnotiz fuer ML-Training
     * @param {string} notiz - Freitext-Notiz
     */
    function setLearningNote(notiz) {
        currentFeedback.kpiLernnotiz = notiz;
        return currentFeedback;
    }

    /**
     * Speichert Feedback in Firestore
     * @returns {Promise<boolean>} Erfolg
     */
    async function saveFeedback() {
        if (!currentFeedback.fahrzeugId) {
            console.error('[AGI Sprint 3] Kein Fahrzeug ausgewaehlt');
            return false;
        }

        try {
            await window.firebaseInitialized;

            const feedbackData = {
                kpiKostenvoranschlag: currentFeedback.kpiKostenvoranschlag,
                kpiTatsaechlicheKosten: currentFeedback.kpiTatsaechlicheKosten,
                kpiAbweichung: currentFeedback.kpiAbweichung,
                kpiAbweichungProzent: currentFeedback.kpiAbweichungProzent,
                kpiGrundAbweichung: currentFeedback.kpiGrundAbweichung,
                kpiLernnotiz: currentFeedback.kpiLernnotiz,
                abweichungsKategorie: currentFeedback.abweichungsKategorie,
                kpiFeedbackDatum: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Update Fahrzeug-Dokument
            const fahrzeugeRef = window.getCollection('fahrzeuge');
            await fahrzeugeRef.doc(String(currentFeedback.fahrzeugId)).update(feedbackData);

            // Event dispatchen
            window.dispatchEvent(new CustomEvent('kvaFeedbackSaved', {
                detail: {
                    fahrzeugId: currentFeedback.fahrzeugId,
                    feedback: feedbackData
                }
            }));

            console.log('[AGI Sprint 3] Feedback gespeichert:', feedbackData);
            return true;

        } catch (error) {
            console.error('[AGI Sprint 3] Fehler beim Speichern:', error);
            return false;
        }
    }

    // ============================================
    // UI FUNCTIONS
    // ============================================

    /**
     * Erstellt Feedback-Formular Widget
     * @param {string} fahrzeugId - Fahrzeug ID
     * @param {Object} fahrzeugData - Fahrzeug-Datensatz
     * @returns {HTMLElement} Formular-Element
     */
    function createFeedbackWidget(fahrzeugId, fahrzeugData) {
        initFeedback(fahrzeugId, fahrzeugData);

        const widget = document.createElement('div');
        widget.className = 'kva-feedback-widget';
        widget.id = 'kvaFeedbackWidget';

        const kva = currentFeedback.kpiKostenvoranschlag;
        const existingActual = fahrzeugData.kpiTatsaechlicheKosten || '';
        const existingGrund = fahrzeugData.kpiGrundAbweichung || '';
        const existingNotiz = fahrzeugData.kpiLernnotiz || '';

        widget.innerHTML = `
            <style>
                .kva-feedback-widget {
                    background: var(--color-surface-elevated, #f8f9fa);
                    border: 1px solid var(--color-border-glass, #e0e0e0);
                    border-radius: 12px;
                    padding: 20px;
                    margin-top: 20px;
                }
                .kva-feedback-widget h4 {
                    margin: 0 0 15px 0;
                    color: var(--color-text-primary, #333);
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                .kva-feedback-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 15px;
                    margin-bottom: 15px;
                }
                .kva-field {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }
                .kva-field label {
                    font-size: 12px;
                    font-weight: 600;
                    color: var(--color-text-secondary, #666);
                    text-transform: uppercase;
                }
                .kva-field input, .kva-field select, .kva-field textarea {
                    padding: 10px 12px;
                    border: 1px solid var(--color-border-glass, #ddd);
                    border-radius: 8px;
                    font-size: 14px;
                    background: var(--color-surface, white);
                    color: var(--color-text-primary, #333);
                }
                .kva-field input:focus, .kva-field select:focus, .kva-field textarea:focus {
                    outline: none;
                    border-color: var(--color-primary, #007aff);
                    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
                }
                .kva-deviation-display {
                    background: var(--color-surface, white);
                    border-radius: 8px;
                    padding: 15px;
                    text-align: center;
                    margin-bottom: 15px;
                }
                .kva-deviation-value {
                    font-size: 32px;
                    font-weight: 700;
                }
                .kva-deviation-label {
                    font-size: 12px;
                    color: var(--color-text-secondary, #666);
                    margin-top: 5px;
                }
                .kva-reason-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
                    gap: 8px;
                    margin-bottom: 15px;
                }
                .kva-reason-btn {
                    padding: 10px;
                    border: 2px solid var(--color-border-glass, #ddd);
                    border-radius: 8px;
                    background: var(--color-surface, white);
                    cursor: pointer;
                    transition: all 0.2s;
                    text-align: center;
                    font-size: 12px;
                }
                .kva-reason-btn:hover {
                    border-color: var(--color-primary, #007aff);
                    background: rgba(0, 122, 255, 0.05);
                }
                .kva-reason-btn.selected {
                    border-color: var(--color-primary, #007aff);
                    background: rgba(0, 122, 255, 0.1);
                    color: var(--color-primary, #007aff);
                }
                .kva-reason-btn.impact-positiv { border-left: 4px solid #4CAF50; }
                .kva-reason-btn.impact-negativ { border-left: 4px solid #f44336; }
                .kva-reason-btn.impact-neutral { border-left: 4px solid #9e9e9e; }
            </style>

            <h4>
                <span style="font-size: 24px;">&#128202;</span>
                KVA-Feedback (ML Training)
            </h4>

            <div class="kva-feedback-grid">
                <div class="kva-field">
                    <label>Kostenvoranschlag (EUR)</label>
                    <input type="number" id="kvaEstimate" value="${kva}" readonly
                           style="background: #f0f0f0; cursor: not-allowed;">
                </div>
                <div class="kva-field">
                    <label>Tatsaechliche Kosten (EUR)</label>
                    <input type="number" id="kvaActual" value="${existingActual}"
                           placeholder="0.00" step="0.01" min="0"
                           onchange="window.KVAFeedback.onActualCostChange(this.value)">
                </div>
            </div>

            <div class="kva-deviation-display" id="kvaDeviationDisplay">
                <div class="kva-deviation-value" id="kvaDeviationValue">-</div>
                <div class="kva-deviation-label" id="kvaDeviationLabel">Abweichung</div>
            </div>

            <div class="kva-field" style="margin-bottom: 15px;">
                <label>Grund fuer Abweichung</label>
                <div class="kva-reason-grid" id="kvaReasonGrid">
                    ${Object.entries(ABWEICHUNGS_GRUENDE).map(([key, val]) => `
                        <button type="button"
                                class="kva-reason-btn impact-${val.impact} ${existingGrund === key ? 'selected' : ''}"
                                data-reason="${key}"
                                onclick="window.KVAFeedback.selectReason('${key}')">
                            ${val.name}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="kva-field">
                <label>Lernnotiz (fuer ML-Training)</label>
                <textarea id="kvaLearningNote" rows="3"
                          placeholder="Was koennen wir fuer zukuenftige Schaetzungen lernen?"
                          onchange="window.KVAFeedback.setLearningNote(this.value)">${existingNotiz}</textarea>
            </div>
        `;

        // Update display if existing data
        if (existingActual) {
            setTimeout(() => {
                updateActualCosts(parseFloat(existingActual));
                updateDeviationDisplay();
            }, 100);
        }

        return widget;
    }

    /**
     * Handler fuer Kostenfeld-Aenderung
     */
    function onActualCostChange(value) {
        const actualCost = parseFloat(value) || 0;
        updateActualCosts(actualCost);
        updateDeviationDisplay();
    }

    /**
     * Handler fuer Grund-Auswahl
     */
    function selectReason(reason) {
        // Deselect all
        document.querySelectorAll('.kva-reason-btn').forEach(btn => {
            btn.classList.remove('selected');
        });

        // Select clicked
        const btn = document.querySelector(`.kva-reason-btn[data-reason="${reason}"]`);
        if (btn) {
            btn.classList.add('selected');
        }

        setDeviationReason(reason);
    }

    /**
     * Aktualisiert Abweichungs-Anzeige
     */
    function updateDeviationDisplay() {
        const valueEl = document.getElementById('kvaDeviationValue');
        const labelEl = document.getElementById('kvaDeviationLabel');
        const displayEl = document.getElementById('kvaDeviationDisplay');

        if (!valueEl || !labelEl || !displayEl) return;

        const abw = currentFeedback.kpiAbweichung;
        const pct = currentFeedback.kpiAbweichungProzent;
        const kat = currentFeedback.abweichungsKategorie;

        // Farbe basierend auf Kategorie
        const katInfo = ABWEICHUNGS_KATEGORIEN[kat];
        const color = katInfo ? katInfo.color : '#9e9e9e';

        // Vorzeichen
        const sign = abw >= 0 ? '+' : '';

        valueEl.textContent = `${sign}${abw.toFixed(2)} EUR`;
        valueEl.style.color = color;

        labelEl.textContent = `${sign}${pct.toFixed(1)}% | ${katInfo ? katInfo.label : 'Unbekannt'}`;
    }

    /**
     * Holt aktuelles Feedback
     */
    function getCurrentFeedback() {
        return { ...currentFeedback };
    }

    // ============================================
    // STATISTICS FUNCTIONS
    // ============================================

    /**
     * Holt KVA-Feedback-Statistiken fuer ML
     * @returns {Promise<Object>} Statistiken
     */
    async function getKVAStats() {
        await window.firebaseInitialized;

        const fahrzeugeRef = window.getCollection('fahrzeuge');
        const snapshot = await fahrzeugeRef
            .where('kpiFeedbackDatum', '!=', null)
            .get();

        const stats = {
            totalFeedback: 0,
            avgAbweichungProzent: 0,
            byKategorie: {},
            byGrund: {},
            trendData: []
        };

        let sumAbweichung = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            stats.totalFeedback++;

            // Summe fuer Durchschnitt
            if (data.kpiAbweichungProzent !== undefined) {
                sumAbweichung += data.kpiAbweichungProzent;
            }

            // Nach Kategorie
            const kat = data.abweichungsKategorie || 'UNBEKANNT';
            stats.byKategorie[kat] = (stats.byKategorie[kat] || 0) + 1;

            // Nach Grund
            const grund = data.kpiGrundAbweichung || 'UNBEKANNT';
            stats.byGrund[grund] = (stats.byGrund[grund] || 0) + 1;

            // Trend-Daten
            stats.trendData.push({
                datum: data.kpiFeedbackDatum?.toDate?.() || new Date(),
                abweichung: data.kpiAbweichungProzent || 0,
                kategorie: kat
            });
        });

        // Durchschnitt berechnen
        if (stats.totalFeedback > 0) {
            stats.avgAbweichungProzent = Math.round((sumAbweichung / stats.totalFeedback) * 100) / 100;
        }

        // Trend sortieren
        stats.trendData.sort((a, b) => a.datum - b.datum);

        console.log('[AGI Sprint 3] KVA Stats:', stats);
        return stats;
    }

    /**
     * Exportiert KVA-Feedback fuer ML-Training
     * @returns {Promise<string>} JSON-String
     */
    async function exportKVATrainingData() {
        await window.firebaseInitialized;

        const fahrzeugeRef = window.getCollection('fahrzeuge');
        const snapshot = await fahrzeugeRef
            .where('kpiFeedbackDatum', '!=', null)
            .get();

        const stats = await getKVAStats();

        const exportData = {
            exportDate: new Date().toISOString(),
            werkstattId: window.werkstattId || window.getWerkstattId(),
            stats: stats,
            trainingData: []
        };

        snapshot.forEach(doc => {
            const data = doc.data();
            exportData.trainingData.push({
                // ML Features
                kpiKostenvoranschlag: data.kpiKostenvoranschlag,
                kpiTatsaechlicheKosten: data.kpiTatsaechlicheKosten,
                kpiAbweichung: data.kpiAbweichung,
                kpiAbweichungProzent: data.kpiAbweichungProzent,
                abweichungsKategorie: data.abweichungsKategorie,
                kpiGrundAbweichung: data.kpiGrundAbweichung,
                // Context
                serviceTyp: data.serviceTyp,
                marke: data.marke,
                modell: data.modell,
                baujahr: data.baujahrVon,
                // Quality
                kpiLernnotiz: data.kpiLernnotiz
            });
        });

        console.log(`[AGI Sprint 3] Export: ${exportData.trainingData.length} KVA-Feedback-Datensaetze`);
        return JSON.stringify(exportData, null, 2);
    }

    // ============================================
    // PUBLIC API
    // ============================================

    window.KVAFeedback = {
        // Constants
        ABWEICHUNGS_GRUENDE,
        ABWEICHUNGS_KATEGORIEN,

        // Core functions
        initFeedback,
        updateActualCosts,
        setDeviationReason,
        setLearningNote,
        saveFeedback,
        calculateDeviation,
        getCurrentFeedback,

        // UI functions
        createFeedbackWidget,
        onActualCostChange,
        selectReason,
        updateDeviationDisplay,

        // Statistics
        getKVAStats,
        exportKVATrainingData
    };

    console.log('[AGI Sprint 3] KVA Feedback Module geladen');
    console.log('   API: window.KVAFeedback');

})();
