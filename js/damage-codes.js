/**
 * DAMAGE-CODES.JS - Standardisierter Schadenskatalog
 *
 * AGI-VORBEREITUNG: Strukturierte Daten für ML-Training
 * Kompatibel mit Audatex/DAT Standards
 *
 * @version 1.0.0
 * @date 2025-12-11
 */

(function() {
    'use strict';

    // ============================================================================
    // DAMAGE CODES CATALOG
    // ============================================================================

    window.DAMAGE_CODES = {

        // ========================================
        // FAHRZEUG-POSITIONEN (nach Audatex/DAT)
        // ========================================
        positions: {
            // === FRONT ===
            'STOSSFAENGER_V': {
                name: 'Stossfaenger vorne',
                audatex: '100',
                zone: 'front',
                typical_damages: ['KRATZER', 'DELLE', 'BRUCH']
            },
            'MOTORHAUBE': {
                name: 'Motorhaube',
                audatex: '110',
                zone: 'front',
                typical_damages: ['DELLE', 'HAGEL', 'LACKSCHADEN']
            },
            'SCHEINWERFER_L': {
                name: 'Scheinwerfer links',
                audatex: '120',
                zone: 'front',
                typical_damages: ['BRUCH', 'MATT', 'KRATZER']
            },
            'SCHEINWERFER_R': {
                name: 'Scheinwerfer rechts',
                audatex: '121',
                zone: 'front',
                typical_damages: ['BRUCH', 'MATT', 'KRATZER']
            },
            'KUEHLERGRILL': {
                name: 'Kuehlergrill',
                audatex: '130',
                zone: 'front',
                typical_damages: ['BRUCH', 'KRATZER', 'FEHLT']
            },

            // === KOTFLUEGEL ===
            'KOTFLUEGEL_VL': {
                name: 'Kotfluegel vorne links',
                audatex: '310',
                zone: 'seite_links',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'KOTFLUEGEL_VR': {
                name: 'Kotfluegel vorne rechts',
                audatex: '320',
                zone: 'seite_rechts',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'KOTFLUEGEL_HL': {
                name: 'Kotfluegel hinten links',
                audatex: '510',
                zone: 'seite_links',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'KOTFLUEGEL_HR': {
                name: 'Kotfluegel hinten rechts',
                audatex: '520',
                zone: 'seite_rechts',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },

            // === TUEREN ===
            'TUER_VL': {
                name: 'Tuer vorne links',
                audatex: '410',
                zone: 'seite_links',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'TUER_VR': {
                name: 'Tuer vorne rechts',
                audatex: '420',
                zone: 'seite_rechts',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'TUER_HL': {
                name: 'Tuer hinten links',
                audatex: '430',
                zone: 'seite_links',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },
            'TUER_HR': {
                name: 'Tuer hinten rechts',
                audatex: '440',
                zone: 'seite_rechts',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'LACKSCHADEN']
            },

            // === SCHWELLER ===
            'SCHWELLER_L': {
                name: 'Schweller links',
                audatex: '450',
                zone: 'seite_links',
                typical_damages: ['DELLE', 'ROST', 'KRATZER', 'DURCHROSTUNG']
            },
            'SCHWELLER_R': {
                name: 'Schweller rechts',
                audatex: '460',
                zone: 'seite_rechts',
                typical_damages: ['DELLE', 'ROST', 'KRATZER', 'DURCHROSTUNG']
            },

            // === A/B/C-SAEULE ===
            'A_SAEULE_L': {
                name: 'A-Saeule links',
                audatex: '470',
                zone: 'seite_links',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },
            'A_SAEULE_R': {
                name: 'A-Saeule rechts',
                audatex: '471',
                zone: 'seite_rechts',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },
            'B_SAEULE_L': {
                name: 'B-Saeule links',
                audatex: '480',
                zone: 'seite_links',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },
            'B_SAEULE_R': {
                name: 'B-Saeule rechts',
                audatex: '481',
                zone: 'seite_rechts',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },
            'C_SAEULE_L': {
                name: 'C-Saeule links',
                audatex: '490',
                zone: 'seite_links',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },
            'C_SAEULE_R': {
                name: 'C-Saeule rechts',
                audatex: '491',
                zone: 'seite_rechts',
                typical_damages: ['ROST', 'DELLE', 'STRUKTURSCHADEN']
            },

            // === HECK ===
            'STOSSFAENGER_H': {
                name: 'Stossfaenger hinten',
                audatex: '600',
                zone: 'heck',
                typical_damages: ['KRATZER', 'DELLE', 'BRUCH']
            },
            'HECKKLAPPE': {
                name: 'Heckklappe / Kofferraumdeckel',
                audatex: '610',
                zone: 'heck',
                typical_damages: ['DELLE', 'KRATZER', 'ROST', 'HAGEL']
            },
            'RUECKLEUCHTE_L': {
                name: 'Rueckleuchte links',
                audatex: '620',
                zone: 'heck',
                typical_damages: ['BRUCH', 'KRATZER', 'FEHLT']
            },
            'RUECKLEUCHTE_R': {
                name: 'Rueckleuchte rechts',
                audatex: '621',
                zone: 'heck',
                typical_damages: ['BRUCH', 'KRATZER', 'FEHLT']
            },
            'HECKSCHEIBE': {
                name: 'Heckscheibe',
                audatex: '630',
                zone: 'heck',
                typical_damages: ['BRUCH', 'KRATZER', 'STEINSCHLAG']
            },

            // === DACH ===
            'DACH': {
                name: 'Dach',
                audatex: '700',
                zone: 'dach',
                typical_damages: ['DELLE', 'HAGEL', 'LACKSCHADEN', 'ROST']
            },
            'SCHIEBEDACH': {
                name: 'Schiebedach / Panoramadach',
                audatex: '710',
                zone: 'dach',
                typical_damages: ['BRUCH', 'UNDICHT', 'MECHANIK_DEFEKT']
            },
            'DACHTRAEGER': {
                name: 'Dachtraeger / Reling',
                audatex: '720',
                zone: 'dach',
                typical_damages: ['KRATZER', 'KORROSION', 'FEHLT']
            },

            // === SPIEGEL ===
            'SPIEGEL_L': {
                name: 'Aussenspiegel links',
                audatex: '800',
                zone: 'seite_links',
                typical_damages: ['BRUCH', 'KRATZER', 'FEHLT', 'LACK_AB']
            },
            'SPIEGEL_R': {
                name: 'Aussenspiegel rechts',
                audatex: '810',
                zone: 'seite_rechts',
                typical_damages: ['BRUCH', 'KRATZER', 'FEHLT', 'LACK_AB']
            },

            // === SCHEIBEN ===
            'FRONTSCHEIBE': {
                name: 'Frontscheibe',
                audatex: '900',
                zone: 'front',
                typical_damages: ['STEINSCHLAG', 'RISS', 'KRATZER']
            },
            'SEITENSCHEIBE_VL': {
                name: 'Seitenscheibe vorne links',
                audatex: '910',
                zone: 'seite_links',
                typical_damages: ['BRUCH', 'KRATZER']
            },
            'SEITENSCHEIBE_VR': {
                name: 'Seitenscheibe vorne rechts',
                audatex: '911',
                zone: 'seite_rechts',
                typical_damages: ['BRUCH', 'KRATZER']
            },
            'SEITENSCHEIBE_HL': {
                name: 'Seitenscheibe hinten links',
                audatex: '920',
                zone: 'seite_links',
                typical_damages: ['BRUCH', 'KRATZER']
            },
            'SEITENSCHEIBE_HR': {
                name: 'Seitenscheibe hinten rechts',
                audatex: '921',
                zone: 'seite_rechts',
                typical_damages: ['BRUCH', 'KRATZER']
            },

            // === RAEDER ===
            'FELGE_VL': {
                name: 'Felge vorne links',
                audatex: '1000',
                zone: 'raeder',
                typical_damages: ['BORDSTEIN', 'KRATZER', 'VERFORMT']
            },
            'FELGE_VR': {
                name: 'Felge vorne rechts',
                audatex: '1001',
                zone: 'raeder',
                typical_damages: ['BORDSTEIN', 'KRATZER', 'VERFORMT']
            },
            'FELGE_HL': {
                name: 'Felge hinten links',
                audatex: '1010',
                zone: 'raeder',
                typical_damages: ['BORDSTEIN', 'KRATZER', 'VERFORMT']
            },
            'FELGE_HR': {
                name: 'Felge hinten rechts',
                audatex: '1011',
                zone: 'raeder',
                typical_damages: ['BORDSTEIN', 'KRATZER', 'VERFORMT']
            },

            // === INNENRAUM (falls lackiert) ===
            'INNENRAUM_GENERAL': {
                name: 'Innenraum (allgemein)',
                audatex: '2000',
                zone: 'innen',
                typical_damages: ['KRATZER', 'RISS', 'FLECK', 'BRANDLOCH']
            }
        },

        // ========================================
        // SCHADENSARTEN
        // ========================================
        damageTypes: {
            // === MECHANISCHE SCHAEDEN ===
            'DELLE': {
                name: 'Delle',
                category: 'mechanisch',
                avgRepairTime: 45,      // Minuten
                avgCost: 150,           // EUR
                difficulty: 2,          // 1-5
                pdrCompatible: true,    // Paintless Dent Repair moeglich?
                description: 'Einbeulungen ohne Lackschaden'
            },
            'DELLE_GROSS': {
                name: 'Grosse Delle (>10cm)',
                category: 'mechanisch',
                avgRepairTime: 90,
                avgCost: 300,
                difficulty: 3,
                pdrCompatible: true,
                description: 'Grosse Einbeulung, evtl. mit Nachlackierung'
            },
            'HAGEL': {
                name: 'Hagelschaden',
                category: 'mechanisch',
                avgRepairTime: 180,     // Pro Panel
                avgCost: 500,
                difficulty: 4,
                pdrCompatible: true,
                description: 'Multiple kleine Dellen durch Hagel'
            },

            // === OBERFLAECHEN SCHAEDEN ===
            'KRATZER_LEICHT': {
                name: 'Leichter Kratzer',
                category: 'oberflaeche',
                avgRepairTime: 20,
                avgCost: 80,
                difficulty: 1,
                pdrCompatible: false,
                description: 'Oberflaeche betroffen, kein Grundierung sichtbar'
            },
            'KRATZER_TIEF': {
                name: 'Tiefer Kratzer',
                category: 'oberflaeche',
                avgRepairTime: 60,
                avgCost: 200,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Grundierung oder Metall sichtbar'
            },
            'KRATZER_TIEFGANG': {
                name: 'Schluesselkratzer / Vandalismus',
                category: 'oberflaeche',
                avgRepairTime: 120,
                avgCost: 400,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Langer, tiefer Kratzer durch Vandalismus'
            },

            // === LACKSCHAEDEN ===
            'LACKSCHADEN': {
                name: 'Lackschaden',
                category: 'lack',
                avgRepairTime: 90,
                avgCost: 350,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Lack platzt ab, Blasen, Verfaerbungen'
            },
            'LACK_AB': {
                name: 'Lack abgeplatzt',
                category: 'lack',
                avgRepairTime: 60,
                avgCost: 250,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Lack hat sich vom Untergrund geloest'
            },
            'LACK_VERFAERBT': {
                name: 'Lackverfaerbung',
                category: 'lack',
                avgRepairTime: 120,
                avgCost: 400,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Farbunterschied durch UV/Alter'
            },
            'ORANGENHAUT': {
                name: 'Orangenhaut / Lackfehler',
                category: 'lack',
                avgRepairTime: 180,
                avgCost: 500,
                difficulty: 4,
                pdrCompatible: false,
                description: 'Strukturfehler in der Lackierung'
            },

            // === KORROSION ===
            'ROST': {
                name: 'Oberflaechenrost',
                category: 'korrosion',
                avgRepairTime: 120,
                avgCost: 450,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Rost an der Oberflaeche, Blech noch stabil'
            },
            'DURCHROSTUNG': {
                name: 'Durchrostung',
                category: 'korrosion',
                avgRepairTime: 300,
                avgCost: 800,
                difficulty: 5,
                pdrCompatible: false,
                description: 'Blech durchgerostet, Schweissarbeiten noetig'
            },
            'KORROSION': {
                name: 'Korrosion (allgemein)',
                category: 'korrosion',
                avgRepairTime: 90,
                avgCost: 300,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Rostansatz, Oxidation'
            },

            // === BRUCH/RISS ===
            'BRUCH': {
                name: 'Bruch / Riss',
                category: 'strukturell',
                avgRepairTime: 180,
                avgCost: 600,
                difficulty: 4,
                pdrCompatible: false,
                description: 'Teil gebrochen oder gerissen'
            },
            'RISS': {
                name: 'Riss (klein)',
                category: 'strukturell',
                avgRepairTime: 60,
                avgCost: 200,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Kleiner Riss, reparierbar'
            },
            'STRUKTURSCHADEN': {
                name: 'Strukturschaden',
                category: 'strukturell',
                avgRepairTime: 480,
                avgCost: 1500,
                difficulty: 5,
                pdrCompatible: false,
                description: 'Tragende Struktur beschaedigt'
            },

            // === GLAS ===
            'STEINSCHLAG': {
                name: 'Steinschlag',
                category: 'glas',
                avgRepairTime: 30,
                avgCost: 100,
                difficulty: 1,
                pdrCompatible: false,
                description: 'Kleine Beschaedigung durch Steinschlag'
            },
            'STEINSCHLAG_GROSS': {
                name: 'Steinschlag gross',
                category: 'glas',
                avgRepairTime: 120,
                avgCost: 400,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Grosser Steinschlag, ggf. Scheibenaustausch'
            },

            // === SONSTIGE ===
            'FEHLT': {
                name: 'Teil fehlt',
                category: 'sonstiges',
                avgRepairTime: 60,
                avgCost: 250,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Teil fehlt komplett'
            },
            'UNDICHT': {
                name: 'Undichtigkeit',
                category: 'sonstiges',
                avgRepairTime: 120,
                avgCost: 350,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Wasser-/Luftundichtigkeit'
            },
            'MECHANIK_DEFEKT': {
                name: 'Mechanik defekt',
                category: 'sonstiges',
                avgRepairTime: 90,
                avgCost: 300,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Mechanismus funktioniert nicht'
            },
            'MATT': {
                name: 'Matt / stumpf',
                category: 'sonstiges',
                avgRepairTime: 45,
                avgCost: 120,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Oberflaeche matt geworden (Scheinwerfer etc.)'
            },
            'BORDSTEIN': {
                name: 'Bordsteinschaden',
                category: 'sonstiges',
                avgRepairTime: 60,
                avgCost: 180,
                difficulty: 2,
                pdrCompatible: false,
                description: 'Schaden durch Bordsteinkontakt (Felgen)'
            },
            'VERFORMT': {
                name: 'Verformt',
                category: 'sonstiges',
                avgRepairTime: 90,
                avgCost: 250,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Teil verbogen/verformt'
            },
            'BRANDLOCH': {
                name: 'Brandloch / Brandschaden',
                category: 'sonstiges',
                avgRepairTime: 60,
                avgCost: 200,
                difficulty: 3,
                pdrCompatible: false,
                description: 'Brandloch (meist Innenraum)'
            },
            'FLECK': {
                name: 'Fleck (nicht entfernbar)',
                category: 'sonstiges',
                avgRepairTime: 30,
                avgCost: 100,
                difficulty: 1,
                pdrCompatible: false,
                description: 'Dauerhafter Fleck auf Oberflaeche'
            }
        },

        // ========================================
        // SCHWEREGRADE
        // ========================================
        severityLevels: {
            1: {
                name: 'Minimal',
                description: 'Kaum sichtbar, kosmetisch',
                priceMultiplier: 0.5
            },
            2: {
                name: 'Leicht',
                description: 'Sichtbar bei genauem Hinsehen',
                priceMultiplier: 0.75
            },
            3: {
                name: 'Mittel',
                description: 'Deutlich sichtbar',
                priceMultiplier: 1.0
            },
            4: {
                name: 'Stark',
                description: 'Grossflaechig oder tief',
                priceMultiplier: 1.5
            },
            5: {
                name: 'Schwer',
                description: 'Strukturell / Sicherheitsrelevant',
                priceMultiplier: 2.0
            }
        },

        // ========================================
        // REPARATURMETHODEN
        // ========================================
        repairMethods: {
            'PDR': {
                name: 'Paintless Dent Repair',
                skillRequired: 'senior',
                description: 'Dellen ohne Lackierung entfernen',
                applicableTo: ['DELLE', 'DELLE_GROSS', 'HAGEL']
            },
            'SMART_REPAIR': {
                name: 'Smart Repair / Spot Repair',
                skillRequired: 'mittel',
                description: 'Punktuelle Reparatur und Lackierung',
                applicableTo: ['KRATZER_LEICHT', 'KRATZER_TIEF', 'LACK_AB']
            },
            'SPACHTELN': {
                name: 'Spachteln & Lackieren',
                skillRequired: 'mittel',
                description: 'Klassische Karosseriereparatur',
                applicableTo: ['DELLE_GROSS', 'KRATZER_TIEFGANG', 'LACKSCHADEN', 'ROST']
            },
            'VOLLACKIERUNG': {
                name: 'Vollackierung Teil',
                skillRequired: 'mittel',
                description: 'Komplettes Teil neu lackieren',
                applicableTo: ['LACKSCHADEN', 'LACK_VERFAERBT', 'ORANGENHAUT']
            },
            'SCHWEISSEN': {
                name: 'Schweissen & Blech einsetzen',
                skillRequired: 'meister',
                description: 'Schweissarbeiten fuer Durchrostung',
                applicableTo: ['DURCHROSTUNG', 'STRUKTURSCHADEN', 'BRUCH']
            },
            'AUSTAUSCH': {
                name: 'Teil austauschen',
                skillRequired: 'junior',
                description: 'Teil komplett ersetzen',
                applicableTo: ['BRUCH', 'FEHLT', 'STRUKTURSCHADEN']
            },
            'POLIEREN': {
                name: 'Polieren / Aufbereiten',
                skillRequired: 'junior',
                description: 'Oberflaeche polieren',
                applicableTo: ['KRATZER_LEICHT', 'MATT', 'LACK_VERFAERBT']
            },
            'STEINSCHLAGREP': {
                name: 'Steinschlagreparatur',
                skillRequired: 'junior',
                description: 'Steinschlag mit Harz fuellen',
                applicableTo: ['STEINSCHLAG']
            },
            'GLASAUSTAUSCH': {
                name: 'Scheibenaustausch',
                skillRequired: 'mittel',
                description: 'Scheibe ersetzen',
                applicableTo: ['STEINSCHLAG_GROSS', 'BRUCH', 'RISS']
            },
            'FELGENREP': {
                name: 'Felgenreparatur',
                skillRequired: 'mittel',
                description: 'Felge instandsetzen',
                applicableTo: ['BORDSTEIN', 'KRATZER', 'VERFORMT']
            }
        },

        // ========================================
        // SKILL LEVELS
        // ========================================
        skillLevels: {
            'junior': { name: 'Junior (0-2 Jahre)', multiplier: 1.2 },
            'mittel': { name: 'Facharbeiter (2-5 Jahre)', multiplier: 1.0 },
            'senior': { name: 'Senior (5-10 Jahre)', multiplier: 0.85 },
            'meister': { name: 'Meister (10+ Jahre)', multiplier: 0.75 }
        },

        // ========================================
        // FAHRZEUG-ZONEN (fuer Visualisierung)
        // ========================================
        zones: {
            'front': { name: 'Front', color: '#4CAF50' },
            'heck': { name: 'Heck', color: '#2196F3' },
            'seite_links': { name: 'Seite links', color: '#FF9800' },
            'seite_rechts': { name: 'Seite rechts', color: '#9C27B0' },
            'dach': { name: 'Dach', color: '#607D8B' },
            'raeder': { name: 'Raeder', color: '#795548' },
            'innen': { name: 'Innenraum', color: '#E91E63' }
        }
    };

    // ============================================================================
    // HELPER FUNCTIONS
    // ============================================================================

    /**
     * Generiert kombinierten Schadenscode fuer ML-Training
     * @param {string} positionCode - Position Code (z.B. 'KOTFLUEGEL_VL')
     * @param {string} damageType - Schadensart (z.B. 'DELLE')
     * @param {number} severity - Schweregrad (1-5)
     * @returns {string} - Kombinierter Code (z.B. 'DELLE_KOTFLUEGEL_VL_GRAD3')
     */
    window.generateDamageCode = function(positionCode, damageType, severity) {
        return `${damageType}_${positionCode}_GRAD${severity}`;
    };

    /**
     * Berechnet geschaetzten Reparaturpreis
     * @param {string} damageType - Schadensart Code
     * @param {number} severity - Schweregrad (1-5)
     * @param {string} skillLevel - Skill Level des Mitarbeiters
     * @returns {Object} - { minPrice, maxPrice, avgPrice, estimatedTime }
     */
    window.estimateRepairCost = function(damageType, severity = 3, skillLevel = 'mittel') {
        const damage = window.DAMAGE_CODES.damageTypes[damageType];
        const severityData = window.DAMAGE_CODES.severityLevels[severity];
        const skill = window.DAMAGE_CODES.skillLevels[skillLevel];

        if (!damage || !severityData || !skill) {
            console.warn('[DAMAGE_CODES] Invalid parameters:', { damageType, severity, skillLevel });
            return null;
        }

        const baseCost = damage.avgCost * severityData.priceMultiplier;
        const baseTime = damage.avgRepairTime * severityData.priceMultiplier * skill.multiplier;

        return {
            minPrice: Math.round(baseCost * 0.8),
            maxPrice: Math.round(baseCost * 1.3),
            avgPrice: Math.round(baseCost),
            estimatedTime: Math.round(baseTime),
            damageInfo: damage,
            severityInfo: severityData
        };
    };

    /**
     * Findet passende Reparaturmethode fuer Schadensart
     * @param {string} damageType - Schadensart Code
     * @returns {Array} - Array von passenden Reparaturmethoden
     */
    window.findRepairMethods = function(damageType) {
        const methods = [];
        for (const [code, method] of Object.entries(window.DAMAGE_CODES.repairMethods)) {
            if (method.applicableTo && method.applicableTo.includes(damageType)) {
                methods.push({ code, ...method });
            }
        }
        return methods;
    };

    /**
     * Liefert Positionen nach Zone
     * @param {string} zone - Zone name (z.B. 'front', 'seite_links')
     * @returns {Array} - Array von Positionen in dieser Zone
     */
    window.getPositionsByZone = function(zone) {
        const positions = [];
        for (const [code, pos] of Object.entries(window.DAMAGE_CODES.positions)) {
            if (pos.zone === zone) {
                positions.push({ code, ...pos });
            }
        }
        return positions;
    };

    /**
     * Validiert Schadenslabel-Objekt
     * @param {Object} label - Label-Objekt zu validieren
     * @returns {Object} - { valid: boolean, errors: [] }
     */
    window.validateDamageLabel = function(label) {
        const errors = [];

        if (!label) {
            return { valid: false, errors: ['Label ist leer'] };
        }

        // Position pruefen
        if (!label.position || !window.DAMAGE_CODES.positions[label.position]) {
            errors.push(`Unbekannte Position: ${label.position}`);
        }

        // Schadensart pruefen
        if (!label.schadensart || !window.DAMAGE_CODES.damageTypes[label.schadensart]) {
            errors.push(`Unbekannte Schadensart: ${label.schadensart}`);
        }

        // Schweregrad pruefen
        if (!label.schweregrad || label.schweregrad < 1 || label.schweregrad > 5) {
            errors.push(`Ungueltiger Schweregrad: ${label.schweregrad} (muss 1-5 sein)`);
        }

        return {
            valid: errors.length === 0,
            errors: errors
        };
    };

    /**
     * Erstellt leeres Schadenslabel-Template
     * @returns {Object} - Leeres Label-Objekt
     */
    window.createEmptyDamageLabel = function() {
        return {
            position: null,
            schadensart: null,
            schweregrad: 3,
            groesseSchaetzung: null,
            tiefe: 'mittel',
            reparaturart: null,
            notizen: ''
        };
    };

    // ============================================================================
    // STATISTICS HELPERS (fuer ML-Datenexport)
    // ============================================================================

    /**
     * Zaehlt Schaeden nach Kategorie
     * @param {Array} labels - Array von Schadenslabels
     * @returns {Object} - Statistiken nach Kategorie
     */
    window.getDamageStatistics = function(labels) {
        const stats = {
            byPosition: {},
            byType: {},
            bySeverity: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
            byZone: {},
            totalDamages: labels.length
        };

        labels.forEach(label => {
            // Nach Position
            if (label.position) {
                stats.byPosition[label.position] = (stats.byPosition[label.position] || 0) + 1;
            }

            // Nach Typ
            if (label.schadensart) {
                stats.byType[label.schadensart] = (stats.byType[label.schadensart] || 0) + 1;
            }

            // Nach Schweregrad
            if (label.schweregrad) {
                stats.bySeverity[label.schweregrad]++;
            }

            // Nach Zone
            if (label.position && window.DAMAGE_CODES.positions[label.position]) {
                const zone = window.DAMAGE_CODES.positions[label.position].zone;
                stats.byZone[zone] = (stats.byZone[zone] || 0) + 1;
            }
        });

        return stats;
    };

    // ============================================================================
    // LOG INITIALIZATION
    // ============================================================================

    console.log('✅ [DAMAGE_CODES] Katalog geladen:', {
        positions: Object.keys(window.DAMAGE_CODES.positions).length,
        damageTypes: Object.keys(window.DAMAGE_CODES.damageTypes).length,
        repairMethods: Object.keys(window.DAMAGE_CODES.repairMethods).length,
        severityLevels: Object.keys(window.DAMAGE_CODES.severityLevels).length
    });

})();
