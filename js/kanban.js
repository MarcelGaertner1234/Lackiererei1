        let allFahrzeuge = [];
        let firebaseInitialized = false;
        // firebaseApp is provided by firebase-config.js as window.firebaseApp
        let currentProcess = 'alle'; // Aktuell gewählter Prozess (synchronisiert mit Dropdown Line 817)
        let unsubscribeListener = null; // Realtime Listener cleanup function

        // 🔧 2025-11-25: Filter disabled services from process dropdown
        function filterDisabledProcesses(enabledServices) {
            console.log('🔧 [KANBAN] Filtere deaktivierte Prozesse:', enabledServices);

            const dropdown = document.getElementById('processSelect');
            if (!dropdown) return;

            Array.from(dropdown.options).forEach(option => {
                const serviceKey = option.value;
                // Skip "alle" option
                if (serviceKey === 'alle') return;

                // Hide option if explicitly disabled (false)
                if (enabledServices[serviceKey] === false) {
                    option.style.display = 'none';
                    option.disabled = true;
                    console.log(`   ❌ Prozess: ${serviceKey} ausgeblendet`);
                }
            });

            // If current selection is disabled, switch to "alle"
            const currentValue = dropdown.value;
            if (currentValue !== 'alle' && enabledServices[currentValue] === false) {
                dropdown.value = 'alle';
                currentProcess = 'alle';
                renderKanbanBoard();
                console.log('   🔄 Prozess: Wechsel zu "alle"');
            }

            // Count remaining visible services
            const enabledCount = Object.values(enabledServices).filter(v => v !== false).length;
            console.log(`✅ [KANBAN] ${enabledCount}/12 Prozesse aktiv`);
        }

        // Prozess-Definitionen (Service-spezifische Schritte)
        const processDefinitions = {
            alle: {
                name: '📋 Alle Prozesse',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'angenommen', icon: '📥', label: 'Neu/Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'vorbereitung', icon: '🔧', label: 'Vorbereitung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'in_arbeit', icon: '⚙️', label: 'In Arbeit', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'qualitaetskontrolle', icon: '🔍', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'bereit', icon: '✅', label: 'Fertig/Bereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            lackier: {
                name: '🎨 Lackierung',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'angenommen', icon: '📋', label: 'Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'vorbereitung', icon: '🔧', label: 'Vorbereitung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'lackierung', icon: '🎨', label: 'Lackierung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'trocknung', icon: '⏱️', label: 'Trocknung', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'qualitaetskontrolle', icon: '🔍', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'bereit', icon: '✅', label: 'Bereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            reifen: {
                name: '🚗 Reifen-Service',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'bestellung', icon: '🛒', label: 'Bestellung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'angekommen', icon: '📦', label: 'Angekommen', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'montage', icon: '🔧', label: 'Montage', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'wuchten', icon: '⚖️', label: 'Wuchten', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            mechanik: {
                name: '🔧 Mechanik',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'diagnose', icon: '🔍', label: 'Diagnose', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'angebot', icon: '💰', label: 'Angebot', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'beauftragt', icon: '✅', label: 'Beauftragt', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'test', icon: '🧪', label: 'Test', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            pflege: {
                name: '✨ Fahrzeugpflege',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'termin', icon: '🗓️', label: 'Termin', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'aufbereitung', icon: '✨', label: 'Aufbereitung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            tuev: {
                name: '✅ TÜV/AU',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'termin_gebucht', icon: '🗓️', label: 'Termin gebucht', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'pruefung', icon: '🔍', label: 'Prüfung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' },
                    { id: 'abholbereit', icon: '🚗', label: 'Abholbereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            versicherung: {
                name: '🛡️ Versicherung',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'gutachten', icon: '📋', label: 'Gutachten', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'freigabe', icon: '✅', label: 'Freigabe', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            dellen: {
                name: '🔨 Dellen-Drückung',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'begutachtung', icon: '🔍', label: 'Begutachtung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'drueckung', icon: '🔨', label: 'Drückung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'politur', icon: '✨', label: 'Politur', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            klima: {
                name: '❄️ Klima-Service',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'diagnose', icon: '🔍', label: 'Diagnose', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'wartung', icon: '🔧', label: 'Wartung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'fuellen', icon: '💨', label: 'Befüllen', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'test', icon: '🧪', label: 'Test', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            glas: {
                name: '🔍 Glas-Reparatur',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'begutachtung', icon: '🔍', label: 'Begutachtung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'aushärten', icon: '⏱️', label: 'Aushärten', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'politur', icon: '✨', label: 'Politur', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            folierung: {
                name: '🌈 Auto Folierung',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'angenommen', icon: '📋', label: 'Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'material', icon: '📦', label: 'Material beschafft', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'vorbereitung', icon: '🔧', label: 'Vorbereitung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'montage', icon: '🌈', label: 'Folierung', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'trocknung', icon: '⏱️', label: 'Trocknung', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'qualitaetskontrolle', icon: '🔍', label: 'Qualität', color: 'rgba(52, 199, 89, 0.7)' },
                    { id: 'bereit', icon: '✅', label: 'Bereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            steinschutz: {
                name: '🛡️ Steinschutzfolie',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'angenommen', icon: '📋', label: 'Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'material', icon: '📦', label: 'Material bestellt', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'vorbereitung', icon: '🧼', label: 'Reinigung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'montage', icon: '🛡️', label: 'PPF Montage', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'aushärtung', icon: '⏱️', label: 'Aushärtung', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'qualitaetskontrolle', icon: '🔍', label: 'Endkontrolle', color: 'rgba(52, 199, 89, 0.7)' },
                    { id: 'bereit', icon: '✅', label: 'Bereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            },
            werbebeklebung: {
                name: '📢 Fahrzeugbeschriftung',
                steps: [
                    { id: 'anlieferung', icon: '📦', label: 'Anlieferung', color: 'rgba(0, 188, 212, 0.8)' },
                    { id: 'angenommen', icon: '📋', label: 'Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
                    { id: 'design', icon: '🎨', label: 'Design-Erstellung', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'freigabe', icon: '✅', label: 'Kunden-Freigabe', color: 'rgba(0, 122, 255, 0.7)' },
                    { id: 'produktion', icon: '🖨️', label: 'Produktion', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'montage', icon: '📢', label: 'Beklebung', color: 'rgba(255, 149, 0, 0.7)' },
                    { id: 'qualitaetskontrolle', icon: '🔍', label: 'Endkontrolle', color: 'rgba(52, 199, 89, 0.7)' },
                    { id: 'bereit', icon: '✅', label: 'Bereit', color: 'rgba(52, 199, 89, 0.7)' }
                ]
            }
        };

        // ============================================
        // BUG #2 FIX: STATUS TRANSITION VALIDATION
        // ============================================

        /**
         * Validates if a status transition is allowed for a given service
         * @param {string} serviceTyp - Service type (e.g., 'lackier', 'tuev', 'reifen')
         * @param {string} currentStatus - Current status of the vehicle
         * @param {string} newStatus - Target status to transition to
         * @returns {Object} {isValid: boolean, reason: string}
         *
         * Rules:
         * 1. Forward-only transitions (no backward jumps)
         * 2. Max 2 steps forward (prevent excessive skipping)
         * 3. Special case: "terminiert" can be set from angenommen/neu anytime
         *
         * Example:
         * - Valid: isValidTransition('lackier', 'angenommen', 'vorbereitung') → true
         * - Invalid: isValidTransition('lackier', 'lackierung', 'angenommen') → false (backward)
         */
        function isValidTransition(serviceTyp, currentStatus, newStatus) {
            // Special case 1: Same status (no transition)
            if (currentStatus === newStatus) {
                return { isValid: true, reason: 'Status unverändert' };
            }

            // Special case 2: "terminiert" can be set from angenommen/neu at any time (scheduling)
            if (newStatus === 'terminiert' && ['angenommen', 'neu'].includes(currentStatus)) {
                return { isValid: true, reason: 'Termin kann jederzeit gesetzt werden' };
            }

            // Get workflow for service type
            const workflow = processDefinitions[serviceTyp];
            if (!workflow) {
                console.error(`❌ isValidTransition: Unknown serviceTyp: ${serviceTyp}`);
                return {
                    isValid: false,
                    reason: `Unbekannter Service-Typ: ${serviceTyp}`
                };
            }

            // Extract step IDs from workflow
            const stepIds = workflow.steps.map(s => s.id);

            // 🔧 FIX (2025-11-27): Map legacy/alternative statuses to workflow equivalents
            // Problem: Some services use 'angenommen' (lackier, werbebeklebung, folierung, steinschutz)
            //          while others use 'neu' (reifen, mechanik, pflege, etc.)
            // Solution: Map 'neu' ↔ 'angenommen' when the other is not in the workflow
            let mappedCurrentStatus = currentStatus;
            let mappedNewStatus = newStatus;

            // Map 'neu' → 'angenommen' if 'neu' not in workflow but 'angenommen' is
            if (currentStatus === 'neu' && !stepIds.includes('neu') && stepIds.includes('angenommen')) {
                mappedCurrentStatus = 'angenommen';
                console.log(`   🔄 Status-Mapping: "neu" → "angenommen" (Service: ${serviceTyp})`);
            }
            // Map 'angenommen' → 'neu' if 'angenommen' not in workflow but 'neu' is
            if (currentStatus === 'angenommen' && !stepIds.includes('angenommen') && stepIds.includes('neu')) {
                mappedCurrentStatus = 'neu';
                console.log(`   🔄 Status-Mapping: "angenommen" → "neu" (Service: ${serviceTyp})`);
            }
            // Same for target status
            if (newStatus === 'neu' && !stepIds.includes('neu') && stepIds.includes('angenommen')) {
                mappedNewStatus = 'angenommen';
            }
            if (newStatus === 'angenommen' && !stepIds.includes('angenommen') && stepIds.includes('neu')) {
                mappedNewStatus = 'neu';
            }

            const currentIndex = stepIds.indexOf(mappedCurrentStatus);
            const newIndex = stepIds.indexOf(mappedNewStatus);

            // Validation Check 1: Both statuses must exist in workflow
            if (currentIndex === -1) {
                return {
                    isValid: false,
                    reason: `Ungültiger aktueller Status: ${currentStatus}`
                };
            }
            if (newIndex === -1) {
                return {
                    isValid: false,
                    reason: `Ungültiger Ziel-Status: ${newStatus}`
                };
            }

            // Validation Check 2: Forward-only transitions (no backward jumps)
            if (newIndex < currentIndex) {
                const currentLabel = workflow.steps[currentIndex].label;
                const newLabel = workflow.steps[newIndex].label;
                return {
                    isValid: false,
                    reason: `Rückwärts-Transition nicht erlaubt: ${currentLabel} → ${newLabel}`
                };
            }

            // Validation Check 3: Max 2 steps forward (prevent excessive skipping)
            const maxJump = 2;  // Allow jumping 1-2 steps (e.g., skip optional steps)
            if (newIndex - currentIndex > maxJump) {
                const currentLabel = workflow.steps[currentIndex].label;
                const newLabel = workflow.steps[newIndex].label;
                const stepsSkipped = newIndex - currentIndex;
                return {
                    isValid: false,
                    reason: `Zu viele Schritte übersprungen: ${currentLabel} → ${newLabel} (${stepsSkipped} Schritte, max ${maxJump} erlaubt)`
                };
            }

            // All checks passed
            return {
                isValid: true,
                reason: 'Gültige Transition'
            };
        }

        // 🆕 HELPER FUNCTIONS - Multi-Service Status-Tracking (2025-11-13)
        // ================================================================

        /**
         * Gibt aktuellen Service zurück (aus currentProcess Variable)
         * @returns {string|null} Service-Typ (z.B. "lackier", "tuev") oder null
         */
        function getCurrentService() {
            // currentProcess ist globale Variable (Zeile 2338)
            if (!currentProcess || currentProcess === 'alle') {
                console.warn('⚠️ getCurrentService: Kein spezifischer Service aktiv (currentProcess:', currentProcess, ')');
                return null;
            }
            return currentProcess;
        }

        /**
         * 🆕 BUG #8 FIX (2025-11-20): Get current user info for audit trail
         *
         * Tries multiple sources in order:
         * 1. sessionStorage (mitarbeiter login) - PREFERRED
         * 2. firebase.auth().currentUser - FALLBACK
         * 3. 'system' - LAST RESORT
         *
         * This replaces the broken `window.currentUser` pattern that was never initialized!
         *
         * @returns {Object} {user: string, userId: string|null, rolle: string|null, email: string|null}
         */
        function getCurrentUserForAudit() {
            // Try sessionStorage first (mitarbeiter login via Mitarbeiterverwaltung)
            const mitarbeiterStr = sessionStorage.getItem('mitarbeiter');
            if (mitarbeiterStr) {
                try {
                    const mitarbeiter = JSON.parse(mitarbeiterStr);
                    return {
                        user: mitarbeiter.name || mitarbeiter.email || 'system',
                        userId: mitarbeiter.id || null,
                        rolle: mitarbeiter.rolle || 'Sonstige',
                        email: mitarbeiter.email || null
                    };
                } catch (e) {
                    console.error('❌ Fehler beim Parsen von Mitarbeiter-Daten:', e);
                }
            }

            // Fallback: Firebase Auth (for Admin/Werkstatt login)
            const authUser = firebase.auth().currentUser;
            if (authUser) {
                return {
                    user: authUser.displayName || authUser.email || 'system',
                    userId: authUser.uid || null,
                    rolle: null,  // Role not available from Firebase Auth alone
                    email: authUser.email || null
                };
            }

            // Last resort (should rarely happen if login works correctly)
            console.warn('⚠️ getCurrentUserForAudit(): Kein User gefunden! Fallback zu "system"');
            return {
                user: 'system',
                userId: null,
                rolle: null,
                email: null
            };
        }

        /**
         * Prüft ob Fahrzeug einen Service hat (Primary ODER Additional)
         * @param {Object} fahrzeug - Fahrzeug-Dokument
         * @param {string} serviceTyp - Service-Typ zu prüfen
         * @returns {boolean} true wenn Fahrzeug den Service hat
         */
        function hasService(fahrzeug, serviceTyp) {
            if (!fahrzeug || !serviceTyp) return false;

            if (window.DEBUG) console.log(`🔍 hasService() CHECK: ${fahrzeug.kennzeichen} für Service: ${serviceTyp}`);
            console.log(`   Primary Service: ${fahrzeug.serviceTyp}`);
            console.log(`   Additional Services (raw):`, fahrzeug.additionalServices);
            console.log(`   typeof additionalServices:`, typeof fahrzeug.additionalServices);
            console.log(`   Array.isArray(additionalServices):`, Array.isArray(fahrzeug.additionalServices));

            if (fahrzeug.additionalServices) {
                console.log(`   additionalServices existiert!`);
                console.log(`   Keys:`, Object.keys(fahrzeug.additionalServices));
                console.log(`   Length:`, fahrzeug.additionalServices.length);
            }

            // Check Primary Service
            if (fahrzeug.serviceTyp === serviceTyp) {
                console.log(`   ✅ MATCH auf Primary Service!`);
                return true;
            }

            // Check Additional Services
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices)) {
                console.log(`   ✅ additionalServices ist ein ARRAY mit ${fahrzeug.additionalServices.length} Einträgen`);
                const hasMatch = fahrzeug.additionalServices.some(s => s.serviceTyp === serviceTyp);
                if (hasMatch) {
                    console.log(`   ✅ MATCH auf Additional Service!`);
                    return true;
                } else {
                    console.log(`   ❌ KEIN MATCH in Additional Services`);
                    console.log(`   Verfügbare Services:`, fahrzeug.additionalServices.map(s => s.serviceTyp).join(', '));
                }
            } else {
                console.log(`   ⚠️ Keine Additional Services vorhanden ODER kein Array`);
                if (fahrzeug.additionalServices && !Array.isArray(fahrzeug.additionalServices)) {
                    console.error(`   ❌ PROBLEM: additionalServices ist KEIN Array! Type: ${typeof fahrzeug.additionalServices}`);
                }
            }

            return false;
        }

        /**
         * Gibt Status für spezifischen Service mit Lazy Migration
         * @param {Object} fahrzeug - Fahrzeug-Dokument
         * @param {string} serviceTyp - Service-Typ
         * @returns {string} Status (z.B. "vorbereitung", "neu")
         */
        function getServiceStatus(fahrzeug, serviceTyp) {
            if (!fahrzeug || !serviceTyp) return 'neu';

            // 1. Priorität: serviceStatuses Object (NEU)
            if (fahrzeug.serviceStatuses && fahrzeug.serviceStatuses[serviceTyp]) {
                return fahrzeug.serviceStatuses[serviceTyp].status;
            }

            // 2. Fallback: prozessStatus (Backwards Compatibility)
            if (fahrzeug.serviceTyp === serviceTyp && fahrzeug.prozessStatus) {
                // 🆕 Lazy Migration: Erstelle serviceStatuses on-the-fly
                if (!fahrzeug.serviceStatuses) {
                    console.log('🔄 Lazy Migration: Erstelle serviceStatuses für Fahrzeug', fahrzeug.kennzeichen);

                    fahrzeug.serviceStatuses = {
                        [serviceTyp]: {
                            status: fahrzeug.prozessStatus,
                            timestamp: fahrzeug.lastModified || Date.now(),
                            statusHistory: fahrzeug.statusHistory || []
                        }
                    };

                    // Async Update in Firestore (with tracking - Pattern 57 FIX)
                    window.getCollection('fahrzeuge').doc(fahrzeug.id).update({
                        serviceStatuses: fahrzeug.serviceStatuses
                    }).catch(err => {
                        // 🛡️ Pattern 57 FIX: Track failure instead of silent warn
                        window.backgroundSyncTracker?.trackFailure('LazyMigration', err, fahrzeug.id);
                    });
                }

                return fahrzeug.prozessStatus;
            }

            // 3. Check ob Service in additionalServices existiert (aber noch kein Status)
            const hasAdditionalService = fahrzeug.additionalServices?.some(s => s.serviceTyp === serviceTyp);
            if (hasAdditionalService) {
                // Auto-Initialize serviceStatus mit 'neu'
                console.log('🔄 Auto-Init: Erstelle serviceStatus für Additional Service', serviceTyp);

                if (!fahrzeug.serviceStatuses) fahrzeug.serviceStatuses = {};

                fahrzeug.serviceStatuses[serviceTyp] = {
                    status: 'neu',
                    timestamp: Date.now(),
                    statusHistory: [{
                        status: 'neu',
                        timestamp: Date.now(),
                        note: 'Auto-initialisiert'
                    }]
                };

                // Async Update (with tracking - Pattern 57 FIX)
                window.getCollection('fahrzeuge').doc(fahrzeug.id).update({
                    [`serviceStatuses.${serviceTyp}`]: fahrzeug.serviceStatuses[serviceTyp]
                }).catch(err => {
                    // 🛡️ Pattern 57 FIX: Track failure instead of silent warn
                    window.backgroundSyncTracker?.trackFailure('ServiceStatusInit', err, fahrzeug.id);
                });

                return 'neu';
            }

            // 4. Default
            return 'neu';
        }

        /**
         * 🆕 FERTIGSTELLUNGS-DROPDOWN (2025-12-02): Multi-Service Koordination
         *
         * Zeigt ein dezentes Dropdown mit Fertigstellungsdatum pro Service.
         * Mitarbeiter können nur Datum eingeben wenn Service auf "terminiert" steht.
         *
         * @param {Object} fahrzeug - Fahrzeug-Dokument aus Firestore
         * @returns {string} HTML für das Dropdown
         */
        function buildFertigstellungsDropdown(fahrzeug) {
            if (!fahrzeug) return '';

            // Sammle alle Services (Primary + Additional)
            const allServices = [];

            // 1. Primary Service
            const primaryServiceTyp = fahrzeug.serviceTyp || 'lackier';
            allServices.push({
                serviceTyp: primaryServiceTyp,
                isPrimary: true
            });

            // 2. Additional Services
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices)) {
                fahrzeug.additionalServices.forEach(s => {
                    if (typeof s === 'string') {
                        allServices.push({ serviceTyp: s, isPrimary: false });
                    } else if (s && s.serviceTyp) {
                        allServices.push({ serviceTyp: s.serviceTyp, isPrimary: false });
                    }
                });
            }

            // Wenn nur 1 Service, kein Dropdown nötig (Single-Service Auftrag)
            if (allServices.length <= 1) {
                return '';
            }

            // Service Labels
            const serviceLabels = {
                'lackier': '🎨 Lackierung',
                'reifen': '🛞 Reifen',
                'mechanik': '🔧 Mechanik',
                'pflege': '✨ Pflege',
                'tuev': '📋 TÜV',
                'versicherung': '🛡️ Versicherung',
                'glas': '🔍 Glas',
                'klima': '❄️ Klima',
                'dellen': '🔨 Dellen',
                'folierung': '🎬 Folierung',
                'steinschutz': '🛡️ Steinschutz',
                'werbebeklebung': '📢 Werbung'
            };

            // Baue die Service-Zeilen
            let serviceRows = '';
            allServices.forEach(service => {
                const status = getServiceStatus(fahrzeug, service.serviceTyp);
                const isTerminiert = (status === 'terminiert');
                const label = serviceLabels[service.serviceTyp] || `🔧 ${service.serviceTyp}`;

                // Hole bestehendes Datum aus serviceStatuses
                const existingDatum = fahrzeug.serviceStatuses?.[service.serviceTyp]?.fertigstellungsDatum || '';

                // Format: YYYY-MM-DD für input type="date"
                const datumValue = existingDatum ? existingDatum : '';

                // Formatiertes Datum für Anzeige (DD.MM.YYYY)
                let displayDatum = '—';
                if (existingDatum) {
                    try {
                        const parts = existingDatum.split('-');
                        if (parts.length === 3) {
                            displayDatum = `${parts[2]}.${parts[1]}.${parts[0]}`;
                        }
                    } catch (e) {
                        displayDatum = existingDatum;
                    }
                }

                if (isTerminiert) {
                    // Editierbares Input-Feld
                    serviceRows += `
                        <div class="fertigstellung-service-row">
                            <span class="fertigstellung-service-label">${label}</span>
                            <input type="date"
                                   class="fertigstellung-datum-input"
                                   value="${datumValue}"
                                   data-fahrzeug-id="${fahrzeug.id}"
                                   data-service-typ="${service.serviceTyp}"
                                   onclick="event.stopPropagation();"
                                   onchange="saveFertigstellungsDatum(this, '${fahrzeug.id}', '${service.serviceTyp}')">
                        </div>
                    `;
                } else {
                    // Nur Anzeige (nicht editierbar)
                    serviceRows += `
                        <div class="fertigstellung-service-row">
                            <span class="fertigstellung-service-label">${label}</span>
                            <span class="fertigstellung-datum-display">
                                ${displayDatum}
                                <span class="fertigstellung-lock-icon">🔒</span>
                            </span>
                        </div>
                    `;
                }
            });

            // Dropdown zusammenbauen
            const dropdownId = `fertigstellung-${fahrzeug.id}`;

            return `
                <div class="fertigstellung-dropdown-toggle"
                     onclick="event.stopPropagation(); toggleFertigstellungsDropdown('${dropdownId}');">
                    <span>📅 Fertigstellung</span>
                    <span class="toggle-icon">▼</span>
                </div>
                <div id="${dropdownId}" class="fertigstellung-dropdown-content">
                    ${serviceRows}
                </div>
            `;
        }

        /**
         * Toggle-Funktion für Fertigstellungs-Dropdown
         */
        function toggleFertigstellungsDropdown(dropdownId) {
            const content = document.getElementById(dropdownId);
            const toggle = content?.previousElementSibling;

            if (content && toggle) {
                content.classList.toggle('open');
                toggle.classList.toggle('open');
            }
        }

        /**
         * Speichert das Fertigstellungsdatum in Firestore
         */
        async function saveFertigstellungsDatum(inputElement, fahrzeugId, serviceTyp) {
            const datum = inputElement.value; // Format: YYYY-MM-DD

            if (!fahrzeugId || !serviceTyp) {
                console.error('❌ saveFertigstellungsDatum: Fehlende Parameter');
                return;
            }

            try {
                console.log(`📅 Speichere Fertigstellungsdatum: ${serviceTyp} = ${datum || '(gelöscht)'}`);

                // Update in Firestore
                const updatePath = `serviceStatuses.${serviceTyp}.fertigstellungsDatum`;
                await window.getCollection('fahrzeuge').doc(String(fahrzeugId)).update({
                    [updatePath]: datum || null,
                    [`serviceStatuses.${serviceTyp}.fertigstellungUpdatedAt`]: new Date().toISOString()
                });

                // Visuelles Feedback
                inputElement.style.borderColor = 'rgba(76, 175, 80, 0.6)';
                inputElement.style.boxShadow = '0 0 0 2px rgba(76, 175, 80, 0.2)';

                setTimeout(() => {
                    inputElement.style.borderColor = '';
                    inputElement.style.boxShadow = '';
                }, 1500);

                console.log(`✅ Fertigstellungsdatum gespeichert: ${serviceTyp} = ${datum}`);

            } catch (error) {
                console.error('❌ Fehler beim Speichern des Fertigstellungsdatums:', error);

                // Fehler-Feedback
                inputElement.style.borderColor = 'rgba(255, 59, 48, 0.6)';
                inputElement.style.boxShadow = '0 0 0 2px rgba(255, 59, 48, 0.2)';

                setTimeout(() => {
                    inputElement.style.borderColor = '';
                    inputElement.style.boxShadow = '';
                }, 2000);
            }
        }

        /**
         * 🆕 Multi-Service Helper: Check if ALL services are complete
         *
         * Used to prevent premature invoice creation when only ONE service is finished.
         *
         * @param {Object} fahrzeug - Vehicle document from Firestore
         * @param {string} currentService - Service that just finished (for logging)
         * @returns {boolean} true if ALL services have completed status
         *
         * Completed statuses: 'fertig', 'bereit', 'abholbereit', 'abgeschlossen'
         *
         * Example:
         *   Vehicle with Lackierung + TÜV:
         *   - Lackierung: 'fertig' ✅
         *   - TÜV: 'in_arbeit' ❌
         *   → Returns false (TÜV not finished yet)
         *
         * @since 2025-11-13 (Multi-Service Invoice Fix)
         */
        function allServicesComplete(fahrzeug, currentService) {
            // Collect all services (primary + additional)
            const services = [fahrzeug.serviceTyp];
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices)) {
                fahrzeug.additionalServices.forEach(s => {
                    // 🆕 FIX (2025-12-01): Legacy String-Array Support (BUG #2)
                    // ALTE Fahrzeuge: additionalServices: ['reifen', 'pflege'] (String-Array)
                    // NEUE Fahrzeuge: additionalServices: [{serviceTyp: 'reifen'}, {...}] (Object-Array)
                    if (typeof s === 'string') {
                        // Legacy Format: String direkt
                        services.push(s);
                    } else if (s && s.serviceTyp) {
                        // Neues Format: Object mit serviceTyp
                        services.push(s.serviceTyp);
                    }
                });
            }

            if (window.DEBUG) console.log(`🔍 allServicesComplete() CHECK für ${fahrzeug.kennzeichen}:`);
            console.log(`   Services gesamt: ${services.length} → ${services.join(', ')}`);
            console.log(`   Trigger: ${currentService} wurde auf 'fertig' gesetzt`);

            // Check if ALL services have completed status
            const completedStatuses = ['fertig', 'bereit', 'abholbereit', 'abgeschlossen'];
            const allComplete = services.every(serviceTyp => {
                const status = getServiceStatus(fahrzeug, serviceTyp);
                const isComplete = completedStatuses.includes(status);
                console.log(`   - ${serviceTyp}: ${status} ${isComplete ? '✅' : '❌'}`);
                return isComplete;
            });

            if (allComplete) {
                console.log(`   ✅ ALLE Services fertig → Rechnung kann erstellt werden`);
            } else {
                console.log(`   ⏳ Noch nicht alle Services fertig → Warte auf Fertigstellung`);
            }

            return allComplete;
        }

        // Firebase initialisieren
        // ✅ BUG FIX: Firebase Initialisierung Check korrigiert
        // Problem: initFirebase() gibt nichts zurück → success ist undefined → FALSE
        // Lösung: Prüfe window.firebaseInitialized direkt statt return value
        document.addEventListener('DOMContentLoaded', async function() {
            try {
                if (typeof initFirebase !== 'undefined') {
                    // Warte auf Firebase Initialisierung
                    await initFirebase();

                    // ✅ FIX: Prüfe window.firebaseInitialized statt undefined return value
                    if (window.firebaseInitialized && window.firebaseApp) {
                        firebaseApp = window.firebaseApp;
                        firebaseInitialized = true;
                        console.log('✅ Firebase initialisiert für Kanban');
                        console.log('   firebaseApp.listenToFahrzeuge:', typeof firebaseApp.listenToFahrzeuge);

                        // Auth-Check für Multi-Tenant Support (Race Condition Fix)
                        console.log('🔐 [KANBAN] Prüfe Auth State für Multi-Tenant...');
                        let currentUser = null;
                        let attempts = 0;
                        const maxAttempts = 20;

                        while (!currentUser && attempts < maxAttempts) {
                            currentUser = window.authManager?.getCurrentUser();
                            if (!currentUser) {
                                console.log(`⏳ [KANBAN] Warte auf Auth State (${attempts + 1}/${maxAttempts})...`);
                                await new Promise(resolve => setTimeout(resolve, 250));
                                attempts++;
                            }
                        }

                        if (!currentUser) {
                            console.warn('⚠️ [KANBAN] Kein User eingeloggt - verwende globale Collections');
                        } else {
                            console.log('✅ [KANBAN] Auth State geladen');
                            console.log('   User:', currentUser.name);
                            console.log('   WerkstattId:', currentUser.werkstattId);

                            // 🆕 BUGFIX 2025-11-04 (FIX #41): Partner-Zugriff auf Werkstatt-Seiten blockieren
                            // Partner dürfen nur das Partner-Portal nutzen, nicht Werkstatt-Seiten
                            const userRole = currentUser.rolle || currentUser.role; // Support both property names
                            if (userRole === 'partner') {
                                console.warn('🚫 Partner-Zugriff blockiert! Redirect zu Partner-Portal...');
                                safeNavigate('./partner-app/meine-anfragen.html');
                                return; // Stop further execution
                            }
                        }

                        // Load Werkstatt Branding (Logo & Page Title)
                        try {
                            const settings = await window.settingsManager.loadSettings();
                            if (settings?.profil) {
                                // Update Page Title
                                document.title = `${settings.profil.name} | Kanban Board`;

                                // Add Logo to Header (if available)
                                if (settings.profil.logoUrl) {
                                    const header = document.querySelector('.page-header h1');
                                    if (header) {
                                        const logoImg = document.createElement('img');
                                        logoImg.src = settings.profil.logoUrl;
                                        logoImg.alt = settings.profil.name;
                                        logoImg.style.cssText = 'height: 32px; width: auto; margin-right: 12px; vertical-align: middle;';
                                        header.insertBefore(logoImg, header.firstChild);
                                    }
                                }

                                console.log('✅ [KANBAN] Werkstatt-Branding geladen:', settings.profil.name);
                            }

                            // 🔧 2025-11-25: Filter disabled services from process dropdown
                            if (settings?.enabledServices) {
                                filterDisabledProcesses(settings.enabledServices);
                            }
                        } catch (error) {
                            console.warn('⚠️ [KANBAN] Werkstatt-Branding konnte nicht geladen werden:', error);
                        }
                    } else {
                        console.warn('⚠️ Firebase Initialisierung fehlgeschlagen');
                        console.warn('   window.firebaseInitialized:', window.firebaseInitialized);
                        console.warn('   window.firebaseApp:', !!window.firebaseApp);
                    }
                } else {
                    console.warn('⚠️ initFirebase() nicht definiert');
                }
            } catch (error) {
                console.warn('⚠️ Firebase nicht verfügbar, verwende LocalStorage:', error);
            }

            // Realtime Listener aktivieren (ersetzt loadFahrzeuge)
            setupRealtimeListener();
            renderKanbanBoard();
            setupDragAndDrop();
        });

        // ========================================
        // CROSS-CHECK FILTER: Partner-Fahrzeuge gegen stornierte Anfragen prüfen
        // ========================================
        async function filterStorniertePartnerAuftraege(fahrzeuge) {
            // Nur Partner-Portal Fahrzeuge prüfen
            const partnerFahrzeuge = fahrzeuge.filter(f => f.quelle === 'Partner-Portal');
            if (partnerFahrzeuge.length === 0) {
                console.log('   ℹ️ CROSS-CHECK: Keine Partner-Fahrzeuge gefunden');
                return fahrzeuge;
            }

            if (window.DEBUG) console.log(`🔍 CROSS-CHECK: Prüfe ${partnerFahrzeuge.length} Partner-Fahrzeuge gegen stornierte Anfragen...`);

            try {
                // Stornierte Anfragen aus Firestore laden (Multi-Tenant)
                const anfrageSnapshot = await window.getCollection('partnerAnfragen')
                    .where('status', '==', 'storniert')
                    .get();

                // Set von stornierten Kennzeichen erstellen
                const stornierteKennzeichen = new Set();
                anfrageSnapshot.docs.forEach(doc => {
                    const anfrage = doc.data();
                    const kz = (anfrage.kennzeichen || anfrage.auftragsnummer || '').toUpperCase();
                    if (kz) {
                        stornierteKennzeichen.add(kz);
                        console.log(`   📋 Stornierte Anfrage: ${kz}`);
                    }
                });

                console.log(`   📊 ${stornierteKennzeichen.size} stornierte Anfragen gefunden`);

                // Fahrzeuge filtern - Entferne Fahrzeuge mit stornierten Anfragen
                const gefiltert = fahrzeuge.filter(f => {
                    const fzKennzeichen = (f.kennzeichen || '').toUpperCase();

                    // Wenn es ein Partner-Fahrzeug ist UND das Kennzeichen storniert ist
                    if (f.quelle === 'Partner-Portal' && stornierteKennzeichen.has(fzKennzeichen)) {
                        console.log(`   🚫 Überspringe Fahrzeug mit stornierter Anfrage: ${f.kennzeichen}`);
                        return false; // Ausfiltern
                    }

                    return true; // Behalten
                });

                const entfernt = fahrzeuge.length - gefiltert.length;
                if (entfernt > 0) {
                    console.log(`   ✅ CROSS-CHECK abgeschlossen: ${entfernt} Fahrzeuge ausgeblendet`);
                } else {
                    console.log(`   ✅ CROSS-CHECK abgeschlossen: Keine Konflikte gefunden`);
                }

                return gefiltert;

            } catch (error) {
                console.error('❌ CROSS-CHECK Fehler:', error);
                // Bei Fehler: Alle Fahrzeuge anzeigen (fail-safe)
                return fahrzeuge;
            }
        }

        // Realtime Listener für Fahrzeuge (NEU!)
        function setupRealtimeListener() {
            if (firebaseInitialized && firebaseApp) {
                console.log('🔄 Aktiviere Realtime Listener für Kanban Board...');

                // Unsubscribe alter Listener falls vorhanden
                if (unsubscribeListener) {
                    unsubscribeListener();
                }

                // 🛡️ PERFORMANCE FIX Phase 1.1: Use optimized listener with Firestore-side filter
                // - listenToActiveFahrzeuge filters status != 'abgeschlossen' on Firestore level
                // - Reduces data transfer and client-side processing
                // - Requires composite index (graceful fallback if missing)
                const listenerFn = firebaseApp.listenToActiveFahrzeuge || firebaseApp.listenToFahrzeuge;
                console.log(`⚡ [PERF] Using ${listenerFn === firebaseApp.listenToActiveFahrzeuge ? 'listenToActiveFahrzeuge (optimized)' : 'listenToFahrzeuge (fallback)'}`);

                unsubscribeListener = listenerFn(async function(fahrzeuge) {
                    console.log(`🔥 Realtime Update: ${fahrzeuge.length} Fahrzeuge empfangen`);

                    // 🐛 DEBUG: Check for duplicates (ID und Kennzeichen)
                    const idCount = {};
                    const kennzeichenCount = {};
                    fahrzeuge.forEach(f => {
                        const id = f.id;
                        const kz = f.kennzeichen || 'OHNE_KZ';
                        idCount[id] = (idCount[id] || 0) + 1;
                        kennzeichenCount[kz] = (kennzeichenCount[kz] || 0) + 1;
                    });

                    const idDuplikate = Object.entries(idCount).filter(([id, count]) => count > 1);
                    const kzDuplikate = Object.entries(kennzeichenCount).filter(([kz, count]) => count > 1);

                    if (idDuplikate.length > 0) {
                        console.error('❌ DUPLIKAT IDs GEFUNDEN:', idDuplikate);
                        console.error('   → Firestore hat wahrscheinlich ein Problem!');
                    }
                    if (kzDuplikate.length > 0) {
                        console.warn('⚠️ DUPLIKAT KENNZEICHEN GEFUNDEN:', kzDuplikate);
                        kzDuplikate.forEach(([kz, count]) => {
                            const betroffeneFahrzeuge = fahrzeuge.filter(f => f.kennzeichen === kz);
                            console.warn(`   → "${kz}" kommt ${count}x vor:`);
                            betroffeneFahrzeuge.forEach(f => {
                                console.warn(`      - ID: ${f.id}, serviceTyp: ${f.serviceTyp}, prozessStatus: ${f.prozessStatus}`);
                            });
                        });
                    }

                    // Migration: Alte baujahr-Werte in baujahrVon/baujahrBis konvertieren
                    allFahrzeuge = fahrzeuge.map(f => {
                        if (!f.baujahrVon && f.baujahr) {
                            f.baujahrVon = f.baujahr;
                            if (f.baujahr !== 'Älter') {
                                f.baujahrBis = f.baujahr;
                            }
                        }

                        // 🛡️ PHASE 3: DATA RESCUE - Auto-Heal Corrupted Multi-Service Data (2025-11-14)
                        // ⚠️ CRITICAL BUG FIX: Existing vehicles may have corrupted additionalServices
                        // Root Causes:
                        //   1. additionalServices stored as Object instead of Array → hasService() fails
                        //   2. Primary service duplicated in additionalServices → Logical corruption
                        //   3. additionalServices is undefined (Firestore serialization omits empty arrays) → BUG #13 (2025-11-24)
                        let needsFirestoreUpdate = false;

                        // Fix #0: Initialize if missing (BUG #13 FIX - 2025-11-24)
                        // CRITICAL: Firestore's JavaScript SDK sometimes omits empty arrays during .data() serialization
                        // When additionalServices: [] is stored, .data() may return additionalServices: undefined
                        // This causes hasService() to fail → vehicles get filtered out from Kanban
                        if (!f.additionalServices) {
                            console.warn(`🔧 DATA RESCUE [${f.kennzeichen}]: additionalServices is undefined → Initialize to [] (BUG #13 FIX)`);
                            f.additionalServices = [];
                            needsFirestoreUpdate = true;
                        }

                        // Fix #1: Convert Object → Array
                        if (f.additionalServices && !Array.isArray(f.additionalServices)) {
                            console.warn(`🔧 DATA RESCUE [${f.kennzeichen}]: additionalServices ist Object → Converting to Array`);
                            console.warn(`   → BEFORE:`, typeof f.additionalServices, f.additionalServices);
                            f.additionalServices = Object.values(f.additionalServices);
                            console.warn(`   → AFTER:`, Array.isArray(f.additionalServices), f.additionalServices);
                            needsFirestoreUpdate = true;
                        }

                        // Fix #2: Remove primary service from additionalServices (duplicate prevention)
                        if (Array.isArray(f.additionalServices) && f.additionalServices.length > 0) {
                            const beforeLength = f.additionalServices.length;
                            const removedServices = [];  // 🆕 BUGFIX 2025-11-15 (FIX #3): Track removed services

                            f.additionalServices = f.additionalServices.filter(service => {
                                // Remove if service matches primary service
                                const isDuplicate = service.serviceTyp === f.serviceTyp;
                                if (isDuplicate) {
                                    console.warn(`🔧 DATA RESCUE [${f.kennzeichen}]: Removing duplicate primary service "${f.serviceTyp}" from additionalServices`);
                                    removedServices.push(service.serviceTyp);  // 🆕 Track removed service
                                }
                                return !isDuplicate;
                            });

                            if (f.additionalServices.length < beforeLength) {
                                console.warn(`   → Removed ${beforeLength - f.additionalServices.length} duplicate service(s)`);
                                needsFirestoreUpdate = true;

                                // 🆕 BUGFIX 2025-11-15 (FIX #3): Cleanup serviceStatuses for removed services
                                if (f.serviceStatuses && removedServices.length > 0) {
                                    removedServices.forEach(serviceTyp => {
                                        if (f.serviceStatuses[serviceTyp]) {
                                            console.warn(`🧹 [CLEANUP] Removing orphaned serviceStatus for: ${serviceTyp}`);
                                            delete f.serviceStatuses[serviceTyp];
                                        }
                                    });
                                }
                            }
                        }

                        // Auto-fix in Firestore (async, non-blocking)
                        if (needsFirestoreUpdate && firebaseInitialized) {
                            console.log(`💾 DATA RESCUE [${f.kennzeichen}]: Auto-saving fix to Firestore...`);
                            window.getCollection('fahrzeuge').doc(f.id).update({
                                additionalServices: f.additionalServices || [],
                                // 🆕 BUGFIX 2025-11-15 (FIX #3): Also save cleaned serviceStatuses
                                serviceStatuses: f.serviceStatuses || {}
                            }).then(() => {
                                console.log(`   ✅ DATA RESCUE [${f.kennzeichen}]: Auto-fix saved successfully`);
                            }).catch(err => {
                                // 🛡️ Pattern 57 FIX: Track DATA RESCUE failures (critical!)
                                console.error(`   ❌ DATA RESCUE [${f.kennzeichen}]: Auto-fix failed:`, err);
                                window.backgroundSyncTracker?.trackFailure('DataRescue', err, f.id);
                            });
                        }

                        return f;
                    });

                    // Filter: Nur aktive Fahrzeuge (ohne abgeschlossen + stornierte)
                    const vorFilter = allFahrzeuge.length;
                    allFahrzeuge = allFahrzeuge.filter(f => {
                        // Abgeschlossene Fahrzeuge ausfiltern
                        if (f.status === 'abgeschlossen') return false;

                        // ✅ SAFETY-FILTER: Stornierte Partner-Aufträge ausfiltern
                        // Falls CASCADE DELETE in Partner-App fehlgeschlagen ist, verhindert dieser Filter die Anzeige
                        // (Backup-Lösung für Robustheit)
                        if (f.quelle === 'Partner-Portal-STORNIERT') {
                            console.log(`⏭️ Werkstatt-Kanban: Überspringe stornierte Partner-Anfrage "${f.kennzeichen}"`);
                            return false;
                        }

                        return true;
                    });

                    const nachFilter = allFahrzeuge.length;
                    const gefiltert = vorFilter - nachFilter;
                    console.log(`✅ ${nachFilter} aktive Fahrzeuge (${gefiltert} gefiltert: abgeschlossen + storniert)`);

                    // ✅ CROSS-CHECK: Partner-Fahrzeuge gegen stornierte Anfragen prüfen
                    const vorCrossCheck = allFahrzeuge.length;
                    allFahrzeuge = await filterStorniertePartnerAuftraege(allFahrzeuge);
                    const nachCrossCheck = allFahrzeuge.length;
                    const crossCheckGefiltert = vorCrossCheck - nachCrossCheck;

                    if (crossCheckGefiltert > 0) {
                        console.log(`🚫 CROSS-CHECK: ${crossCheckGefiltert} Fahrzeuge mit stornierten Anfragen ausgeblendet`);
                    }

                    console.log(`✅ FINAL: ${nachCrossCheck} Fahrzeuge im Kanban`);

                    // Board automatisch neu rendern
                    renderKanbanBoard();
                    setupDragAndDrop();
                }, 200);  // ✅ Explicit limit: 200 vehicles (increased from default 50)
            } else {
                // Fallback: LocalStorage
                console.log('⚠️ Firebase nicht verfügbar, verwende LocalStorage');
                allFahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');
                allFahrzeuge = allFahrzeuge.filter(f => f.status !== 'abgeschlossen');
                console.log(`✅ ${allFahrzeuge.length} Fahrzeuge aus LocalStorage geladen`);
            }
        }

        // Prozess wechseln
        async function changeProcess() {
            const newProcess = document.getElementById('processSelect').value;
            console.log('🔄 Prozess gewechselt:', currentProcess, '→', newProcess);
            console.log('📊 Fahrzeuge gesamt:', allFahrzeuge.length);
            console.log('📋 ServiceTyp-Verteilung:', allFahrzeuge.reduce((acc, f) => {
                const typ = f.serviceTyp || 'UNDEFINED';
                acc[typ] = (acc[typ] || 0) + 1;
                return acc;
            }, {}));

            // 🆕 BUG #10 FIX + NEBENWIRKUNG FIX #3: Auto-Korrektur beim Zurück-Wechseln zu Service-Tab
            // OPTIMIERUNG: Nur wenn von "Alle Prozesse" kommend (nicht bei jedem Tab-Wechsel!)
            if (newProcess !== 'alle' && currentProcess === 'alle') {
                if (window.DEBUG) console.log('🔍 Auto-Korrektur Check: Prüfe ob Fahrzeuge ungültige Stati haben...');
                console.log('   (Trigger: Wechsel von "Alle Prozesse" zu Service-Tab)');

                // Map process key to serviceTyp (z.B. 'lackier' → 'lackierung')
                const serviceTypMap = {
                    'lackier': 'lackierung',
                    'reifen': 'reifen',
                    'mechanik': 'mechanik',
                    'pflege': 'pflege',
                    'tuev': 'tuev',
                    'versicherung': 'versicherung',
                    'glas': 'glas',
                    'klima': 'klima',
                    'dellen': 'dellen',
                    'folierung': 'folierung',
                    'steinschutz': 'steinschutz',
                    'werbebeklebung': 'werbebeklebung'
                };
                const serviceTyp = serviceTypMap[newProcess];

                if (serviceTyp) {
                    const validStatuses = getValidStatusesForService(serviceTyp);
                    let correctionCount = 0;
                    const toCorrect = [];  // Sammle erst, dann update (Batch!)

                    // Prüfe ALLE Fahrzeuge dieses Service-Typs (Quick-Scan)
                    for (const fahrzeug of allFahrzeuge) {
                        const fahrzeugServiceTyp = fahrzeug.serviceTyp || 'lackierung';

                        if (fahrzeugServiceTyp === serviceTyp) {
                            const fahrzeugStatus = fahrzeug.prozessStatus || 'angenommen';

                            // Check: Ist Status gültig für diesen Service?
                            if (!validStatuses.includes(fahrzeugStatus)) {
                                console.warn(`⚠️ Auto-Korrektur nötig: ${fahrzeug.kennzeichen} "${fahrzeugStatus}" → ungültig für ${serviceTyp}`);
                                const correctedStatus = getNextValidStatus(serviceTyp, fahrzeugStatus);
                                toCorrect.push({ fahrzeug, oldStatus: fahrzeugStatus, newStatus: correctedStatus });
                            }
                        }
                    }

                    // Batch-Update (falls nötig)
                    if (toCorrect.length > 0 && firebaseInitialized && firebaseApp) {
                        console.log(`🔧 Auto-Korrektur START: ${toCorrect.length} Fahrzeuge werden korrigiert...`);

                        for (const { fahrzeug, oldStatus, newStatus } of toCorrect) {
                            try {
                                await directStatusUpdate(fahrzeug.id, newStatus);
                                correctionCount++;
                                console.log(`   ✅ ${fahrzeug.kennzeichen}: "${oldStatus}" → "${newStatus}"`);
                            } catch (error) {
                                console.error(`   ❌ Fehler bei ${fahrzeug.kennzeichen}:`, error);
                            }
                        }

                        console.log(`✅ Auto-Korrektur FERTIG: ${correctionCount}/${toCorrect.length} Fahrzeuge korrigiert`);
                        showToast(`ℹ️ Auto-Korrektur durchgeführt!\n\n` +
                              `${correctionCount} Fahrzeug(e) hatten ungültige Stati für "${processDefinitions[newProcess].name}".\n` +
                              `Stati wurden automatisch korrigiert.`);
                    } else if (toCorrect.length === 0) {
                        console.log('✅ Keine Korrektur nötig - alle Stati sind gültig');
                    }
                }
            } else if (newProcess !== 'alle' && currentProcess !== 'alle') {
                console.log('ℹ️ Auto-Korrektur ÜBERSPRUNGEN (Tab-Wechsel zwischen Services)');
            }

            currentProcess = newProcess;
            renderKanbanBoard();
            setupDragAndDrop();  // ← FIX: Event Listeners nach Re-Render neu hinzufügen!
        }

        // ========== PAYMENT STATUS FUNCTIONS (Bug #2) ==========

        /**
         * Global variable für aktuelle Fahrzeug-ID (Payment Modal)
         */
        let currentBezahltFahrzeugId = null;

        /**
         * Open "Als bezahlt markieren" modal from Kanban
         * @param {string} fahrzeugId - Vehicle document ID
         * @param {string} rechnungsnummer - Invoice number
         */
        function openBezahltModalKanban(fahrzeugId, rechnungsnummer) {
            currentBezahltFahrzeugId = fahrzeugId;

            // Set default date (today)
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('modal-bezahldatum-kanban').value = today;

            // Clear other fields
            document.getElementById('modal-zahlungsart-kanban').value = '';
            document.getElementById('modal-notizen-kanban').value = '';

            // Show rechnungsnummer
            document.getElementById('modal-rechnungsnummer-kanban').textContent =
                `Rechnungsnummer: ${rechnungsnummer}`;

            // Show modal
            document.getElementById('bezahltModal-kanban').style.display = 'flex';
        }

        /**
         * Close "Als bezahlt markieren" modal
         */
        function closeBezahltModalKanban() {
            document.getElementById('bezahltModal-kanban').style.display = 'none';
            currentBezahltFahrzeugId = null;
        }

        /**
         * Submit payment status update from Kanban
         */
        async function submitBezahltKanban() {
            const datum = document.getElementById('modal-bezahldatum-kanban').value;
            const zahlungsart = document.getElementById('modal-zahlungsart-kanban').value;
            const notizen = document.getElementById('modal-notizen-kanban').value;

            // Validation
            if (!datum || !zahlungsart) {
                showToast('Bitte alle Pflichtfelder ausfüllen!', 'error');
                return;
            }

            if (!currentBezahltFahrzeugId) {
                showToast('Fehler: Fahrzeug-ID nicht gefunden.', 'error');
                return;
            }

            try {
                // Update Firestore
                await window.getCollection('fahrzeuge').doc(currentBezahltFahrzeugId).update({
                    'rechnung.zahlungsstatus': 'bezahlt',
                    'rechnung.bezahltAm': firebase.firestore.Timestamp.fromDate(new Date(datum)),
                    'rechnung.bezahltVon': firebase.auth().currentUser?.displayName ||
                                           firebase.auth().currentUser?.email || 'Admin',
                    'rechnung.zahlungsart': zahlungsart,
                    'rechnung.notizen': notizen,
                    updatedAt: firebase.firestore.Timestamp.now()
                });

                showToast('✅ Rechnung wurde als bezahlt markiert!', 'success');
                closeBezahltModalKanban();

                // Reload Kanban board to reflect changes
                await renderKanbanBoard();

            } catch (error) {
                console.error('Fehler beim Markieren als bezahlt:', error);
                showToast('❌ Fehler: ' + error.message, 'error');
            }
        }

        // Kanban Board rendern
        function renderKanbanBoard() {
            const boardContainer = document.getElementById('kanbanBoard');

            // 🦴 SKELETON LOADER: Hide skeleton, show board
            const skeleton = document.getElementById('kanbanSkeleton');
            if (skeleton && skeleton.style.display !== 'none') {
                skeleton.style.display = 'none';
                boardContainer.style.display = 'grid';
                console.log('✅ [SKELETON] Skeleton hidden, kanban board visible');
            }

            // Board leeren
            boardContainer.innerHTML = '';

            // Aktuelle Prozess-Definition
            const process = processDefinitions[currentProcess];
            if (!process) {
                console.error('❌ Prozess nicht gefunden:', currentProcess);
                return;
            }

            // Grid-Spalten anpassen
            boardContainer.style.gridTemplateColumns = `repeat(${process.steps.length}, 1fr)`;

            // Spalten erstellen
            process.steps.forEach(step => {
                const column = document.createElement('div');
                column.className = `kanban-column column-${step.id}`;
                column.dataset.status = step.id;
                column.innerHTML = `
                    <div class="column-header" style="background: ${step.color}">
                        <span class="column-count" id="count-${step.id}">0</span>
                        <span>${step.icon} ${step.label}</span>
                    </div>
                    <div class="kanban-cards" id="cards-${step.id}">
                        <div class="empty-column">Keine Fahrzeuge</div>
                    </div>
                `;
                boardContainer.appendChild(column);
            });

            // Fahrzeuge rendern
            renderFahrzeuge();
        }

        // Fahrzeuge rendern
        function renderFahrzeuge() {
            console.log(`🎨 renderFahrzeuge() START - Aktueller Tab: ${currentProcess}`);
            console.log(`📊 Gesamt Fahrzeuge: ${allFahrzeuge.length}`);

            const process = processDefinitions[currentProcess];
            if (!process) return;

            const statuses = process.steps.map(s => s.id);

            statuses.forEach(status => {
                const container = document.getElementById(`cards-${status}`);
                const countEl = document.getElementById(`count-${status}`);
                if (!container || !countEl) return;

                // Fahrzeuge für diese Spalte filtern
                // 🆕 MULTI-SERVICE (2025-11-13): Nach hasService() UND getServiceStatus() filtern
                let fahrzeuge = allFahrzeuge.filter(f => {
                    // 🆕 MULTI-SERVICE: Prüfe ob Fahrzeug den aktuellen Service hat (Primary ODER Additional)
                    // Falls currentProcess === 'alle', zeige alle Fahrzeuge
                    const fahrzeugHasService = (currentProcess === 'alle') || hasService(f, currentProcess);
                    if (!fahrzeugHasService) {
                        console.log(`   ⏭️ SKIP ${f.kennzeichen}: hat Service ${currentProcess} nicht`);
                        return false;  // Fahrzeug hat diesen Service nicht
                    }

                    console.log(`   ✅ INCLUDE ${f.kennzeichen}: hat Service ${currentProcess}`);

                    // 🆕 MULTI-SERVICE: Hole Status für den aktuellen Service (nicht nur prozessStatus!)
                    const fahrzeugStatus = (currentProcess === 'alle')
                        ? (f.prozessStatus || 'angenommen')  // Bei 'alle': nutze Primary Service Status
                        : getServiceStatus(f, currentProcess);  // Bei spezifischem Service: nutze Service-spezifischen Status

                    console.log(`      Status für ${currentProcess}: ${fahrzeugStatus}`)

                    // ✅ Backwards Compatibility: Weiterhin serviceTyp-Mapping für 'alle' View
                    const fahrzeugServiceTyp = f.serviceTyp || 'lackier'; // Default: lackier
                    const serviceTypToProcessKey = {
                        'lackierung': 'lackier',   // Legacy Support
                        'lackier': 'lackier',      // New Standard
                        'reifen': 'reifen',
                        'mechanik': 'mechanik',
                        'pflege': 'pflege',
                        'tuev': 'tuev',
                        'versicherung': 'versicherung',
                        'glas': 'glas',
                        'klima': 'klima',
                        'dellen': 'dellen',
                        'folierung': 'folierung',
                        'steinschutz': 'steinschutz',
                        'werbebeklebung': 'werbebeklebung'
                    };
                    const processKey = serviceTypToProcessKey[fahrzeugServiceTyp] || fahrzeugServiceTyp;

                    // 🐛 DEBUG: Log für Service-Filter
                    if (status === 'angenommen' || status === 'neu') {
                        if (window.DEBUG) console.log(`🔍 Filter Check: ${f.kennzeichen} | serviceTyp: ${fahrzeugServiceTyp} → processKey: ${processKey} | prozessStatus: ${fahrzeugStatus} | currentProcess: ${currentProcess}`);
                    }

                    // Wenn currentProcess 'alle', alle Services anzeigen
                    if (currentProcess === 'alle') {
                        // 🆕 BUG #10 FIX: Mapping für vereinheitlichte Spalten
                        // WICHTIG: Zeige ALLE Fahrzeuge, auch mit service-spezifischen Stati!
                        // Mapping: Verschiedene Prozess-Status auf Standard-Spalten mappen

                        // 📦 ANLIEFERUNG (2025-11-27): Neue erste Spalte für Fahrzeugabholungen
                        if (status === 'anlieferung') {
                            return fahrzeugStatus === 'anlieferung';
                        } else if (status === 'angenommen') {
                            return ['angenommen', 'neu'].includes(fahrzeugStatus);
                        } else if (status === 'terminiert') {
                            // NEU: Terminiert-Spalte zeigt ALLE terminierten Fahrzeuge (service-unabhängig)
                            return fahrzeugStatus === 'terminiert';
                        } else if (status === 'vorbereitung') {
                            // ✅ BUG #10 FIX: Zeige ALLE Vorbereitungs-Stati (nur Lackierung hat "vorbereitung")
                            // ABER: In "Alle Prozesse" wird diese Spalte angezeigt!
                            return fahrzeugStatus === 'vorbereitung';
                        } else if (status === 'in_arbeit') {
                            // ✅ BUG #10 FIX + NEBENWIRKUNG FIX #6: Erweitert um ALLE service-spezifischen Arbeitsschritte!
                            // Vollständige Liste aller Arbeits-Stati aus processDefinitions:
                            return ['in_arbeit', 'lackierung', 'trocknung', 'montage', 'wuchten', 'reparatur',
                                    'aufbereitung', 'pruefung', 'diagnose', 'bestellung', 'angekommen', 'termin',
                                    'termin_gebucht', 'gutachten', 'freigabe', 'angebot', 'beauftragt', 'test',
                                    'qualitaet'].includes(fahrzeugStatus);  // ✅ FEHLTE: 'qualitaet' (Pflege + Versicherung!)
                        } else if (status === 'qualitaetskontrolle') {
                            // ✅ BUG #10 FIX: Zeige ALLE Qualitäts-Stati
                            return ['qualitaetskontrolle', 'qualitaet'].includes(fahrzeugStatus);
                        } else if (status === 'bereit') {
                            return ['bereit', 'fertig', 'abholbereit'].includes(fahrzeugStatus);
                        } else {
                            // ✅ BUG #10 FIX: Alle anderen Stati (auch ungültige!) direkt matchen
                            return fahrzeugStatus === status;
                        }
                    } else {
                        // 🐛 CRITICAL: Service-spezifischer Filter mit Status-Fallback-Mappings

                        // ✅ QUICK FIX: Status-Fallback für falsche Firestore-Daten
                        // Problem: TÜV Fahrzeuge haben manchmal "bereit" (Lackierung-Status) statt "abholbereit"
                        // ✅ HOTFIX: Prioritäts-basiertes Fallback (verhindert Duplikate!)
                        const statusFallbacks = {
                            // TÜV End-Spalten (PRIORITÄT: "bereit" nur in "fertig", NICHT in "abholbereit"!)
                            'fertig': ['fertig', 'bereit'],           // TÜV "fertig" akzeptiert auch Lackierung "bereit"
                            'abholbereit': ['abholbereit'],           // ✅ FIX: Kein "bereit"! (wird bereits von "fertig" gefangen)
                            // Reifen, Mechanik, Pflege, Versicherung End-Spalten
                            // (bei diesen Services ist "fertig" korrekt, "bereit" wird auch hier von "fertig" gefangen)
                        };

                        // 📦 ANLIEFERUNG (2025-11-27): Anlieferung-Spalte für Fahrzeugabholungen
                        if (status === 'anlieferung') {
                            const matches = fahrzeugStatus === 'anlieferung';
                            if (matches) {
                                console.log(`✅ Match: ${f.kennzeichen} (serviceTyp: ${fahrzeugServiceTyp}) in Spalte 'anlieferung'`);
                            }
                            return matches;
                        }

                        // SPEZIAL: Terminiert-Spalte zeigt auch alte "angenommen" Status
                        if (status === 'terminiert') {
                            // 🆕 MULTI-SERVICE FIX: Kein processKey Check mehr (hasService() garantiert bereits Service-Zugehörigkeit)
                            const matches = (fahrzeugStatus === 'terminiert' || fahrzeugStatus === 'angenommen');
                            if (matches) {
                                console.log(`✅ Match: ${f.kennzeichen} (serviceTyp: ${fahrzeugServiceTyp} → processKey: ${processKey}) in Spalte '${status}'`);
                            }
                            return matches;
                        }

                        // 🆕 FIX (Nov 13, 2025): Status-Mappings für service-spezifische Tabs
                        // Problem: Fahrzeuge mit Status "neu" oder "fertig" waren unsichtbar in Service-Tabs
                        // Lösung: Füge Status-Mappings hinzu (analog zum "alle" Tab in Lines 3146-3174)
                        if (status === 'angenommen') {
                            // Map "neu" → "angenommen" (neue Fahrzeuge starten in "Angenommen" Spalte)
                            const matches = ['angenommen', 'neu'].includes(fahrzeugStatus);
                            if (matches) {
                                console.log(`✅ Status-Mapping Match: ${f.kennzeichen} (Status: ${fahrzeugStatus} → Spalte: angenommen)`);
                            }
                            return matches;
                        }
                        if (status === 'bereit') {
                            // Map "fertig", "abholbereit" → "bereit" (fertige Fahrzeuge in "Bereit" Spalte)
                            const matches = ['bereit', 'fertig', 'abholbereit'].includes(fahrzeugStatus);
                            if (matches) {
                                console.log(`✅ Status-Mapping Match: ${f.kennzeichen} (Status: ${fahrzeugStatus} → Spalte: bereit)`);
                            }
                            return matches;
                        }

                        // Standard-Match ODER Fallback-Match
                        // 🆕 MULTI-SERVICE FIX: Kein processKey Check mehr (hasService() garantiert bereits Service-Zugehörigkeit)
                        const directMatch = fahrzeugStatus === status;
                        const fallbackStatuses = statusFallbacks[status] || [status];
                        const fallbackMatch = fallbackStatuses.includes(fahrzeugStatus);

                        const matches = directMatch || fallbackMatch;
                        if (matches) {
                            const matchType = directMatch ? 'Direct' : 'Fallback';
                            console.log(`✅ ${matchType} Match: ${f.kennzeichen} (serviceTyp: ${fahrzeugServiceTyp} → processKey: ${processKey}, Status: ${fahrzeugStatus}) in Spalte '${status}'`);
                        }
                        return matches;
                    }
                });

                // SORTIERUNG: Bei "angenommen" nach Dringlichkeit sortieren
                if (status === 'angenommen') {
                    fahrzeuge.sort((a, b) => {
                        const daysA = calculateDaysUntilAbnahme(a);
                        const daysB = calculateDaysUntilAbnahme(b);

                        // Fahrzeuge OHNE Termin ganz nach unten
                        if (daysA === null && daysB === null) return 0;
                        if (daysA === null) return 1;
                        if (daysB === null) return -1;

                        // Sonst: dringendste (kleinste Tage) zuerst
                        return daysA - daysB;
                    });
                }

                // Count aktualisieren
                countEl.textContent = fahrzeuge.length;

                // Karten rendern
                if (fahrzeuge.length === 0) {
                    container.innerHTML = '<div class="empty-column">Keine Fahrzeuge</div>';
                } else {
                    container.innerHTML = '';
                    fahrzeuge.forEach(fahrzeug => {
                        container.appendChild(createKanbanCard(fahrzeug));
                    });
                }
            });
        }

        // Berechnet Tage bis zur Abnahme
        function calculateDaysUntilAbnahme(fahrzeug) {
            if (!fahrzeug.geplantesAbnahmeDatum) return null;

            const heute = new Date();
            heute.setHours(0, 0, 0, 0);

            // ✅ FIX Bug #15 (2025-11-24): Handle Firestore Timestamp objects
            let abnahmeDate = fahrzeug.geplantesAbnahmeDatum;
            if (typeof abnahmeDate.toDate === 'function') {
                abnahmeDate = abnahmeDate.toDate();  // Firestore Timestamp → Date
            }
            const abnahme = new Date(abnahmeDate);
            abnahme.setHours(0, 0, 0, 0);

            const diffTime = abnahme - heute;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return diffDays;
        }

        // Kanban-Karte erstellen
        /**
         * Lädt Material-Status für ein Fahrzeug und zeigt Badge an
         * @param {string} fahrzeugId - ID des Fahrzeugs
         */
        async function loadMaterialStatusForCard(fahrzeugId) {
            try {
                if (!window.db || !window.firebaseInitialized) {
                    return; // Kein Badge wenn Firebase nicht verfügbar
                }

                // Query: Hole alle Bestellungen für dieses Fahrzeug
                const snapshot = await window.getCollection('bestellungen')
                    .where('fahrzeugId', '==', String(fahrzeugId))
                    .get();

                if (snapshot.empty) {
                    return; // Kein Badge wenn keine Bestellungen
                }

                // Zähle Teile nach Status
                const bestellungen = [];
                snapshot.forEach(doc => bestellungen.push(doc.data()));

                const totalTeile = bestellungen.length;
                const bestelltTeile = bestellungen.filter(b => b.status === 'bestellt').length;
                const angeliefertTeile = bestellungen.filter(b => b.status === 'angeliefert').length;

                // Badge-Container
                const badgeContainer = document.getElementById(`materialStatus_${fahrzeugId}`);
                if (!badgeContainer) return;

                // Badge-Styling basierend auf Status
                let badgeClass = 'dringlichkeit-badge';
                let badgeIcon = '';
                let badgeText = '';
                let badgeBackground = '';

                if (bestelltTeile > 0) {
                    // ⚠️ Warnung: Teile fehlen noch
                    badgeClass += ' diese-woche';
                    badgeIcon = '⚠️';
                    badgeText = `${bestelltTeile} Teil${bestelltTeile > 1 ? 'e' : ''} bestellt`;
                    badgeBackground = 'rgba(255, 152, 0, 0.7)'; // Orange
                } else if (angeliefertTeile > 0) {
                    // ✅ Alle Teile angeliefert
                    badgeIcon = '✅';
                    badgeText = `${angeliefertTeile} Teil${angeliefertTeile > 1 ? 'e' : ''} angeliefert`;
                    badgeBackground = 'rgba(76, 175, 80, 0.7)'; // Grün
                }

                // Badge anzeigen
                badgeContainer.innerHTML = `
                    <div class="${badgeClass}" style="background: ${badgeBackground}; backdrop-filter: blur(8px); margin-bottom: 8px; font-size: 10px; padding: 4px 8px;">
                        ${badgeIcon} ${badgeText}
                    </div>
                `;
                badgeContainer.style.display = 'block';

            } catch (error) {
                console.error('❌ Fehler beim Laden von Material-Status:', error);
            }
        }

        function createKanbanCard(fahrzeug) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = fahrzeug.id;

            // Spezielle Klasse für "bereit"-Fahrzeuge
            const isBereit = (fahrzeug.prozessStatus === 'bereit');
            if (isBereit) {
                card.classList.add('bereit-zur-abnahme');
            }

            // 📦 ANLIEFERUNG (2025-11-27): Spezielle Klasse für abzuholende Fahrzeuge
            const isAnlieferung = (fahrzeug.prozessStatus === 'anlieferung');

            // Preis ermitteln - unterstützt vereinbarterPreis UND KVA-Varianten (Partner Portal)
            let preisWert = 0;
            if (fahrzeug.vereinbarterPreis && fahrzeug.vereinbarterPreis > 0) {
                preisWert = parseFloat(fahrzeug.vereinbarterPreis);
            } else if (fahrzeug.kva?.varianten && fahrzeug.kva.gewaehlteVariante) {
                preisWert = parseFloat(fahrzeug.kva.varianten[fahrzeug.kva.gewaehlteVariante]?.gesamt) || 0;
            } else if (fahrzeug.kva?.varianten?.original) {
                preisWert = parseFloat(fahrzeug.kva.varianten.original.gesamt) || 0;
            } else if (fahrzeug.kva?.gesamt) {
                preisWert = parseFloat(fahrzeug.kva.gesamt) || 0;
            }

            let preis = preisWert > 0
                ? `€ ${preisWert.toLocaleString('de-DE', {minimumFractionDigits: 2})}`
                : '-';

            // 💰 PREISE-BERECHTIGUNG: Preis für Mitarbeiter ohne Berechtigung ausblenden
            let preisCssClass = 'card-preis';
            if (typeof window.canViewPrices === 'function' && !window.canViewPrices()) {
                preis = '━━━━━━';
                preisCssClass = 'card-preis price-hidden';
            }

            // Badge für "bereit"-Fahrzeuge
            const bereitBadge = isBereit
                ? `<div class="bereit-badge">⚠️ ABNAHME AUSSTEHEND!</div>`
                : '';

            // Link-Button für "bereit"-Fahrzeuge
            const bereitButton = isBereit
                ? `<button class="bereit-button" onclick="event.stopPropagation(); safeNavigate('abnahme.html');">
                     🎯 Zur Abnahme →
                   </button>`
                : '';

            // ✅ FIX Bug #2: Payment-Status Quick Action
            // Button erscheint NUR wenn: 1) Rechnung existiert UND 2) Noch nicht bezahlt
            const paymentButton = (fahrzeug.rechnung && fahrzeug.rechnung.zahlungsstatus !== 'bezahlt')
                ? `<button class="payment-btn"
                           onclick="event.stopPropagation(); openBezahltModalKanban('${fahrzeug.id}', '${fahrzeug.rechnung.rechnungsnummer}');"
                           style="width: 100%; margin-top: 8px; padding: 8px 12px;
                                  background: rgba(76, 175, 80, 0.1);
                                  border: 1px solid rgba(76, 175, 80, 0.3);
                                  border-radius: 6px;
                                  color: #4CAF50;
                                  font-size: 13px;
                                  font-weight: 600;
                                  cursor: pointer;
                                  transition: all 0.2s;">
                       💳 Als bezahlt markieren
                   </button>`
                : '';

            // 📦 ANLIEFERUNG (2025-11-27): Button für "Fahrzeug abgeholt" Bestätigung
            const anlieferungButton = isAnlieferung
                ? `<button class="anlieferung-btn"
                           onclick="event.stopPropagation(); markFahrzeugAsAbgeholt('${fahrzeug.id}');"
                           style="width: 100%; margin-top: 8px; padding: 10px 12px;
                                  background: rgba(0, 188, 212, 0.2);
                                  border: 2px solid rgba(0, 188, 212, 0.5);
                                  border-radius: 8px;
                                  color: #00BCD4;
                                  font-size: 14px;
                                  font-weight: 700;
                                  cursor: pointer;
                                  transition: all 0.2s;">
                       ✅ Fahrzeug abgeholt
                   </button>`
                : '';

            // DRINGLICHKEITS-BADGE - NUR für Planungs-Phasen (angenommen, terminiert, neu)
            // Grund: In Arbeits-Phasen (lackierung, trocknung) ist Fortschritt wichtiger als Deadline
            let dringlichkeitBadge = '';
            const planungsPhasen = ['angenommen', 'terminiert', 'neu'];
            const isPlanung = planungsPhasen.includes(fahrzeug.prozessStatus || 'angenommen');

            if (isPlanung && fahrzeug.geplantesAbnahmeDatum) {
                const tage = calculateDaysUntilAbnahme(fahrzeug);

                if (tage !== null) {
                    let badgeClass = '';
                    let badgeIcon = '';
                    let badgeText = '';

                    if (tage < 0) {
                        // Überfällig!
                        badgeClass = 'dringlichkeit-badge ueberfaellig';
                        badgeIcon = '❌';
                        badgeText = `ÜBERFÄLLIG! (${Math.abs(tage)} Tage)`;
                        card.classList.add('ueberfaellig-card');
                    } else if (tage === 0) {
                        // HEUTE!
                        badgeClass = 'dringlichkeit-badge dringend';
                        badgeIcon = '🚨';
                        badgeText = 'HEUTE!';
                        card.classList.add('dringend-card');
                    } else if (tage === 1) {
                        // MORGEN!
                        badgeClass = 'dringlichkeit-badge dringend';
                        badgeIcon = '🚨';
                        badgeText = 'MORGEN!';
                        card.classList.add('dringend-card');
                    } else if (tage <= 7) {
                        // Diese Woche
                        badgeClass = 'dringlichkeit-badge diese-woche';
                        badgeIcon = '⏰';
                        badgeText = `In ${tage} Tagen`;
                    } else {
                        // Geparkt
                        badgeClass = 'dringlichkeit-badge geparkt';
                        badgeIcon = '📦';
                        badgeText = `Noch ${tage} Tage`;
                    }

                    dringlichkeitBadge = `<div class="${badgeClass}">${badgeIcon} ${badgeText}</div>`;
                }
            }

            // SPEZIELLER BADGE für "bereit"-Fahrzeuge mit überfälligem Abnahme-Termin
            if (fahrzeug.prozessStatus === 'bereit' && fahrzeug.geplantesAbnahmeDatum) {
                const tage = calculateDaysUntilAbnahme(fahrzeug);
                if (tage !== null && tage < 0) {
                    dringlichkeitBadge = `<div class="dringlichkeit-badge ueberfaellig">
                        ❌ ABNAHME ÜBERFÄLLIG! (${Math.abs(tage)} Tage)
                    </div>`;
                    card.classList.add('ueberfaellig-card');
                }
            }

            // 🆕 MULTI-SERVICE: Function to build service label with details
            function buildServiceLabel(serviceTyp, serviceData) {
                const serviceTypeLabels = {
                    'lackier': '🎨 Lackierung',
                    'reifen': '🚗 Reifen',
                    'mechanik': '🔧 Mechanik',
                    'pflege': '✨ Pflege',
                    'tuev': '✅ TÜV',
                    'versicherung': '🛡️ Versicherung',
                    'glas': '🔍 Glas',
                    'klima': '❄️ Klima',
                    'dellen': '🔨 Dellen',
                    'folierung': '🌈 Folierung',
                    'steinschutz': '🛡️ Steinschutz',
                    'werbebeklebung': '📢 Werbebeklebung'
                };

                let label = serviceTypeLabels[serviceTyp] || '🔧 Service';

                // Add service-specific details if available
                if (serviceData) {
                    switch(serviceTyp) {
                        case 'reifen':
                            if (serviceData.reifentyp && serviceData.reifenanzahl) {
                                const typShort = { sommer: 'S', winter: 'W', ganzjahr: 'G' }[serviceData.reifentyp] || serviceData.reifentyp.charAt(0);
                                label += ` (${serviceData.reifenanzahl}x ${typShort})`;
                            }
                            break;
                        case 'glas':
                            if (serviceData.scheibentyp) {
                                const scheibeShort = serviceData.scheibentyp.includes('front') ? 'Front' :
                                                   serviceData.scheibentyp.includes('heck') ? 'Heck' :
                                                   serviceData.scheibentyp.includes('seiten') ? 'Seite' : '';
                                if (scheibeShort) label += ` (${scheibeShort})`;
                            }
                            break;
                        case 'klima':
                            if (serviceData.klimaservice) {
                                const serviceShort = { wartung: 'Wartung', fuellen: 'Auffüllen', reparatur: 'Reparatur', komplett: 'Komplett' }[serviceData.klimaservice];
                                if (serviceShort) label += ` (${serviceShort})`;
                            }
                            break;
                        case 'dellen':
                            if (serviceData.dellenanzahl) {
                                label += ` (${serviceData.dellenanzahl}x)`;
                            }
                            break;
                        case 'folierung':
                            const folierungArt = serviceData?.folierungArt;
                            if (folierungArt) {
                                const artShort = { vollfolierung: 'Voll', teilfolierung: 'Teil', akzentfolierung: 'Akzent', akzente: 'Akzent' }[folierungArt];
                                if (artShort) label += ` (${artShort})`;
                            }
                            break;
                        case 'steinschutz':
                            // ⚠️ HINWEIS: Hier NUR steinschutzUmfang (Service-Präfix) verwenden!
                            // Kanban zeigt nur Fahrzeuge (bereits normalisiert), KEINE Partner-Anfragen
                            // Fahrzeuge haben immer Service-Präfix-Fields (steinschutzUmfang, folierungArt, etc.)
                            // Siehe REFERENCE_SERVICE_FIELDS.md:892 für Multi-Service Field-Präfix Pattern
                            if (serviceData.steinschutzUmfang) {
                                const umfangShort = { vollverklebung: 'Voll', frontpaket: 'Front', teilbereich: 'Teil' }[serviceData.steinschutzUmfang];
                                if (umfangShort) label += ` (${umfangShort})`;
                            }
                            break;
                        case 'werbebeklebung':
                            if (serviceData.werbebeklebungKomplexitaet) {
                                const artShort = { einfach: 'Einfach', mittel: 'Mittel', komplex: 'Komplex' }[serviceData.werbebeklebungKomplexitaet];
                                if (artShort) label += ` (${artShort})`;
                            }
                            break;
                    }
                }

                return label;
            }

            /**
             * 🆕 MULTI-SERVICE STATUS-TRACKING (2025-11-13): Build service badges WITH STATUS
             * Zeigt Primary + Additional Services mit ihren jeweiligen Status-Werten
             */
            function buildServiceBadgeWithStatus(fahrzeug) {
                const primaryServiceTyp = fahrzeug.serviceTyp || 'lackier';

                // Status Label Mapping (Deutsch)
                const statusLabels = {
                    'neu': 'Neu',
                    'angenommen': 'Angenommen',
                    'terminiert': 'Terminiert',
                    'vorbereitung': 'Vorbereitung',
                    'lackierung': 'Lackierung',
                    'trocknung': 'Trocknung',
                    'montage': 'Montage',
                    'qualitaetskontrolle': 'Qualität',
                    'bereit': 'Bereit',
                    'fertig': 'Fertig',
                    'abholbereit': 'Abholbereit',
                    'in_arbeit': 'In Arbeit',
                    'wuchten': 'Wuchten',
                    'reparatur': 'Reparatur',
                    'aufbereitung': 'Aufbereitung',
                    'pruefung': 'Prüfung',
                    'diagnose': 'Diagnose',
                    'bestellung': 'Bestellung',
                    'angekommen': 'Angekommen',
                    'termin': 'Termin',
                    'termin_gebucht': 'Termin gebucht',
                    'gutachten': 'Gutachten',
                    'freigabe': 'Freigabe',
                    'angebot': 'Angebot',
                    'beauftragt': 'Beauftragt',
                    'test': 'Test',
                    'qualitaet': 'Qualität'
                };

                // Status Colors (für visuelles Feedback)
                const statusColors = {
                    'neu': 'rgba(158, 158, 158, 0.7)',              // Grau
                    'angenommen': 'rgba(0, 122, 255, 0.7)',         // Blau
                    'terminiert': 'rgba(0, 122, 255, 0.7)',         // Blau
                    'vorbereitung': 'rgba(255, 152, 0, 0.7)',       // Orange
                    'in_arbeit': 'rgba(255, 193, 7, 0.7)',          // Gelb
                    'lackierung': 'rgba(255, 193, 7, 0.7)',         // Gelb
                    'trocknung': 'rgba(255, 193, 7, 0.7)',          // Gelb
                    'montage': 'rgba(255, 193, 7, 0.7)',            // Gelb
                    'wuchten': 'rgba(255, 193, 7, 0.7)',            // Gelb
                    'reparatur': 'rgba(255, 193, 7, 0.7)',          // Gelb
                    'aufbereitung': 'rgba(255, 193, 7, 0.7)',       // Gelb
                    'pruefung': 'rgba(255, 193, 7, 0.7)',           // Gelb
                    'diagnose': 'rgba(255, 193, 7, 0.7)',           // Gelb
                    'bestellung': 'rgba(255, 152, 0, 0.7)',         // Orange
                    'angekommen': 'rgba(255, 193, 7, 0.7)',         // Gelb
                    'termin': 'rgba(0, 122, 255, 0.7)',             // Blau
                    'termin_gebucht': 'rgba(0, 122, 255, 0.7)',     // Blau
                    'gutachten': 'rgba(255, 193, 7, 0.7)',          // Gelb
                    'freigabe': 'rgba(255, 193, 7, 0.7)',           // Gelb
                    'angebot': 'rgba(255, 152, 0, 0.7)',            // Orange
                    'beauftragt': 'rgba(0, 122, 255, 0.7)',         // Blau
                    'test': 'rgba(255, 193, 7, 0.7)',               // Gelb
                    'qualitaetskontrolle': 'rgba(156, 39, 176, 0.7)', // Lila
                    'qualitaet': 'rgba(156, 39, 176, 0.7)',         // Lila
                    'bereit': 'rgba(76, 175, 80, 0.7)',             // Grün
                    'fertig': 'rgba(76, 175, 80, 0.7)',             // Grün
                    'abholbereit': 'rgba(76, 175, 80, 0.7)'         // Grün
                };

                let badges = '';

                // 1️⃣ PRIMARY SERVICE Badge mit Status
                const primaryServiceLabel = buildServiceLabel(primaryServiceTyp, fahrzeug.serviceDetails);
                const primaryStatus = getServiceStatus(fahrzeug, primaryServiceTyp);
                const primaryStatusLabel = statusLabels[primaryStatus] || primaryStatus;
                const primaryStatusColor = statusColors[primaryStatus] || 'rgba(0, 122, 255, 0.7)';

                badges += `
                    <div class="service-status-badge primary" style="background: ${primaryStatusColor}; backdrop-filter: blur(8px); margin-bottom: 6px; font-size: 10px; padding: 5px 8px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                        <span style="font-weight: 600;">${primaryServiceLabel}</span>
                        <span style="opacity: 0.9; font-size: 9px; background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 4px;">→ ${primaryStatusLabel}</span>
                    </div>
                `;

                // 2️⃣ ADDITIONAL SERVICES Badges mit Status
                if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                    console.log(`🆕 Multi-Service Card: ${fahrzeug.kennzeichen} has ${fahrzeug.additionalServices.length} additional services`);

                    fahrzeug.additionalServices.forEach(additionalService => {
                        // 🆕 BUG #1 FIX (Nov 13, 2025): Korrekter Feldname mit Fallback
                        // Problem: serviceData (alt) vs serviceDetails (neu) → Details fehlten in Card Labels
                        // Lösung: serviceDetails primär, serviceData fallback für alte Fahrzeuge
                        const additionalLabel = buildServiceLabel(
                            additionalService.serviceTyp,
                            additionalService.serviceDetails || additionalService.serviceData || {}
                        );
                        const additionalStatus = getServiceStatus(fahrzeug, additionalService.serviceTyp);
                        const additionalStatusLabel = statusLabels[additionalStatus] || additionalStatus;
                        const additionalStatusColor = statusColors[additionalStatus] || 'rgba(100, 60, 255, 0.6)';

                        badges += `
                            <div class="service-status-badge additional" style="background: ${additionalStatusColor}; backdrop-filter: blur(8px); margin-bottom: 6px; font-size: 10px; padding: 5px 8px; border-radius: 6px; border-left: 3px solid rgba(255, 255, 255, 0.5); display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                                <span style="font-weight: 600;">+ ${additionalLabel}</span>
                                <span style="opacity: 0.9; font-size: 9px; background: rgba(255, 255, 255, 0.2); padding: 2px 6px; border-radius: 4px;">→ ${additionalStatusLabel}</span>
                            </div>
                        `;
                    });
                }

                return badges;
            }

            // 🆕 MULTI-SERVICE STATUS-TRACKING (2025-11-13): Use new badge function
            const serviceTypBadge = buildServiceBadgeWithStatus(fahrzeug);

            // 🆕 FERTIGSTELLUNGS-DROPDOWN (2025-12-02): Multi-Service Koordination
            const fertigstellungsDropdown = buildFertigstellungsDropdown(fahrzeug);

            // ABHOLUNGS-BADGE - FÜR ALLE PHASEN (außer "bereit" = bereits abholbereit)
            // Zeigt Abholung in ALLEN Spalten, damit Werkstatt frühzeitig planen kann
            let abholungBadge = '';
            const showAbholungBadge = (fahrzeug.prozessStatus !== 'bereit' && fahrzeug.prozessStatus !== 'fertig' && fahrzeug.prozessStatus !== 'abholbereit');
            if (showAbholungBadge && fahrzeug.fahrzeugAbholung === 'ja') {
                // ✅ FIX Bug #15 (2025-11-24): Use formatFirestoreDate() for Timestamp compatibility
                const abholdatumText = fahrzeug.abholdatum
                    ? formatFirestoreDate(fahrzeug.abholdatum)
                    : 'Termin offen';
                const abholzeitText = fahrzeug.abholzeit ? ` um ${fahrzeug.abholzeit} Uhr` : '';

                abholungBadge = `
                    <div class="dringlichkeit-badge" style="background: rgba(0, 122, 255, 0.7); backdrop-filter: blur(8px); margin-bottom: 8px;">
                        🚙 ABHOLUNG: ${abholdatumText}${abholzeitText}
                    </div>
                `;

                // Abholadresse anzeigen (gekürzt)
                if (fahrzeug.abholadresse) {
                    const adresseKurz = fahrzeug.abholadresse.length > 45
                        ? fahrzeug.abholadresse.substring(0, 45) + '...'
                        : fahrzeug.abholadresse;
                    abholungBadge += `
                        <div class="card-info" style="font-size: 11px; color: #666; margin-bottom: 8px; background: #e3f2fd; padding: 5px 8px; border-radius: 6px;">
                            📍 ${adresseKurz}
                        </div>
                    `;
                }
            }

            // 🚗 ERSATZFAHRZEUG-BADGE (FIX 2025-11-27)
            let ersatzfahrzeugBadge = '';
            if (fahrzeug.ersatzfahrzeugGewuenscht && fahrzeug.kalkulationData?.ersatzfahrzeug) {
                const ersatzKennzeichen = fahrzeug.kalkulationData.ersatzfahrzeug.kennzeichen || 'Leihwagen';
                const ersatzTage = fahrzeug.kalkulationData.ersatzfahrzeug.tage || '';

                ersatzfahrzeugBadge = `
                    <div class="dringlichkeit-badge" style="background: rgba(245, 158, 11, 0.8); backdrop-filter: blur(8px); margin-bottom: 8px;">
                        🚗 LEIHFAHRZEUG: ${ersatzKennzeichen}${ersatzTage ? ` (${ersatzTage} Tage)` : ''}
                    </div>
                `;
            }

            // 🆕 Phase 1.3: Bearbeitungs-History Badge
            // Zeigt letzten Mitarbeiter der den Status geändert hat
            let bearbeitungsBadge = '';
            if (fahrzeug.bearbeitungsHistory && fahrzeug.bearbeitungsHistory.length > 0) {
                // Letzter Eintrag
                const letzteBearbeitung = fahrzeug.bearbeitungsHistory[fahrzeug.bearbeitungsHistory.length - 1];
                const mitarbeiterName = letzteBearbeitung.mitarbeiterName || 'Unbekannt';

                // Service-Emojis für Services
                const serviceEmojis = {
                    'lackierung': '🎨',
                    'mechanik': '🔧',
                    'reifen': '🛞',
                    'pflege': '✨',
                    'tuev': '📋',
                    'versicherung': '📄',
                    'glas': '🔍',
                    'klima': '❄️',
                    'dellen': '🔨',
                    'folierung': '🎬',
                    'steinschutz': '🛡️',
                    'werbebeklebung': '📢'
                };

                // Services als Emojis
                const services = letzteBearbeitung.services || [];
                const serviceIcons = services.length > 0
                    ? ' ' + services.map(s => serviceEmojis[s] || '').join(' ')
                    : '';

                bearbeitungsBadge = `
                    <div class="dringlichkeit-badge" style="background: rgba(76, 175, 80, 0.7); backdrop-filter: blur(8px); margin-bottom: 8px; font-size: 10px; padding: 4px 8px;">
                        👤 ${mitarbeiterName}${serviceIcons}
                    </div>
                `;
            }

            card.innerHTML = `
                ${serviceTypBadge}
                ${fertigstellungsDropdown}
                ${bereitBadge}
                ${dringlichkeitBadge}
                ${abholungBadge}
                ${ersatzfahrzeugBadge}
                ${bearbeitungsBadge}
                <div id="materialStatus_${window.escapeHtml(fahrzeug.id)}" class="material-status-badge" style="display: none;"></div>
                <div class="card-kennzeichen">${window.escapeHtml(fahrzeug.kennzeichen)}</div>
                <div class="card-info">👤 <span class="card-kunde">${window.escapeHtml(fahrzeug.kundenname) || 'k.A.'}</span></div>
                <div class="card-info">🚗 ${window.escapeHtml(fahrzeug.marke) || ''} ${window.escapeHtml(fahrzeug.modell) || ''}</div>
                ${(fahrzeug.farbnummer || fahrzeug.farbname) ? `<div class="card-info">🎨 ${window.escapeHtml(fahrzeug.farbnummer) || ''} ${fahrzeug.farbnummer && fahrzeug.farbname ? '-' : ''} ${window.escapeHtml(fahrzeug.farbname) || ''}</div>` : ''}
                <div class="${preisCssClass}">${preis}</div>
                <button class="auftrag-view-btn" onclick="event.stopPropagation(); openAuftragModal('${fahrzeug.id}');" style="width: 100%; margin-top: 8px; padding: 8px 12px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 6px; color: var(--color-primary); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    📄 Auftrag anzeigen
                </button>
                ${anlieferungButton}
                ${paymentButton}
                ${bereitButton}
            `;

            // Load Material-Status asynchronously (non-blocking)
            loadMaterialStatusForCard(fahrzeug.id);

            // Click Event - Details anzeigen (öffnet Detail-Modal in liste.html)
            const cardClickHandler = () => {
                safeNavigate(`liste.html?showDetails=${fahrzeug.id}`);
            };
            window.listenerRegistry.registerDOM(card, 'click', cardClickHandler, `Kanban Card Click: ${fahrzeug.kennzeichen}`);

            return card;
        }

        // Drag & Drop Setup
        function setupDragAndDrop() {
            const cards = document.querySelectorAll('.kanban-card');
            const columns = document.querySelectorAll('.kanban-cards');

            // Drag Start
            cards.forEach(card => {
                const dragStartHandler = (e) => {
                    card.classList.add('dragging');
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', card.dataset.id);
                };
                const dragEndHandler = () => {
                    card.classList.remove('dragging');
                };
                window.listenerRegistry.registerDOM(card, 'dragstart', dragStartHandler, `Kanban Card Drag Start: ${card.dataset.id}`);
                window.listenerRegistry.registerDOM(card, 'dragend', dragEndHandler, `Kanban Card Drag End: ${card.dataset.id}`);
            });

            // Drop Zones
            columns.forEach(column => {
                const dragOverHandler = (e) => {
                    e.preventDefault();
                    column.closest('.kanban-column').classList.add('drag-over');
                };
                const dragLeaveHandler = () => {
                    column.closest('.kanban-column').classList.remove('drag-over');
                };
                const dropHandler = async (e) => {
                    e.preventDefault();
                    column.closest('.kanban-column').classList.remove('drag-over');

                    const fahrzeugId = e.dataTransfer.getData('text/plain');
                    let newStatus = column.closest('.kanban-column').dataset.status;

                    // 🆕 BUG #11 FIX: Auto-Mapping für Pseudo-Universal-Stati
                    // Problem: "Alle Prozesse" hat Stati ('in_arbeit', 'vorbereitung', 'qualitaetskontrolle')
                    // die NICHT in allen Services existieren → Fahrzeug verschwindet aus Service-Tab!
                    // Lösung: Mappe zu service-spezifischem Status BEVOR updateFahrzeugStatus() aufgerufen wird
                    const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
                    if (fahrzeug && currentProcess === 'alle') {
                        const pseudoUniversalStatuses = ['in_arbeit', 'vorbereitung', 'qualitaetskontrolle'];

                        if (pseudoUniversalStatuses.includes(newStatus)) {
                            const currentServiceTyp = fahrzeug.serviceTyp || 'lackierung';
                            const mappedStatus = mapUniversalToServiceStatus(newStatus, currentServiceTyp);

                            console.log(`🎯 BUG #11 FIX: Pseudo-Universal-Status erkannt!`);
                            console.log(`   Original: "${newStatus}" (nur in "Alle Prozesse")`);
                            console.log(`   Gemappt: "${mappedStatus}" (gültig für ${currentServiceTyp})`);

                            // Überschreibe newStatus mit gemapptem Status
                            newStatus = mappedStatus;
                        }
                    }

                    // 🆕 BUG #10 FIX: Auto-Tab-Wechsel wenn Status ungültig für aktuellen Service
                    if (fahrzeug && currentProcess !== 'alle') {
                        // ✅ FIX Bug #18 (2025-11-24): Use currentProcess instead of fahrzeug.serviceTyp
                        // PROBLEM: Multi-Service vehicles validated against PRIMARY service (fahrzeug.serviceTyp) instead of CURRENT tab (currentProcess)
                        // IMPACT: User in "dellen" tab → drag to "politur" → validated against "lackier" workflow → FAILED
                        // SOLUTION: Validate against CURRENT service tab, fallback to PRIMARY if undefined
                        const currentServiceTyp = currentProcess || fahrzeug.serviceTyp || 'lackierung';
                        const validStatuses = getValidStatusesForService(currentServiceTyp);

                        // Check: Ist newStatus gültig für aktuellen Service?
                        if (!validStatuses.includes(newStatus)) {
                            console.warn(`⚠️ Status "${newStatus}" ist NICHT gültig für Service "${currentServiceTyp}"`);

                            // Auto-Tab-Wechsel: Finde richtigen Service für diesen Status
                            // 🆕 BUG #12+#13 FIX: Übergebe currentServiceTyp für Konflikt-Resolution!
                            const correctService = findServiceForStatus(newStatus, currentServiceTyp);

                            if (correctService) {
                                console.log(`🔄 Auto-Tab-Wechsel: ${currentProcess} → ${correctService}`);

                                // 🆕 CONSISTENCY FIX: serviceTyp bleibt konsistent mit annahme.html
                                // Map process key to serviceTyp (1:1 mapping - keine Transformation)
                                const serviceTypMap = {
                                    'lackier': 'lackier',      // FIX: 'lackierung' → 'lackier' für Consistency
                                    'reifen': 'reifen',
                                    'mechanik': 'mechanik',
                                    'pflege': 'pflege',
                                    'tuev': 'tuev',
                                    'versicherung': 'versicherung',
                                    'glas': 'glas',
                                    'klima': 'klima',
                                    'dellen': 'dellen',
                                    'folierung': 'folierung',
                                    'steinschutz': 'steinschutz',
                                    'werbebeklebung': 'werbebeklebung'
                                };
                                // 🛡️ MULTI-SERVICE FIX (2025-11-14): NEVER change serviceTyp after creation
                                // OLD BUG: Lines 3923-3936 changed serviceTyp in Firestore + local object
                                // IMPACT: Multi-Service vehicles lost primary service → data loss in frontend
                                // FIX: Only switch UI tab (currentProcess), keep serviceTyp immutable

                                // Tab wechseln (UI-only state - doesn't affect Firestore)
                                currentProcess = correctService;
                                document.getElementById('processSelect').value = correctService;

                                // Notification anzeigen (UPDATED: No longer mentions serviceTyp change)
                                showToast(`ℹ️ Tab gewechselt zu "${processDefinitions[correctService].name}"\n\n` +
                                      `Grund: Status "${newStatus}" gehört zu diesem Service-Workflow.`);

                                // Board neu rendern (zeigt jetzt richtigen Service-Tab)
                                renderKanbanBoard();
                            } else {
                                console.log(`ℹ️ Status "${newStatus}" ist universal → kein Tab-Wechsel nötig`);
                            }
                        }
                    }

                    await updateFahrzeugStatus(fahrzeugId, newStatus);
                };

                window.listenerRegistry.registerDOM(column, 'dragover', dragOverHandler, `Kanban Column Drag Over: ${column.closest('.kanban-column').dataset.status}`);
                window.listenerRegistry.registerDOM(column, 'dragleave', dragLeaveHandler, `Kanban Column Drag Leave: ${column.closest('.kanban-column').dataset.status}`);
                window.listenerRegistry.registerDOM(column, 'drop', dropHandler, `Kanban Column Drop: ${column.closest('.kanban-column').dataset.status}`);
            });
        }

        // 🔧 HELPER: Mapping prozessStatus → status (für Liste-Kompatibilität)
        function mapProzessToStatus(prozessStatus) {
            // ✅ BUG FIX #2: Erweiterte Status-Mappings für alle Services

            // 1. Abgeschlossen (End-State)
            if (prozessStatus === 'abgeschlossen') return 'abgeschlossen';

            // 2. Start-Status (angenommen, neu)
            if (prozessStatus === 'angenommen' || prozessStatus === 'neu') return prozessStatus;

            // 3. Terminiert (alle Services haben diesen Status!)
            if (prozessStatus === 'terminiert') return 'terminiert';

            // 4. Fertig/Bereit Status (End-Status vor Abholung)
            if (prozessStatus === 'bereit' || prozessStatus === 'fertig' || prozessStatus === 'abholbereit') {
                return 'bereit'; // Vereinheitlicht: "Bereit zur Abnahme"
            }

            // 5. Alle Zwischen-Prozess-Status → in_arbeit
            // (lackierung, trocknung, polierung, montage, wuchten, reparatur, aufbereitung, pruefung, etc.)
            return 'in_arbeit';
        }

        // 🆕 BUG #10 FIX: Helper-Funktionen für Service-Workflow Validation

        // 1. Get valid statuses for service
        function getValidStatusesForService(serviceTyp) {
            // Map serviceTyp to processDefinition key (1:1 mapping, no transformation)
            const serviceKey = {
                'lackier': 'lackier',
                'reifen': 'reifen',
                'mechanik': 'mechanik',
                'pflege': 'pflege',
                'tuev': 'tuev',
                'versicherung': 'versicherung',
                'glas': 'glas',
                'klima': 'klima',
                'dellen': 'dellen',
                'folierung': 'folierung',
                'steinschutz': 'steinschutz',
                'werbebeklebung': 'werbebeklebung'
            }[serviceTyp];

            if (!serviceKey || !processDefinitions[serviceKey]) {
                console.warn(`⚠️ Unbekannter Service-Typ: ${serviceTyp}, fallback auf Lackierung`);
                return processDefinitions['lackier'].steps.map(s => s.id);
            }

            return processDefinitions[serviceKey].steps.map(s => s.id);
        }

        // 2. Find service for status (returns processDefinition key like 'lackier', 'reifen', etc.)
        // 🆕 BUG #12+#13 FIX: currentServiceTyp Parameter für Konflikt-Resolution
        function findServiceForStatus(status, currentServiceTyp = null) {
            // Universal statuses that exist in ALL services
            const universalStatuses = ['anlieferung', 'neu', 'angenommen', 'terminiert', 'bereit', 'fertig', 'abgeschlossen'];

            if (universalStatuses.includes(status)) {
                return null; // Status ist universal, kein spezifischer Service
            }

            // 🆕 BUG #12 FIX: Konflikt-Resolution für 'reparatur' (Mechanik UND Versicherung haben diesen Status!)
            if (status === 'reparatur') {
                // Map serviceTyp to processKey (1:1 mapping, no legacy transform)
                const serviceTypToProcessKey = {
                    'lackier': 'lackier',
                    'reifen': 'reifen',
                    'mechanik': 'mechanik',
                    'pflege': 'pflege',
                    'tuev': 'tuev',
                    'versicherung': 'versicherung',
                    'glas': 'glas',
                    'klima': 'klima',
                    'dellen': 'dellen',
                    'folierung': 'folierung',
                    'steinschutz': 'steinschutz',
                    'werbebeklebung': 'werbebeklebung'
                };
                const processKey = currentServiceTyp ? (serviceTypToProcessKey[currentServiceTyp] || currentServiceTyp) : null;

                // Bevorzuge aktuellen Service (wenn bekannt)
                if (processKey === 'mechanik') {
                    if (window.DEBUG) console.log(`🔍 BUG #12 FIX: 'reparatur' + serviceTyp='${currentServiceTyp}' → mechanik (conflict resolved)`);
                    return 'mechanik';
                }
                if (processKey === 'versicherung') {
                    if (window.DEBUG) console.log(`🔍 BUG #12 FIX: 'reparatur' + serviceTyp='${currentServiceTyp}' → versicherung (conflict resolved)`);
                    return 'versicherung';
                }

                // Fallback: Versicherung (höhere Priorität, da teurer/wichtiger)
                if (window.DEBUG) console.log(`🔍 BUG #12 FIX: 'reparatur' ohne serviceTyp → versicherung (default priority)`);
                return 'versicherung';
            }

            // 🆕 BUG #13 FIX: Konflikt-Resolution für 'qualitaet' (Pflege UND Versicherung haben diesen Status!)
            if (status === 'qualitaet') {
                // Map serviceTyp to processKey (1:1 mapping, no legacy transform)
                const serviceTypToProcessKey = {
                    'lackier': 'lackier',
                    'reifen': 'reifen',
                    'mechanik': 'mechanik',
                    'pflege': 'pflege',
                    'tuev': 'tuev',
                    'versicherung': 'versicherung',
                    'glas': 'glas',
                    'klima': 'klima',
                    'dellen': 'dellen',
                    'folierung': 'folierung',
                    'steinschutz': 'steinschutz',
                    'werbebeklebung': 'werbebeklebung'
                };
                const processKey = currentServiceTyp ? (serviceTypToProcessKey[currentServiceTyp] || currentServiceTyp) : null;

                // Bevorzuge aktuellen Service (wenn bekannt)
                if (processKey === 'pflege') {
                    if (window.DEBUG) console.log(`🔍 BUG #13 FIX: 'qualitaet' + serviceTyp='${currentServiceTyp}' → pflege (conflict resolved)`);
                    return 'pflege';
                }
                if (processKey === 'versicherung') {
                    if (window.DEBUG) console.log(`🔍 BUG #13 FIX: 'qualitaet' + serviceTyp='${currentServiceTyp}' → versicherung (conflict resolved)`);
                    return 'versicherung';
                }

                // Fallback: Pflege (höhere Priorität, da häufiger)
                if (window.DEBUG) console.log(`🔍 BUG #13 FIX: 'qualitaet' ohne serviceTyp → pflege (default priority)`);
                return 'pflege';
            }

            // 🆕 NEBENWIRKUNG FIX #5: Service-specific statuses (dedupliziert + Priorität)
            // WICHTIG: 'reparatur' und 'qualitaet' jetzt mit Konflikt-Resolution oben!
            // NUR UNIQUE STATUSES hier listen (shared statuses nutzen Konflikt-Resolution)
            const serviceSpecificStatuses = {
                'lackier': ['vorbereitung', 'lackierung', 'trocknung', 'qualitaetskontrolle'],
                'reifen': ['bestellung', 'angekommen', 'montage', 'wuchten'],
                'mechanik': ['diagnose', 'angebot', 'beauftragt', 'test'],  // 'reparatur' jetzt mit Konflikt-Resolution!
                'pflege': ['termin', 'aufbereitung'],  // 'qualitaet' jetzt mit Konflikt-Resolution!
                'tuev': ['termin_gebucht', 'pruefung', 'abholbereit'],
                'versicherung': ['gutachten', 'freigabe'],  // 'reparatur' + 'qualitaet' jetzt mit Konflikt-Resolution!
                'glas': ['begutachtung', 'aushärten', 'politur'],  // 'reparatur' jetzt mit Konflikt-Resolution!
                'klima': ['wartung', 'fuellen'],  // 'diagnose' + 'test' auch in mechanik/klima → Konflikt möglich
                'dellen': ['drueckung'],  // 'begutachtung', 'politur', 'qualitaet' auch in anderen Services
                'folierung': ['material'],  // vorbereitung/montage/trocknung/qualitaetskontrolle sind shared
                'steinschutz': ['aushärtung'],  // material/vorbereitung/montage/qualitaetskontrolle sind shared (aber material auch in folierung!)
                'werbebeklebung': ['design', 'produktion']  // freigabe ist shared mit versicherung
            };

            for (const [service, statuses] of Object.entries(serviceSpecificStatuses)) {
                if (statuses.includes(status)) {
                    return service; // z.B. 'lackier', 'reifen'
                }
            }

            return null; // Status nicht gefunden
        }

        // 3. Get next valid status (Auto-Korrektur Fallback-Chain)
        function getNextValidStatus(serviceTyp, currentStatus) {
            const validStatuses = getValidStatusesForService(serviceTyp);

            // Fallback-Chain:
            // 1. 'terminiert' (fast alle Services haben das)
            // 2. 'angenommen' (alle haben das)
            // 3. 'neu' (alle haben das)

            if (validStatuses.includes('terminiert')) return 'terminiert';
            if (validStatuses.includes('angenommen')) return 'angenommen';
            if (validStatuses.includes('neu')) return 'neu';

            // Final Fallback: Erster Status im Workflow
            return validStatuses[0] || 'angenommen';
        }

        // 4. Map Universal-Status to Service-Specific Status (BUG #11 FIX)
        // Problem: "Alle Prozesse" hat Pseudo-Universal-Stati ('in_arbeit', 'vorbereitung', 'qualitaetskontrolle')
        // Diese existieren NICHT in allen Services → Fahrzeug verschwindet aus Service-Tab!
        // Lösung: Auto-Mapping zu passendem service-spezifischem Status
        function mapUniversalToServiceStatus(universalStatus, serviceTyp) {
            // Map serviceTyp to process key
            const serviceTypToProcessKey = {
                'lackierung': 'lackier',   // Legacy Support
                'lackier': 'lackier',
                'reifen': 'reifen',
                'mechanik': 'mechanik',
                'pflege': 'pflege',
                'tuev': 'tuev',
                'versicherung': 'versicherung',
                'glas': 'glas',
                'klima': 'klima',
                'dellen': 'dellen',
                'folierung': 'folierung',
                'steinschutz': 'steinschutz',
                'werbebeklebung': 'werbebeklebung'
            };
            const processKey = serviceTypToProcessKey[serviceTyp] || serviceTyp;

            // Mapping-Regeln: Universal-Status → Service-spezifischer Status
            const mappings = {
                'in_arbeit': {
                    'lackier': 'lackierung',       // Hauptarbeitsschritt
                    'reifen': 'montage',           // Hauptarbeitsschritt
                    'mechanik': 'reparatur',       // Hauptarbeitsschritt
                    'pflege': 'aufbereitung',      // Hauptarbeitsschritt
                    'tuev': 'pruefung',            // Hauptarbeitsschritt
                    'versicherung': 'reparatur',   // Hauptarbeitsschritt
                    'glas': 'reparatur',           // Hauptarbeitsschritt
                    'klima': 'service',            // Hauptarbeitsschritt
                    'dellen': 'pdr',               // Hauptarbeitsschritt
                    'folierung': 'montage',        // Hauptarbeitsschritt (Folierung anbringen)
                    'steinschutz': 'montage',      // Hauptarbeitsschritt (Folie anbringen)
                    'werbebeklebung': 'montage'    // Hauptarbeitsschritt (Beklebung anbringen)
                },
                'vorbereitung': {
                    'lackier': 'vorbereitung',     // Existiert in Lackierung
                    'reifen': 'bestellung',        // Erste Arbeitsphase
                    'mechanik': 'diagnose',        // Erste Arbeitsphase
                    'pflege': 'termin',            // Erste Arbeitsphase
                    'tuev': 'termin_gebucht',      // Erste Arbeitsphase
                    'versicherung': 'gutachten',   // Erste Arbeitsphase
                    'glas': 'neu',                 // Erste Arbeitsphase
                    'klima': 'diagnose',           // Erste Arbeitsphase
                    'dellen': 'neu',               // Erste Arbeitsphase
                    'folierung': 'vorbereitung',   // Existiert in Folierung
                    'steinschutz': 'vorbereitung', // Existiert in Steinschutz
                    'werbebeklebung': 'design'     // Erste Arbeitsphase (Design-Entwurf)
                },
                'qualitaetskontrolle': {
                    'lackier': 'qualitaetskontrolle', // Existiert in Lackierung
                    'reifen': 'wuchten',              // Qualitätsschritt
                    'mechanik': 'test',               // Qualitätsschritt
                    'pflege': 'qualitaet',            // Qualitätsschritt
                    'tuev': 'fertig',                 // TÜV hat keine QK (direkt fertig)
                    'versicherung': 'qualitaet',      // Qualitätsschritt
                    'glas': 'politur',                // Qualitätsschritt
                    'klima': 'test',                  // Qualitätsschritt
                    'dellen': 'polieren',             // Qualitätsschritt
                    'folierung': 'qualitaetskontrolle', // Existiert in Folierung
                    'steinschutz': 'qualitaetskontrolle', // Existiert in Steinschutz
                    'werbebeklebung': 'qualitaetskontrolle' // Existiert in Werbebeklebung
                }
            };

            // Mappe Status
            const mapped = mappings[universalStatus]?.[processKey];

            if (mapped) {
                console.log(`🔄 Auto-Mapping: "${universalStatus}" (Universal) → "${mapped}" (${serviceTyp}/${processKey})`);
                return mapped;
            } else {
                // Fallback: Original-Status zurückgeben (wenn kein Mapping definiert)
                console.warn(`⚠️ Kein Mapping gefunden für: "${universalStatus}" + "${serviceTyp}" → Behalte Original-Status`);
                return universalStatus;
            }
        }

        // 📦 ANLIEFERUNG (2025-11-27): Fahrzeug als "abgeholt" markieren
        // Ändert Status von 'anlieferung' → 'angenommen'
        async function markFahrzeugAsAbgeholt(fahrzeugId) {
            try {
                console.log(`📦 markFahrzeugAsAbgeholt: Fahrzeug ${fahrzeugId}`);

                // Fahrzeug finden
                const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
                if (!fahrzeug) {
                    console.error('❌ Fahrzeug nicht gefunden:', fahrzeugId);
                    if (window.toast) {
                        window.toast.error('Fahrzeug nicht gefunden');
                    }
                    return;
                }

                // Sicherheitscheck: Nur wenn Status 'anlieferung' ist
                if (fahrzeug.prozessStatus !== 'anlieferung') {
                    console.warn(`⚠️ Fahrzeug ist nicht im Status 'anlieferung' (aktuell: ${fahrzeug.prozessStatus})`);
                    if (window.toast) {
                        window.toast.warning('Fahrzeug ist nicht mehr in der Anlieferung');
                    }
                    return;
                }

                // Update in Firestore
                // 🆕 FIX (2025-11-29): window.getCollection() gibt Collection-Referenz zurück, nicht String
                await window.getCollection('fahrzeuge').doc(String(fahrzeugId)).update({
                    prozessStatus: 'angenommen',
                    abgeholtAm: firebase.firestore.FieldValue.serverTimestamp(),
                    abgeholtVon: getCurrentUserForAudit().user || 'system'
                });

                console.log(`✅ Fahrzeug ${fahrzeug.kennzeichen} wurde als abgeholt markiert`);

                // Success Toast
                if (window.toast) {
                    window.toast.success(
                        `✅ ${fahrzeug.kennzeichen} wurde abgeholt\n` +
                        `→ Jetzt in "Angenommen" Spalte`
                    );
                }

                // Realtime-Listener aktualisiert automatisch, aber für sofortiges Feedback:
                fahrzeug.prozessStatus = 'angenommen';
                renderKanbanBoard();

            } catch (error) {
                console.error('❌ Fehler beim Markieren als abgeholt:', error);
                if (window.toast) {
                    window.toast.error('Fehler: ' + error.message);
                }
            }
        }

        // Fahrzeug-Status aktualisieren
        async function updateFahrzeugStatus(fahrzeugId, newStatus) {
            try {
                console.log(`🔄 Aktualisiere Fahrzeug ${fahrzeugId} → ${newStatus}`);

                // Fahrzeug finden
                const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
                if (!fahrzeug) {
                    console.error('Fahrzeug nicht gefunden:', fahrzeugId);
                    return;
                }

                // ✅ BUG #2 FIX: Validate status transition before update
                const currentService = getCurrentService() || fahrzeug.serviceTyp;
                const currentStatus = getServiceStatus(fahrzeug, currentService);

                console.log(`🔍 Status Validation Check:`, {
                    service: currentService,
                    from: currentStatus,
                    to: newStatus
                });

                const validation = isValidTransition(currentService, currentStatus, newStatus);

                if (!validation.isValid) {
                    console.warn(`⚠️ Invalid transition blocked: ${validation.reason}`);

                    // Check if user is Admin (can override)
                    const userRole = sessionStorage.getItem('userRole');
                    const isAdmin = userRole === 'admin' || userRole === 'werkstatt';

                    if (isAdmin) {
                        // Admin can override with confirmation
                        const confirmOverride = confirm(
                            `⚠️ ADMIN OVERRIDE ERFORDERLICH\n\n` +
                            `Diese Status-Änderung verstößt gegen den Standard-Workflow:\n\n` +
                            `Service: ${currentService}\n` +
                            `Von: ${currentStatus}\n` +
                            `Nach: ${newStatus}\n\n` +
                            `Grund: ${validation.reason}\n\n` +
                            `Möchten Sie diese Änderung trotzdem durchführen?`
                        );

                        if (!confirmOverride) {
                            console.log('✋ Admin cancelled override');
                            if (window.toast) {
                                window.toast.warning('Status-Änderung abgebrochen');
                            } else {
                                showToast('Status-Änderung abgebrochen', 'warning');
                            }
                            return;  // Exit function - no update
                        }

                        console.log('✅ Admin override confirmed - proceeding with update');
                    } else {
                        // Non-admin: Block transition
                        console.error('❌ Transition blocked for non-admin user');
                        if (window.toast) {
                            window.toast.error(
                                `Status-Änderung nicht erlaubt:\n\n${validation.reason}\n\n` +
                                `💡 Tipp: Bitte folgen Sie dem Standard-Workflow.`
                            );
                        } else {
                            showToast(
                                `Status-Änderung nicht erlaubt: ${validation.reason}`,
                                'error'
                            );
                        }
                        return;  // Exit function - no update
                    }
                } else {
                    console.log(`✅ Valid transition: ${validation.reason}`);
                }

                // Arbeitsschritte die ein Foto benötigen (physische Produktionsschritte)
                const arbeitsschritte = [
                    'vorbereitung',        // Lackierung
                    'lackierung',          // Lackierung
                    'qualitaetskontrolle', // Lackierung
                    'trocknung',           // Lackierung
                    'reparatur',           // Mechanik, Versicherung, Glas
                    'montage',             // Reifen
                    'wuchten',             // Reifen
                    'aufbereitung',        // Pflege
                    'qualitaet',           // Pflege, Versicherung, Dellen
                    'pruefung',            // TÜV
                    'diagnose',            // Mechanik, Klima
                    // NEU: Fehlende Arbeitsschritte für alle 9 Services
                    'test',                // Mechanik, Klima - Qualitätskontrolle/Funktionstest
                    'aushärten',           // Glas - Chemischer Aushärtungsprozess
                    'politur',             // Glas, Dellen - Oberflächenbearbeitung
                    'wartung',             // Klima - Wartungsarbeiten
                    'fuellen',             // Klima - Kältemittel befüllen
                    'drueckung',           // Dellen - Hauptarbeitsschritt (Dellen drücken)
                    'begutachtung'         // Glas, Dellen - Inspektion/Schadensaufnahme
                ];

                // Prüfen ob Arbeitsschritt
                if (arbeitsschritte.includes(newStatus)) {
                    // Photo Modal anzeigen
                    console.log('📸 Arbeitsschritt erkannt - Photo Modal wird angezeigt');
                    await showPhotoModal(fahrzeugId, newStatus);
                } else {
                    // Kein Foto nötig - direkt speichern
                    console.log('ℹ️ Kein Arbeitsschritt - kein Foto erforderlich');
                    await directStatusUpdate(fahrzeugId, newStatus);
                }
            } catch (error) {
                console.error('❌ Fehler beim Aktualisieren:', error);
                showToast('Fehler beim Speichern des Status!', 'error');
            }
        }

        // Global exportieren für ai-agent-tools.js Delegation
        window.updateFahrzeugStatusKanban = updateFahrzeugStatus;

        /**
         * 🆕 MULTI-SERVICE (2025-11-13): Sync Service-Status zu Partner-Anfrage
         * @param {Object} transaction - Firestore Transaction
         * @param {string} anfrageId - Partner-Anfrage ID
         * @param {string} serviceTyp - Service-Typ (z.B. "lackier", "tuev")
         * @param {string} newStatus - Neuer Prozess-Status
         * @param {Object} fahrzeugData - Fahrzeug-Daten
         * @param {number} timestamp - Timestamp
         */
        async function syncServiceStatusToPartner(transaction, anfrageId, serviceTyp, newStatus, fahrzeugData, timestamp) {
            try {
                const anfrageRef = window.getCollection('partnerAnfragen').doc(anfrageId);

                // Prüfe ob Anfrage existiert
                const anfrageDoc = await transaction.get(anfrageRef);
                if (!anfrageDoc.exists) {
                    console.warn('⚠️ Partner-Anfrage nicht gefunden - Sync übersprungen:', anfrageId);
                    return;  // Nicht blockieren - Fahrzeug-Update trotzdem durchführen
                }

                // Mapping: Werkstatt-Status → Partner-Kanban-Status
                const mappedStatus = mapProzessToStatus(newStatus);

                // 🔧 BUG #8 FIX #2 (2025-11-20): Get user info for Partner-Sync audit
                const userInfo = getCurrentUserForAudit();

                const updateData = {
                    // ✅ Backwards Compatibility: Nur Primary Service updatet status/prozessStatus
                    ...(serviceTyp === fahrzeugData.serviceTyp && {
                        status: mappedStatus,
                        prozessStatus: newStatus
                    }),

                    // 🆕 MULTI-SERVICE: Update spezifischen Service-Status
                    [`serviceStatuses.${serviceTyp}.status`]: mappedStatus,
                    [`serviceStatuses.${serviceTyp}.prozessStatus`]: newStatus,
                    [`serviceStatuses.${serviceTyp}.timestamp`]: timestamp,
                    // 🔧 FIX (2025-11-13): Add statusHistory for Partner-Portal Timeline
                    [`serviceStatuses.${serviceTyp}.statusHistory`]: firebase.firestore.FieldValue.arrayUnion({
                        status: mappedStatus,
                        prozessStatus: newStatus,
                        timestamp: timestamp,
                        user: userInfo.user,  // ✅ FIX: No longer hardcoded 'werkstatt-sync'!
                        userId: userInfo.userId,  // 🆕 NEW: User-ID für Audit-Trail
                        rolle: userInfo.rolle,  // 🆕 NEW: Rolle für Compliance
                        syncedBy: 'werkstatt',  // 🆕 NEW: Flag that this is a sync operation
                        note: `Von Werkstatt synchronisiert (${newStatus} → ${mappedStatus})`
                    }),

                    lastModified: timestamp
                };

                transaction.update(anfrageRef, updateData);
                console.log(`   🔄 Partner-Sync: ${serviceTyp} → ${newStatus} (anfrage: ${anfrageId})`);

            } catch (error) {
                console.error('❌ Partner-Sync fehlgeschlagen:', error);
                // NICHT werfen - Fahrzeug-Update soll erfolgreich sein
                // Partner-Sync wird beim nächsten Update automatisch korrigiert
            }
        }

        // 🛡️ FIX 2: VALIDATE serviceTyp - Prevent invalid service types from being saved (2025-11-14)
        // ⚠️ ROOT CAUSE: Partner-app had 'lackschutz' in validation, but werkstatt-app doesn't support it
        // → Partner-app could accidentally save vehicles with serviceTyp: "lackschutz"
        // → Werkstatt-app then preserves this invalid value (defense in depth)
        // FIX: Auto-correct invalid serviceTyp values before saving to Firestore
        function validateServiceTyp(serviceTyp) {
            // Valid service types in werkstatt-app
            const validTypes = [
                'lackier',        // Lackierung
                'reifen',         // Reifen/Felgen
                'mechanik',       // Mechanische Arbeiten
                'pflege',         // Aufbereitung/Pflege
                'tuev',           // TÜV/HU
                'versicherung',   // Versicherungsschaden
                'glas',           // Glasreparatur
                'klima',          // Klimaanlagen-Service
                'dellen',         // Dellenentfernung/PDR
                'folierung',      // Folierung
                'steinschutz',    // Steinschutzfolie
                'werbebeklebung'  // Werbebeklebung
            ];

            // Auto-fix mapping for common mistakes & legacy values
            const serviceTypMap = {
                'lackschutz': 'steinschutz',   // ⚡ CRITICAL: lackschutz is INVALID → Auto-correct to steinschutz
                'lackierung': 'lackier',       // Legacy name
                'smart-repair': 'dellen',      // Alias
                'smartrepair': 'dellen',       // Alias
                'pdr': 'dellen',               // Alias
                'aufbereitung': 'pflege',      // Alias
                'tüv': 'tuev',                 // Umlaut variant
                'tauv': 'tuev',                // Typo variant
                'karosserie': 'lackier',       // Category → Service mapping
                'unfall': 'versicherung'       // Category → Service mapping
            };

            // Apply auto-fix if mapping exists
            let correctedTyp = serviceTypMap[serviceTyp] || serviceTyp;

            // Validate corrected type
            if (!validTypes.includes(correctedTyp)) {
                console.error(`❌ INVALID serviceTyp detected: "${serviceTyp}" → Fallback: "lackier"`, {
                    original: serviceTyp,
                    corrected: correctedTyp,
                    validTypes: validTypes
                });
                return 'lackier';  // Safe fallback (default service)
            }

            // Log if auto-correction was applied
            if (correctedTyp !== serviceTyp) {
                console.warn(`🔧 AUTO-FIX serviceTyp: "${serviceTyp}" → "${correctedTyp}"`);
            }

            return correctedTyp;
        }

        // Direktes Status-Update (ohne Foto)
        async function directStatusUpdate(fahrzeugId, newStatus) {
            try {
                const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
                if (!fahrzeug) return;

                // 🛡️ MULTI-SERVICE FIX (2025-11-14): READ-ONLY serviceTyp safeguard
                // CRITICAL: Store original serviceTyp to prevent overwriting by any code in this function
                // WHY: Bug at Line 3935 was overwriting serviceTyp → Multi-Service data loss
                const ORIGINAL_SERVICE_TYP = fahrzeug.serviceTyp;

                // 🆕 MULTI-SERVICE (2025-11-13): Ermittle aktuellen Service
                let currentService = getCurrentService();

                // 🛡️ PHASE 5: FIX "Alle Prozesse" Tab Edge Case (2025-11-14)
                // ⚠️ BUG: getCurrentService() returns null in "Alle Prozesse" tab → Update fails silently
                // FIX: Fallback to primary service (fahrzeug.serviceTyp) when no specific service selected
                if (!currentService) {
                    console.warn('⚠️ getCurrentService() returned null (likely "Alle Prozesse" tab)');
                    console.warn('   → Fallback: Using primary service (fahrzeug.serviceTyp)');
                    currentService = fahrzeug.serviceTyp;

                    if (!currentService) {
                        console.error('❌ CRITICAL: Both getCurrentService() AND fahrzeug.serviceTyp are null/undefined!');
                        console.error('   → Cannot determine which service to update - Aborting');
                        showToast('Fehler: Kein Service verfügbar!', 'error');
                        return;
                    }

                    console.log(`   ✅ Fallback successful: Using "${currentService}" as current service`);
                }

                // 🐛 PHASE 4: DEBUG LOGGING - Comprehensive Pre-Update State (2025-11-14)
                // ⚠️ CRITICAL: Helps diagnose Multi-Service bugs (vehicles disappearing, data loss)
                console.group('🔧 directStatusUpdate - BEFORE UPDATE');
                console.log('📋 Basic Info:');
                console.log('  Kennzeichen:', fahrzeug.kennzeichen);
                console.log('  Fahrzeug ID:', fahrzeug.id);
                console.log('  Current Service:', currentService);
                console.log('  New Status:', newStatus);
                console.log('');
                console.log('🎯 Service Configuration:');
                console.log('  serviceTyp (Primary):', fahrzeug.serviceTyp);
                console.log('  additionalServices:', fahrzeug.additionalServices);
                console.log('    → Type:', typeof fahrzeug.additionalServices);
                console.log('    → isArray:', Array.isArray(fahrzeug.additionalServices));
                console.log('    → Length:', fahrzeug.additionalServices?.length || 0);
                if (Array.isArray(fahrzeug.additionalServices)) {
                    console.log('    → Services:', fahrzeug.additionalServices.map(s => s.serviceTyp).join(', '));
                }
                console.log('');
                console.log('📊 Service Statuses:');
                console.log('  serviceStatuses:', fahrzeug.serviceStatuses);
                if (fahrzeug.serviceStatuses) {
                    Object.entries(fahrzeug.serviceStatuses).forEach(([service, data]) => {
                        console.log(`    → ${service}:`, data.status);
                    });
                }
                console.log('');
                console.log('⚠️ Backwards Compatibility:');
                console.log('  prozessStatus:', fahrzeug.prozessStatus);
                console.log('  status:', fahrzeug.status);
                console.groupEnd();

                console.log(`🔧 Service-Status Update: ${currentService} → ${newStatus}`);

                // Status aktualisieren (Backwards Compatibility)
                // Nur Primary Service: Update prozessStatus
                if (currentService === fahrzeug.serviceTyp) {
                    fahrzeug.prozessStatus = newStatus;
                }

                // Timestamp für Prozessübergang speichern
                const timestamp = Date.now();
                if (!fahrzeug.prozessTimestamps) {
                    fahrzeug.prozessTimestamps = {};
                }
                fahrzeug.prozessTimestamps[newStatus] = timestamp;

                // statusHistory erweitern (ohne Foto)
                // 🆕 FIX Bug #6 (2025-11-27): Add User-Info to statusHistory for audit
                if (!fahrzeug.statusHistory) {
                    fahrzeug.statusHistory = [];
                }

                // Get user info for statusHistory audit
                let statusHistoryEntry = {
                    status: newStatus,
                    timestamp: timestamp,
                    foto: null,
                    notiz: null
                };

                // 🆕 FIX Bug #6: Add user info if available
                const mitarbeiterStrForHistory = sessionStorage.getItem('mitarbeiter');
                if (mitarbeiterStrForHistory) {
                    try {
                        const mitarbeiterForHistory = JSON.parse(mitarbeiterStrForHistory);
                        statusHistoryEntry.user = mitarbeiterForHistory.name || 'Unbekannt';
                        statusHistoryEntry.userId = mitarbeiterForHistory.id || null;
                        statusHistoryEntry.rolle = mitarbeiterForHistory.rolle || 'Werkstatt';
                    } catch (e) {
                        console.warn('⚠️ Mitarbeiter-Info für statusHistory nicht verfügbar');
                    }
                }

                fahrzeug.statusHistory.push(statusHistoryEntry);

                // 🆕 Phase 1.3: Bearbeitungs-History (Audit-Trail)
                // Trackt welcher Mitarbeiter den Status geändert hat
                if (!fahrzeug.bearbeitungsHistory) {
                    fahrzeug.bearbeitungsHistory = [];
                }

                // Hole Mitarbeiter aus sessionStorage
                const mitarbeiterStr = sessionStorage.getItem('mitarbeiter');
                if (mitarbeiterStr) {
                    try {
                        const mitarbeiter = JSON.parse(mitarbeiterStr);
                        const currentServices = JSON.parse(sessionStorage.getItem('currentServices') || '[]');

                        fahrzeug.bearbeitungsHistory.push({
                            mitarbeiterId: mitarbeiter.id,
                            mitarbeiterName: mitarbeiter.name,
                            rolle: mitarbeiter.rolle || 'Sonstige',
                            services: currentServices,  // Die Services, für die der Mitarbeiter eingeloggt ist
                            aktion: 'Status geändert',
                            alterStatus: fahrzeug.prozessStatus || 'neu',
                            neuerStatus: newStatus,
                            timestamp: timestamp,
                            userAgent: navigator.userAgent.substring(0, 200)
                        });

                        console.log('✅ Bearbeitungs-History erweitert:', {
                            mitarbeiter: mitarbeiter.name,
                            status: `${fahrzeug.prozessStatus} → ${newStatus}`,
                            services: currentServices
                        });
                    } catch (e) {
                        console.error('❌ Fehler beim Parsen von Mitarbeiter-Daten:', e);
                    }
                }

                // Last Modified aktualisieren
                fahrzeug.lastModified = timestamp;

                // 🔧 FIX BUG #1: status UND prozessStatus synchron halten
                // Mapping prozessStatus → status für Liste-Kompatibilität
                const mappedStatus = mapProzessToStatus(newStatus);

                // Backwards Compatibility: Nur Primary Service updatet fahrzeug.status
                if (currentService === fahrzeug.serviceTyp) {
                    fahrzeug.status = mappedStatus;
                }

                // 🆕 MULTI-SERVICE (2025-11-13): Update serviceStatuses Object
                if (!fahrzeug.serviceStatuses) {
                    fahrzeug.serviceStatuses = {};
                }
                if (!fahrzeug.serviceStatuses[currentService]) {
                    fahrzeug.serviceStatuses[currentService] = {
                        status: 'neu',
                        timestamp: timestamp,
                        statusHistory: []
                    };
                }

                // Update Status für aktuellen Service
                fahrzeug.serviceStatuses[currentService].status = newStatus;
                fahrzeug.serviceStatuses[currentService].timestamp = timestamp;

                // 🔧 BUG #8 FIX (2025-11-20): Replace window.currentUser with getCurrentUserForAudit()
                const userInfo = getCurrentUserForAudit();
                fahrzeug.serviceStatuses[currentService].statusHistory.push({
                    status: newStatus,
                    timestamp: timestamp,
                    user: userInfo.user,  // ✅ FIX: No longer always 'system'!
                    userId: userInfo.userId,  // 🆕 NEW: User-ID für Audit-Trail
                    rolle: userInfo.rolle,  // 🆕 NEW: Rolle für Compliance
                    foto: null,
                    notiz: null
                });

                // 🛡️ PHASE 1: DEFENSIVE VALIDATION - Ensure additionalServices is Array
                // ⚠️ CRITICAL BUG FIX (2025-11-14): Missing additionalServices in updateData caused vehicles to disappear
                // Root Cause: Firestore update() only modifies specified fields → if additionalServices corrupted, never restored
                if (!Array.isArray(fahrzeug.additionalServices)) {
                    console.error('❌ CRITICAL: additionalServices ist kein Array!', {
                        kennzeichen: fahrzeug.kennzeichen,
                        type: typeof fahrzeug.additionalServices,
                        value: fahrzeug.additionalServices
                    });

                    // DATA RESCUE: Convert Object → Array
                    if (fahrzeug.additionalServices && typeof fahrzeug.additionalServices === 'object') {
                        console.warn('🔧 DATA RESCUE: Converting Object → Array');
                        fahrzeug.additionalServices = Object.values(fahrzeug.additionalServices);
                    } else {
                        console.warn('🔧 DATA RESCUE: Initializing empty array');
                        fahrzeug.additionalServices = [];
                    }
                }

                // 🔧 BUG #8 FIX (2025-11-20): userInfo already declared at line 4778

                const updateData = {
                    // ✅ Backwards Compatibility: Nur Primary Service updatet prozessStatus
                    ...(currentService === fahrzeug.serviceTyp && {
                        prozessStatus: newStatus,
                        status: mappedStatus
                    }),

                    // 🆕 MULTI-SERVICE: Update spezifischen Service-Status
                    [`serviceStatuses.${currentService}.status`]: newStatus,
                    [`serviceStatuses.${currentService}.timestamp`]: timestamp,
                    [`serviceStatuses.${currentService}.statusHistory`]: firebase.firestore.FieldValue.arrayUnion({
                        status: newStatus,
                        timestamp: timestamp,
                        user: userInfo.user,  // ✅ FIX: No longer always 'system'!
                        userId: userInfo.userId,  // 🆕 NEW: User-ID für Audit-Trail
                        rolle: userInfo.rolle  // 🆕 NEW: Rolle für Compliance
                        // 🔧 PHASE 2 (2025-11-16): Don't set foto/notiz to null
                        // Photos are added separately via updateFahrzeugStatusWithPhoto()
                    }),

                    // ✅ Bestehende Fields
                    prozessTimestamps: fahrzeug.prozessTimestamps,
                    statusHistory: fahrzeug.statusHistory,
                    bearbeitungsHistory: fahrzeug.bearbeitungsHistory,  // 🆕 Phase 1.3: Audit-Trail
                    lastModified: timestamp,

                    // 🛡️ PHASE 1: CRITICAL FIX - Preserve Multi-Service Data (2025-11-14)
                    // WHY: Without these fields, Multi-Service vehicles lose service associations after drag & drop
                    // IMPACT: Vehicles disappear from filtered views (hasService check fails)
                    additionalServices: fahrzeug.additionalServices || [],     // ⚡ CRITICAL: Preserve additional services
                    serviceTyp: validateServiceTyp(ORIGINAL_SERVICE_TYP),      // 🛡️ FIX 3.2: Use READ-ONLY original value (prevents overwrite)
                    kennzeichen: fahrzeug.kennzeichen                          // 🛡️ Defense in depth: Preserve vehicle ID
                };

                // 🛡️ FIX 3.2: Detect if serviceTyp was corrupted during function execution
                if (fahrzeug.serviceTyp !== ORIGINAL_SERVICE_TYP) {
                    console.error('❌ CRITICAL: serviceTyp was modified during directStatusUpdate()!');
                    console.error(`   Original: "${ORIGINAL_SERVICE_TYP}"`);
                    console.error(`   Modified to: "${fahrzeug.serviceTyp}"`);
                    console.error('   → Restoring original value (READ-ONLY enforcement)');

                    // Restore original value in local object
                    fahrzeug.serviceTyp = ORIGINAL_SERVICE_TYP;
                }

                // 🐛 PHASE 4: DEBUG LOGGING - Firestore Update Payload (2025-11-14)
                console.group('🔥 Firestore Update Payload');
                console.log('updateData:', updateData);
                console.log('');
                console.log('🎯 Critical Multi-Service Fields:');
                console.log('  additionalServices:', updateData.additionalServices);
                console.log('    → Type:', typeof updateData.additionalServices);
                console.log('    → isArray:', Array.isArray(updateData.additionalServices));
                console.log('    → Length:', updateData.additionalServices?.length || 0);
                console.log('  serviceTyp:', updateData.serviceTyp);
                console.log('  kennzeichen:', updateData.kennzeichen);
                console.log('');
                console.log('📊 Service Status Update:');
                console.log(`  serviceStatuses.${currentService}.status:`, updateData[`serviceStatuses.${currentService}.status`]);
                console.log(`  serviceStatuses.${currentService}.timestamp:`, updateData[`serviceStatuses.${currentService}.timestamp`]);
                if (currentService === fahrzeug.serviceTyp) {
                    console.log('  ✅ Primary Service → Also updating prozessStatus:', updateData.prozessStatus);
                    console.log('  ✅ Primary Service → Also updating status:', updateData.status);
                } else {
                    console.log('  ℹ️ Additional Service → NOT updating prozessStatus (only serviceStatuses)');
                }
                console.groupEnd();

                // 🆕 2025-11-11: AUTOMATISCHE RECHNUNGS-ERSTELLUNG bei Status "Fertig"
                // ✅ CRITICAL FIX (2025-11-13): Nur wenn ALLE Services fertig sind (Multi-Service Support)
                // 🔒 RACE CONDITION FIX (2025-11-13): Check INNERHALB Transaction, Invoice NACH Transaction
                //
                // Problem (alt): Invoice Check AUSSERHALB Transaction → Race Condition bei Multi-User
                // Lösung (neu): Check INNERHALB Transaction → Atomic, nur EIN User erstellt Invoice
                //
                // Architektur:
                // 1. Transaction: Status Update + Invoice Check (atomic)
                // 2. Nach Transaction: Invoice erstellen (wenn Flag gesetzt)
                // 3. Zweites Update: Invoice ins Document schreiben
                //
                // Warum nicht Invoice IN Transaction?
                // → autoCreateRechnung() macht eigene Transaction für Counter
                // → Nested Transactions nicht erlaubt in Firestore
                let shouldCreateInvoice = false;
                let invoiceVehicleData = null;

                // In Firebase/LocalStorage speichern
                if (firebaseInitialized && firebaseApp) {
                    // ✅ IMPROVEMENT #1: Nutze Transaction statt simples update (verhindert Race Conditions)
                    const db = firebase.firestore();
                    const fahrzeugRef = window.getCollection('fahrzeuge').doc(String(fahrzeugId));

                    await db.runTransaction(async (transaction) => {
                        // 🔧 FIX (2025-11-27): ALL READS BEFORE ALL WRITES
                        // Firestore transactions require reads to complete before writes

                        // READ 1: Fahrzeug-Dokument
                        const doc = await transaction.get(fahrzeugRef);

                        if (!doc.exists) {
                            throw new Error(`Fahrzeug ${fahrzeugId} nicht gefunden!`);
                        }

                        const fahrzeugData = doc.data();

                        // READ 2: Partner-Anfrage (falls vorhanden) - MUSS VOR allen WRITES passieren!
                        const partnerAnfrageId = fahrzeugData.partnerAnfrageId || fahrzeugData.anfrageId || fahrzeugData.fahrzeugAnfrageId;
                        let anfrageDoc = null;
                        let anfrageRef = null;
                        if (partnerAnfrageId) {
                            anfrageRef = window.getCollection('partnerAnfragen').doc(partnerAnfrageId);
                            anfrageDoc = await transaction.get(anfrageRef);
                            console.log(`   📖 Partner-Anfrage READ (vor Writes): ${partnerAnfrageId}, exists: ${anfrageDoc.exists}`);
                        }

                        // 🔒 RACE CONDITION FIX: Invoice Check INNERHALB Transaction (atomic)
                        if (newStatus === 'fertig' && !fahrzeugData.rechnung) {
                            // 🛡️ PHASE 6: FIX Multi-Service Invoice Timing (2025-11-14)
                            // ⚠️ BUG: allServicesComplete() checks OLD data (before update) → Incorrect invoice timing
                            // FIX: Merge old data + new updateData → Check FUTURE state (after update will be applied)
                            //
                            // Example scenario:
                            // - Vehicle has Lackierung (status: fertig) + Steinschutz (status: in_arbeit)
                            // - User moves Steinschutz → "fertig"
                            // - OLD check: fahrzeugData still shows Steinschutz = "in_arbeit" → allComplete = FALSE ❌
                            // - NEW check: mergedData shows Steinschutz = "fertig" → allComplete = TRUE ✅
                            const mergedData = {
                                ...fahrzeugData,
                                // Apply current update (simulate post-transaction state)
                                serviceStatuses: {
                                    ...fahrzeugData.serviceStatuses,
                                    [currentService]: {
                                        ...fahrzeugData.serviceStatuses?.[currentService],
                                        status: newStatus,  // ← Apply NEW status!
                                        timestamp: timestamp
                                    }
                                },
                                // Update backwards compatibility fields if primary service
                                ...(currentService === fahrzeugData.serviceTyp && {
                                    prozessStatus: newStatus,
                                    status: updateData.status  // mappedStatus
                                })
                            };

                            if (window.DEBUG) console.log('🔍 [INVOICE CHECK] Checking if all services complete...');
                            console.log(`   → Current Service: ${currentService} → ${newStatus}`);
                            const allComplete = allServicesComplete(mergedData, currentService);

                            if (allComplete) {
                                console.log('🧾 [TRANSACTION] Status → Fertig UND alle Services fertig');
                                console.log('   → Flag gesetzt: Invoice wird NACH Transaction erstellt');
                                shouldCreateInvoice = true;
                                invoiceVehicleData = mergedData;  // Use merged data for invoice
                            } else {
                                console.log('⏳ [TRANSACTION] Status → Fertig für einen Service, aber NICHT alle fertig');
                                console.log('   → Rechnung wird erstellt sobald ALLE Services fertig sind');
                            }
                        }

                        // Atomic Update
                        transaction.update(fahrzeugRef, updateData);
                        console.log('   🔒 Transaction: Status + Timestamps atomic update');

                        // 🆕 MULTI-SERVICE (2025-11-13): Sync zu partnerAnfragen wenn Anfrage verknüpft ist
                        // 🔧 FIX (2025-11-27): Use pre-fetched anfrageDoc (READ already done above!)
                        // OLD: syncServiceStatusToPartner() did transaction.get() AFTER transaction.update() → ERROR
                        // NEW: All reads done before any writes (Firestore requirement)
                        if (partnerAnfrageId && anfrageDoc && anfrageDoc.exists) {
                            try {
                                // Mapping: Werkstatt-Status → Partner-Kanban-Status
                                const mappedStatus = mapProzessToStatus(newStatus);

                                // Get user info for Partner-Sync audit
                                const userInfo = getCurrentUserForAudit();

                                const partnerUpdateData = {
                                    // ✅ Backwards Compatibility: Nur Primary Service updatet status/prozessStatus
                                    ...(currentService === fahrzeugData.serviceTyp && {
                                        status: mappedStatus,
                                        prozessStatus: newStatus
                                    }),

                                    // 🆕 MULTI-SERVICE: Update spezifischen Service-Status
                                    [`serviceStatuses.${currentService}.status`]: mappedStatus,
                                    [`serviceStatuses.${currentService}.prozessStatus`]: newStatus,
                                    [`serviceStatuses.${currentService}.timestamp`]: timestamp,
                                    [`serviceStatuses.${currentService}.statusHistory`]: firebase.firestore.FieldValue.arrayUnion({
                                        status: mappedStatus,
                                        prozessStatus: newStatus,
                                        timestamp: timestamp,
                                        user: userInfo.user,
                                        userId: userInfo.userId,
                                        rolle: userInfo.rolle,
                                        syncedBy: 'werkstatt',
                                        note: `Von Werkstatt synchronisiert (${newStatus} → ${mappedStatus})`
                                    }),

                                    lastModified: timestamp
                                };

                                transaction.update(anfrageRef, partnerUpdateData);
                                console.log(`   🔄 Partner-Sync: ${currentService} → ${newStatus} (anfrage: ${partnerAnfrageId})`);
                            } catch (syncError) {
                                console.error('❌ Partner-Sync fehlgeschlagen:', syncError);
                                // NICHT werfen - Fahrzeug-Update soll erfolgreich sein
                            }
                        } else if (partnerAnfrageId) {
                            console.warn(`⚠️ Partner-Anfrage nicht gefunden - Sync übersprungen: ${partnerAnfrageId}`);
                        }
                    });

                    console.log('✅ Status + Timestamps in Firebase aktualisiert (via Transaction)');

                    // 🐛 PHASE 4: DEBUG LOGGING - Post-Transaction Verification (2025-11-14)
                    console.group('✅ directStatusUpdate - AFTER TRANSACTION');
                    console.log('Transaction committed successfully');
                    console.log('');
                    if (window.DEBUG) console.log('🔍 Verifying Firestore State...');
                    try {
                        const verificationDoc = await fahrzeugRef.get();
                        if (verificationDoc.exists) {
                            const updatedData = verificationDoc.data();
                            console.log('');
                            console.log('🎯 Multi-Service Fields in Firestore:');
                            console.log('  additionalServices:', updatedData.additionalServices);
                            console.log('    → Type:', typeof updatedData.additionalServices);
                            console.log('    → isArray:', Array.isArray(updatedData.additionalServices));
                            console.log('    → Length:', updatedData.additionalServices?.length || 0);
                            if (Array.isArray(updatedData.additionalServices)) {
                                console.log('    → Services:', updatedData.additionalServices.map(s => s.serviceTyp).join(', '));
                            }
                            console.log('  serviceTyp:', updatedData.serviceTyp);
                            console.log('  kennzeichen:', updatedData.kennzeichen);
                            console.log('');
                            console.log('📊 Service Statuses in Firestore:');
                            if (updatedData.serviceStatuses) {
                                Object.entries(updatedData.serviceStatuses).forEach(([service, data]) => {
                                    console.log(`    → ${service}:`, data.status);
                                });
                            }
                            console.log('');
                            console.log('⚠️ Backwards Compatibility Fields:');
                            console.log('  prozessStatus:', updatedData.prozessStatus);
                            console.log('  status:', updatedData.status);
                        } else {
                            console.error('❌ CRITICAL: Vehicle document not found after transaction!');
                        }
                    } catch (verifyError) {
                        console.error('❌ Verification read failed:', verifyError);
                    }
                    console.groupEnd();

                    // 🔒 NACH Transaction: Invoice erstellen (verhindert Nested Transaction Problem)
                    if (shouldCreateInvoice) {
                        console.log('🧾 Transaction committed - starte Invoice Creation...');
                        try {
                            const result = await autoCreateRechnung(fahrzeugId, invoiceVehicleData);
                            if (result && result.rechnung) {
                                // 🛡️ PERFORMANCE FIX: Parallelize both updates (independent operations)
                                const parallelUpdates = [
                                    // Update 1: Save invoice reference to fahrzeug
                                    fahrzeugRef.update({
                                        rechnung: result.rechnung,
                                        lastModified: firebase.firestore.FieldValue.serverTimestamp()
                                    })
                                ];

                                // Update 2: Delete pending rabatt (conditional, independent)
                                if (result.rabattInfo?.pendingBonusId && result.rabattInfo?.partnerId) {
                                    parallelUpdates.push(
                                        window.getCollection('partners').doc(result.rabattInfo.partnerId).update({
                                            'rabattKonditionen.pendingRabatt': firebase.firestore.FieldValue.delete()
                                        }).then(() => {
                                            console.log('✅ pendingRabatt gelöscht für Partner:', result.rabattInfo.partnerId);
                                        }).catch(deleteError => {
                                            console.warn('⚠️ pendingRabatt konnte nicht gelöscht werden:', deleteError);
                                        })
                                    );
                                }

                                // Execute both updates in parallel
                                await Promise.all(parallelUpdates);
                                console.log('✅ Rechnung automatisch erstellt:', result.rechnung.rechnungsnummer);
                                console.log('✅ Rechnung + pendingRabatt parallel aktualisiert');
                            }
                        } catch (error) {
                            // Fehler loggen, aber Status-Update ist bereits committed
                            console.error('❌ Fehler bei automatischer Rechnungserstellung (Status bereits gespeichert):', error);
                            console.error('   → Rechnung kann später manuell erstellt werden');
                            // Status-Update ist NICHT beeinträchtigt (bereits committed)
                        }
                    }
                } else {
                    // LocalStorage: Alle Fahrzeuge aktualisieren
                    let allStoredFahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');
                    const index = allStoredFahrzeuge.findIndex(f => window.compareIds(f.id, fahrzeugId));
                    if (index !== -1) {
                        Object.assign(allStoredFahrzeuge[index], updateData);
                        localStorage.setItem('fahrzeuge', JSON.stringify(allStoredFahrzeuge));
                    }
                    console.log('✅ Status + Timestamps in LocalStorage aktualisiert');
                }

                // Board neu rendern
                renderKanbanBoard();
                setupDragAndDrop();
            } catch (error) {
                console.error('❌ Fehler beim direkten Update:', error);
                throw error;
            }
        }

        /* ========================================
           PHOTO UPLOAD MODAL FUNCTIONS
           ======================================== */

        let currentPhotoData = {
            fahrzeugId: null,
            newStatus: null,
            photoFile: null,
            photoDataURL: null
        };

        // Foto-Auswahl Handler
        function handlePhotoSelect(event) {
            const file = event.target.files[0];
            if (!file) return;

            currentPhotoData.photoFile = file;

            // Vorschau anzeigen
            const reader = new FileReader();
            reader.onload = (e) => {
                currentPhotoData.photoDataURL = e.target.result;
                document.getElementById('photoPreview').innerHTML = `
                    <img src="${e.target.result}" alt="Foto-Vorschau" loading="lazy" decoding="async">
                `;
                document.getElementById('uploadPhotoBtn').disabled = false;
            };
            reader.readAsDataURL(file);
        }

        // Modal anzeigen (with defensive checks - Pattern 58 FIX)
        async function showPhotoModal(fahrzeugId, newStatus) {
            const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
            if (!fahrzeug) {
                console.error('❌ showPhotoModal: Fahrzeug nicht gefunden:', fahrzeugId);
                return;
            }

            // 🛡️ Pattern 58 FIX: Verify modal exists before using
            const modal = document.getElementById('photoModal');
            if (!modal) {
                console.error('❌ showPhotoModal: Modal #photoModal nicht im DOM gefunden!');
                window.toast?.error('Fehler: Foto-Dialog konnte nicht geöffnet werden. Bitte Seite neu laden.');
                return;
            }

            // Daten speichern
            currentPhotoData.fahrzeugId = fahrzeugId;
            currentPhotoData.newStatus = newStatus;
            currentPhotoData.photoFile = null;
            currentPhotoData.photoDataURL = null;

            // Modal-Inhalte aktualisieren (with null checks)
            const modalKennzeichen = document.getElementById('modalKennzeichen');
            const modalNeuerStatus = document.getElementById('modalNeuerStatus');
            const photoPreview = document.getElementById('photoPreview');
            const photoNotiz = document.getElementById('photoNotiz');
            const uploadPhotoBtn = document.getElementById('uploadPhotoBtn');
            const photoInputFile = document.getElementById('photoInputFile');

            if (modalKennzeichen) modalKennzeichen.textContent = fahrzeug.kennzeichen;
            if (modalNeuerStatus) modalNeuerStatus.textContent = getStatusLabel(newStatus);
            if (photoPreview) photoPreview.innerHTML = '';
            if (photoNotiz) photoNotiz.value = '';
            if (uploadPhotoBtn) uploadPhotoBtn.disabled = true;
            if (photoInputFile) photoInputFile.value = '';

            // Modal anzeigen
            modal.classList.add('active');
        }

        // Modal schließen (with defensive check - Pattern 58 FIX)
        function closePhotoModal() {
            const modal = document.getElementById('photoModal');
            if (modal) modal.classList.remove('active');
            currentPhotoData = { fahrzeugId: null, newStatus: null, photoFile: null, photoDataURL: null };
        }

        // SKIP Photo Upload - Ohne Foto fortfahren
        async function skipPhotoUpload() {
            if (!currentPhotoData.fahrzeugId || !currentPhotoData.newStatus) {
                console.error('Keine Fahrzeug-Daten vorhanden');
                return;
            }

            const { fahrzeugId, newStatus } = currentPhotoData;
            console.log('⏭️ Ohne Foto fortfahren:', fahrzeugId, newStatus);

            // Modal schließen
            closePhotoModal();

            // Direkt Status aktualisieren (ohne Foto)
            await directStatusUpdate(fahrzeugId, newStatus);
        }

        // Foto hochladen
        async function uploadPhoto() {
            if (!currentPhotoData.photoFile || !currentPhotoData.fahrzeugId) {
                showToast('Bitte wählen Sie zuerst ein Foto aus!', 'error');
                return;
            }

            try {
                // Loading anzeigen
                document.getElementById('photoLoading').classList.add('active');
                document.getElementById('uploadPhotoBtn').disabled = true;

                const { fahrzeugId, newStatus, photoFile } = currentPhotoData;
                const notiz = document.getElementById('photoNotiz').value;

                // 🆕 FIX #2: Validate File BEFORE Upload (Security)
                try {
                    window.validateImageFile(photoFile);
                } catch (validationError) {
                    console.error('❌ [uploadPhoto] Validation failed:', validationError.message);
                    showToast(validationError.message, 'error');
                    document.getElementById('photoLoading').classList.remove('active');
                    document.getElementById('uploadPhotoBtn').disabled = false;
                    return;
                }

                // 🔧 NEUE LÖSUNG: Komprimiertes Foto in Firestore + Vollauflösung in Storage
                // Grund: CORS-Probleme verhinderten Laden von Storage in PDF
                // Lösung: Speichere komprimierte DataURL (~50-150 KB) direkt in Firestore

                // Schritt 1: Konvertiere File zu Base64 DataURL
                console.log('📸 [uploadPhoto] Konvertiere Foto zu Base64...');
                const originalDataURL = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target.result);
                    reader.onerror = (e) => reject(new Error('FileReader Fehler'));
                    reader.readAsDataURL(photoFile);
                });
                console.log('✅ [uploadPhoto] Original DataURL erstellt:', {
                    length: originalDataURL.length,
                    sizeMB: (originalDataURL.length / 1024 / 1024).toFixed(2)
                });

                // Schritt 2: Komprimiere Foto für Firestore (800x600 @ 60% = ~50-150 KB)
                console.log('🗜️ [uploadPhoto] Komprimiere Foto für Firestore...');
                const compressed = await window.ImageOptimizer.compressImage(
                    originalDataURL,
                    'prozessFoto'  // 800x600 @ 60% Qualität
                );
                console.log('✅ [uploadPhoto] Foto komprimiert:', {
                    originalMB: (compressed.originalSize / 1024 / 1024).toFixed(2),
                    compressedMB: (compressed.compressedSize / 1024 / 1024).toFixed(2),
                    savings: compressed.savings + '%',
                    dimensions: compressed.dimensions
                });

                // Schritt 3: Vollauflösung in Firebase Storage speichern (Backup)
                if (firebaseInitialized && firebaseApp) {
                    const storage = firebaseApp.storage();
                    if (storage) {
                        const storageRef = storage.ref(`progress-photos/${fahrzeugId}/${newStatus}_${Date.now()}.jpg`);
                        await storageRef.put(photoFile);
                        const firebaseURL = await storageRef.getDownloadURL();
                        console.log('✅ [uploadPhoto] Vollauflösung in Firebase Storage gespeichert:', firebaseURL);
                    } else {
                        console.warn('⚠️ Firebase Storage nicht verfügbar - nur komprimierte Version wird gespeichert');
                    }
                } else {
                    console.warn('⚠️ Firebase nicht initialisiert - nur komprimierte Version wird gespeichert');
                }

                // Schritt 4: Fahrzeug-Status mit komprimiertem Foto aktualisieren
                await updateFahrzeugStatusWithPhoto(fahrzeugId, newStatus, compressed.compressed, notiz);

                // Modal schließen
                closePhotoModal();
                document.getElementById('photoLoading').classList.remove('active');
                showToast('Foto erfolgreich hochgeladen!', 'success');

            } catch (error) {
                console.error('❌ Fehler beim Hochladen:', error);
                showToast('Fehler beim Hochladen des Fotos: ' + error.message, 'error');
                document.getElementById('photoLoading').classList.remove('active');
                document.getElementById('uploadPhotoBtn').disabled = false;
            }
        }

        // Fahrzeug-Status mit Foto aktualisieren
        async function updateFahrzeugStatusWithPhoto(fahrzeugId, newStatus, photoURL, notiz) {
            try {
                const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
                if (!fahrzeug) return;

                // Status aktualisieren
                fahrzeug.prozessStatus = newStatus;

                // Timestamp
                const timestamp = Date.now();
                if (!fahrzeug.prozessTimestamps) {
                    fahrzeug.prozessTimestamps = {};
                }
                fahrzeug.prozessTimestamps[newStatus] = timestamp;

                // statusHistory erweitern (NEU!)
                if (!fahrzeug.statusHistory) {
                    fahrzeug.statusHistory = [];
                }
                fahrzeug.statusHistory.push({
                    status: newStatus,
                    timestamp: timestamp,
                    foto: photoURL,  // 🔧 NEUE LÖSUNG: Komprimierte DataURL (~50-150 KB) direkt in Firestore
                    notiz: notiz || null
                });

                // 🆕 Phase 1.3: Bearbeitungs-History (Audit-Trail) - MIT Foto
                // Trackt welcher Mitarbeiter den Status geändert hat
                if (!fahrzeug.bearbeitungsHistory) {
                    fahrzeug.bearbeitungsHistory = [];
                }

                // Hole Mitarbeiter aus sessionStorage
                const mitarbeiterStr = sessionStorage.getItem('mitarbeiter');
                if (mitarbeiterStr) {
                    try {
                        const mitarbeiter = JSON.parse(mitarbeiterStr);
                        const currentServices = JSON.parse(sessionStorage.getItem('currentServices') || '[]');

                        fahrzeug.bearbeitungsHistory.push({
                            mitarbeiterId: mitarbeiter.id,
                            mitarbeiterName: mitarbeiter.name,
                            rolle: mitarbeiter.rolle || 'Sonstige',
                            services: currentServices,
                            aktion: 'Status geändert (mit Foto)',
                            alterStatus: fahrzeug.prozessStatus || 'neu',
                            neuerStatus: newStatus,
                            timestamp: timestamp,
                            hatFoto: true,  // Flag: Dieses Update hatte ein Foto
                            userAgent: navigator.userAgent.substring(0, 200)
                        });

                        console.log('✅ Bearbeitungs-History erweitert (mit Foto):', {
                            mitarbeiter: mitarbeiter.name,
                            status: `${fahrzeug.prozessStatus} → ${newStatus}`,
                            services: currentServices,
                            foto: true
                        });
                    } catch (e) {
                        console.error('❌ Fehler beim Parsen von Mitarbeiter-Daten:', e);
                    }
                }

                // Last Modified
                fahrzeug.lastModified = timestamp;

                // 🔧 FIX BUG #1: status UND prozessStatus synchron halten
                const mappedStatus = mapProzessToStatus(newStatus);
                fahrzeug.status = mappedStatus;

                // 🔧 BUG FIX (2025-11-27): Add photo ONLY to CURRENT service, not ALL services
                // WHY: Partner should only see photo in the service where it was added
                // OLD BUG: Added photo to ALL services → partner saw photo in ALL timelines
                // NEW: Add photo ONLY to currentProcess (active tab service)
                if (fahrzeug.serviceStatuses && typeof fahrzeug.serviceStatuses === 'object') {
                    const userInfo = getCurrentUserForAudit();

                    // Bestimme den AKTUELLEN Service (nicht alle!)
                    // currentProcess = aktiver Tab, 'alle' = kein spezifischer Service
                    const targetService = (currentProcess && currentProcess !== 'alle')
                        ? currentProcess
                        : fahrzeug.serviceTyp;  // Fallback auf primären Service

                    // Foto NUR zum aktuellen Service hinzufügen
                    if (targetService && fahrzeug.serviceStatuses[targetService] && fahrzeug.serviceStatuses[targetService].statusHistory) {
                        // 🔧 BUGFIX 2025-11-27: Status-Feld aktualisieren (FEHLTE!)
                        // Ohne diese Zeilen bleibt das Fahrzeug in der alten Kanban-Spalte
                        fahrzeug.serviceStatuses[targetService].status = newStatus;
                        fahrzeug.serviceStatuses[targetService].timestamp = timestamp;

                        fahrzeug.serviceStatuses[targetService].statusHistory.push({
                            status: newStatus,
                            timestamp: timestamp,
                            user: userInfo.user,
                            userId: userInfo.userId,
                            rolle: userInfo.rolle,
                            foto: photoURL,
                            notiz: notiz || null
                        });
                        console.log(`✅ Added photo to CURRENT service '${targetService}' statusHistory (not all services)`);
                    } else {
                        console.warn(`⚠️ Could not add photo: targetService='${targetService}' has no statusHistory`);
                    }
                }

                const updateData = {
                    prozessStatus: newStatus,
                    status: mappedStatus,  // ✅ CRITICAL FIX: Auch status aktualisieren!
                    prozessTimestamps: fahrzeug.prozessTimestamps,
                    statusHistory: fahrzeug.statusHistory,
                    bearbeitungsHistory: fahrzeug.bearbeitungsHistory,  // 🆕 Phase 1.3: Audit-Trail
                    serviceStatuses: fahrzeug.serviceStatuses || {},  // 🆕 PHASE 2: Include updated serviceStatuses
                    lastModified: timestamp
                };

                // Speichern
                if (firebaseInitialized && firebaseApp) {
                    // ✅ IMPROVEMENT #1: Nutze Transaction statt simples update (verhindert Race Conditions)
                    const db = firebase.firestore();
                    const fahrzeugRef = window.getCollection('fahrzeuge').doc(String(fahrzeugId));

                    await db.runTransaction(async (transaction) => {
                        const doc = await transaction.get(fahrzeugRef);

                        if (!doc.exists) {
                            throw new Error(`Fahrzeug ${fahrzeugId} nicht gefunden!`);
                        }

                        // Atomic Update
                        transaction.update(fahrzeugRef, updateData);
                        console.log('   🔒 Transaction: Status + Foto atomic update');

                        // 🆕 BUGFIX 2025-11-06: Sync zu partnerAnfragen wenn Anfrage verknüpft ist (MIT Foto!)
                        const fahrzeugData = doc.data();
                        // ✅ FIX 2025-11-07: Check partnerAnfrageId FIRST (standardized field), then fallbacks
                        const partnerAnfrageId = fahrzeugData.partnerAnfrageId || fahrzeugData.anfrageId || fahrzeugData.fahrzeugAnfrageId;
                        if (partnerAnfrageId) {
                            const anfrageRef = window.getCollection('partnerAnfragen')
                                .doc(partnerAnfrageId);
                            transaction.update(anfrageRef, {
                                status: mappedStatus,
                                prozessStatus: newStatus,
                                lastModified: timestamp,
                                statusHistory: firebase.firestore.FieldValue.arrayUnion({
                                    status: mappedStatus,
                                    prozessStatus: newStatus,
                                    timestamp: new Date(timestamp).toISOString(),
                                    user: firebaseApp.auth.currentUser?.email || 'system',
                                    foto: photoURL,  // 🔧 NEU: Foto-URL mit syncen
                                    notiz: notiz || null  // 🔧 NEU: Notiz mit syncen
                                })
                            });
                            console.log('   🔄 Synced status + foto to partnerAnfragen:', partnerAnfrageId);
                        }
                    });

                    console.log('✅ Status + Foto in Firebase gespeichert (via Transaction)');
                } else {
                    let allStoredFahrzeuge = JSON.parse(localStorage.getItem('fahrzeuge') || '[]');
                    const index = allStoredFahrzeuge.findIndex(f => window.compareIds(f.id, fahrzeugId));
                    if (index !== -1) {
                        Object.assign(allStoredFahrzeuge[index], updateData);
                        localStorage.setItem('fahrzeuge', JSON.stringify(allStoredFahrzeuge));
                    }
                    console.log('✅ Status + Foto in LocalStorage gespeichert');
                }

                // Board neu rendern
                renderKanbanBoard();
                setupDragAndDrop();

            } catch (error) {
                console.error('❌ Fehler beim Speichern:', error);
                throw error;
            }
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // 🧾 RECHNUNGS-AUTOMATIK (2025-11-11)
        // ═══════════════════════════════════════════════════════════════════════════

        /**
         * Generiert eindeutige Rechnungsnummer mit Counter-basiertem Ansatz
         * Format: RE-YYYY-MM-NNNN (z.B. RE-2025-11-0042)
         *
         * Verwendet Firestore Transaction für Race Condition Safety:
         * - Liest Counter aus counters_{werkstattId}/rechnungsnummer
         * - Inkrementiert letzteNummer atomically
         * - Reset bei Monatswechsel (letzteNummer = 1)
         *
         * Vorteile gegenüber Query-basiert:
         * - 5-13x schneller (~150ms vs ~800-2000ms)
         * - Keine Composite Indexes nötig
         * - Garantiert eindeutig durch Firestore Transactions
         *
         * @param {number} retryCount - Anzahl bisheriger Retry-Versuche (intern)
         * @returns {Promise<string>} Formatierte Rechnungsnummer (z.B. "RE-2025-11-0042")
         * @throws {Error} Wenn Counter-Update nach 3 Retries fehlschlägt oder offline
         */
        async function generateUniqueRechnungsnummer(retryCount = 0) {
            if (!navigator.onLine) {
                throw new Error('Offline - Rechnungsnummer kann nicht generiert werden');
            }

            if (!firebaseInitialized || !firebaseApp) {
                throw new Error('Firebase nicht initialisiert');
            }

            try {
                const db = firebase.firestore();
                const counterRef = window.getCollection('counters').doc('rechnungsnummer');

                // Aktuelle Zeit
                const now = new Date();
                const currentYear = now.getFullYear();
                const currentMonth = now.getMonth() + 1; // 1-12

                // Transaction für atomisches Counter-Update
                const neueNummer = await db.runTransaction(async (transaction) => {
                    const counterDoc = await transaction.get(counterRef);

                    if (!counterDoc.exists) {
                        // Erstmalige Initialisierung
                        console.log('⚠️ Rechnungs-Counter nicht gefunden - erstelle neu');
                        transaction.set(counterRef, {
                            jahr: currentYear,
                            monat: currentMonth,
                            letzteNummer: 1,
                            updatedAt: firebase.firestore.Timestamp.now()
                        });
                        return 1;
                    }

                    const counterData = counterDoc.data();

                    // Monatswechsel? → Reset Counter
                    if (counterData.jahr !== currentYear || counterData.monat !== currentMonth) {
                        console.log(`📅 Neuer Monat erkannt (${counterData.monat}/${counterData.jahr} → ${currentMonth}/${currentYear}) - Reset Counter`);
                        transaction.update(counterRef, {
                            jahr: currentYear,
                            monat: currentMonth,
                            letzteNummer: 1,
                            updatedAt: firebase.firestore.Timestamp.now()
                        });
                        return 1;
                    }

                    // Gleicher Monat → Inkrementieren
                    const neueNummer = counterData.letzteNummer + 1;
                    transaction.update(counterRef, {
                        letzteNummer: neueNummer,
                        updatedAt: firebase.firestore.Timestamp.now()
                    });
                    return neueNummer;
                });

                // Formatiere Rechnungsnummer: RE-YYYY-MM-NNNN
                const rechnungsnummer = `RE-${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(neueNummer).padStart(4, '0')}`;
                console.log('✅ Rechnungsnummer generiert:', rechnungsnummer);
                return rechnungsnummer;

            } catch (error) {
                console.error('❌ Fehler bei Rechnungsnummer-Generierung:', error);

                // Retry mit Exponential Backoff (max 3 Versuche)
                if ((error.code === 'aborted' || error.message.includes('transaction')) && retryCount < 3) {
                    const backoffMs = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
                    console.log(`🔄 Retry ${retryCount + 1}/3 nach ${backoffMs}ms...`);
                    await new Promise(resolve => setTimeout(resolve, backoffMs));
                    return await generateUniqueRechnungsnummer(retryCount + 1);
                }

                throw error;
            }
        }

        /**
         * Lädt Partner-Rabatt aus partnerAnfragen Collection
         * 🆕 NEU (2025-11-28): Unterstützt jetzt auch pendingRabatt (Bonus-Verrechnung)
         *
         * @param {string} partnerAnfrageId - ID des Partner-Anfrage-Dokuments
         * @returns {Promise<Object>} { prozent, betrag, pendingBonusId, partnerId }
         */
        async function loadPartnerRabatt(partnerAnfrageId) {
            const defaultResult = { prozent: 0, betrag: 0, pendingBonusId: null, partnerId: null };

            if (!partnerAnfrageId) {
                console.log('ℹ️ Keine Partner-Anfrage verknüpft - kein Rabatt');
                return defaultResult;
            }

            try {
                const anfrageDoc = await window.getCollection('partnerAnfragen')
                    .doc(partnerAnfrageId)
                    .get();

                if (!anfrageDoc.exists) {
                    console.warn('⚠️ Partner-Anfrage nicht gefunden:', partnerAnfrageId);
                    return defaultResult;
                }

                const anfrageData = anfrageDoc.data();
                const partnerEmail = anfrageData.partnerEmail || anfrageData.email;

                if (!partnerEmail) {
                    console.warn('⚠️ Keine Partner-Email in Anfrage gefunden');
                    return defaultResult;
                }

                // Lade Partner-Dokument für Rabatt
                const partnersSnapshot = await window.getCollection('partners')
                    .where('email', '==', partnerEmail)
                    .limit(1)
                    .get();

                if (partnersSnapshot.empty) {
                    console.warn('⚠️ Partner nicht gefunden:', partnerEmail);
                    return defaultResult;
                }

                const partnerDoc = partnersSnapshot.docs[0];
                const partnerData = partnerDoc.data();
                const partnerId = partnerDoc.id;

                // 🆕 NEU: Check for pendingRabatt (einmaliger Bonus-Abzug) FIRST
                const pendingRabatt = partnerData.rabattKonditionen?.pendingRabatt;

                if (pendingRabatt) {
                    console.log('🎁 pendingRabatt gefunden:', pendingRabatt);

                    if (pendingRabatt.typ === 'prozent') {
                        return {
                            prozent: pendingRabatt.wert,
                            betrag: 0,
                            pendingBonusId: pendingRabatt.bonusId,
                            partnerId: partnerId
                        };
                    } else if (pendingRabatt.typ === 'betrag') {
                        return {
                            prozent: 0,
                            betrag: pendingRabatt.wert,
                            pendingBonusId: pendingRabatt.bonusId,
                            partnerId: partnerId
                        };
                    }
                }

                // Fallback: Dauerhafter allgemeinerRabatt
                const rabatt = partnerData.rabattKonditionen?.allgemeinerRabatt || 0;
                console.log('✅ Partner-Rabatt (dauerhaft):', rabatt + '%');

                return {
                    prozent: rabatt,
                    betrag: 0,
                    pendingBonusId: null,
                    partnerId: partnerId
                };

            } catch (error) {
                console.error('❌ Fehler beim Laden des Partner-Rabatts:', error);
                return defaultResult;
            }
        }

        /**
         * Erstellt automatisch eine Rechnung beim Status-Wechsel zu "Fertig"
         *
         * Workflow:
         * 1. Prüft ob Rechnung bereits existiert → Skip
         * 2. Prüft ob KVA vorhanden → Wenn nicht: Skip (manuell später möglich)
         * 3. Lädt Partner-Rabatt (falls Partner-Anfrage verknüpft)
         * 4. Berechnet Brutto/Netto/Rabatt
         * 5. Generiert eindeutige Rechnungsnummer
         * 6. Erstellt rechnung-Objekt
         *
         * @param {string} fahrzeugId - ID des Fahrzeugs
         * @param {Object} fahrzeugData - Fahrzeug-Daten aus Firestore
         * @returns {Promise<Object|null>} Rechnung-Objekt oder null wenn Skip
         */
        async function autoCreateRechnung(fahrzeugId, fahrzeugData) {
            console.log('🧾 [autoCreateRechnung] Starte für Fahrzeug:', fahrzeugId);

            // ✅ Prüfung 1: Rechnung existiert bereits?
            if (fahrzeugData.rechnung) {
                console.log('   ℹ️ Rechnung bereits vorhanden - überspringe');
                return null;
            }

            // ✅ Prüfung 2: KVA vorhanden?
            let bruttoPreis = 0;

            // KVA-Preis extrahieren (mit Fallback-Logik wie in renderKanbanBoard)
            if (fahrzeugData.kva?.varianten && fahrzeugData.kva.gewaehlteVariante) {
                const variante = fahrzeugData.kva.varianten[fahrzeugData.kva.gewaehlteVariante];
                bruttoPreis = parseFloat(variante?.gesamt) || 0;
            } else if (fahrzeugData.kva?.varianten?.original) {
                bruttoPreis = parseFloat(fahrzeugData.kva.varianten.original.gesamt) || 0;
            } else if (fahrzeugData.kva?.gesamt) {
                bruttoPreis = parseFloat(fahrzeugData.kva.gesamt) || 0;
            }

            if (bruttoPreis === 0 || !fahrzeugData.kva) {
                console.log('   ⚠️ Keine KVA vorhanden oder Preis = 0 - Rechnung muss manuell erstellt werden');
                return null; // Kein Fehler, einfach überspringen
            }

            console.log('   ✅ KVA gefunden - Bruttobetrag:', bruttoPreis.toFixed(2), '€');

            // ✅ Schritt 3: Partner-Rabatt laden (🆕 2025-11-28: jetzt Object mit prozent, betrag, pendingBonusId)
            const partnerAnfrageId = fahrzeugData.partnerAnfrageId || fahrzeugData.anfrageId || fahrzeugData.fahrzeugAnfrageId;
            const rabattInfo = await loadPartnerRabatt(partnerAnfrageId);

            // 🆕 2025-11-28: Beträge berechnen - BEIDE Rabattarten unterstützen
            const rabattProzent = rabattInfo.prozent || 0;
            const rabattBetragFix = rabattInfo.betrag || 0;  // Fixer Bonus-Abzug
            const rabattBetragProzent = bruttoPreis * (rabattProzent / 100);  // Prozent-Rabatt
            let gesamtRabatt = rabattBetragProzent + rabattBetragFix;

            // 🔧 BUG #10 FIX (2025-11-30): Rabatt-Boundary-Check - Rabatt darf nicht größer als Brutto sein
            if (gesamtRabatt > bruttoPreis) {
                console.warn('⚠️ Rabatt-Boundary: Gesamtrabatt (', gesamtRabatt.toFixed(2), '€) > Bruttopreis (', bruttoPreis.toFixed(2), '€)');
                console.warn('   → Rabatt wird auf Bruttopreis begrenzt (Netto = 0€)');
                gesamtRabatt = bruttoPreis;  // Maximal 100% Rabatt
            }

            const nettoBetrag = bruttoPreis - gesamtRabatt;

            console.log('   💰 Berechnung:', {
                brutto: bruttoPreis.toFixed(2) + '€',
                rabattProzent: `${rabattProzent}% = ${rabattBetragProzent.toFixed(2)}€`,
                rabattFix: rabattBetragFix.toFixed(2) + '€',
                gesamtRabatt: gesamtRabatt.toFixed(2) + '€',
                netto: nettoBetrag.toFixed(2) + '€'
            });

            // ✅ Schritt 5: Rechnungsnummer generieren
            const rechnungsnummer = await generateUniqueRechnungsnummer();

            // ✅ Schritt 6: Rechnung-Objekt erstellen
            const jetzt = firebase.firestore.Timestamp.now();
            const faelligAm = new Date();
            faelligAm.setDate(faelligAm.getDate() + 14); // +14 Tage Zahlungsziel

            const rechnung = {
                rechnungsnummer: rechnungsnummer,
                erstelltAm: jetzt,
                erstelltVon: firebaseApp.auth.currentUser?.email || 'system',
                faelligAm: firebase.firestore.Timestamp.fromDate(faelligAm),
                zahlungsstatus: 'offen',

                bruttoBetrag: parseFloat(bruttoPreis.toFixed(2)),
                rabattProzent: rabattProzent,
                rabattBetrag: parseFloat(rabattBetragProzent.toFixed(2)),  // Prozent-Rabatt Betrag
                rabattBetragFix: parseFloat(rabattBetragFix.toFixed(2)),   // 🆕 Fixer Bonus-Abzug
                nettoBetrag: parseFloat(nettoBetrag.toFixed(2)),
                bonusId: rabattInfo.pendingBonusId || null,                // 🆕 Referenz zum Bonus

                bezahltAm: null,
                bezahltVon: null,
                zahlungsart: null,
                notizen: '',
                mahnungen: []
            };

            // 🆕 MULTI-SERVICE: Breakdown-Daten hinzufügen (für PDF-Generierung)
            // 🔧 FIX (2025-12-01): Breakdown-Struktur korrigieren!
            // PROBLEM: kva.breakdown ist nach Variante verschachtelt: { "original": { "lackier": {...} } }
            // PDF erwartet aber flache Service-Struktur: { "lackier": {...}, "reifen": {...} }
            if (fahrzeugData.kva?.breakdown && fahrzeugData.kva?.isMultiService) {
                const gewaehlteVariante = fahrzeugData.kva.gewaehlteVariante || 'original';
                const breakdown = fahrzeugData.kva.breakdown;

                // Prüfe ob Breakdown verschachtelt ist (nach Variante) oder bereits flach (nach Service)
                const isNestedByVariant = breakdown[gewaehlteVariante] &&
                                          typeof breakdown[gewaehlteVariante] === 'object' &&
                                          !breakdown[gewaehlteVariante].fields;

                if (isNestedByVariant) {
                    rechnung.serviceBreakdown = breakdown[gewaehlteVariante];
                    console.log(`   📦 [MULTI-SERVICE] serviceBreakdown extrahiert für "${gewaehlteVariante}":`, Object.keys(breakdown[gewaehlteVariante]));
                } else {
                    rechnung.serviceBreakdown = breakdown;
                    console.log('   📦 [MULTI-SERVICE] serviceBreakdown (flach):', Object.keys(breakdown));
                }

                rechnung.serviceLabels = fahrzeugData.kva.serviceLabels || {};
                rechnung.isMultiService = true;
            }

            // 🆕 FIX (2025-12-01): Varianten-Details in Rechnung speichern (BUG #1)
            // PROBLEM: Nur Brutto-Preis wurde gespeichert, nicht welche Variante (Original/Aftermarket)
            // LÖSUNG: gewaehlteVariante + vollständige Varianten-Daten übertragen
            if (fahrzeugData.kva?.gewaehlteVariante) {
                rechnung.gewaehlteVariante = fahrzeugData.kva.gewaehlteVariante;
                console.log('   ✅ gewaehlteVariante:', fahrzeugData.kva.gewaehlteVariante);

                // Varianten-Details übertragen (für PDF-Aufschlüsselung)
                if (fahrzeugData.kva.varianten) {
                    const gewaehlteVarianteData = fahrzeugData.kva.varianten[fahrzeugData.kva.gewaehlteVariante];
                    if (gewaehlteVarianteData) {
                        rechnung.varianteDetails = {
                            name: fahrzeugData.kva.gewaehlteVariante,
                            gesamt: gewaehlteVarianteData.gesamt || 0,
                            netto: gewaehlteVarianteData.netto || 0,
                            mwst: gewaehlteVarianteData.mwst || 0,
                            rabattNachlass: gewaehlteVarianteData.rabattNachlass || 0
                        };
                        console.log('   ✅ varianteDetails:', rechnung.varianteDetails);
                    }

                    // Alle Varianten speichern (für Vergleich im PDF)
                    rechnung.alleVarianten = {};
                    for (const [varName, varData] of Object.entries(fahrzeugData.kva.varianten)) {
                        rechnung.alleVarianten[varName] = {
                            gesamt: varData.gesamt || 0,
                            netto: varData.netto || 0
                        };
                    }
                }
            }

            // 🆕 FIX (2025-12-01): summeBruttoOriginal/Aftermarket für PDF
            if (fahrzeugData.summeBruttoOriginal || fahrzeugData.summeBruttoAftermarket) {
                rechnung.summeBruttoOriginal = fahrzeugData.summeBruttoOriginal || null;
                rechnung.summeBruttoAftermarket = fahrzeugData.summeBruttoAftermarket || null;
                rechnung.hasVarianten = fahrzeugData.hasVarianten ||
                    (fahrzeugData.summeBruttoOriginal && fahrzeugData.summeBruttoAftermarket &&
                     fahrzeugData.summeBruttoOriginal !== fahrzeugData.summeBruttoAftermarket);
                console.log('   ✅ Varianten-Preise: Original=', rechnung.summeBruttoOriginal, 'Aftermarket=', rechnung.summeBruttoAftermarket);
            }

            // 🆕 FIX (2025-11-29): werkstattDaten für PDF einfrieren
            // PROBLEM: Service-Auswahl-Pipeline PDFs fehlten:
            //   - Steuernummer, IBAN/BIC/Bank, QR-Code, Footer (GmbH/GF/HRB)
            // LÖSUNG: Identisch zu rechnungen-admin.html Zeile 1564-1570
            try {
                const settings = await window.settingsManager.loadSettings();
                if (settings) {
                    rechnung.werkstattDaten = {
                        profil: settings.profil || {},
                        bank: settings.bank || {},
                        steuer: settings.steuer || {},
                        rechtliches: settings.rechtliches || {},
                        rechnungsConfig: settings.rechnungsConfig || {}
                    };
                    console.log('   ✅ werkstattDaten eingefroren:', Object.keys(rechnung.werkstattDaten));
                }
            } catch (settingsError) {
                console.warn('   ⚠️ werkstattDaten konnten nicht geladen werden:', settingsError);
                // Nicht werfen - Rechnung funktioniert auch ohne (mit Fallback-Werten im PDF)
            }

            // 🆕 FIX (2025-11-29): kalkulationData für PDF-Aufschlüsselung übertragen
            // PROBLEM: Kalkulationsaufschlüsselung zeigte "Zwischensumme: 0.00€"
            // LÖSUNG: kalkulationData aus fahrzeugData übertragen (wenn vorhanden)
            if (fahrzeugData.kalkulationData) {
                rechnung.kalkulationData = fahrzeugData.kalkulationData;
                console.log('   ✅ kalkulationData übertragen:', Object.keys(fahrzeugData.kalkulationData));
            }

            console.log('✅ [autoCreateRechnung] Rechnung erstellt:', rechnung);
            // 🆕 2025-11-28: Return Object mit rechnung + rabattInfo für pendingRabatt-Löschung
            return { rechnung, rabattInfo };
        }

        // Status-Label Hilfsfunktion
        function getStatusLabel(status) {
            const labels = {
                'angenommen': 'Angenommen',
                'vorbereitung': 'Vorbereitung',
                'lackierung': 'Lackierung',
                'trocknung': 'Trocknung',
                'qualitaetskontrolle': 'Qualitätskontrolle',
                'bereit': 'Bereit zur Abnahme',
                'neu': 'Neu eingegangen',
                'bestellung': 'Bestellung',
                'angekommen': 'Angekommen',
                'montage': 'Montage',
                'wuchten': 'Wuchten',
                'fertig': 'Fertig',
                'diagnose': 'Diagnose',
                'angebot': 'Angebot erstellt',
                'beauftragt': 'Beauftragt',
                'reparatur': 'Reparatur',
                'test': 'Test',
                'termin': 'Termin bestätigt',
                'aufbereitung': 'Aufbereitung',
                'termin_gebucht': 'Termin gebucht',
                'pruefung': 'Prüfung',
                'abholbereit': 'Abholbereit',
                'gutachten': 'Gutachten',
                'freigabe': 'Freigabe'
            };
            return labels[status] || status;
        }

        // ============================================
        // 📄 AUFTRAG DETAIL MODAL FUNCTIONS
        // ============================================

        // Helper: Service Label mit Icon
        function getServiceLabelWithIcon(serviceTyp) {
            const labels = {
                'lackier': '🎨 Lackierung',
                'reifen': '🛞 Reifen-Service',
                'mechanik': '🔧 Mechanik-Service',
                'pflege': '✨ Fahrzeug-Pflege',
                'tuev': '📋 TÜV/AU-PRÜFUNG',
                'versicherung': '🛡️ Versicherungs-Schaden',
                'glas': '🔍 Glas-Reparatur',
                'klima': '❄️ Klima-Service',
                'dellen': '🔨 Dellen-Reparatur',
                'folierung': '🌈 Auto-Folierung',
                'steinschutz': '🛡️ Steinschutzfolie',
                'werbebeklebung': '📢 Fahrzeugbeschriftung'
            };
            return labels[serviceTyp] || serviceTyp || 'Unbekannter Service';
        }

        // 🆕 Helper: Service Quick Info (Top 1-2 Felder für Übersicht)
        function getServiceQuickInfo(serviceTyp, serviceDetails, fahrzeugTopLevel) {
            if (!serviceDetails) serviceDetails = {};

            // ✅ FIX #38: Fallback to top-level for ALL services (backwards compatibility for old vehicles)
            if (Object.keys(serviceDetails).length === 0 && fahrzeugTopLevel) {
                switch(serviceTyp) {
                    case 'lackier':
                        serviceDetails = {
                            farbname: fahrzeugTopLevel.farbname,
                            farbnummer: fahrzeugTopLevel.farbnummer,
                            farbvariante: fahrzeugTopLevel.farbvariante,
                            lackart: fahrzeugTopLevel.lackart,
                            // 🆕 FIX (2025-11-29): Partner-Anfrage Felder aus serviceData
                            schadensbeschreibung: fahrzeugTopLevel.serviceData?.beschreibung || fahrzeugTopLevel.schadenBeschreibung,
                            karosseriearbeiten: fahrzeugTopLevel.serviceData?.karosserie || fahrzeugTopLevel.karosseriearbeiten,
                            ersatzteilPraeferenz: fahrzeugTopLevel.serviceData?.ersatzteil || fahrzeugTopLevel.ersatzteilPraeferenz
                        };
                        break;
                    case 'reifen':
                        serviceDetails = {
                            reifengroesse: fahrzeugTopLevel.reifengroesse,
                            reifentyp: fahrzeugTopLevel.reifentyp,
                            reifenanzahl: fahrzeugTopLevel.reifenanzahl
                        };
                        break;
                    case 'mechanik':
                        serviceDetails = {
                            problem: fahrzeugTopLevel.mechanikProblem,  // ✅ FIX #39: mechanikProblem (match annahme.html)
                            symptome: fahrzeugTopLevel.mechanikSymptome  // ✅ FIX #39: mechanikSymptome (match annahme.html)
                        };
                        break;
                    case 'glas':
                        serviceDetails = {
                            scheibentyp: fahrzeugTopLevel.scheibentyp,
                            glasposition: fahrzeugTopLevel.glasposition,
                            schadensgroesse: fahrzeugTopLevel.schadensgroesse
                        };
                        break;
                    case 'klima':
                        serviceDetails = {
                            klimaservice: fahrzeugTopLevel.klimaservice,
                            kaeltemittel: fahrzeugTopLevel.kaeltemittel,
                            klimaproblem: fahrzeugTopLevel.klimaproblem
                        };
                        break;
                    case 'dellen':
                        serviceDetails = {
                            dellenanzahl: fahrzeugTopLevel.dellenanzahl,
                            dellengroesse: fahrzeugTopLevel.dellengroesse,
                            lackschaden: fahrzeugTopLevel.lackschaden,
                            dellenpositionen: fahrzeugTopLevel.dellenpositionen
                        };
                        break;
                    case 'versicherung':
                        serviceDetails = {
                            versicherungsart: fahrzeugTopLevel.versicherungsart,
                            schadensnummer: fahrzeugTopLevel.schadensnummer,  // ✅ FIX #39: schadensnummer (match annahme.html)
                            versicherung: fahrzeugTopLevel.versicherung
                        };
                        break;
                    case 'pflege':
                        serviceDetails = {
                            paket: fahrzeugTopLevel.paket,  // ✅ FIX #39: paket (match annahme.html)
                            zusatzleistungen: fahrzeugTopLevel.zusatzleistungen  // ✅ FIX #39: zusatzleistungen (match annahme.html)
                        };
                        break;
                    case 'tuev':
                        serviceDetails = {
                            pruefart: fahrzeugTopLevel.pruefart,  // ✅ FIX #39: pruefart (match annahme.html)
                            faelligkeit: fahrzeugTopLevel.faelligkeit  // ✅ FIX #39: faelligkeit (match annahme.html)
                        };
                        break;
                    case 'folierung':
                        serviceDetails = {
                            folierungArt: fahrzeugTopLevel.folierungArt,  // ✅ FIX #39: folierungArt (match annahme.html)
                            folierungMaterial: fahrzeugTopLevel.folierungMaterial,  // ✅ FIX #39: folierungMaterial (match annahme.html)
                            folierungBereiche: fahrzeugTopLevel.folierungBereiche  // ✅ FIX #39: folierungBereiche (match annahme.html)
                        };
                        break;
                    case 'steinschutz':
                        serviceDetails = {
                            steinschutzUmfang: fahrzeugTopLevel.steinschutzUmfang,  // ✅ FIX #39: steinschutzUmfang (match annahme.html)
                            steinschutzMaterial: fahrzeugTopLevel.steinschutzMaterial  // ✅ FIX #39: steinschutzMaterial (match annahme.html)
                        };
                        break;
                    case 'werbebeklebung':
                        serviceDetails = {
                            werbebeklebungUmfang: fahrzeugTopLevel.werbebeklebungUmfang,  // ✅ FIX #39: werbebeklebungUmfang (match annahme.html)
                            werbebeklebungKomplexitaet: fahrzeugTopLevel.werbebeklebungKomplexitaet,  // ✅ FIX #39: werbebeklebungKomplexitaet (match annahme.html)
                            werbebeklebungText: fahrzeugTopLevel.werbebeklebungText  // ✅ FIX #39: werbebeklebungText (match annahme.html)
                        };
                        break;
                }
            }

            let info = [];

            switch(serviceTyp) {
                case 'lackier':
                    // 🆕 FIX (2025-11-29): Schadensbeschreibung anzeigen (Partner-Anfragen)
                    if (serviceDetails.schadensbeschreibung || serviceDetails.beschreibung) {
                        const beschreibung = serviceDetails.schadensbeschreibung || serviceDetails.beschreibung;
                        const short = beschreibung.length > 80 ? beschreibung.substring(0, 80) + '...' : beschreibung;
                        info.push(`📝 ${short}`);
                    }
                    if (serviceDetails.farbnummer || serviceDetails.farbname) {
                        info.push(`🎨 ${serviceDetails.farbnummer || ''} ${serviceDetails.farbname || ''}`.trim());
                    }
                    if (serviceDetails.lackart) {
                        info.push(`🖌️ ${serviceDetails.lackart}`);
                    }
                    // 🆕 FIX (2025-11-29): Karosseriearbeiten anzeigen
                    if (serviceDetails.karosseriearbeiten && serviceDetails.karosseriearbeiten !== 'nein') {
                        info.push(`🔧 Karosserie: ${serviceDetails.karosseriearbeiten === 'ja' ? 'Ja' : serviceDetails.karosseriearbeiten}`);
                    }
                    break;

                case 'reifen':
                    if (serviceDetails.reifengroesse) {
                        info.push(`📏 ${serviceDetails.reifengroesse}`);
                    }
                    if (serviceDetails.reifentyp) {
                        info.push(`❄️ ${serviceDetails.reifentyp}`);
                    }
                    if (serviceDetails.reifenanzahl) {
                        info.push(`🔢 ${serviceDetails.reifenanzahl} Reifen`);
                    }
                    break;

                case 'glas':
                    if (serviceDetails.scheibentyp) {
                        info.push(`🪟 ${serviceDetails.scheibentyp}`);
                    }
                    if (serviceDetails.glasposition) {
                        info.push(`📍 ${serviceDetails.glasposition}`);
                    }
                    break;

                case 'klima':
                    if (serviceDetails.klimaservice) {
                        info.push(`🔧 ${serviceDetails.klimaservice}`);
                    }
                    break;

                case 'pflege':
                    if (serviceDetails.paket) {
                        info.push(`📦 ${serviceDetails.paket}`);
                    }
                    if (serviceDetails.zusatzleistungen) {
                        info.push(`➕ ${serviceDetails.zusatzleistungen}`);
                    }
                    break;

                case 'mechanik':
                    if (serviceDetails.problem) {
                        const short = serviceDetails.problem.substring(0, 50);
                        info.push(`🔧 ${short}${serviceDetails.problem.length > 50 ? '...' : ''}`);
                    }
                    if (serviceDetails.symptome) {
                        info.push(`⚠️ ${serviceDetails.symptome.substring(0, 30)}...`);
                    }
                    break;

                case 'versicherung':
                    if (serviceDetails.schadensnummer) {
                        info.push(`📋 ${serviceDetails.schadensnummer}`);
                    }
                    if (serviceDetails.versicherung) {
                        info.push(`🏢 ${serviceDetails.versicherung}`);
                    }
                    break;

                case 'steinschutz':
                    if (serviceDetails.steinschutzUmfang) {
                        const umfangLabels = {
                            vollverklebung: 'Vollverklebung',
                            frontpaket: 'Frontpaket',
                            teilbereich: 'Teilbereich'
                        };
                        info.push(`🛡️ ${umfangLabels[serviceDetails.steinschutzUmfang] || serviceDetails.steinschutzUmfang}`);
                    }
                    if (serviceDetails.steinschutzMaterial) {
                        const materialLabels = {
                            standard: 'Standard',
                            premium: 'Premium',
                            high_end: 'High-End'
                        };
                        info.push(`🎯 ${materialLabels[serviceDetails.steinschutzMaterial] || serviceDetails.steinschutzMaterial}`);
                    }
                    break;

                case 'werbebeklebung':
                    if (serviceDetails.werbebeklebungUmfang) {
                        info.push(`📢 ${serviceDetails.werbebeklebungUmfang}`);
                    }
                    if (serviceDetails.werbebeklebungKomplexitaet) {
                        const komplexLabels = {
                            einfach: 'Einfach',
                            mittel: 'Mittel',
                            komplex: 'Komplex'
                        };
                        info.push(`🎨 ${komplexLabels[serviceDetails.werbebeklebungKomplexitaet]}`);
                    }
                    break;

                case 'tuev':
                    // 🆕 FIX (Nov 13, 2025): Korrigierter Feldname (pruefart statt tuevart)
                    // annahme.html speichert: pruefart, faelligkeit, bekannteMaengel
                    if (serviceDetails.pruefart) {
                        info.push(`📋 ${serviceDetails.pruefart}`);
                    }
                    break;

                case 'folierung':
                    // 🆕 FIX (Nov 13, 2025): Korrigierte Feldnamen für Folierung
                    // annahme.html speichert: folierungArt, folierungFarbe (camelCase!)
                    if (serviceDetails.folierungArt) {
                        info.push(`📏 ${serviceDetails.folierungArt}`);
                    }
                    if (serviceDetails.folierungFarbe) {
                        info.push(`🎨 ${serviceDetails.folierungFarbe}`);
                    }
                    break;

                case 'smartrepair':
                    if (serviceDetails.schadensart) {
                        info.push(`🔨 ${serviceDetails.schadensart}`);
                    }
                    if (serviceDetails.position) {
                        info.push(`📍 ${serviceDetails.position}`);
                    }
                    break;

                case 'dellen':
                    // 🆕 FIX (Nov 13, 2025): Korrigierte Feldnamen für Dellen
                    // annahme.html speichert: dellenanzahl, dellengroesse (lowercase!)
                    if (serviceDetails.dellenanzahl) {
                        info.push(`🔢 ${serviceDetails.dellenanzahl} Dellen`);
                    }
                    if (serviceDetails.dellengroesse) {
                        info.push(`📏 ${serviceDetails.dellengroesse}`);
                    }
                    break;

                case 'politur':
                    if (serviceDetails.politurart) {
                        info.push(`✨ ${serviceDetails.politurart}`);
                    }
                    break;

                case 'unterboden':
                    if (serviceDetails.material) {
                        info.push(`🛡️ ${serviceDetails.material}`);
                    }
                    break;

                case 'abholung':
                    if (serviceDetails.abholadresse) {
                        info.push(`📍 ${serviceDetails.abholadresse}`);
                    }
                    if (serviceDetails.abholdatum) {
                        // ✅ FIX Bug #15 (2025-11-24): Timestamp compatibility
                        info.push(`📅 ${formatFirestoreDate(serviceDetails.abholdatum)}`);
                    }
                    break;

                case 'sonstiges':
                    if (serviceDetails.beschreibung) {
                        const short = serviceDetails.beschreibung.substring(0, 100);
                        info.push(`📝 ${short}${serviceDetails.beschreibung.length > 100 ? '...' : ''}`);
                    }
                    break;
            }

            return info.length > 0 ? info.join('<br>') : '-';
        }

        // 🆕 Helper: Service Status abrufen (Multi-Service Support)
        function getServiceStatus(fahrzeug, serviceTyp) {
            if (!fahrzeug || !serviceTyp) return 'neu';

            // 1. Priorität: serviceStatuses Object (Multi-Service)
            if (fahrzeug.serviceStatuses && fahrzeug.serviceStatuses[serviceTyp]) {
                return fahrzeug.serviceStatuses[serviceTyp].status;
            }

            // 2. Fallback: prozessStatus (Single-Service / Backwards Compatibility)
            if (fahrzeug.prozessStatus && fahrzeug.serviceTyp === serviceTyp) {
                return fahrzeug.prozessStatus;
            }

            return 'neu';
        }

        // 🆕 Service Icons & Colors (für Status Badges)
        const serviceIcons = {
            lackier: { icon: '🎨', bg: 'var(--color-primary)', label: 'Lackierung' },
            reifen: { icon: '🛞', bg: '#42a5f5', label: 'Reifen' },
            pflege: { icon: '✨', bg: '#7b1fa2', label: 'Pflege' },
            mechanik: { icon: '🔧', bg: '#d32f2f', label: 'Mechanik' },
            tuev: { icon: '✅', bg: '#388e3c', label: 'TÜV/AU' },
            versicherung: { icon: '🛡️', bg: '#f57c00', label: 'Versicherung' },
            glas: { icon: '🔍', bg: '#0288d1', label: 'Glas' },
            klima: { icon: '❄️', bg: '#00bcd4', label: 'Klima' },
            dellen: { icon: '🔨', bg: '#757575', label: 'Dellen' },
            folierung: { icon: '🌈', bg: '#9c27b0', label: 'Folierung' },
            steinschutz: { icon: '🛡️', bg: '#607d8b', label: 'Steinschutz' },
            werbebeklebung: { icon: '📢', bg: '#ff5722', label: 'Werbebeklebung' },
            smartrepair: { icon: '🔨', bg: '#795548', label: 'Smart-Repair' },
            politur: { icon: '✨', bg: '#9c27b0', label: 'Politur' },
            unterboden: { icon: '🛡️', bg: '#455a64', label: 'Unterbodenschutz' },
            abholung: { icon: '🚗', bg: '#00897b', label: 'Abholung' },
            sonstiges: { icon: '📋', bg: '#666', label: 'Sonstiges' }
        };

        // 🆕 Status Labels (DE Translation)
        const statusLabels = {
            'neu': 'Neu',
            'angenommen': 'Angenommen',
            'terminiert': 'Terminiert',
            'vorbereitung': 'Vorbereitung',
            'lackierung': 'Lackierung',
            'trocknung': 'Trocknung',
            'montage': 'Montage',
            'qualitaetskontrolle': 'Qualität',
            'bereit': 'Bereit',
            'fertig': 'Fertig',
            'abholbereit': 'Abholbereit',
            'in_arbeit': 'In Arbeit',
            'wuchten': 'Wuchten',
            'reparatur': 'Reparatur',
            'aufbereitung': 'Aufbereitung',
            'pruefung': 'Prüfung',
            'diagnose': 'Diagnose',
            'bestellung': 'Bestellung',
            'angekommen': 'Angekommen',
            'termin': 'Termin',
            'termin_gebucht': 'Termin gebucht',
            'gutachten': 'Gutachten',
            'freigabe': 'Freigabe',
            'angebot': 'Angebot',
            'beauftragt': 'Beauftragt',
            'test': 'Test',
            'qualitaet': 'Qualität'
        };

        // Helper: Einzelnes Feld formatieren
        function formatField(label, value) {
            if (!value || value === '') return '';
            return `
                <div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                    <strong style="min-width: 150px; color: var(--color-text-secondary);">${label}:</strong>
                    <span>${value}</span>
                </div>
            `;
        }

        // Helper: Service-spezifische Details formatieren
        function renderServiceDetails(serviceTyp, serviceData, fahrzeugTopLevel) {
            // ✅ FALLBACK: If serviceData is empty, try top-level fields (for backwards compatibility)
            if ((!serviceData || Object.keys(serviceData).length === 0) && fahrzeugTopLevel) {
                console.log('🔧 FALLBACK: Checking top-level fields for serviceTyp:', serviceTyp);

                // Map top-level fields based on service type
                if (serviceTyp === 'lackier') {
                    serviceData = {
                        farbname: fahrzeugTopLevel.farbname,
                        farbnummer: fahrzeugTopLevel.farbnummer,
                        farbvariante: fahrzeugTopLevel.farbvariante,
                        lackart: fahrzeugTopLevel.lackart,
                        schadenBeschreibung: fahrzeugTopLevel.schadenBeschreibung
                    };
                    console.log('🔧 FALLBACK: Created serviceData from top-level:', serviceData);
                } else if (serviceTyp === 'reifen') {
                    serviceData = {
                        reifengroesse: fahrzeugTopLevel.reifengroesse || fahrzeugTopLevel.dimension,
                        reifentyp: fahrzeugTopLevel.reifentyp || fahrzeugTopLevel.typ,
                        reifenanzahl: fahrzeugTopLevel.reifenanzahl || fahrzeugTopLevel.anzahl
                    };
                } else if (serviceTyp === 'glas') {
                    serviceData = {
                        scheibentyp: fahrzeugTopLevel.scheibentyp,
                        schadensgroesse: fahrzeugTopLevel.schadensgroesse,
                        glasposition: fahrzeugTopLevel.glasposition
                    };
                }
                // Add more service types as needed...
            }

            // If still no data after fallback, show "Keine Details"
            if (!serviceData || Object.keys(serviceData).length === 0) {
                return '<p style="color: var(--color-text-secondary); font-style: italic;">Keine Details vorhanden</p>';
            }

            let html = '<div style="display: grid; gap: 8px;">';

            switch(serviceTyp) {
                case 'reifen':
                    // Werkstatt + Partner Felder (beide Namen unterstützen)
                    if (serviceData.reifengroesse || serviceData.dimension) html += formatField('Reifengröße', serviceData.reifengroesse || serviceData.dimension);
                    if (serviceData.reifentyp || serviceData.typ) html += formatField('Reifentyp', serviceData.reifentyp || serviceData.typ);
                    if (serviceData.reifenanzahl || serviceData.anzahl) html += formatField('Anzahl', (serviceData.reifenanzahl || serviceData.anzahl) + ' Reifen');

                    // Partner-spezifische Felder (FIX 2025-11-12: Partner-Daten Integration)
                    if (serviceData.art) {
                        const artLabels = {
                            'montage': 'Montage (neue Reifen aufziehen)',
                            'wechsel': 'Reifenwechsel (Sommer/Winter)',
                            'einlagerung': 'Einlagerung'
                        };
                        html += formatField('Service-Art', artLabels[serviceData.art] || serviceData.art);
                    }
                    if (serviceData.marke) html += formatField('Reifenmarke', serviceData.marke);
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'glas':
                    if (serviceData.scheibentyp) html += formatField('Scheibentyp', serviceData.scheibentyp);
                    if (serviceData.schadensgroesse) html += formatField('Schadensgröße', serviceData.schadensgroesse);
                    if (serviceData.glasposition) html += formatField('Position', serviceData.glasposition);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.art) {
                        const artLabels = {
                            'reparatur': 'Reparatur (Steinschlag)',
                            'austausch': 'Austausch (komplette Scheibe)'
                        };
                        html += formatField('Service-Art', artLabels[serviceData.art] || serviceData.art);
                    }
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'klima':
                    if (serviceData.klimaservice) html += formatField('Service-Art', serviceData.klimaservice);
                    if (serviceData.kaeltemittel) html += formatField('Kältemittel', serviceData.kaeltemittel);
                    if (serviceData.klimaproblem) html += formatField('Problem', serviceData.klimaproblem);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.art) {
                        const artLabels = {
                            'wartung': 'Wartung/Service',
                            'befuellung': 'Befüllung',
                            'reparatur': 'Reparatur',
                            'desinfektion': 'Desinfektion'
                        };
                        html += formatField('Service-Art', artLabels[serviceData.art] || serviceData.art);
                    }
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'dellen':
                    if (serviceData.dellenanzahl) html += formatField('Anzahl Dellen', serviceData.dellenanzahl);
                    if (serviceData.dellengroesse) html += formatField('Größe', serviceData.dellengroesse);
                    if (serviceData.lackschaden) html += formatField('Lackschaden', serviceData.lackschaden);
                    if (serviceData.dellenpositionen) html += formatField('Positionen', serviceData.dellenpositionen);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'mechanik':
                    if (serviceData.problem) html += formatField('Problem', serviceData.problem);
                    if (serviceData.symptome) html += formatField('Symptome', serviceData.symptome);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.kategorie) {
                        const kategorieLabels = {
                            'motor': 'Motor',
                            'bremsen': 'Bremsen',
                            'fahrwerk': 'Fahrwerk',
                            'elektrik': 'Elektrik',
                            'abgasanlage': 'Abgasanlage',
                            'sonstiges': 'Sonstiges'
                        };
                        html += formatField('Kategorie', kategorieLabels[serviceData.kategorie] || serviceData.kategorie);
                    }
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'versicherung':
                    if (serviceData.schadensnummer) html += formatField('Schadensnummer', serviceData.schadensnummer);
                    if (serviceData.versicherung) html += formatField('Versicherung', serviceData.versicherung);
                    if (serviceData.schadendatum) {
                        const datum = formatFirestoreDate(serviceData.schadendatum); // ✅ FIX Bug #15
                        html += formatField('Schadendatum', datum);
                    }
                    if (serviceData.unfallhergang) html += formatField('Unfallhergang', serviceData.unfallhergang);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'pflege':
                    if (serviceData.paket) html += formatField('Pflege-Paket', serviceData.paket);
                    if (serviceData.zusatzleistungen) html += formatField('Zusatzleistungen', serviceData.zusatzleistungen);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.pflegeart) {
                        const pflegeLabels = {
                            'aussenreinigung': 'Außenreinigung',
                            'innenreinigung': 'Innenreinigung',
                            'komplettreinigung': 'Komplettreinigung',
                            'politur': 'Politur/Versiegelung'
                        };
                        html += formatField('Pflege-Art', pflegeLabels[serviceData.pflegeart] || serviceData.pflegeart);
                    }
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'tuev':
                    if (serviceData.pruefart) html += formatField('Prüfart', serviceData.pruefart);
                    if (serviceData.faelligkeit) {
                        const datum = new Date(serviceData.faelligkeit + '-01');
                        const text = datum.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
                        html += formatField('Fälligkeit', text);
                    }
                    if (serviceData.bekannteMaengel) html += formatField('Bekannte Mängel', serviceData.bekannteMaengel);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'folierung':
                    if (serviceData.folierungArt) {
                        const artLabels = {
                            'vollfolierung': 'Vollfolierung',
                            'teilfolierung': 'Teilfolierung',
                            'akzentfolierung': 'Akzentfolierung'
                        };
                        html += formatField('Art der Folierung', artLabels[serviceData.folierungArt] || serviceData.folierungArt);
                    }
                    if (serviceData.folierungMaterial) {
                        const materialLabels = {
                            'standard': 'Standard',
                            'premium': 'Premium',
                            'high_end': 'High-End'
                        };
                        html += formatField('Materialqualität', materialLabels[serviceData.folierungMaterial] || serviceData.folierungMaterial);
                    }
                    if (serviceData.folierungSpezialTyp) html += formatField('Spezialtyp', serviceData.folierungSpezialTyp);
                    if (serviceData.folierungFarbe) html += formatField('Farbauswahl', serviceData.folierungFarbe);
                    if (serviceData.folierungBereiche && Array.isArray(serviceData.folierungBereiche)) {
                        html += formatField('Zu folierende Bereiche', serviceData.folierungBereiche.join(', '));
                    }
                    if (serviceData.folierungDesign) html += formatField('Design-Vorstellungen', serviceData.folierungDesign);
                    if (serviceData.folierungInfo) html += formatField('Zusätzliche Informationen', serviceData.folierungInfo);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'steinschutz':
                    if (serviceData.steinschutzUmfang) {
                        const umfangLabels = {
                            'vollverklebung': 'Vollverklebung',
                            'frontpaket': 'Frontpaket',
                            'teilbereich': 'Teilbereich'
                        };
                        html += formatField('Schutzumfang', umfangLabels[serviceData.steinschutzUmfang] || serviceData.steinschutzUmfang);
                    }
                    if (serviceData.steinschutzMaterial) {
                        const materialLabels = {
                            'standard': 'Standard',
                            'premium': 'Premium',
                            'high_end': 'High-End'
                        };
                        html += formatField('Materialqualität', materialLabels[serviceData.steinschutzMaterial] || serviceData.steinschutzMaterial);
                    }
                    if (serviceData.steinschutzBereiche) html += formatField('Zu schützende Bereiche', serviceData.steinschutzBereiche);
                    if (serviceData.steinschutzInfo) html += formatField('Zusätzliche Informationen', serviceData.steinschutzInfo);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'werbebeklebung':
                    if (serviceData.werbebeklebungUmfang) html += formatField('Umfang der Beklebung', serviceData.werbebeklebungUmfang);
                    if (serviceData.werbebeklebungKomplexitaet) {
                        const komplexLabels = {
                            'einfach': 'Einfach',
                            'mittel': 'Mittel',
                            'komplex': 'Komplex'
                        };
                        html += formatField('Design-Komplexität', komplexLabels[serviceData.werbebeklebungKomplexitaet] || serviceData.werbebeklebungKomplexitaet);
                    }
                    if (serviceData.werbebeklebungText) html += formatField('Textelemente', serviceData.werbebeklebungText);
                    if (serviceData.werbebeklebungFarbanzahl) html += formatField('Anzahl Farben', serviceData.werbebeklebungFarbanzahl + ' Farben');
                    if (serviceData.werbebeklebungInfo) html += formatField('Zusätzliche Informationen', serviceData.werbebeklebungInfo);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                case 'lackier':
                    if (serviceData.farbname) html += formatField('Farbname', serviceData.farbname);
                    if (serviceData.farbvariante) html += formatField('Farbvariante', serviceData.farbvariante);
                    if (serviceData.farbnummer) html += formatField('Farbnummer', serviceData.farbnummer);
                    if (serviceData.lackart) html += formatField('Lackart', serviceData.lackart);
                    if (serviceData.schadenBeschreibung) html += formatField('Schadenbeschreibung', serviceData.schadenBeschreibung);

                    // Partner-spezifische Felder (FIX 2025-11-12)
                    if (serviceData.lackierumfang) {
                        const umfangLabels = {
                            'spot': 'Spot-Lackierung (kleine Stellen)',
                            'teil': 'Teillackierung (1-2 Teile)',
                            'komplett': 'Komplettlackierung'
                        };
                        html += formatField('Lackierumfang', umfangLabels[serviceData.lackierumfang] || serviceData.lackierumfang);
                    }
                    if (serviceData.lackierBereiche) html += formatField('Zu lackierende Bereiche', serviceData.lackierBereiche);
                    if (serviceData.anliefertermin) {
                        const datum = formatFirestoreDate(serviceData.anliefertermin); // ✅ FIX Bug #15
                        html += formatField('Anliefertermin', datum);
                    }
                    if (serviceData.dringlichkeitLabel) {
                        const dringStyle = serviceData.dringlichkeitLabel === 'DRINGEND' ? 'color: #C7254E; font-weight: bold;' : '';
                        html += `<div style="display: flex; gap: 10px; padding: 8px 12px; background: white; border-radius: 4px;">
                            <strong style="min-width: 150px; color: var(--color-text-secondary);">Dringlichkeit:</strong>
                            <span style="${dringStyle}">${serviceData.dringlichkeitLabel}</span>
                        </div>`;
                    }
                    if (serviceData.lieferoption) {
                        const lieferLabels = {
                            'abholung': 'Abholung durch Werkstatt',
                            'selbstanlieferung': 'Selbstanlieferung durch Partner'
                        };
                        html += formatField('Lieferoption', lieferLabels[serviceData.lieferoption] || serviceData.lieferoption);
                    }
                    if (serviceData.abholadresse) html += formatField('Abholadresse', serviceData.abholadresse);
                    if (serviceData.ersatzfahrzeugGewuenscht) html += formatField('Ersatzfahrzeug', serviceData.ersatzfahrzeugGewuenscht ? 'Ja, gewünscht' : 'Nein');
                    if (serviceData.info) html += formatField('Zusatzinformationen', serviceData.info);
                    break;

                default:
                    // Fallback: Alle Felder als Liste anzeigen
                    for (const [key, value] of Object.entries(serviceData)) {
                        html += formatField(key, Array.isArray(value) ? value.join(', ') : value);
                    }
            }

            html += '</div>';
            return html;
        }

        function openAuftragModal(fahrzeugId) {
            const fahrzeug = allFahrzeuge.find(f => window.compareIds(f.id, fahrzeugId));
            if (!fahrzeug) {
                console.error('❌ Fahrzeug nicht gefunden:', fahrzeugId);
                return;
            }

            console.log('📄 Öffne Auftrag-Modal für:', fahrzeug.kennzeichen);

            // Fahrzeug-ID für Tabs speichern
            document.getElementById('auftragModal').dataset.fahrzeugId = fahrzeug.id;

            // Kennzeichen im Header
            document.getElementById('auftragKennzeichen').textContent = fahrzeug.kennzeichen;

            // Tab: Übersicht
            document.getElementById('detail-kennzeichen').textContent = fahrzeug.kennzeichen;
            document.getElementById('detail-kunde').textContent = fahrzeug.kundenname || '-';
            document.getElementById('detail-kontakt').textContent = `📞 ${fahrzeug.kundenTelefon || '-'} | 📧 ${fahrzeug.kundenEmail || '-'}`;
            document.getElementById('detail-fahrzeug').textContent = `${fahrzeug.marke || '-'} ${fahrzeug.modell || '-'}`;

            // 🆕 Baujahr (baujahrVon-baujahrBis range or single year)
            const baujahrDisplay = fahrzeug.baujahrVon && fahrzeug.baujahrBis
                ? `📅 ${fahrzeug.baujahrVon} - ${fahrzeug.baujahrBis}`
                : `📅 ${fahrzeug.baujahrVon || fahrzeug.baujahrBis || '-'}`;
            document.getElementById('detail-baujahr').textContent = baujahrDisplay;

            // 🆕 VIN/FIN-Nummer
            document.getElementById('detail-vin').textContent = `🔢 VIN: ${fahrzeug.vin || '-'}`;

            // 🆕 Service-Details (Quick Info für Primary + Additional Services)
            let serviceDetailsHTML = '';

            // Primary Service
            serviceDetailsHTML += `<div style="margin-bottom: 10px;">`;
            serviceDetailsHTML += `<div style="font-weight: 600; margin-bottom: 5px;">${getServiceLabelWithIcon(fahrzeug.serviceTyp)}</div>`;
            serviceDetailsHTML += `<div style="padding-left: 10px; font-size: 12px; color: var(--color-text-secondary);">`;
            serviceDetailsHTML += getServiceQuickInfo(fahrzeug.serviceTyp, fahrzeug.serviceDetails || fahrzeug.serviceData, fahrzeug);  // ✅ FIX #37: Fallback to serviceData for old vehicles
            serviceDetailsHTML += `</div></div>`;

            // Additional Services
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                fahrzeug.additionalServices.forEach(addService => {
                    serviceDetailsHTML += `<div style="margin-bottom: 10px;">`;
                    serviceDetailsHTML += `<div style="font-weight: 600; margin-bottom: 5px;">${getServiceLabelWithIcon(addService.serviceTyp)}</div>`;
                    serviceDetailsHTML += `<div style="padding-left: 10px; font-size: 12px; color: var(--color-text-secondary);">`;
                    serviceDetailsHTML += getServiceQuickInfo(addService.serviceTyp, addService.serviceDetails || addService.serviceData, fahrzeug);
                    serviceDetailsHTML += `</div></div>`;
                });
            }

            document.getElementById('detail-service-specifics').innerHTML = serviceDetailsHTML;

            // 🆕 Multi-Service Status Display (Primary + Additional Services)
            let statusHTML = '';

            if (window.DEBUG) console.log('🔍 DEBUG: Fahrzeug serviceStatuses:', fahrzeug.serviceStatuses);
            if (window.DEBUG) console.log('🔍 DEBUG: additionalServices:', fahrzeug.additionalServices);

            // Primary Service Status
            const primaryServiceTyp = fahrzeug.serviceTyp;
            const primaryServiceData = serviceIcons[primaryServiceTyp] || { icon: '📋', bg: '#666', label: 'Service' };
            const primaryStatus = getServiceStatus(fahrzeug, primaryServiceTyp);
            const primaryStatusLabel = statusLabels[primaryStatus] || primaryStatus;

            if (window.DEBUG) console.log(`🔍 DEBUG Primary: ${primaryServiceTyp} → Status: ${primaryStatus} → Label: ${primaryStatusLabel}`);

            statusHTML += `
                <div class="card-service-badge-multi primary" style="background: ${primaryServiceData.bg}; color: white;">
                    <span>${primaryServiceData.icon} ${primaryServiceData.label}</span>
                    <span class="status-pill">${primaryStatusLabel}</span>
                </div>
            `;

            // Additional Services Status
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                fahrzeug.additionalServices.forEach(addService => {
                    const addServiceTyp = addService.serviceTyp;
                    const addServiceData = serviceIcons[addServiceTyp] || { icon: '📋', bg: '#666', label: 'Service' };
                    const addStatus = getServiceStatus(fahrzeug, addServiceTyp);
                    const addStatusLabel = statusLabels[addStatus] || addStatus;

                    if (window.DEBUG) console.log(`🔍 DEBUG Additional: ${addServiceTyp} → Status: ${addStatus} → Label: ${addStatusLabel}`);

                    statusHTML += `
                        <div class="card-service-badge-multi additional" style="background: ${addServiceData.bg}; color: white;">
                            <span>+ ${addServiceData.icon} ${addServiceData.label}</span>
                            <span class="status-pill">${addStatusLabel}</span>
                        </div>
                    `;
                });
            }

            if (window.DEBUG) console.log('🔍 DEBUG statusHTML:', statusHTML);
            document.getElementById('detail-status').innerHTML = statusHTML;
            // ✅ FIX Bug #15 (2025-11-24): Use formatFirestoreDate() helper for Timestamp compatibility
            document.getElementById('detail-termin').textContent = fahrzeug.geplantesAbnahmeDatum ?
                `📅 ${formatFirestoreDate(fahrzeug.geplantesAbnahmeDatum)}` : 'Kein Termin';

            // Service-Übersicht generieren (FIX 2025-11-12: Multi-Service Display)
            let servicesOverview = getServiceLabelWithIcon(fahrzeug.serviceTyp);
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                const additionalLabels = fahrzeug.additionalServices.map(s => getServiceLabelWithIcon(s.serviceTyp)).join(' + ');
                servicesOverview += ` + ${additionalLabels}`;
            }
            document.getElementById('detail-services-overview').innerHTML = servicesOverview;

            // Tab: Services (FIX 2025-11-12: Multi-Service Support)
            let servicesHTML = '';

            // 🔧 HAUPTSERVICE (Primary Service)
            servicesHTML += `
                <div style="margin-bottom: 25px;">
                    <h3 style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 24px;">🔧</span>
                        Hauptservice
                    </h3>
                    <div style="padding: 15px; background: rgba(0, 122, 255, 0.05); border-radius: 8px; border-left: 4px solid rgba(0, 122, 255, 0.8);">
                        <h4 style="margin: 0 0 10px 0;">${getServiceLabelWithIcon(fahrzeug.serviceTyp)}</h4>
                        ${(() => {
                            // DEBUG: Primary Service Details
                            if (window.DEBUG) console.log('🔍 PRIMARY SERVICE DEBUG:', {
                                serviceTyp: fahrzeug.serviceTyp,
                                serviceDetails: fahrzeug.serviceDetails,
                                hasServiceDetails: !!fahrzeug.serviceDetails,
                                serviceDetailsKeys: fahrzeug.serviceDetails ? Object.keys(fahrzeug.serviceDetails) : [],
                                fahrzeugKeys: Object.keys(fahrzeug).filter(k => k.includes('farb') || k.includes('lack') || k.includes('schaden'))
                            });
                            return renderServiceDetails(fahrzeug.serviceTyp, fahrzeug.serviceDetails, fahrzeug);
                        })()}
                    </div>
                </div>
            `;

            // ➕ ZUSÄTZLICHE SERVICES (Additional Services)
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                servicesHTML += `
                    <div style="margin-bottom: 25px;">
                        <h3 style="margin-bottom: 15px; display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 24px;">➕</span>
                            Zusätzliche Services
                        </h3>
                `;

                fahrzeug.additionalServices.forEach((additionalService, index) => {
                    servicesHTML += `
                        <div style="padding: 15px; background: rgba(100, 60, 255, 0.05); border-radius: 8px; border-left: 4px solid rgba(100, 60, 255, 0.6); margin-bottom: ${index < fahrzeug.additionalServices.length - 1 ? '15px' : '0'};">
                            <h4 style="margin: 0 0 10px 0;">${getServiceLabelWithIcon(additionalService.serviceTyp)}</h4>
                            ${renderServiceDetails(additionalService.serviceTyp, additionalService.serviceDetails || additionalService.serviceData, additionalService)}
                        </div>
                    `;
                });

                servicesHTML += `</div>`;
            }

            // 💰 Preis nur wenn Berechtigung (Default: false für Sicherheit)
            const canShow = typeof window.canViewPrices === 'function' ? window.canViewPrices() : false;
            if (canShow) {
                const preis = fahrzeug.vereinbarterPreis || fahrzeug.kva?.varianten?.original?.gesamt || 0;
                if (preis > 0) {
                    servicesHTML += `<div style="margin-top: 20px; padding: 15px; background: rgba(76, 175, 80, 0.1); border-radius: 8px;">
                        <strong style="font-size: 16px;">💰 Preis:</strong> <span style="font-size: 20px; font-weight: 700; color: var(--color-success);">${preis.toFixed(2)} €</span>
                    </div>`;
                }
            }
            document.getElementById('detail-services').innerHTML = servicesHTML;

            // Tab: Bilder (FIX 2025-11-13: Load from subcollection 'fotos/vorher')
            // Show loading state initially
            document.getElementById('detail-photos').innerHTML = '<p style="color: var(--color-text-secondary); padding: 20px; text-align: center;"><span style="display: inline-block; animation: spin 1s linear infinite;">⏳</span> Lade Bilder...</p>';

            // Async load photos from subcollection
            (async () => {
                try {
                    console.log('📷 Loading photos from subcollection for fahrzeugId:', fahrzeug.id);

                    // Try to load from subcollection first
                    const photosDoc = await window.getCollection('fahrzeuge')
                        .doc(String(fahrzeug.id))
                        .collection('fotos')
                        .doc('vorher')
                        .get();

                    let photos = [];

                    if (photosDoc.exists) {
                        const data = photosDoc.data();
                        photos = data.photos || [];
                        console.log('📷 Photos from subcollection:', photos.length, 'found');
                    } else {
                        // Fallback: Check main document (backwards compatibility)
                        photos = fahrzeug.photoUrls || fahrzeug.photos || fahrzeug.bilder || fahrzeug.images || [];  // ✅ FIX Bug #9 (2025-11-23): Added photoUrls (new standard from Bug #7)
                        console.log('📷 Photos from main document (fallback):', photos.length, 'found');
                    }

                    if (photos && photos.length > 0) {
                        let photosHTML = '<div style="display: grid; gap: 15px;">';
                        photos.forEach((photoData, index) => {
                            // Support both Base64 and URLs
                            const src = photoData.startsWith('http') ? photoData : photoData;
                            photosHTML += `
                                <div style="position: relative;">
                                    <img src="${src}"
                                         alt="Foto ${index + 1}"
                                         style="width: 100%; height: 200px; object-fit: cover; border-radius: 8px; cursor: pointer; border: 2px solid var(--color-border);"
                                         onclick="window.open('${src}', '_blank')"
                                         onerror="this.parentElement.innerHTML='<div style=\\'padding: 20px; background: rgba(244, 67, 54, 0.1); border-radius: 8px; color: var(--color-error); text-align: center;\\'>❌ Bild ${index + 1} konnte nicht geladen werden</div>'">
                                    <div style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">Foto ${index + 1}</div>
                                </div>
                            `;
                        });
                        photosHTML += '</div>';
                        document.getElementById('detail-photos').innerHTML = photosHTML;
                    } else {
                        document.getElementById('detail-photos').innerHTML = '<p style="color: var(--color-text-secondary); padding: 20px;">Keine Bilder vorhanden</p>';
                    }
                } catch (error) {
                    console.error('❌ Error loading photos:', error);
                    document.getElementById('detail-photos').innerHTML = `<p style="color: var(--color-error); padding: 20px;">❌ Fehler beim Laden der Bilder: ${error.message}</p>`;
                }
            })();

            // Tab: Notizen (FIX 2025-11-12: Service-spezifische Trennung)
            let notesHTML = '';
            let hasAnyNotes = false;

            // 📝 ALLGEMEINE NOTIZEN (General Notes)
            if (fahrzeug.notizen) {
                hasAnyNotes = true;
                notesHTML += `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(255, 193, 7, 0.12); border-radius: 8px; border-left: 5px solid rgba(255, 193, 7, 0.9);">
                        <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--color-text);">
                            <span style="font-size: 20px; line-height: 1; display: flex; align-items: center;">📝</span>
                            Allgemeine Notizen
                        </h4>
                        <p style="margin: 0; white-space: pre-wrap; line-height: 1.5; font-size: 14px; color: var(--color-text);">${fahrzeug.notizen}</p>
                    </div>
                `;
            }

            // 🔧 PRIMARY SERVICE NOTIZEN
            if (fahrzeug.serviceDetails && fahrzeug.serviceDetails.info) {
                hasAnyNotes = true;
                notesHTML += `
                    <div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 122, 255, 0.08); border-radius: 8px; border-left: 5px solid rgba(0, 122, 255, 0.9);">
                        <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--color-text);">
                            <span style="font-size: 20px; line-height: 1; display: flex; align-items: center;">🔧</span>
                            ${getServiceLabelWithIcon(fahrzeug.serviceTyp)}
                        </h4>
                        <p style="margin: 0; white-space: pre-wrap; line-height: 1.5; font-size: 14px; color: var(--color-text);">${fahrzeug.serviceDetails.info}</p>
                    </div>
                `;
            }

            // ➕ ADDITIONAL SERVICES NOTIZEN
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices) && fahrzeug.additionalServices.length > 0) {
                fahrzeug.additionalServices.forEach((additionalService, index) => {
                    // 🔧 FIX (2025-11-13): Backward compatibility for serviceData/serviceDetails field name
                    const serviceDetails = additionalService.serviceDetails || additionalService.serviceData;
                    if (serviceDetails && serviceDetails.info) {
                        hasAnyNotes = true;
                        notesHTML += `
                            <div style="margin-bottom: 20px; padding: 15px; background: rgba(100, 60, 255, 0.08); border-radius: 8px; border-left: 5px solid rgba(100, 60, 255, 0.8);">
                                <h4 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: var(--color-text);">
                                    <span style="font-size: 20px; line-height: 1; display: flex; align-items: center;">➕</span>
                                    ${getServiceLabelWithIcon(additionalService.serviceTyp)}
                                </h4>
                                <p style="margin: 0; white-space: pre-wrap; line-height: 1.5; font-size: 14px; color: var(--color-text);">${serviceDetails.info}</p>
                            </div>
                        `;
                    }
                });
            }

            // Fallback if no notes exist
            if (!hasAnyNotes) {
                notesHTML = '<p style="color: var(--color-text-secondary); padding: 20px; text-align: center; font-style: italic;">Keine Notizen vorhanden</p>';
            }

            document.getElementById('detail-notes').innerHTML = notesHTML;

            // Tab: Abholung (🆕 2025-11-27: Abholungs-Informationen)
            // FIX: Auch prüfen ob abholadresse/abholnotiz vorhanden sind
            const isAbholung = fahrzeug.fahrzeugAbholung === 'ja'
                || fahrzeug.fahrzeugAbholen === true
                || fahrzeug.abholadresse
                || fahrzeug.abholnotiz;
            document.getElementById('detail-abholdatum').textContent = fahrzeug.abholdatum
                ? formatFirestoreDate(fahrzeug.abholdatum)
                : (isAbholung ? 'Termin offen' : 'Keine Abholung');
            document.getElementById('detail-abholzeit').textContent = fahrzeug.abholzeit
                ? `um ${fahrzeug.abholzeit} Uhr`
                : '';
            document.getElementById('detail-abholadresse').textContent = fahrzeug.abholadresse || '-';

            // Leihfahrzeug aus kalkulationData oder direktem Feld
            const ersatzfahrzeug = fahrzeug.kalkulationData?.ersatzfahrzeug || fahrzeug.zugewiesenesErsatzfahrzeug;
            // 🆕 FIX (Nov 27): Werkstatt-Name anzeigen wenn vorhanden (für Pool-Fahrzeuge)
            const leihfahrzeugDisplay = ersatzfahrzeug?.kennzeichen || 'Kein Leihfahrzeug';
            const werkstattSuffix = ersatzfahrzeug?.werkstattName ? ` (${ersatzfahrzeug.werkstattName})` : '';
            document.getElementById('detail-leihfahrzeug').textContent = leihfahrzeugDisplay + werkstattSuffix;
            document.getElementById('detail-leihfahrzeug-tage').textContent = ersatzfahrzeug?.tage
                ? `${ersatzfahrzeug.tage} Tage`
                : '';
            document.getElementById('detail-abholnotiz').textContent = fahrzeug.abholnotiz || '-';

            // Tab: PDF (Multi-field support: pdfUrl, annahmePdfUrl, pdf_url)
            // DEBUG: Check which PDF field has value (FIX 2025-11-13)
            console.log('📄 PDF DEBUG:', {
                fahrzeugId: fahrzeug.id,
                pdfUrl: fahrzeug.pdfUrl,
                annahmePdfUrl: fahrzeug.annahmePdfUrl,
                pdf_url: fahrzeug.pdf_url,
                hasAnyPdfField: !!(fahrzeug.pdfUrl || fahrzeug.annahmePdfUrl || fahrzeug.pdf_url),
                allFahrzeugKeys: Object.keys(fahrzeug).filter(k => k.toLowerCase().includes('pdf'))
            });
            const pdfUrl = fahrzeug.pdfUrl || fahrzeug.annahmePdfUrl || fahrzeug.pdf_url;
            if (pdfUrl) {
                document.getElementById('detail-pdf').innerHTML = `
                    <div style="display: flex; flex-direction: column; gap: 15px;">
                        <iframe src="${pdfUrl}"
                                style="width: 100%; height: 600px; border: 2px solid var(--color-border); border-radius: 8px; background: white;">
                        </iframe>
                        <div style="display: flex; gap: 10px; justify-content: center;">
                            <a href="${pdfUrl}" target="_blank" class="btn btn-primary">
                                <svg data-feather="external-link" style="width: 16px; height: 16px;"></svg>
                                PDF in neuem Tab öffnen
                            </a>
                            <a href="${pdfUrl}" download class="btn btn-secondary">
                                <svg data-feather="download" style="width: 16px; height: 16px;"></svg>
                                PDF herunterladen
                            </a>
                        </div>
                    </div>
                `;
                if (typeof feather !== 'undefined') feather.replace();
            } else {
                document.getElementById('detail-pdf').innerHTML = `
                    <div style="padding: 40px; text-align: center;">
                        <svg data-feather="file-text" style="width: 64px; height: 64px; color: var(--color-text-secondary); margin-bottom: 15px;"></svg>
                        <p style="color: var(--color-text-secondary); font-size: 16px; margin-bottom: 10px;">Kein PDF vorhanden</p>
                        <p style="font-size: 13px; color: var(--color-text-secondary);">
                            💡 Das Annahme-PDF wird automatisch generiert, wenn das Fahrzeug aufgenommen wird.
                        </p>
                    </div>
                `;
                if (typeof feather !== 'undefined') feather.replace();
            }

            // Modal anzeigen
            document.getElementById('auftragModal').classList.add('active');

            // Ersten Tab aktivieren
            switchAuftragTab('overview');
        }

        function closeAuftragModal() {
            document.getElementById('auftragModal').classList.remove('active');
        }

        function switchAuftragTab(tabName) {
            // Alle Tabs deaktivieren
            document.querySelectorAll('.auftrag-tab').forEach(tab => tab.classList.remove('active'));
            document.querySelectorAll('.auftrag-tab-content').forEach(content => content.style.display = 'none');

            // Aktiven Tab aktivieren
            const activeTab = document.querySelector(`.auftrag-tab[data-tab="${tabName}"]`);
            const activeContent = document.getElementById(`tab-${tabName}`);

            if (activeTab) activeTab.classList.add('active');
            if (activeContent) activeContent.style.display = 'block';

            // Lazy Loading: Bestellungen Tab
            if (tabName === 'bestellungen') {
                const fahrzeugId = document.getElementById('auftragModal').dataset.fahrzeugId;
                if (fahrzeugId) {
                    loadBestellungenForModal(fahrzeugId);
                }
            }

            // Lazy Loading: Anleitungen Tab (YouTube Videos)
            if (tabName === 'anleitungen') {
                const fahrzeugId = document.getElementById('auftragModal').dataset.fahrzeugId;
                if (fahrzeugId) {
                    loadAnleitungenForModal(fahrzeugId);
                }
            }
        }

        // ====================================================================
        // 🎬 YOUTUBE ANLEITUNGEN SYSTEM (2025-12-02)
        // ====================================================================

        const YOUTUBE_API_KEY = 'AIzaSyD2qmcVuTGyyIxV9LEQzvkCAyrBfBJXt3s';
        let currentAnleitungenFahrzeug = null; // Speichert aktuelles Fahrzeug für Kontext

        /**
         * Lädt Anleitungen-Tab mit auto-generierten Suchvorschlägen
         */
        function loadAnleitungenForModal(fahrzeugId) {
            const fahrzeug = allFahrzeuge.find(f => String(f.id) === String(fahrzeugId));
            if (!fahrzeug) {
                console.error('❌ Fahrzeug nicht gefunden für Anleitungen:', fahrzeugId);
                return;
            }

            currentAnleitungenFahrzeug = fahrzeug;
            console.log('🎬 Lade Anleitungen für:', fahrzeug.kennzeichen, fahrzeug.marke, fahrzeug.modell);

            // Generiere Suchvorschläge basierend auf Fahrzeug + Services
            const vorschlaege = generateSearchSuggestions(fahrzeug);
            renderSearchSuggestions(vorschlaege);

            // Setze Suchfeld-Placeholder mit Fahrzeug-Info
            const suchfeld = document.getElementById('anleitungen-suchfeld');
            if (suchfeld) {
                suchfeld.placeholder = `🔍 Suche z.B. "${fahrzeug.marke} ${fahrzeug.modell} Anleitung"...`;
            }
        }

        /**
         * Generiert Suchvorschläge basierend auf Fahrzeug-Daten und gebuchten Services
         * Nutzt alle verfügbaren Fahrzeug-Infos für präzisere Suchergebnisse
         */
        function generateSearchSuggestions(fahrzeug) {
            const suggestions = [];

            // === FAHRZEUG-IDENTIFIKATION (präzise) ===
            const marke = fahrzeug.marke || '';
            const modell = fahrzeug.modell || '';
            const baujahr = fahrzeug.baujahrVon || fahrzeug.baujahr || '';
            const motorisierung = fahrzeug.motorisierung || '';
            const karosserie = fahrzeug.karosserieform || fahrzeug.karosserie || '';

            // Basis-Suchstring: Marke + Modell
            const markeModell = `${marke} ${modell}`.trim();

            // Erweiterter Suchstring: mit Baujahr (präziser für YouTube)
            const markeModellBaujahr = baujahr
                ? `${markeModell} ${baujahr}`.trim()
                : markeModell;

            // Vollständiger Suchstring: mit Motor (für spezifische Anleitungen)
            const vollstaendig = motorisierung
                ? `${markeModellBaujahr} ${motorisierung}`.trim()
                : markeModellBaujahr;

            console.log('🎬 YouTube Suchkontext:', {
                marke, modell, baujahr, motorisierung, karosserie,
                markeModell, markeModellBaujahr, vollstaendig
            });

            if (!markeModell) {
                return [{ label: '🔧 Allgemeine KFZ Reparatur', query: 'KFZ Reparatur Anleitung' }];
            }

            // === SERVICE-DATEN AUSLESEN ===
            const serviceData = fahrzeug.serviceData || fahrzeug.serviceDetails || {};
            const schadenBeschreibung = fahrzeug.schadenBeschreibung || serviceData.beschreibung || '';

            // Service-spezifische Suchvorschläge mit Fahrzeug-Details
            const serviceSearchTerms = {
                'lackier': () => {
                    const terms = [
                        { label: `🎨 ${marke} Lackiervorbereitung`, query: `${markeModellBaujahr} Lackiervorbereitung Demontage` },
                        { label: '🚪 Tür demontieren', query: `${markeModellBaujahr} Tür ausbauen Anleitung` },
                        { label: '🛡️ Stoßstange ab/anbauen', query: `${markeModellBaujahr} Stoßstange demontieren` },
                        { label: '🔧 Kotflügel ausbauen', query: `${markeModellBaujahr} Kotflügel demontieren wechseln` }
                    ];
                    // Wenn Schadensbeschreibung vorhanden, spezifische Suche
                    if (schadenBeschreibung) {
                        const keywords = extractKeywords(schadenBeschreibung);
                        if (keywords.length > 0) {
                            terms.unshift({
                                label: `🔍 ${keywords[0]} reparieren`,
                                query: `${markeModellBaujahr} ${keywords[0]} reparieren Anleitung`
                            });
                        }
                    }
                    return terms;
                },
                'reifen': () => {
                    const reifenGroesse = serviceData.reifengroesse || serviceData.dimension || serviceData.groesse || '';
                    const reifenTyp = serviceData.reifentyp || serviceData.typ || '';
                    const terms = [
                        { label: '🛞 Reifen wechseln', query: `${markeModellBaujahr} Reifen wechseln Radwechsel` },
                        { label: '🔧 Wagenheber Aufnahme', query: `${markeModellBaujahr} Wagenheber Ansetzpunkt Aufnahme` },
                        { label: '⚖️ Reifen auswuchten', query: `Reifen auswuchten Anleitung Wuchtmaschine` }
                    ];
                    if (reifenGroesse) {
                        terms.push({ label: `📏 ${reifenGroesse} Felgen`, query: `${marke} ${reifenGroesse} Felgen montieren` });
                    }
                    return terms;
                },
                'mechanik': () => {
                    const reparaturArt = serviceData.art || serviceData.reparaturart || '';
                    const terms = [
                        { label: '🔧 Bremsen wechseln', query: `${markeModellBaujahr} Bremsbeläge Bremsscheiben wechseln` },
                        { label: '🛢️ Ölwechsel', query: `${markeModellBaujahr} Ölwechsel Anleitung Ölfilter` },
                        { label: '⚙️ Zahnriemen', query: `${markeModellBaujahr} Zahnriemen wechseln Steuerzeiten` }
                    ];
                    // Motor-spezifische Suche wenn vorhanden
                    if (motorisierung) {
                        terms.unshift({
                            label: `🔧 ${motorisierung} Motor`,
                            query: `${marke} ${motorisierung} Motor Reparatur Anleitung`
                        });
                    }
                    // Reparaturart-spezifisch
                    if (reparaturArt) {
                        terms.unshift({
                            label: `🔧 ${reparaturArt}`,
                            query: `${markeModellBaujahr} ${reparaturArt} Anleitung`
                        });
                    }
                    return terms;
                },
                'pflege': () => {
                    const pflegePaket = serviceData.paket || serviceData.leistung || '';
                    const terms = [
                        { label: '✨ Polieren', query: `${marke} ${karosserie || 'Auto'} polieren Anleitung Profi` },
                        { label: '🧽 Innenreinigung', query: `${markeModell} Innenreinigung Detailing komplett` },
                        { label: '💎 Keramikversiegelung', query: `Keramikversiegelung ${marke} Anleitung auftragen` }
                    ];
                    if (karosserie) {
                        terms.push({ label: `🚗 ${karosserie} aufbereiten`, query: `${karosserie} Fahrzeugaufbereitung Anleitung` });
                    }
                    return terms;
                },
                'glas': () => {
                    const scheibentyp = serviceData.scheibentyp || '';
                    const terms = [];
                    if (scheibentyp.includes('front') || scheibentyp.includes('windschutz')) {
                        terms.push({ label: '🔍 Frontscheibe wechseln', query: `${markeModellBaujahr} Frontscheibe Windschutzscheibe wechseln` });
                    } else if (scheibentyp.includes('heck')) {
                        terms.push({ label: '🔍 Heckscheibe wechseln', query: `${markeModellBaujahr} Heckscheibe wechseln` });
                    } else if (scheibentyp.includes('seiten')) {
                        terms.push({ label: '🔍 Seitenscheibe wechseln', query: `${markeModellBaujahr} Seitenscheibe Fensterheber` });
                    } else {
                        terms.push({ label: '🔍 Scheibe wechseln', query: `${markeModellBaujahr} Scheibe wechseln Verglasung` });
                    }
                    terms.push({ label: '🛠️ Steinschlag reparieren', query: `Steinschlag reparieren Anleitung DIY` });
                    return terms;
                },
                'klima': () => {
                    const klimaService = serviceData.klimaservice || '';
                    const kaeltemittel = serviceData.kaeltemittel || '';
                    const terms = [
                        { label: '❄️ Klima befüllen', query: `${markeModellBaujahr} Klimaanlage befüllen ${kaeltemittel}`.trim() },
                        { label: '🔧 Klimakompressor', query: `${markeModellBaujahr} Klimakompressor wechseln ausbauen` }
                    ];
                    if (klimaService === 'wartung') {
                        terms.unshift({ label: '🔄 Klima Wartung', query: `${markeModell} Klimaanlage Wartung Desinfektion` });
                    }
                    return terms;
                },
                'dellen': () => {
                    const dellenPosition = serviceData.position || serviceData.dellenposition || '';
                    const dellenAnzahl = serviceData.dellenanzahl || '';
                    const terms = [
                        { label: '🔨 PDR Technik', query: `PDR Dellendrücken Anleitung Profi Technik` },
                        { label: '🛠️ Ausbeultechnik', query: `Ausbeultechnik ohne Lackieren Delle entfernen` }
                    ];
                    if (dellenPosition) {
                        terms.unshift({
                            label: `🎯 ${dellenPosition} Delle`,
                            query: `${marke} ${dellenPosition} Delle entfernen PDR`
                        });
                    }
                    return terms;
                },
                'folierung': () => {
                    const folienArt = serviceData.art || serviceData.folierungArt || '';
                    const terms = [
                        { label: '🎬 Folie aufziehen', query: `${markeModellBaujahr} Folie aufziehen Car Wrapping` },
                        { label: '🔥 Wrap Technik', query: `Car Wrapping Anleitung Profi Technik` }
                    ];
                    if (folienArt) {
                        terms.unshift({ label: `🎨 ${folienArt}`, query: `${marke} ${folienArt} Folierung Anleitung` });
                    }
                    if (karosserie) {
                        terms.push({ label: `🚗 ${karosserie} folieren`, query: `${karosserie} komplett folieren Anleitung` });
                    }
                    return terms;
                },
                'tuev': () => [
                    { label: '📋 TÜV Checkliste', query: `TÜV Hauptuntersuchung vorbereiten Checkliste ${baujahr ? 'Oldtimer' : ''}`.trim() },
                    { label: '🔧 TÜV Mängel', query: `TÜV Mängel selbst beheben häufige Fehler` },
                    { label: `🔍 ${marke} TÜV`, query: `${markeModell} TÜV Probleme häufige Mängel` }
                ],
                'versicherung': () => {
                    const schadenTyp = serviceData.schadenart || serviceData.unfallart || '';
                    const terms = [
                        { label: '📸 Schadensdoku', query: `Unfallschaden dokumentieren Gutachten Anleitung` }
                    ];
                    if (schadenTyp) {
                        terms.unshift({ label: `🚨 ${schadenTyp}`, query: `${marke} ${schadenTyp} Reparatur Anleitung` });
                    }
                    return terms;
                },
                'steinschutz': () => {
                    const steinschutzUmfang = serviceData.steinschutzUmfang || serviceData.umfang || '';
                    const terms = [
                        { label: '🛡️ PPF aufbringen', query: `Steinschlagschutzfolie PPF aufbringen Anleitung` },
                        { label: '🎬 PPF Installation', query: `PPF Paint Protection Film Installation Tutorial` }
                    ];
                    if (steinschutzUmfang === 'frontpaket' || steinschutzUmfang.includes('front')) {
                        terms.unshift({ label: '🚗 Front PPF', query: `${marke} Frontpaket Steinschutzfolie anbringen` });
                    }
                    return terms;
                },
                'werbebeklebung': () => {
                    const flaeche = serviceData.flaeche || '';
                    return [
                        { label: '📢 Beschriftung', query: `Fahrzeugbeschriftung aufbringen Anleitung Profi` },
                        { label: '🎨 Plotterfolie', query: `Plotterfolie aufkleben Auto Beschriftung` }
                    ];
                }
            };

            // === VORSCHLÄGE GENERIEREN ===

            // Haupt-Service hinzufügen
            const primaryService = fahrzeug.serviceTyp || 'lackier';
            if (serviceSearchTerms[primaryService]) {
                const terms = serviceSearchTerms[primaryService]();
                suggestions.push(...terms);
            }

            // Additional Services hinzufügen
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices)) {
                fahrzeug.additionalServices.forEach(s => {
                    const serviceTyp = typeof s === 'string' ? s : s.serviceTyp;
                    if (serviceTyp && serviceSearchTerms[serviceTyp]) {
                        // Nur erste 2 Vorschläge pro Additional Service
                        const terms = serviceSearchTerms[serviceTyp]();
                        suggestions.push(...terms.slice(0, 2));
                    }
                });
            }

            // Allgemeiner Fahrzeug-Vorschlag (mit Baujahr für Präzision)
            suggestions.unshift({
                label: `🚗 ${markeModell} ${baujahr || ''}`.trim(),
                query: `${vollstaendig} Reparatur Wartung Anleitung`
            });

            // Duplikate entfernen und auf max. 10 begrenzen (mehr Auswahl)
            const uniqueSuggestions = suggestions.filter((s, i, arr) =>
                arr.findIndex(x => x.query === s.query) === i
            ).slice(0, 10);

            return uniqueSuggestions;
        }

        /**
         * Extrahiert relevante Keywords aus einer Schadensbeschreibung
         */
        function extractKeywords(text) {
            if (!text) return [];

            // Relevante KFZ-Teile und Schäden
            const relevantTerms = [
                'stoßstange', 'kotflügel', 'tür', 'haube', 'motorhaube', 'heckklappe',
                'schweller', 'dach', 'spiegel', 'scheinwerfer', 'rückleuchte',
                'felge', 'radlauf', 'a-säule', 'b-säule', 'c-säule',
                'kratzer', 'delle', 'beule', 'rost', 'lack', 'steinschlag',
                'riss', 'bruch', 'verformung', 'bremse', 'auspuff', 'getriebe'
            ];

            const lowerText = text.toLowerCase();
            const found = relevantTerms.filter(term => lowerText.includes(term));

            // Kapitalisieren für bessere Darstellung
            return found.map(term => term.charAt(0).toUpperCase() + term.slice(1));
        }

        /**
         * Rendert die Suchvorschläge als klickbare Buttons
         * Klick fügt Text zum Suchfeld hinzu (kombinierbar!)
         */
        function renderSearchSuggestions(suggestions) {
            const container = document.getElementById('anleitungen-vorschlaege');
            if (!container) return;

            // Speichere die kurzen Suchbegriffe für die Buttons (ohne volle Query)
            container.innerHTML = suggestions.map(s => {
                // Extrahiere kurzen Begriff für Anzeige im Suchfeld
                const shortTerm = extractShortSearchTerm(s.label, s.query);
                return `
                    <button onclick="addToAnleitungenSuchfeld('${shortTerm.replace(/'/g, "\\'")}')"
                            data-full-query="${s.query.replace(/"/g, '&quot;')}"
                            style="padding: 8px 14px; background: rgba(33, 150, 243, 0.1); border: 1px solid rgba(33, 150, 243, 0.3); border-radius: 20px; color: var(--color-primary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.2s; white-space: nowrap;"
                            onmouseover="this.style.background='rgba(33, 150, 243, 0.2)'; this.style.transform='scale(1.02)'"
                            onmouseout="this.style.background='rgba(33, 150, 243, 0.1)'; this.style.transform='scale(1)'"
                            title="Klicken um '${shortTerm.replace(/'/g, "\\'")}' hinzuzufügen">
                        ${s.label}
                    </button>
                `;
            }).join('');
        }

        /**
         * Extrahiert kurzen Suchbegriff aus Label/Query
         */
        function extractShortSearchTerm(label, query) {
            // Entferne Emoji vom Label für den Suchbegriff
            const cleanLabel = label.replace(/^[\u{1F300}-\u{1F9FF}]\s*/u, '').trim();

            // Für Fahrzeug-spezifische Labels, nutze den vollen Begriff
            if (cleanLabel.includes('BMW') || cleanLabel.includes('Audi') || cleanLabel.includes('VW') ||
                cleanLabel.includes('Mercedes') || cleanLabel.includes('Porsche')) {
                return cleanLabel;
            }

            // Für allgemeine Labels, nutze das Label ohne Emoji
            return cleanLabel;
        }

        /**
         * Fügt einen Suchbegriff zum Suchfeld hinzu (kombinierbar)
         */
        function addToAnleitungenSuchfeld(term) {
            const suchfeld = document.getElementById('anleitungen-suchfeld');
            if (!suchfeld) return;

            const currentValue = suchfeld.value.trim();

            // Prüfe ob Begriff schon enthalten ist
            if (currentValue.toLowerCase().includes(term.toLowerCase())) {
                console.log('🔍 Begriff bereits im Suchfeld:', term);
                // Visuelles Feedback - kurzes Highlight
                suchfeld.style.borderColor = '#FF9800';
                setTimeout(() => {
                    suchfeld.style.borderColor = '';
                }, 300);
                return;
            }

            // Füge Begriff hinzu (mit Leerzeichen wenn schon Text vorhanden)
            if (currentValue) {
                suchfeld.value = `${currentValue} ${term}`;
            } else {
                suchfeld.value = term;
            }

            // Visuelles Feedback - grüner Rahmen
            suchfeld.style.borderColor = '#4CAF50';
            setTimeout(() => {
                suchfeld.style.borderColor = '';
            }, 300);

            // Fokus aufs Suchfeld
            suchfeld.focus();

            console.log('➕ Zum Suchfeld hinzugefügt:', term, '→ Gesamt:', suchfeld.value);
        }

        /**
         * Leert das Suchfeld
         */
        function clearAnleitungenSuchfeld() {
            const suchfeld = document.getElementById('anleitungen-suchfeld');
            if (suchfeld) {
                suchfeld.value = '';
                suchfeld.focus();
                console.log('🗑️ Suchfeld geleert');
            }
        }

        /**
         * Manuelle YouTube-Suche aus dem Suchfeld
         */
        function searchYouTubeAnleitungenManual() {
            const suchfeld = document.getElementById('anleitungen-suchfeld');
            const query = suchfeld?.value?.trim();

            if (!query) {
                alert('Bitte füge zuerst Suchbegriffe hinzu oder tippe etwas ein.');
                return;
            }

            searchYouTubeAnleitungen(query);
        }

        // YouTube Pagination State
        let youtubeNextPageToken = null;
        let youtubeCurrentQuery = '';
        let youtubeCurrentQueryWords = [];
        let youtubeLoadedVideos = [];
        let youtubeFilteredOutCount = 0;

        /**
         * YouTube API Suche durchführen (Kanban Anleitungen)
         * Mit verbesserter Relevanz-Filterung
         */
        async function searchYouTubeAnleitungen(query, loadMore = false) {
            const container = document.getElementById('anleitungen-videos');
            if (!container) return;

            // Neue Suche = Reset
            if (!loadMore) {
                youtubeNextPageToken = null;
                youtubeCurrentQuery = query;
                youtubeCurrentQueryWords = extractSearchWords(query);
                youtubeLoadedVideos = [];
                youtubeFilteredOutCount = 0;
                console.log('🔍 YouTube Neue Suche:', query);
                console.log('🔍 Suchbegriffe für Filter:', youtubeCurrentQueryWords);

                // Lade-Indikator
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                        <div style="font-size: 32px; animation: spin 1s linear infinite;">⏳</div>
                        <p style="color: var(--color-text-secondary); margin-top: 15px;">Suche relevante Videos für "${query}"...</p>
                    </div>
                `;
            } else {
                console.log('🔍 YouTube Mehr laden für:', youtubeCurrentQuery);
            }

            try {
                // API URL mit verbesserten Parametern
                let apiUrl = `https://www.googleapis.com/youtube/v3/search?` +
                    `part=snippet` +
                    `&type=video` +
                    `&maxResults=15` +  // Mehr laden wegen Filter
                    `&q=${encodeURIComponent(youtubeCurrentQuery + ' Anleitung Tutorial')}` +
                    `&relevanceLanguage=de` +  // Deutsche Videos bevorzugen
                    `&videoDefinition=any` +
                    `&order=relevance` +
                    `&key=${YOUTUBE_API_KEY}`;

                if (loadMore && youtubeNextPageToken) {
                    apiUrl += `&pageToken=${youtubeNextPageToken}`;
                }

                const response = await fetch(apiUrl);

                if (!response.ok) {
                    throw new Error(`YouTube API Fehler: ${response.status}`);
                }

                const data = await response.json();

                // Speichere nextPageToken für "Mehr laden"
                youtubeNextPageToken = data.nextPageToken || null;

                console.log('🎬 YouTube Rohergebnisse:', data.items?.length || 0);

                if (!data.items || data.items.length === 0) {
                    if (!loadMore) {
                        container.innerHTML = `
                            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-text-secondary);">
                                <div style="font-size: 48px; margin-bottom: 15px;">😕</div>
                                <p>Keine Videos gefunden für "${query}"</p>
                                <p style="font-size: 13px; margin-top: 10px;">Versuche eine andere Suche.</p>
                            </div>
                        `;
                    }
                    return;
                }

                // Video-IDs für Detail-Abfrage (Dauer)
                const videoIds = data.items.map(v => v.id.videoId).join(',');

                // Hole Video-Details (Dauer, Views)
                const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?` +
                    `part=contentDetails,statistics` +
                    `&id=${videoIds}` +
                    `&key=${YOUTUBE_API_KEY}`;

                const detailsResponse = await fetch(detailsUrl);
                const detailsData = await detailsResponse.json();

                // Erstelle Map für schnellen Zugriff
                const videoDetailsMap = {};
                if (detailsData.items) {
                    detailsData.items.forEach(v => {
                        videoDetailsMap[v.id] = {
                            duration: parseDuration(v.contentDetails?.duration),
                            viewCount: parseInt(v.statistics?.viewCount || '0')
                        };
                    });
                }

                // Filtere und bewerte Videos
                const filteredVideos = data.items
                    .map(video => {
                        const details = videoDetailsMap[video.id.videoId] || { duration: 0, viewCount: 0 };
                        const relevanceScore = calculateRelevanceScore(video, details, youtubeCurrentQueryWords);
                        return { ...video, details, relevanceScore };
                    })
                    .filter(video => {
                        const dominated = isRelevantVideo(video, youtubeCurrentQueryWords);
                        if (!dominated) youtubeFilteredOutCount++;
                        return dominated;
                    })
                    .sort((a, b) => b.relevanceScore - a.relevanceScore)
                    .slice(0, 6);  // Nur beste 6 behalten

                console.log('🎬 Nach Filterung:', filteredVideos.length, '| Herausgefiltert:', youtubeFilteredOutCount);

                // Videos zur Liste hinzufügen
                youtubeLoadedVideos = loadMore ? [...youtubeLoadedVideos, ...filteredVideos] : filteredVideos;

                // Videos rendern
                renderYouTubeVideos();

            } catch (error) {
                console.error('❌ YouTube API Fehler:', error);
                container.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--color-error);">
                        <div style="font-size: 48px; margin-bottom: 15px;">❌</div>
                        <p>Fehler beim Laden der Videos</p>
                        <p style="font-size: 13px; margin-top: 10px;">${error.message}</p>
                    </div>
                `;
            }
        }

        /**
         * Extrahiert relevante Suchbegriffe aus der Query
         */
        function extractSearchWords(query) {
            // Entferne unwichtige Wörter
            const stopWords = ['der', 'die', 'das', 'und', 'oder', 'für', 'mit', 'bei', 'von', 'zu', 'im', 'am', 'an', 'auf', 'aus', 'ein', 'eine', 'einer', 'einem', 'einen'];

            return query
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 2 && !stopWords.includes(word))
                .map(word => word.replace(/[^\wäöüß]/g, ''));
        }

        /**
         * Prüft ob ein Video relevant ist basierend auf:
         * - Titel enthält mindestens 1 Suchbegriff
         * - Videodauer zwischen 2 und 45 Minuten
         * - Kein offensichtlicher Spam/Musik
         */
        function isRelevantVideo(video, searchWords) {
            const title = (video.snippet?.title || '').toLowerCase();
            const description = (video.snippet?.description || '').toLowerCase();
            const channelTitle = (video.snippet?.channelTitle || '').toLowerCase();
            const duration = video.details?.duration || 0;

            // 1. Videodauer-Filter (2-45 Minuten)
            const minDuration = 2 * 60;   // 2 Minuten
            const maxDuration = 45 * 60;  // 45 Minuten
            if (duration > 0 && (duration < minDuration || duration > maxDuration)) {
                console.log('⏱️ Gefiltert (Dauer):', video.snippet?.title, `(${Math.round(duration/60)} min)`);
                return false;
            }

            // 2. Blacklist für irrelevante Inhalte
            const blacklistTerms = ['music', 'musik', 'song', 'lyrics', 'official video', 'live concert',
                                   'gameplay', 'gaming', 'lets play', 'reaction', 'unboxing haul',
                                   'tiktok', 'shorts compilation', 'funny moments', 'fails compilation'];
            if (blacklistTerms.some(term => title.includes(term))) {
                console.log('🚫 Gefiltert (Blacklist):', video.snippet?.title);
                return false;
            }

            // 3. Mindestens 1 Suchbegriff im Titel ODER Beschreibung
            const matchesInTitle = searchWords.filter(word => title.includes(word)).length;
            const matchesInDesc = searchWords.filter(word => description.includes(word)).length;

            if (matchesInTitle === 0 && matchesInDesc < 2) {
                console.log('❌ Gefiltert (keine Matches):', video.snippet?.title, `| Titel: ${matchesInTitle}, Desc: ${matchesInDesc}`);
                return false;
            }

            // 4. KFZ-relevante Keywords (Bonus-Check)
            const kfzKeywords = ['auto', 'kfz', 'fahrzeug', 'pkw', 'wagen', 'car', 'reparatur', 'repair',
                                'wechseln', 'tauschen', 'ausbauen', 'einbauen', 'demontieren', 'montieren',
                                'anleitung', 'tutorial', 'how to', 'diy', 'selbst', 'schritt'];
            const hasKfzContext = kfzKeywords.some(kw => title.includes(kw) || description.includes(kw) || channelTitle.includes(kw));

            if (!hasKfzContext && matchesInTitle < 2) {
                console.log('🔧 Gefiltert (kein KFZ-Kontext):', video.snippet?.title);
                return false;
            }

            return true;
        }

        /**
         * Berechnet Relevanz-Score für Sortierung
         */
        function calculateRelevanceScore(video, details, searchWords) {
            let score = 0;
            const title = (video.snippet?.title || '').toLowerCase();
            const description = (video.snippet?.description || '').toLowerCase();

            // Punkte für Suchbegriffe im Titel (wichtiger)
            searchWords.forEach(word => {
                if (title.includes(word)) score += 10;
                if (description.includes(word)) score += 2;
            });

            // Punkte für KFZ-Keywords
            const kfzKeywords = ['anleitung', 'tutorial', 'reparatur', 'wechseln', 'ausbauen', 'diy'];
            kfzKeywords.forEach(kw => {
                if (title.includes(kw)) score += 5;
            });

            // Punkte für gute Videodauer (10-20 min ideal)
            const duration = details.duration || 0;
            if (duration >= 600 && duration <= 1200) score += 8;  // 10-20 min
            else if (duration >= 300 && duration <= 1800) score += 4;  // 5-30 min

            // Punkte für Views (Qualitätsindikator)
            const views = details.viewCount || 0;
            if (views > 100000) score += 5;
            else if (views > 10000) score += 3;
            else if (views > 1000) score += 1;

            return score;
        }

        /**
         * Konvertiert YouTube-Dauer (ISO 8601) in Sekunden
         * z.B. "PT15M33S" → 933
         */
        function parseDuration(isoDuration) {
            if (!isoDuration) return 0;

            const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
            if (!match) return 0;

            const hours = parseInt(match[1] || '0');
            const minutes = parseInt(match[2] || '0');
            const seconds = parseInt(match[3] || '0');

            return hours * 3600 + minutes * 60 + seconds;
        }

        /**
         * Formatiert Sekunden als "MM:SS" oder "H:MM:SS"
         */
        function formatDuration(seconds) {
            if (!seconds) return '';
            const h = Math.floor(seconds / 3600);
            const m = Math.floor((seconds % 3600) / 60);
            const s = seconds % 60;
            if (h > 0) {
                return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
            }
            return `${m}:${s.toString().padStart(2, '0')}`;
        }

        /**
         * Formatiert Views als "1.2K" oder "1.5M"
         */
        function formatViews(views) {
            if (!views) return '';
            if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
            if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
            return views.toString();
        }

        /**
         * Rendert alle geladenen YouTube Videos + "Mehr laden" Button
         */
        function renderYouTubeVideos() {
            const container = document.getElementById('anleitungen-videos');
            if (!container) return;

            // Videos HTML mit Dauer und Views
            const videosHtml = youtubeLoadedVideos.map(video => {
                const duration = video.details?.duration || 0;
                const views = video.details?.viewCount || 0;
                const durationStr = formatDuration(duration);
                const viewsStr = formatViews(views);

                return `
                    <div onclick="playYouTubeAnleitungenVideo('${video.id.videoId}', '${video.snippet.title.replace(/'/g, "\\'").replace(/"/g, '&quot;')}')"
                         style="cursor: pointer; border-radius: 12px; overflow: hidden; background: var(--color-surface); box-shadow: 0 2px 10px rgba(0,0,0,0.1); transition: all 0.2s;"
                         onmouseover="this.style.transform='translateY(-3px)'; this.style.boxShadow='0 5px 20px rgba(0,0,0,0.15)'"
                         onmouseout="this.style.transform=''; this.style.boxShadow='0 2px 10px rgba(0,0,0,0.1)'">
                        <div style="position: relative;">
                            <img src="${video.snippet.thumbnails.medium.url}"
                                 alt="${video.snippet.title}"
                                 style="width: 100%; height: 180px; object-fit: cover;">
                            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60px; height: 60px; background: rgba(255,0,0,0.9); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <span style="color: white; font-size: 24px; margin-left: 4px;">▶</span>
                            </div>
                            ${durationStr ? `
                                <div style="position: absolute; bottom: 8px; right: 8px; background: rgba(0,0,0,0.8); color: white; padding: 3px 6px; border-radius: 4px; font-size: 12px; font-weight: 600;">
                                    ${durationStr}
                                </div>
                            ` : ''}
                        </div>
                        <div style="padding: 12px;">
                            <div style="font-size: 14px; font-weight: 600; color: var(--color-text-primary); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                                ${video.snippet.title}
                            </div>
                            <div style="font-size: 12px; color: var(--color-text-secondary); margin-top: 6px; display: flex; justify-content: space-between; align-items: center;">
                                <span>📺 ${video.snippet.channelTitle}</span>
                                ${viewsStr ? `<span>👁️ ${viewsStr}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            // "Mehr laden" Button (wenn weitere Seiten verfügbar)
            const loadMoreHtml = youtubeNextPageToken ? `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px;">
                    <button onclick="loadMoreYouTubeVideos()"
                            id="youtube-load-more-btn"
                            style="padding: 14px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 25px; font-size: 15px; font-weight: 600; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);"
                            onmouseover="this.style.transform='scale(1.05)'; this.style.boxShadow='0 6px 20px rgba(102, 126, 234, 0.5)'"
                            onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 4px 15px rgba(102, 126, 234, 0.4)'">
                        📥 Weitere Videos laden
                    </button>
                    <p style="font-size: 12px; color: var(--color-text-secondary); margin-top: 10px;">
                        ${youtubeLoadedVideos.length} Videos geladen
                    </p>
                </div>
            ` : `
                <div style="grid-column: 1 / -1; text-align: center; padding: 15px; color: var(--color-text-secondary); font-size: 13px;">
                    ✅ Alle ${youtubeLoadedVideos.length} Videos geladen
                </div>
            `;

            container.innerHTML = videosHtml + loadMoreHtml;
        }

        /**
         * Lädt weitere YouTube Videos (nächste Seite)
         */
        async function loadMoreYouTubeVideos() {
            const btn = document.getElementById('youtube-load-more-btn');
            if (btn) {
                btn.innerHTML = '⏳ Lade...';
                btn.disabled = true;
            }

            await searchYouTubeAnleitungen(youtubeCurrentQuery, true);
        }

        /**
         * Spielt ein YouTube Video im eingebetteten Player ab (Kanban Anleitungen)
         */
        function playYouTubeAnleitungenVideo(videoId, title) {
            console.log('▶️ Spiele Video:', videoId, title);

            const playerContainer = document.getElementById('anleitungen-player');
            const iframe = document.getElementById('youtube-player-iframe');

            if (playerContainer && iframe) {
                iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
                playerContainer.style.display = 'block';

                // Scroll zum Player
                playerContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        /**
         * Schließt den YouTube Anleitungen Player
         */
        function closeYouTubeAnleitungenPlayer() {
            const playerContainer = document.getElementById('anleitungen-player');
            const iframe = document.getElementById('youtube-player-iframe');

            if (playerContainer && iframe) {
                iframe.src = ''; // Video stoppen
                playerContainer.style.display = 'none';
            }
        }

        // CSS für Spinner Animation (wird einmal hinzugefügt)
        if (!document.getElementById('youtube-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'youtube-spinner-style';
            style.textContent = `
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }

        // ====================================================================
        // END YOUTUBE ANLEITUNGEN SYSTEM
        // ====================================================================

        async function loadBestellungenForModal(fahrzeugId) {
            const container = document.getElementById('detail-bestellungen');

            console.log('📦 loadBestellungenForModal START:', {
                fahrzeugId: fahrzeugId,
                fahrzeugIdType: typeof fahrzeugId,
                werkstattId: window.werkstattId
            });

            if (!window.db) {
                container.innerHTML = '<p style="color: var(--color-error); padding: 20px;">❌ Firebase nicht verfügbar</p>';
                return;
            }

            try {
                // Lade-Indikator anzeigen
                container.innerHTML = '<p style="color: var(--color-text-secondary); padding: 20px;">Lade Bestellungen...</p>';

                // DEBUG: Check if ANY bestellungen exist in the collection (FIX 2025-11-13)
                const allBestellungenSnapshot = await window.getCollection('bestellungen').limit(10).get();
                console.log('📦 DEBUG: Total bestellungen in collection (first 10):', {
                    total: allBestellungenSnapshot.size,
                    fahrzeugIds: allBestellungenSnapshot.docs.map(d => ({
                        id: d.id,
                        fahrzeugId: d.data().fahrzeugId,
                        fahrzeugIdType: typeof d.data().fahrzeugId
                    }))
                });

                // Query: Alle Bestellungen für dieses Fahrzeug (Type-safe String comparison)
                const snapshot = await window.getCollection('bestellungen')
                    .where('fahrzeugId', '==', String(fahrzeugId))
                    .get();

                console.log('📦 Query Result:', {
                    empty: snapshot.empty,
                    size: snapshot.size,
                    queryFahrzeugId: String(fahrzeugId),
                    queryFahrzeugIdType: typeof String(fahrzeugId),
                    docs: snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
                });

                if (snapshot.empty) {
                    container.innerHTML = `
                        <div style="padding: 20px; text-align: center;">
                            <p style="color: var(--color-text-secondary); margin-bottom: 15px;">Keine Bestellungen vorhanden</p>
                            <p style="font-size: 13px; color: var(--color-text-secondary);">
                                💡 Tipp: PDF-Ersatzteile in <a href="material.html" style="color: var(--color-primary);">Material-Verwaltung</a> als Bestellung aufgeben
                            </p>
                        </div>
                    `;
                    return;
                }

                // Client-Side Sorting: Bestellungen nach bestelltAm sortieren (neueste zuerst)
                const bestellungen = [];
                snapshot.forEach(doc => bestellungen.push(doc.data()));

                bestellungen.sort((a, b) => {
                    const dateA = new Date(a.bestelltAm || 0);
                    const dateB = new Date(b.bestelltAm || 0);
                    return dateB - dateA; // Descending order (neueste zuerst)
                });

                console.log(`✅ ${bestellungen.length} Bestellungen für Fahrzeug ${fahrzeugId} geladen (client-side sorted)`);

                // Permission Check für Warenannahme-Button
                const canManage = typeof window.canManageBestellungen === 'function' && window.canManageBestellungen();

                // Tabelle erstellen
                let html = `
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--color-border); text-align: left;">
                                <th style="padding: 12px;">ETN</th>
                                <th style="padding: 12px;">Bezeichnung</th>
                                <th style="padding: 12px; text-align: center;">Menge</th>
                                <th style="padding: 12px; text-align: right;">Gesamtpreis</th>
                                <th style="padding: 12px; text-align: center;">Status</th>
                                <th style="padding: 12px;">Bestellt</th>
                                ${canManage ? '<th style="padding: 12px; text-align: center;">Warenannahme</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                `;

                bestellungen.forEach((bestellung, index) => {
                    const bgColor = index % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent';

                    // Status Badge
                    let statusBadge = '';
                    if (bestellung.status === 'angeliefert') {
                        statusBadge = '<span style="background: #4caf50; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">✓ Angeliefert</span>';
                    } else {
                        statusBadge = '<span style="background: #ff9800; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">📦 Bestellt</span>';
                    }

                    // Bestellt am formatieren
                    const bestelltAm = bestellung.bestelltAm ? new Date(bestellung.bestelltAm).toLocaleDateString('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    }) : 'N/A';

                    const bestelltVon = bestellung.bestelltVon || 'Unbekannt';

                    // Warenannahme Button (nur für status='bestellt' + Permission)
                    let actionButton = '';
                    if (bestellung.status === 'bestellt' && canManage) {
                        actionButton = `
                            <button onclick="markAsAngeliefertInModal('${bestellung.id}', '${fahrzeugId}')"
                                    style="padding: 6px 12px; background: #4caf50; color: white; border: none; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 4px; margin: 0 auto;">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                Angeliefert
                            </button>
                        `;
                    } else if (bestellung.status === 'angeliefert') {
                        // Zeige Angeliefert-Info
                        const angeliefertAm = bestellung.angeliefertAm ? new Date(bestellung.angeliefertAm).toLocaleDateString('de-DE') : 'N/A';
                        const angeliefertVon = bestellung.angeliefertVon || 'Unbekannt';
                        actionButton = `<div style="font-size: 11px; color: #4caf50; text-align: center;">${angeliefertAm}<br>${angeliefertVon}</div>`;
                    }

                    html += `
                        <tr style="border-bottom: 1px solid var(--color-border); background: ${bgColor};">
                            <td style="padding: 12px; font-family: 'Courier New', monospace; font-weight: 600;">${bestellung.etn || 'N/A'}</td>
                            <td style="padding: 12px;">${bestellung.benennung || 'Unbekannt'}</td>
                            <td style="padding: 12px; text-align: center; font-weight: 600;">${bestellung.menge || 1}</td>
                            <td style="padding: 12px; text-align: right; font-family: 'Courier New', monospace; font-weight: 600; color: #2196f3;">${(bestellung.gesamtpreis || 0).toFixed(2)} €</td>
                            <td style="padding: 12px; text-align: center;">${statusBadge}</td>
                            <td style="padding: 12px; font-size: 13px; color: var(--color-text-secondary);">${bestelltAm}<br><span style="font-size: 11px;">${bestelltVon}</span></td>
                            ${canManage ? `<td style="padding: 12px; text-align: center;">${actionButton}</td>` : ''}
                        </tr>
                    `;
                });

                html += `
                        </tbody>
                    </table>
                `;

                container.innerHTML = html;

            } catch (error) {
                console.error('❌ Fehler beim Laden der Bestellungen:', error);
                container.innerHTML = `<p style="color: var(--color-error); padding: 20px;">❌ Fehler: ${error.message}</p>`;
            }
        }

        async function markAsAngeliefertInModal(bestellungId, fahrzeugId) {
            if (!confirm('Bestellung als angeliefert markieren?\n\nDies bestätigt die Warenannahme.')) {
                return;
            }

            try {
                console.log('📦 [WARENANNAHME] Markiere Bestellung als angeliefert:', bestellungId);

                // User-Info abrufen
                const currentUser = window.authManager?.getCurrentUser();
                const userName = currentUser?.name || localStorage.getItem('userName') || 'Unbekannt';

                // Firestore Update
                await window.getCollection('bestellungen').doc(bestellungId).update({
                    status: 'angeliefert',
                    angeliefertAm: new Date().toISOString(),
                    angeliefertVon: userName
                });

                console.log('✅ [WARENANNAHME] Status aktualisiert');

                // Reload Bestellungen im Modal (aktualisiert Tabelle)
                await loadBestellungenForModal(fahrzeugId);

                // Success Notification
                alert('✅ Bestellung als angeliefert markiert!\n\nWareneingang wurde erfasst.');

                // Event emittieren (falls andere Komponenten benachrichtigt werden müssen)
                if (typeof window.appEvents?.emit === 'function') {
                    window.appEvents.emit('materialUpdated', {
                        bestellungId,
                        status: 'angeliefert',
                        timestamp: new Date().toISOString()
                    });
                }

            } catch (error) {
                console.error('❌ [WARENANNAHME] Fehler beim Status-Update:', error);
                alert(`❌ Fehler beim Markieren:\n\n${error.message}\n\nBitte erneut versuchen oder Support kontaktieren.`);
            }
        }

        // ============================================
        // 📱 MOBILE KANBAN DASHBOARD SYSTEM
        // ============================================

        // State Management
        let mobileViewMode = 'dashboard'; // 'dashboard' | 'detail'
        let activeColumnId = null;
        let activeColumnIndex = 0;

        // Category mapping for color-coding
        const statusCategories = {
            // Gray - New/Accepted
            'angenommen': 'gray',
            'neu': 'gray',
            'terminiert': 'gray',
            // Blue - Work in Progress
            'vorbereitung': 'blue',
            'lackierung': 'blue',
            'in_arbeit': 'blue',
            'bestellung': 'blue',
            'angekommen': 'blue',
            'montage': 'blue',
            'wuchten': 'blue',
            'diagnose': 'blue',
            'angebot': 'blue',
            'beauftragt': 'blue',
            'reparatur': 'blue',
            'test': 'blue',
            'termin': 'blue',
            'termin_gebucht': 'blue',
            'aufbereitung': 'blue',
            'pruefung': 'blue',
            // Orange - Quality Control
            'trocknung': 'orange',
            'qualitaetskontrolle': 'orange',
            'qk': 'orange',
            'qualitaet': 'orange',
            'gutachten': 'orange',
            // Green - Ready/Done
            'bereit': 'green',
            'fertig': 'green',
            'abholbereit': 'green',
            'freigabe': 'green'
        };

        // Icon mapping for dashboard cards
        const statusIcons = {
            'angenommen': '📥',
            'neu': '📥',
            'terminiert': '📅',
            'vorbereitung': '🔧',
            'lackierung': '🎨',
            'in_arbeit': '⚙️',
            'trocknung': '⏱️',
            'qualitaetskontrolle': '🔍',
            'qk': '🔍',
            'qualitaet': '🔍',
            'bereit': '✅',
            'fertig': '✅',
            'abholbereit': '🚗',
            'freigabe': '✅',
            'bestellung': '📦',
            'angekommen': '✓',
            'montage': '🔩',
            'wuchten': '⚖️',
            'diagnose': '🔬',
            'angebot': '💰',
            'beauftragt': '✔️',
            'reparatur': '🔧',
            'test': '🧪',
            'termin': '📆',
            'termin_gebucht': '📆',
            'aufbereitung': '✨',
            'pruefung': '📋',
            'gutachten': '📄'
        };

        // Render Dashboard View
        function renderDashboard() {
            const dashboardContainer = document.getElementById('kanbanDashboard');
            const process = processDefinitions[currentProcess];

            if (!process || !dashboardContainer) return;

            // Clear dashboard
            dashboardContainer.innerHTML = '';
            dashboardContainer.style.display = 'grid';

            // Create column cards
            process.steps.forEach((step, index) => {
                // Count vehicles in this column
                const count = allFahrzeuge.filter(f => {
                    const fahrzeugServiceTyp = f.serviceTyp || 'lackier';
                    const fahrzeugStatus = f.prozessStatus || 'angenommen';

                    const serviceTypToProcessKey = {
                        'lackierung': 'lackier',
                        'lackier': 'lackier',
                        'reifen': 'reifen',
                        'mechanik': 'mechanik',
                        'pflege': 'pflege',
                        'tuev': 'tuev',
                        'versicherung': 'versicherung',
                        'glas': 'glas',
                        'klima': 'klima',
                        'dellen': 'dellen',
                        'folierung': 'folierung',
                        'steinschutz': 'steinschutz',
                        'werbebeklebung': 'werbebeklebung'
                    };
                    const processKey = serviceTypToProcessKey[fahrzeugServiceTyp] || fahrzeugServiceTyp;

                    return (currentProcess === 'alle' || processKey === currentProcess) && fahrzeugStatus === step.id;
                }).length;

                // Check for urgent items
                const hasUrgent = allFahrzeuge.some(f => {
                    const fahrzeugStatus = f.prozessStatus || 'angenommen';
                    if (fahrzeugStatus !== step.id) return false;

                    const abholungDate = f.abholung ? new Date(f.abholung) : null;
                    if (!abholungDate) return false;

                    const heute = new Date();
                    heute.setHours(0, 0, 0, 0);
                    return abholungDate <= heute;
                });

                const category = statusCategories[step.id] || 'blue';
                const icon = statusIcons[step.id] || '📋';

                const card = document.createElement('div');
                card.className = 'dashboard-column-card';
                card.dataset.category = category;
                card.dataset.columnId = step.id;
                card.dataset.columnIndex = index;
                card.onclick = () => showColumnDetail(step.id, index);

                card.innerHTML = `
                    <div class="dashboard-column-icon">${icon}</div>
                    <div class="dashboard-column-name">${step.label}</div>
                    <div class="dashboard-column-count">${count}</div>
                    ${hasUrgent ? '<div class="dashboard-urgency-indicator">🚨</div>' : ''}
                `;

                dashboardContainer.appendChild(card);
            });
        }

        // Show Column Detail View
        function showColumnDetail(columnId, columnIndex) {
            mobileViewMode = 'detail';
            activeColumnId = columnId;
            activeColumnIndex = columnIndex;

            const process = processDefinitions[currentProcess];
            const step = process.steps[columnIndex];

            // Hide dashboard, show detail
            document.getElementById('kanbanDashboard').style.display = 'none';
            document.getElementById('kanbanBoard').style.display = 'none';
            document.getElementById('kanbanColumnDetail').style.display = 'block';

            // Update header
            document.getElementById('detailColumnName').textContent = step.label;

            // Filter vehicles for this column
            const fahrzeuge = allFahrzeuge.filter(f => {
                const fahrzeugServiceTyp = f.serviceTyp || 'lackier';
                const fahrzeugStatus = f.prozessStatus || 'angenommen';

                const serviceTypToProcessKey = {
                    'lackierung': 'lackier',
                    'lackier': 'lackier',
                    'reifen': 'reifen',
                    'mechanik': 'mechanik',
                    'pflege': 'pflege',
                    'tuev': 'tuev',
                    'versicherung': 'versicherung',
                    'glas': 'glas',
                    'klima': 'klima',
                    'dellen': 'dellen',
                    'folierung': 'folierung',
                    'steinschutz': 'steinschutz',
                    'werbebeklebung': 'werbebeklebung'
                };
                const processKey = serviceTypToProcessKey[fahrzeugServiceTyp] || fahrzeugServiceTyp;

                return (currentProcess === 'alle' || processKey === currentProcess) && fahrzeugStatus === columnId;
            });

            document.getElementById('detailColumnCount').textContent = fahrzeuge.length;

            // Render cards (reuse existing card rendering logic)
            const cardsContainer = document.getElementById('detailCards');
            cardsContainer.innerHTML = '';

            if (fahrzeuge.length === 0) {
                cardsContainer.innerHTML = '<div class="empty-column">Keine Fahrzeuge</div>';
            } else {
                fahrzeuge.forEach(fahrzeug => {
                    const card = createVehicleCard(fahrzeug);
                    cardsContainer.appendChild(card);
                });
            }

            // Update navigation buttons
            document.getElementById('prevColumnBtn').disabled = columnIndex === 0;
            document.getElementById('nextColumnBtn').disabled = columnIndex === process.steps.length - 1;

            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }

        // Navigate between columns
        function navigateColumn(direction) {
            const process = processDefinitions[currentProcess];
            let newIndex = activeColumnIndex;

            if (direction === 'prev' && activeColumnIndex > 0) {
                newIndex = activeColumnIndex - 1;
            } else if (direction === 'next' && activeColumnIndex < process.steps.length - 1) {
                newIndex = activeColumnIndex + 1;
            }

            if (newIndex !== activeColumnIndex) {
                const newStep = process.steps[newIndex];
                showColumnDetail(newStep.id, newIndex);
            }
        }

        // Show Dashboard (back from detail)
        function showDashboard() {
            mobileViewMode = 'dashboard';
            activeColumnId = null;

            document.getElementById('kanbanDashboard').style.display = 'grid';
            document.getElementById('kanbanBoard').style.display = 'none';
            document.getElementById('kanbanColumnDetail').style.display = 'none';

            // Refresh dashboard counts
            renderDashboard();

            // Re-initialize Feather icons
            if (typeof feather !== 'undefined') {
                feather.replace();
            }
        }

        // Helper: Create vehicle card (extracted from existing logic)
        function createVehicleCard(fahrzeug) {
            const card = document.createElement('div');
            card.className = 'kanban-card';
            card.draggable = true;
            card.dataset.id = fahrzeug.id;

            // Dringlichkeit berechnen
            let dringlichkeitBadge = '';
            const abholungDate = fahrzeug.abholung ? new Date(fahrzeug.abholung) : null;
            if (abholungDate) {
                const heute = new Date();
                heute.setHours(0, 0, 0, 0);
                abholungDate.setHours(0, 0, 0, 0);
                const differenz = Math.ceil((abholungDate - heute) / (1000 * 60 * 60 * 24));

                if (differenz < 0) {
                    dringlichkeitBadge = '<div class="dringlichkeit-badge ueberfaellig">🚨 ÜBERFÄLLIG!</div>';
                } else if (differenz === 0) {
                    dringlichkeitBadge = '<div class="dringlichkeit-badge heute">⚠️ HEUTE!</div>';
                } else if (differenz <= 3) {
                    dringlichkeitBadge = '<div class="dringlichkeit-badge dringend">⏰ In ' + differenz + ' Tag' + (differenz > 1 ? 'en' : '') + '</div>';
                }
            }

            // Primary Service Label
            const serviceLabel = getServiceLabelWithIcon(fahrzeug.serviceTyp || 'lackier');

            // Additional Services Badges
            let additionalServicesBadges = '';
            if (fahrzeug.additionalServices && Array.isArray(fahrzeug.additionalServices)
                && fahrzeug.additionalServices.length > 0) {
                additionalServicesBadges = fahrzeug.additionalServices
                    .map(as => `<div class="service-type-badge additional-service-badge">${getServiceLabelWithIcon(as.serviceTyp)}</div>`)
                    .join('');
            }

            card.innerHTML = `
                <div class="card-kennzeichen">${fahrzeug.kennzeichen || 'Unbekannt'}</div>
                <div class="card-info">👤 ${fahrzeug.kunde || 'Unbekannt'}</div>
                <div class="card-info">🚗 ${fahrzeug.marke || ''} ${fahrzeug.modell || ''}</div>
                <div class="card-preis">€ ${fahrzeug.preis ? fahrzeug.preis.toFixed(2) : '0.00'}</div>
                <div class="service-type-badge">${serviceLabel}</div>
                ${additionalServicesBadges}
                ${dringlichkeitBadge}
            `;

            return card;
        }

        // Detect screen size and switch views
        function updateMobileView() {
            const isMobile = window.innerWidth <= 768;

            if (isMobile) {
                // Mobile: Show dashboard or detail
                if (mobileViewMode === 'dashboard') {
                    document.getElementById('kanbanDashboard').style.display = 'grid';
                    document.getElementById('kanbanBoard').style.display = 'none';
                    document.getElementById('kanbanColumnDetail').style.display = 'none';
                    renderDashboard();
                } else {
                    // Detail view already active
                    document.getElementById('kanbanDashboard').style.display = 'none';
                    document.getElementById('kanbanBoard').style.display = 'none';
                    document.getElementById('kanbanColumnDetail').style.display = 'block';
                }
            } else {
                // Desktop: Show standard board
                document.getElementById('kanbanDashboard').style.display = 'none';
                document.getElementById('kanbanBoard').style.display = 'grid';
                document.getElementById('kanbanColumnDetail').style.display = 'none';
                mobileViewMode = 'dashboard'; // Reset for next mobile view
            }
        }

        // Initialize on load and on resize
        window.addEventListener('resize', updateMobileView);

        // Override renderKanbanBoard to also update dashboard
        const originalRenderKanbanBoard = renderKanbanBoard;
        renderKanbanBoard = function() {
            originalRenderKanbanBoard();
            updateMobileView(); // Trigger view update after board render
        };

        // ============================================
        // 🌓 THEME TOGGLE SYSTEM (mit Feather Icons Stroke-Width Update)
        // ============================================

        (function initThemeToggle() {
            const themeToggle = document.getElementById('dark-mode-toggle');
            const html = document.documentElement;

            // Update Feather Icons stroke-width based on theme
            function updateFeatherIcons(theme) {
                const strokeWidth = theme === 'light' ? '2.5' : '2';
                document.querySelectorAll('i[data-feather]').forEach(icon => {
                    const svg = icon.querySelector('svg');
                    if (svg) {
                        svg.querySelectorAll('*[stroke]').forEach(element => {
                            element.setAttribute('stroke-width', strokeWidth);
                        });
                    }
                });
            }

            // Load theme from localStorage (default: dark)
            let currentTheme = localStorage.getItem('theme') || 'dark';
            html.setAttribute('data-theme', currentTheme);

            // Theme toggle on button click
            if (themeToggle) {
                const themeToggleHandler = () => {
                    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                    html.setAttribute('data-theme', currentTheme);
                    localStorage.setItem('theme', currentTheme);

                    // Update accessibility attributes
                    themeToggle.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
                    themeToggle.setAttribute('aria-label',
                        currentTheme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
                    );

                    // Re-initialize Feather Icons with updated stroke-width
                    if (typeof feather !== 'undefined') {
                        feather.replace();
                        setTimeout(() => updateFeatherIcons(currentTheme), 50);
                    }

                    console.log(`✅ Theme switched to: ${currentTheme} (Desktop)`);
                };
                window.listenerRegistry.registerDOM(themeToggle, 'click', themeToggleHandler, 'Theme Toggle Button');

                // Set initial accessibility state
                themeToggle.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
                themeToggle.setAttribute('aria-label',
                    currentTheme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
                );
            }

            // Handle mobile theme toggle
            const mobileThemeToggle = document.getElementById('mobile-theme-toggle');
            if (mobileThemeToggle) {
                const mobileThemeToggleHandler = () => {
                    currentTheme = currentTheme === 'light' ? 'dark' : 'light';
                    html.setAttribute('data-theme', currentTheme);
                    localStorage.setItem('theme', currentTheme);

                    // Update accessibility attributes for mobile button
                    mobileThemeToggle.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
                    mobileThemeToggle.setAttribute('aria-label',
                        currentTheme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
                    );

                    // Also update desktop button if it exists
                    if (themeToggle) {
                        themeToggle.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
                        themeToggle.setAttribute('aria-label',
                            currentTheme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
                        );
                    }

                    // Re-initialize Feather Icons with updated stroke-width
                    if (typeof feather !== 'undefined') {
                        feather.replace();
                        setTimeout(() => updateFeatherIcons(currentTheme), 50);
                    }

                    console.log(`✅ Theme switched to: ${currentTheme} (Mobile)`);
                };
                window.listenerRegistry.registerDOM(mobileThemeToggle, 'click', mobileThemeToggleHandler, 'Mobile Theme Toggle Button');

                // Set initial accessibility state for mobile button
                mobileThemeToggle.setAttribute('aria-pressed', currentTheme === 'dark' ? 'true' : 'false');
                mobileThemeToggle.setAttribute('aria-label',
                    currentTheme === 'dark' ? 'Hellen Modus aktivieren' : 'Dunklen Modus aktivieren'
                );
            }

            // Initialize Feather Icons on load with correct stroke-width
            if (typeof feather !== 'undefined') {
                feather.replace();
                setTimeout(() => updateFeatherIcons(currentTheme), 50);
            }

            console.log(`🌓 Theme loaded: ${currentTheme}`);
        })();
