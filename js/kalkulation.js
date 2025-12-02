        // ============================================
        // INITIALIZATION
        // ============================================

        let kalkulationSaetze = {
            stundensatzLack: 95.00,
            stundensatzKarosserie: 85.00,
            stundensatzMechanik: 75.00,
            stundensatzSonstige: 65.00,
            awInMinuten: 5,
            mwstSatz: 19
        };

        let katalogData = [];
        let materialData = [];
        let aktuelleKalkulation = {
            positionen: [],
            materialien: [],
            fahrzeugId: null,
            kundenName: '',
            kennzeichen: ''
        };

        // ============================================
        // 🔧 BUG #8 FIX (2025-11-30): Audit-Trail Helper für User-Tracking
        // Ersetzt window.currentUser (war nie initialisiert!)
        // ============================================
        /**
         * Ermittelt aktuellen Benutzer für Audit-Trail Einträge
         * Priorität:
         * 1. sessionStorage (mitarbeiter login) - PREFERRED
         * 2. firebase.auth().currentUser - FALLBACK
         * 3. 'Meister' - LAST RESORT
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
                        user: mitarbeiter.name || mitarbeiter.email || 'Meister',
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
                    user: authUser.displayName || authUser.email || 'Meister',
                    userId: authUser.uid || null,
                    rolle: null,
                    email: authUser.email || null
                };
            }

            // Last resort - In Kalkulation-Context ist das normalerweise der Meister
            console.warn('⚠️ getCurrentUserForAudit(): Kein User gefunden! Fallback zu "Meister"');
            return {
                user: 'Meister',
                userId: null,
                rolle: null,
                email: null
            };
        }

        // ============================================
        // 🆕 NEUER KALKULATIONS-WIZARD STATE (6 Steps)
        // ============================================
        let currentStep = 1;
        let kalkWizardData = {
            fahrzeug: {
                marke: '',
                modell: '',
                baujahr: '',
                kennzeichen: '',
                farbcode: '',
                kunde: ''
            },
            serviceArt: '', // BEHALTEN für Backwards-Compat (String)
            // 🆕 MULTI-SERVICE SUPPORT (2025-11-30)
            services: [],              // Array aller Services bei Multi-Service
            currentServiceIndex: 0,    // Welcher Service wird gerade in Step 2b bearbeitet
            serviceDetailsPerService: {}, // Service-Details pro Service: { 'lackier': {...}, 'reifen': {...} }
            additionalServicesFromEntwurf: [], // Original additionalServices aus Entwurf
            isMultiService: false,     // Flag für Multi-Service Modus
            // Ende Multi-Service Support
            teile: [], // Array von { teil: 'Stoßfänger vorne', reparaturen: ['lackieren', 'spachteln'], ersatzteil: {...} }
            ersatzteile: [], // Array von { name, teilenummer, preis, lieferant, menge }
            currentPart: null,
            dbFahrzeugId: null // Falls aus DB geladen
        };

        // Geladene Fahrzeuge aus der Datenbank
        let loadedVehicles = [];
        let selectedDbVehicle = null;

        // Ersatzteile-Datenbank (aus Firestore geladen)
        let ersatzteileDB = [];

        // ============================================
        // 🚗 FAHRZEUGE AUS FIRESTORE LADEN
        // ============================================

        // Lädt Fahrzeuge beim Seitenstart
        async function loadVehiclesFromDB() {
            const loading = document.getElementById('vehicleLoading');
            const empty = document.getElementById('vehicleEmpty');
            const listItems = document.getElementById('vehicleListItems');

            if (!loading || !listItems) return;

            try {
                loading.style.display = 'flex';
                if (empty) empty.style.display = 'none';
                listItems.innerHTML = '';

                // Firebase muss initialisiert sein
                await window.firebaseInitialized;

                const werkstattId = window.werkstattId;
                if (!werkstattId) {
                    console.warn('⚠️ Keine werkstattId gefunden');
                    loading.style.display = 'none';
                    if (empty) empty.style.display = 'flex';
                    return;
                }

                // Fahrzeuge aus Firestore laden (letzte 50, nach Datum sortiert)
                if (!window.getCollection) {
                    console.warn('⚠️ getCollection nicht verfügbar');
                    loading.style.display = 'none';
                    if (empty) empty.style.display = 'flex';
                    return;
                }
                const snapshot = await window.getCollection('fahrzeuge')
                    .orderBy('erstelltAm', 'desc')
                    .limit(50)
                    .get();

                loadedVehicles = [];
                snapshot.forEach(doc => {
                    loadedVehicles.push({ id: doc.id, ...doc.data() });
                });

                loading.style.display = 'none';

                if (loadedVehicles.length === 0) {
                    if (empty) empty.style.display = 'flex';
                } else {
                    renderVehicleList(loadedVehicles);
                }

                console.log(`✅ ${loadedVehicles.length} Fahrzeuge geladen`);

            } catch (error) {
                console.error('❌ Fehler beim Laden der Fahrzeuge:', error);
                loading.style.display = 'none';
                if (empty) empty.style.display = 'flex';
            }
        }

        // Rendert die Fahrzeugliste
        function renderVehicleList(vehicles) {
            const listItems = document.getElementById('vehicleListItems');
            const empty = document.getElementById('vehicleEmpty');

            if (!listItems) return;

            if (vehicles.length === 0) {
                listItems.innerHTML = '';
                if (empty) empty.style.display = 'flex';
                return;
            }

            if (empty) empty.style.display = 'none';

            listItems.innerHTML = vehicles.map(v => {
                const marke = v.fahrzeugmarke || v.marke || '-';
                const modell = v.fahrzeugmodell || v.modell || '';
                const kennzeichen = v.kennzeichen || '';
                const kunde = v.kundenName || v.kunde || '';
                const serviceTyp = v.serviceTyp || '';
                const serviceLabel = SERVICE_LABELS[serviceTyp] || serviceTyp;

                return `
                    <div class="kalk-vehicle-item ${selectedDbVehicle && selectedDbVehicle.id === v.id ? 'selected' : ''}"
                         onclick="selectVehicleFromDB('${v.id}')">
                        <div class="kalk-vehicle-item__icon">🚗</div>
                        <div class="kalk-vehicle-item__info">
                            <div class="kalk-vehicle-item__name">${marke} ${modell}</div>
                            <div class="kalk-vehicle-item__details">
                                ${kennzeichen ? `🔖 ${kennzeichen}` : ''}
                                ${kunde ? ` • 👤 ${kunde}` : ''}
                            </div>
                        </div>
                        ${serviceLabel ? `<span class="kalk-vehicle-item__service">${serviceLabel}</span>` : ''}
                    </div>
                `;
            }).join('');
        }

        // Suche in geladenen Fahrzeugen
        function searchVehicles() {
            const input = document.getElementById('vehicleSearchInput');
            const query = (input?.value || '').toLowerCase().trim();

            if (!query) {
                renderVehicleList(loadedVehicles);
                return;
            }

            const filtered = loadedVehicles.filter(v => {
                const marke = (v.fahrzeugmarke || v.marke || '').toLowerCase();
                const modell = (v.fahrzeugmodell || v.modell || '').toLowerCase();
                const kennzeichen = (v.kennzeichen || '').toLowerCase();
                const kunde = (v.kundenName || v.kunde || '').toLowerCase();

                return marke.includes(query) ||
                       modell.includes(query) ||
                       kennzeichen.includes(query) ||
                       kunde.includes(query);
            });

            renderVehicleList(filtered);
        }

        // Fahrzeug aus DB auswählen
        function selectVehicleFromDB(vehicleId) {
            const vehicle = loadedVehicles.find(v => String(v.id) === String(vehicleId));
            if (!vehicle) {
                console.error('Fahrzeug nicht gefunden:', vehicleId);
                return;
            }

            selectedDbVehicle = vehicle;

            // Wizard-Daten befüllen
            kalkWizardData.fahrzeug = {
                marke: vehicle.fahrzeugmarke || vehicle.marke || '',
                modell: vehicle.fahrzeugmodell || vehicle.modell || '',
                baujahr: vehicle.baujahr || '',
                kennzeichen: vehicle.kennzeichen || '',
                farbcode: vehicle.farbnummer || vehicle.farbcode || '',
                kunde: vehicle.kundenName || vehicle.kunde || '',
                // 🆕 FIX (Nov 30, 2025): Zusätzliche Felder für Meister-Übersicht
                kmstand: vehicle.kmstand || vehicle.kilometerstand || '',
                anliefertermin: vehicle.anliefertermin || vehicle.liefertermin || '',
                abholtermin: vehicle.abholtermin || vehicle.fertigstellungsdatum || '',
                ersatzfahrzeug: vehicle.ersatzfahrzeug || vehicle.ersatzfahrzeugGewuenscht || ''
            };
            kalkWizardData.dbFahrzeugId = vehicle.id;

            // 🆕 Auch auf Root-Level für einfacheren Zugriff
            kalkWizardData.kmstand = kalkWizardData.fahrzeug.kmstand;
            kalkWizardData.anliefertermin = kalkWizardData.fahrzeug.anliefertermin;
            kalkWizardData.abholtermin = kalkWizardData.fahrzeug.abholtermin;

            // 🚗 Ersatzfahrzeug-Daten als Objekt übernehmen (FIX: Nov 30, 2025)
            const ersatzfahrzeugFromVehicle = vehicle.kalkulationData?.ersatzfahrzeug;
            if (ersatzfahrzeugFromVehicle && typeof ersatzfahrzeugFromVehicle === 'object') {
                kalkWizardData.ersatzfahrzeug = ersatzfahrzeugFromVehicle;
                console.log('🚗 Ersatzfahrzeug-Kosten aus Fahrzeug geladen:', ersatzfahrzeugFromVehicle);
            } else {
                kalkWizardData.ersatzfahrzeug = kalkWizardData.fahrzeug.ersatzfahrzeug;
            }

            // Wenn Service bereits gesetzt ist, übernehmen
            if (vehicle.serviceTyp) {
                kalkWizardData.serviceArt = vehicle.serviceTyp;
            }

            // UI aktualisieren
            const selectedDisplay = document.getElementById('selectedDbVehicle');
            const nameEl = document.getElementById('selectedVehicleName');
            const kennzeichenEl = document.getElementById('selectedVehicleKennzeichen');
            const kundeEl = document.getElementById('selectedVehicleKunde');

            if (selectedDisplay) {
                selectedDisplay.style.display = 'block';
                if (nameEl) nameEl.textContent = `${kalkWizardData.fahrzeug.marke} ${kalkWizardData.fahrzeug.modell}`;
                if (kennzeichenEl) kennzeichenEl.textContent = kalkWizardData.fahrzeug.kennzeichen ? `🔖 ${kalkWizardData.fahrzeug.kennzeichen}` : '';
                if (kundeEl) kundeEl.textContent = kalkWizardData.fahrzeug.kunde ? `👤 ${kalkWizardData.fahrzeug.kunde}` : '';
            }

            // Tabs ausblenden, da Fahrzeug gewählt
            const tabsContainer = document.querySelector('.kalk-vehicle-tabs');
            const tabExisting = document.getElementById('tabExisting');
            const tabNew = document.getElementById('tabNew');

            if (tabsContainer) tabsContainer.style.display = 'none';
            if (tabExisting) tabExisting.style.display = 'none';
            if (tabNew) tabNew.style.display = 'none';

            // Liste aktualisieren
            renderVehicleList(loadedVehicles);

            showToast(`Fahrzeug "${kalkWizardData.fahrzeug.marke} ${kalkWizardData.fahrzeug.modell}" ausgewählt`, 'success');
            feather.replace();
        }

        // Auswahl zurücksetzen
        function clearSelectedVehicle() {
            selectedDbVehicle = null;
            selectedEntwurf = null;
            selectedPartnerAnfrage = null;
            kalkWizardData.fahrzeug = {
                marke: '', modell: '', baujahr: '', kennzeichen: '', farbcode: '', kunde: ''
            };
            kalkWizardData.dbFahrzeugId = null;
            kalkWizardData.entwurfId = null;
            kalkWizardData.partnerAnfrageId = null;
            kalkWizardData.entwurfPhotos = [];
            kalkWizardData.serviceArt = '';

            // UI zurücksetzen
            const selectedDisplay = document.getElementById('selectedDbVehicle');
            const tabsContainer = document.querySelector('.kalk-vehicle-tabs');
            const tabEntwurf = document.getElementById('tabEntwurf');

            if (selectedDisplay) selectedDisplay.style.display = 'none';
            if (tabsContainer) tabsContainer.style.display = 'flex';
            // Zeige Standard-Tab (Entwurf)
            if (tabEntwurf) tabEntwurf.style.display = 'block';

            // Liste aktualisieren
            renderVehicleList(loadedVehicles);
            feather.replace();
        }

        // Tab-Wechsel in Step 1
        function switchVehicleTab(tab) {
            const buttons = document.querySelectorAll('.kalk-vehicle-tab');
            const tabEntwurf = document.getElementById('tabEntwurf');
            const tabPartner = document.getElementById('tabPartner');
            const tabExisting = document.getElementById('tabExisting');
            const tabNew = document.getElementById('tabNew');

            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tab);
            });

            // Hide all tabs
            if (tabEntwurf) tabEntwurf.style.display = 'none';
            if (tabPartner) tabPartner.style.display = 'none';
            if (tabExisting) tabExisting.style.display = 'none';
            if (tabNew) tabNew.style.display = 'none';

            // Show selected tab
            if (tab === 'entwurf') {
                if (tabEntwurf) tabEntwurf.style.display = 'block';
                loadEntwuerfe(); // Entwürfe laden
            } else if (tab === 'partner') {
                if (tabPartner) tabPartner.style.display = 'block';
                loadPartnerAnfragen(); // Partner-Anfragen laden
            } else if (tab === 'existing') {
                if (tabExisting) tabExisting.style.display = 'block';
            } else if (tab === 'new') {
                if (tabNew) tabNew.style.display = 'block';
            }

            feather.replace();
        }

        // ============================================
        // 🆕 ENTWURF-INTEGRATION (Workflow: Annahme → Kalkulation)
        // ============================================

        let loadedEntwuerfe = [];
        let selectedEntwurf = null;

        async function loadEntwuerfe() {
            const loading = document.getElementById('entwurfLoading');
            const empty = document.getElementById('entwurfEmpty');
            const listItems = document.getElementById('entwurfListItems');
            const countBadge = document.getElementById('entwurfCount');

            if (!loading || !listItems) return;

            try {
                loading.style.display = 'flex';
                if (empty) empty.style.display = 'none';
                listItems.innerHTML = '';

                await window.firebaseInitialized;
                if (!window.werkstattId || !window.getCollection) {
                    console.warn('⚠️ loadEntwuerfe: werkstattId oder getCollection nicht verfügbar');
                    loading.style.display = 'none';
                    if (empty) empty.style.display = 'flex';
                    return;
                }

                // Entwürfe aus partnerAnfragen laden (isEntwurf=true, entwurfStatus=offen)
                const snapshot = await window.getCollection('partnerAnfragen')
                    .where('isEntwurf', '==', true)
                    .where('entwurfStatus', '==', 'offen')
                    .orderBy('timestamp', 'desc')
                    .limit(50)
                    .get();

                loadedEntwuerfe = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // 🔧 FIX Nov 29, 2025: Nur Entwürfe OHNE Kalkulation anzeigen
                    // Entwürfe mit kalkulationErstelltAm haben bereits eine KVA
                    // Diese sollen in entwuerfe-bearbeiten.html weiter bearbeitet werden
                    if (!data.kalkulationErstelltAm) {
                        loadedEntwuerfe.push({ id: doc.id, ...data });
                    }
                });

                loading.style.display = 'none';

                // Badge aktualisieren
                if (countBadge) {
                    if (loadedEntwuerfe.length > 0) {
                        countBadge.textContent = loadedEntwuerfe.length;
                        countBadge.style.display = 'inline';
                    } else {
                        countBadge.style.display = 'none';
                    }
                }

                if (loadedEntwuerfe.length === 0) {
                    if (empty) empty.style.display = 'flex';
                } else {
                    renderEntwuerfeListe(loadedEntwuerfe);
                }

                console.log(`📝 ${loadedEntwuerfe.length} Entwürfe geladen`);

            } catch (error) {
                console.error('❌ Fehler beim Laden der Entwürfe:', error);
                loading.style.display = 'none';
                if (empty) empty.style.display = 'flex';
            }
        }

        function renderEntwuerfeListe(entwuerfe) {
            const container = document.getElementById('entwurfListItems');
            if (!container) return;

            container.innerHTML = entwuerfe.map(entwurf => {
                // 🆕 MULTI-SERVICE SUPPORT (2025-11-30)
                const services = Array.isArray(entwurf.serviceTyp)
                    ? entwurf.serviceTyp
                    : [entwurf.serviceTyp || 'lackier'];
                const isMultiService = services.length > 1;
                const serviceLabelsStr = services.map(s => SERVICE_LABELS[s] || s).join(' + ');
                // 🔧 FIX Bug #5 (2025-12-01): Fahrzeugschein-Fotos hinzufügen
                const schadenFotos = entwurf.photoUrls || entwurf.photos || [];
                const fahrzeugscheinFotos = entwurf.fahrzeugscheinFotos || [];
                const photos = [...schadenFotos, ...fahrzeugscheinFotos];
                const hasPhotos = photos.length > 0;

                return `
                    <div class="entwurf-item ${selectedEntwurf?.id === entwurf.id ? 'selected' : ''}"
                         onclick="selectEntwurf('${entwurf.id}')">
                        <div class="entwurf-item__icon">${isMultiService ? '📦' : '📝'}</div>
                        <div class="entwurf-item__info">
                            <div class="entwurf-item__title">
                                ${entwurf.kennzeichen || 'Ohne Kennzeichen'}
                                ${entwurf.marke ? `- ${entwurf.marke} ${entwurf.modell || ''}` : ''}
                                ${isMultiService ? '<span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; font-size: 10px; padding: 2px 6px; border-radius: 8px; margin-left: 8px;">MULTI</span>' : ''}
                            </div>
                            <div class="entwurf-item__meta">
                                <span><i data-feather="user" style="width:12px;height:12px;"></i> ${entwurf.kundenname || '-'}</span>
                                <span><i data-feather="calendar" style="width:12px;height:12px;"></i> ${entwurf.datum || '-'}</span>
                                <span class="entwurf-item__service">${serviceLabelsStr}</span>
                            </div>
                            ${hasPhotos ? `
                                <div class="entwurf-item__photos">
                                    ${photos.slice(0, 3).map(url => `
                                        <img src="${url}" class="entwurf-item__photo" alt="Foto">
                                    `).join('')}
                                    ${photos.length > 3 ? `
                                        <div class="entwurf-item__photo-more">+${photos.length - 3}</div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="entwurf-item__arrow">
                            <i data-feather="chevron-right"></i>
                        </div>
                    </div>
                `;
            }).join('');

            feather.replace();
        }

        function selectEntwurf(entwurfId) {
            selectedEntwurf = loadedEntwuerfe.find(e => e.id === entwurfId);
            if (!selectedEntwurf) {
                console.error('Entwurf nicht gefunden:', entwurfId);
                return;
            }

            console.log('📝 Entwurf ausgewählt:', selectedEntwurf);

            // Highlight selected item
            document.querySelectorAll('.entwurf-item').forEach(item => {
                item.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');

            // Fahrzeugdaten aus Entwurf übernehmen
            kalkWizardData.entwurfId = selectedEntwurf.id;
            kalkWizardData.fahrzeug = {
                marke: selectedEntwurf.marke || '',
                modell: selectedEntwurf.modell || '',
                baujahr: selectedEntwurf.baujahrVon || '',
                kennzeichen: selectedEntwurf.kennzeichen || '',
                farbcode: selectedEntwurf.farbcode || selectedEntwurf.farbnummer || '',
                kunde: selectedEntwurf.kundenname || '',
                // 🆕 FIX (Nov 30, 2025): Zusätzliche Felder für Meister-Übersicht
                kmstand: selectedEntwurf.kmstand || selectedEntwurf.kilometerstand || '',
                anliefertermin: selectedEntwurf.anliefertermin || selectedEntwurf.liefertermin || '',
                abholtermin: selectedEntwurf.abholtermin || selectedEntwurf.fertigstellungsdatum || '',
                ersatzfahrzeug: selectedEntwurf.ersatzfahrzeug || selectedEntwurf.ersatzfahrzeugGewuenscht || ''
            };

            // 🆕 Auch auf Root-Level für einfacheren Zugriff
            kalkWizardData.kmstand = kalkWizardData.fahrzeug.kmstand;
            kalkWizardData.anliefertermin = kalkWizardData.fahrzeug.anliefertermin;
            kalkWizardData.abholtermin = kalkWizardData.fahrzeug.abholtermin;

            // 🚗 Ersatzfahrzeug-Daten als Objekt übernehmen (FIX: Nov 30, 2025)
            const ersatzfahrzeugFromEntwurf = selectedEntwurf.kalkulationData?.ersatzfahrzeug;
            if (ersatzfahrzeugFromEntwurf && typeof ersatzfahrzeugFromEntwurf === 'object') {
                kalkWizardData.ersatzfahrzeug = ersatzfahrzeugFromEntwurf;
                console.log('🚗 Ersatzfahrzeug-Kosten aus Entwurf geladen:', ersatzfahrzeugFromEntwurf);
            } else {
                kalkWizardData.ersatzfahrzeug = kalkWizardData.fahrzeug.ersatzfahrzeug;
            }

            // Schadensbeschreibung/Notizen aus Entwurf
            kalkWizardData.schadenBeschreibung = selectedEntwurf.schadenBeschreibung || selectedEntwurf.beschreibung || '';
            kalkWizardData.notizen = selectedEntwurf.notizen || '';

            // 🆕 MULTI-SERVICE SUPPORT (2025-11-30)
            // Service-Art(en) übernehmen
            if (Array.isArray(selectedEntwurf.serviceTyp) && selectedEntwurf.serviceTyp.length > 0) {
                kalkWizardData.services = [...selectedEntwurf.serviceTyp];
                kalkWizardData.isMultiService = selectedEntwurf.serviceTyp.length > 1;
            } else {
                kalkWizardData.services = [selectedEntwurf.serviceTyp || 'lackier'];
                kalkWizardData.isMultiService = false;
            }
            kalkWizardData.serviceArt = kalkWizardData.services[0]; // Backwards-Compat: Erster Service
            kalkWizardData.currentServiceIndex = 0;
            kalkWizardData.serviceDetailsPerService = {};

            // additionalServices aus Entwurf laden (für Service-Details)
            if (selectedEntwurf.additionalServices && Array.isArray(selectedEntwurf.additionalServices)) {
                kalkWizardData.additionalServicesFromEntwurf = selectedEntwurf.additionalServices;
                console.log('🆕 Multi-Service: additionalServices geladen:', kalkWizardData.additionalServicesFromEntwurf);
            } else {
                kalkWizardData.additionalServicesFromEntwurf = [];
            }

            // 🔧 FIX (2025-11-30): Service-Details aus Entwurf in serviceDetailsPerService vorausfüllen
            // Problem: Ohne diesen Code müssen bereits eingegebene Details nochmal eingegeben werden
            kalkWizardData.serviceDetailsPerService = {};

            // 🔧 Feldnamen-Mapping (annahme.html → kalkulation.html SERVICE_CONFIG)
            // annahme.html verwendet teilweise andere Feldnamen als SERVICE_CONFIG.zusatzfelder
            // 🆕 UPDATE Nov 30, 2025: SERVICE_CONFIG wurde erweitert um ALLE Felder aus annahme.html
            // Mappings nur noch nötig wo Feldnamen unterschiedlich sind
            const normalizeServiceDetails = (details) => {
                if (!details || typeof details !== 'object') return {};
                const normalized = { ...details };

                // ===== REIFEN-MAPPING =====
                // reifentyp → reifenTyp (camelCase in SERVICE_CONFIG)
                if (normalized.reifentyp !== undefined) {
                    normalized.reifenTyp = normalized.reifentyp;
                    delete normalized.reifentyp;
                }
                // reifengroesse ✅ (gleich)
                // reifenanzahl ✅ (jetzt in SERVICE_CONFIG)

                // ===== GLAS-MAPPING =====
                // scheibentyp, schadensgroesse, glasposition ✅ (jetzt in SERVICE_CONFIG)
                // kalibrierungNoetig ✅ (gleich)

                // ===== KLIMA-MAPPING =====
                // kaeltemittel ✅ (gleich)
                // klimaservice ✅ (jetzt in SERVICE_CONFIG)
                // klimaproblem ✅ (jetzt in SERVICE_CONFIG)

                // ===== DELLEN-MAPPING =====
                // dellenanzahl, dellengroesse, lackschaden, dellenpositionen ✅ (jetzt in SERVICE_CONFIG)

                // ===== MECHANIK-MAPPING =====
                // problem ✅ (jetzt in SERVICE_CONFIG)
                // symptome ✅ (gleich)

                // ===== VERSICHERUNG-MAPPING =====
                // schadensnummer, versicherung, schadendatum, unfallhergang ✅ (jetzt in SERVICE_CONFIG)

                // ===== PFLEGE-MAPPING =====
                // paket → pflegePaket
                if (normalized.paket !== undefined) {
                    normalized.pflegePaket = normalized.paket;
                    delete normalized.paket;
                }
                // zusatzleistungen ✅ (jetzt in SERVICE_CONFIG)

                // ===== TUEV-MAPPING =====
                // faelligkeit → huDatum
                if (normalized.faelligkeit !== undefined) {
                    normalized.huDatum = normalized.faelligkeit;
                    delete normalized.faelligkeit;
                }
                // pruefart ✅ (jetzt in SERVICE_CONFIG)
                // bekannteMaengel ✅ (gleich)

                // ===== FOLIERUNG-MAPPING =====
                // folierungArt ✅ (jetzt in SERVICE_CONFIG)
                // folierungMaterial → folienTyp
                if (normalized.folierungMaterial !== undefined) {
                    normalized.folienTyp = normalized.folierungMaterial;
                    delete normalized.folierungMaterial;
                }
                // folierungSpezialTyp ✅ (jetzt in SERVICE_CONFIG)
                // folierungFarbe → folienFarbe
                if (normalized.folierungFarbe !== undefined) {
                    normalized.folienFarbe = normalized.folierungFarbe;
                    delete normalized.folierungFarbe;
                }
                // folierungBereiche ✅ (jetzt in SERVICE_CONFIG)
                // folierungDesign → designBeschreibung
                if (normalized.folierungDesign !== undefined) {
                    normalized.designBeschreibung = normalized.folierungDesign;
                    delete normalized.folierungDesign;
                }
                // folierungInfo ✅ (jetzt in SERVICE_CONFIG)

                // ===== STEINSCHUTZ-MAPPING =====
                // steinschutzUmfang ✅ (jetzt in SERVICE_CONFIG)
                // steinschutzMaterial → folienTyp
                if (normalized.steinschutzMaterial !== undefined) {
                    normalized.folienTyp = normalized.steinschutzMaterial;
                    delete normalized.steinschutzMaterial;
                }
                // steinschutzBereiche ✅ (jetzt in SERVICE_CONFIG)
                // steinschutzInfo ✅ (jetzt in SERVICE_CONFIG)

                // ===== WERBEBEKLEBUNG-MAPPING =====
                // werbebeklebungUmfang ✅ (jetzt in SERVICE_CONFIG)
                // werbebeklebungKomplexitaet → designKomplexitaet
                if (normalized.werbebeklebungKomplexitaet !== undefined) {
                    normalized.designKomplexitaet = normalized.werbebeklebungKomplexitaet;
                    delete normalized.werbebeklebungKomplexitaet;
                }
                // werbebeklebungText ✅ (jetzt in SERVICE_CONFIG)
                // werbebeklebungFarbanzahl → farbanzahl
                if (normalized.werbebeklebungFarbanzahl !== undefined) {
                    normalized.farbanzahl = parseInt(normalized.werbebeklebungFarbanzahl) || 2;
                    delete normalized.werbebeklebungFarbanzahl;
                }
                // werbebeklebungInfo ✅ (jetzt in SERVICE_CONFIG)

                // ===== LACKIERUNG/LACKIER-MAPPING =====
                // farbname, farbvariante, farbnummer, lackart ✅ (jetzt in SERVICE_CONFIG)
                // ersatzfahrzeugGewuenscht ✅ (jetzt in SERVICE_CONFIG)
                // Boolean zu String konvertieren für Select-Feld
                if (normalized.ersatzfahrzeugGewuenscht !== undefined) {
                    if (typeof normalized.ersatzfahrzeugGewuenscht === 'boolean') {
                        normalized.ersatzfahrzeugGewuenscht = normalized.ersatzfahrzeugGewuenscht ? 'ja' : 'nein';
                    }
                }

                console.log('📋 Normalisierte Service-Details:', normalized);
                return normalized;
            };

            // 1. Primary Service Details laden
            const primaryService = kalkWizardData.services[0];
            if (selectedEntwurf.serviceDetails && typeof selectedEntwurf.serviceDetails === 'object') {
                kalkWizardData.serviceDetailsPerService[primaryService] = normalizeServiceDetails(selectedEntwurf.serviceDetails);
                console.log(`📋 Primary Service "${primaryService}" Details vorausgefüllt:`, kalkWizardData.serviceDetailsPerService[primaryService]);
            }

            // 2. Additional Services Details laden
            if (kalkWizardData.additionalServicesFromEntwurf.length > 0) {
                kalkWizardData.additionalServicesFromEntwurf.forEach(addService => {
                    if (addService.serviceTyp && addService.serviceDetails && typeof addService.serviceDetails === 'object') {
                        kalkWizardData.serviceDetailsPerService[addService.serviceTyp] = normalizeServiceDetails(addService.serviceDetails);
                        console.log(`📋 Additional Service "${addService.serviceTyp}" Details vorausgefüllt:`, kalkWizardData.serviceDetailsPerService[addService.serviceTyp]);
                    }
                });
            }

            // 3. Falls bereits serviceDetailsPerService vom vorherigen Kalkulations-Durchlauf existiert (Priorität!)
            if (selectedEntwurf.serviceDetailsPerService && typeof selectedEntwurf.serviceDetailsPerService === 'object') {
                Object.keys(selectedEntwurf.serviceDetailsPerService).forEach(serviceKey => {
                    // Überschreibe mit Kalkulations-Daten (haben Priorität über Entwurf-Daten)
                    kalkWizardData.serviceDetailsPerService[serviceKey] = {
                        ...kalkWizardData.serviceDetailsPerService[serviceKey], // Entwurf-Basis
                        ...selectedEntwurf.serviceDetailsPerService[serviceKey]  // Kalkulations-Override
                    };
                    console.log(`📋 Kalkulations-Details für "${serviceKey}" übernommen (Priorität):`, kalkWizardData.serviceDetailsPerService[serviceKey]);
                });
            }

            console.log('✅ serviceDetailsPerService vollständig geladen:', kalkWizardData.serviceDetailsPerService);

            console.log(`🆕 Multi-Service Modus: ${kalkWizardData.isMultiService ? 'JA' : 'NEIN'}, Services:`, kalkWizardData.services);

            // Fotos speichern für Step 3 und 4
            // 🔧 FIX Bug #5 (2025-12-01): Fahrzeugschein-Fotos hinzufügen
            const schadenFotos = selectedEntwurf.photoUrls || selectedEntwurf.photos || [];
            const fahrzeugscheinFotos = selectedEntwurf.fahrzeugscheinFotos || [];
            kalkWizardData.entwurfPhotos = [...schadenFotos, ...fahrzeugscheinFotos];

            // Zusätzliche Daten speichern
            kalkWizardData.kundenEmail = selectedEntwurf.kundenEmail || '';
            kalkWizardData.notizen = selectedEntwurf.notizen || '';
            kalkWizardData.schadenBeschreibung = selectedEntwurf.schadenBeschreibung || selectedEntwurf.notizen || '';
            kalkWizardData.farbe = selectedEntwurf.farbe || selectedEntwurf.farbname || '';
            kalkWizardData.datum = selectedEntwurf.datum || (selectedEntwurf.timestamp ? new Date(selectedEntwurf.timestamp).toLocaleDateString('de-DE') : '-');
            kalkWizardData.dringlichkeit = selectedEntwurf.dringlichkeit || selectedEntwurf.dringlichkeitLabel || '';
            kalkWizardData.quelle = 'entwurf';

            // Zeige ausgewähltes Fahrzeug
            const selectedBox = document.getElementById('selectedDbVehicle');
            if (selectedBox) {
                selectedBox.style.display = 'block';
                document.getElementById('selectedVehicleName').textContent =
                    `${selectedEntwurf.marke || '-'} ${selectedEntwurf.modell || ''}`;
                document.getElementById('selectedVehicleKennzeichen').textContent =
                    selectedEntwurf.kennzeichen || '-';
                document.getElementById('selectedVehicleKunde').textContent =
                    `Kunde: ${selectedEntwurf.kundenname || '-'}`;
            }

            // Service-Art Radio-Button in Step 2 vorauswählen
            setTimeout(() => {
                const serviceRadio = document.querySelector(`input[name="serviceArt"][value="${kalkWizardData.serviceArt}"]`);
                if (serviceRadio) {
                    serviceRadio.checked = true;
                    // Trigger change event um UI zu aktualisieren
                    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Service vorausgewählt:', kalkWizardData.serviceArt);
                } else {
                    console.warn('⚠️ Service-Radio nicht gefunden für:', kalkWizardData.serviceArt);
                }
            }, 100);

            showToast(`✅ Entwurf "${selectedEntwurf.kennzeichen}" übernommen`, 'success');

            // 🔧 FIX (2025-11-30): Bei Multi-Service zu Step 2b mit ALLEN Services auf einer Seite
            setTimeout(() => {
                // Prüfe ob irgendein Service Details hat
                const hasAnyServiceDetails = kalkWizardData.services.some(service => {
                    const config = SERVICE_CONFIG[service];
                    return config?.zusatzfelder && Object.keys(config.zusatzfelder).length > 0;
                });

                if (hasAnyServiceDetails) {
                    console.log('🆕 Services haben Details, gehe zu Step 2b');
                    console.log('   Services:', kalkWizardData.services);

                    // Step 2b anzeigen mit ALLEN Services
                    currentStep = '2b';
                    renderAllServiceDetails(); // 🆕 NEU: Alle Services auf einer Seite!
                    updateStepUI();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    // Keine Service-Details nötig → Direkt zu Step 3
                    console.log('🆕 Keine Service-Details nötig, gehe direkt zu Step 3');
                    goToStep(3);
                }
            }, 500);
        }

        // 🆕 Fotos aus Entwurf in Step 3 und 4 anzeigen
        function renderEntwurfPhotos() {
            const photos = kalkWizardData.entwurfPhotos || [];
            if (photos.length === 0) return;

            // 🆕 FIX (Nov 30, 2025): Auch Step 2b hinzugefügt für Meister-Übersicht
            ['step2b', 'step3', 'step4'].forEach(step => {
                const section = document.getElementById(`${step}PhotosSection`);
                const gallery = document.getElementById(`${step}PhotosGallery`);

                if (section && gallery) {
                    section.style.display = 'block';
                    gallery.innerHTML = photos.map((url, index) => `
                        <img src="${url}"
                             class="entwurf-photo-thumb"
                             alt="Foto ${index + 1}"
                             onclick="openPhotoLightbox(${index})">
                    `).join('');
                }
            });
        }

        // 🆕 Auftragsinfo in Step 3 und Step 4 anzeigen
        // prefix: 'info' für Step 3, 'info4' für Step 4
        function renderAuftragsInfoForStep(stepId, prefix) {
            const infoBox = document.getElementById(stepId);
            if (!infoBox) return;

            // 🔧 FIX (2025-11-30): Auftragsinfo IMMER anzeigen wenn Fahrzeug-Daten vorhanden
            // Vorher: Nur bei Entwurf/Partner-Anfrage angezeigt
            // Jetzt: Immer anzeigen, damit alle Infos während der Kalkulation sichtbar sind
            const hasVehicleData = kalkWizardData.fahrzeug?.kennzeichen || kalkWizardData.fahrzeug?.marke;
            const hasServiceData = kalkWizardData.serviceArt || (kalkWizardData.services && kalkWizardData.services.length > 0);

            if (!hasVehicleData && !hasServiceData) {
                infoBox.style.display = 'none';
                return;
            }

            infoBox.style.display = 'block';

            // Fahrzeug-Infos
            const setTextSafe = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || '-';
            };

            setTextSafe(`${prefix}Kennzeichen`, kalkWizardData.fahrzeug?.kennzeichen);
            setTextSafe(`${prefix}Fahrzeug`, `${kalkWizardData.fahrzeug?.marke || ''} ${kalkWizardData.fahrzeug?.modell || ''}`.trim() || '-');
            // Farbe mit mehreren Fallbacks
            const farbe = kalkWizardData.farbe ||
                          kalkWizardData.fahrzeug?.farbcode ||
                          kalkWizardData.fahrzeug?.farbe ||
                          kalkWizardData.farbname ||
                          '-';
            setTextSafe(`${prefix}Farbe`, farbe);

            // Kunde-Infos
            setTextSafe(`${prefix}Kunde`, kalkWizardData.fahrzeug?.kunde);
            setTextSafe(`${prefix}Datum`, kalkWizardData.datum);

            // Partner anzeigen (nur bei Partner-Anfragen)
            const partnerRow = document.getElementById(`${prefix}PartnerRow`);
            if (partnerRow) {
                if (kalkWizardData.partnerName) {
                    partnerRow.style.display = 'flex';
                    setTextSafe(`${prefix}Partner`, kalkWizardData.partnerName);
                } else {
                    partnerRow.style.display = 'none';
                }
            }

            // Service-Infos - Multi-Service Support
            let serviceDisplay = '-';
            if (kalkWizardData.isMultiService && kalkWizardData.services && kalkWizardData.services.length > 1) {
                serviceDisplay = kalkWizardData.services
                    .map(s => SERVICE_LABELS[s] || s)
                    .join(', ');
                serviceDisplay += ` (${kalkWizardData.services.length} Services)`;
            } else {
                serviceDisplay = SERVICE_LABELS[kalkWizardData.serviceArt] || kalkWizardData.serviceArt || '-';
            }
            setTextSafe(`${prefix}Service`, serviceDisplay);

            // Dringlichkeit anzeigen (wenn vorhanden)
            const dringlichkeitRow = document.getElementById(`${prefix}DringlichkeitRow`);
            if (dringlichkeitRow) {
                if (kalkWizardData.dringlichkeit) {
                    dringlichkeitRow.style.display = 'flex';
                    setTextSafe(`${prefix}Dringlichkeit`, kalkWizardData.dringlichkeit);
                } else {
                    dringlichkeitRow.style.display = 'none';
                }
            }

            // Schadensbeschreibung anzeigen (wenn vorhanden)
            const schadenSection = document.getElementById(`${prefix}SchadenSection`);
            if (schadenSection) {
                if (kalkWizardData.schadenBeschreibung) {
                    schadenSection.style.display = 'block';
                    setTextSafe(`${prefix}Schaden`, kalkWizardData.schadenBeschreibung);
                } else {
                    schadenSection.style.display = 'none';
                }
            }

            // Notizen anzeigen (wenn vorhanden und unterschiedlich von Schadensbeschreibung)
            const notizenSection = document.getElementById(`${prefix}NotizenSection`);
            if (notizenSection) {
                if (kalkWizardData.notizen && kalkWizardData.notizen !== kalkWizardData.schadenBeschreibung) {
                    notizenSection.style.display = 'block';
                    setTextSafe(`${prefix}Notizen`, kalkWizardData.notizen);
                } else {
                    notizenSection.style.display = 'none';
                }
            }

            // Service-Details anzeigen
            renderAuftragsServiceDetailsForStep(`${prefix}ServiceDetailsSection`, `${prefix}ServiceDetails`);

            feather.replace();
        }

        // Wrapper für Step 2 (🆕 Nov 30, 2025)
        function renderAuftragsInfoStep2() {
            renderAuftragsInfoForStep('step2AuftragsInfo', 'info2');
        }

        // Wrapper für Step 2b (🆕 Nov 30, 2025)
        // 🔧 FIX: Meister benötigt ALLE Infos in Step 2b für Service-Details Eingabe
        function renderAuftragsInfoStep2b() {
            console.log('🔧 renderAuftragsInfoStep2b() called');
            console.log('   kalkWizardData.fahrzeug:', kalkWizardData.fahrzeug);

            // Generische Funktion aufrufen (befüllt Standard-Felder)
            renderAuftragsInfoForStep('step2bAuftragsInfo', 'info2b');

            // 🆕 FIX (Nov 30, 2025): Box IMMER anzeigen in Step 2b wenn Fahrzeug ausgewählt
            // Der Meister braucht alle Infos während der Service-Details Eingabe
            const infoBox = document.getElementById('step2bAuftragsInfo');
            if (infoBox && kalkWizardData.fahrzeug) {
                infoBox.style.display = 'block';
                console.log('✅ Step 2b Auftragsinfo-Box angezeigt');
            }

            // 🆕 ZUSÄTZLICHE FELDER für Step 2b (Nov 30, 2025)
            // Diese Felder werden in der generischen Funktion nicht befüllt
            const setTextSafe = (id, value) => {
                const el = document.getElementById(id);
                if (el) el.textContent = value || '-';
            };

            // KM-Stand
            const kmStand = kalkWizardData.fahrzeug?.kmstand ||
                            kalkWizardData.fahrzeug?.kilometerstand ||
                            kalkWizardData.kmstand ||
                            kalkWizardData.kilometerstand;
            if (kmStand) {
                setTextSafe('info2bKmStand', `${parseInt(kmStand).toLocaleString('de-DE')} km`);
            }

            // Anliefertermin
            const anliefertermin = kalkWizardData.anliefertermin ||
                                   kalkWizardData.fahrzeug?.anliefertermin ||
                                   kalkWizardData.termine?.anliefertermin;
            if (anliefertermin) {
                setTextSafe('info2bAnliefertermin', formatDateForDisplay(anliefertermin));
            }

            // Abholtermin
            const abholtermin = kalkWizardData.abholtermin ||
                               kalkWizardData.fahrzeug?.abholtermin ||
                               kalkWizardData.termine?.abholtermin;
            if (abholtermin) {
                setTextSafe('info2bAbholtermin', formatDateForDisplay(abholtermin));
            }

            // Ersatzfahrzeug
            const ersatzfahrzeug = kalkWizardData.ersatzfahrzeug ||
                                   kalkWizardData.fahrzeug?.ersatzfahrzeug ||
                                   kalkWizardData.ersatzfahrzeugGewuenscht;
            if (ersatzfahrzeug) {
                const ersatzText = ersatzfahrzeug === true || ersatzfahrzeug === 'ja' || ersatzfahrzeug === 'Ja'
                    ? '✅ Ja, gewünscht'
                    : ersatzfahrzeug === false || ersatzfahrzeug === 'nein' || ersatzfahrzeug === 'Nein'
                        ? '❌ Nein'
                        : ersatzfahrzeug;
                setTextSafe('info2bErsatzfahrzeug', ersatzText);
            }

            console.log('✅ Step 2b zusätzliche Felder befüllt:', {
                kmStand, anliefertermin, abholtermin, ersatzfahrzeug
            });
        }

        // Hilfsfunktion: Datum formatieren
        function formatDateForDisplay(dateStr) {
            if (!dateStr) return '-';
            try {
                const date = new Date(dateStr);
                if (isNaN(date.getTime())) return dateStr;
                return date.toLocaleDateString('de-DE', {
                    weekday: 'short',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                });
            } catch (e) {
                return dateStr;
            }
        }

        // Wrapper für Step 3 (Kompatibilität)
        function renderAuftragsInfo() {
            renderAuftragsInfoForStep('step3AuftragsInfo', 'info');
        }

        // Wrapper für Step 4
        function renderAuftragsInfoStep4() {
            renderAuftragsInfoForStep('step4AuftragsInfo', 'info4');
        }

        // Wrapper für Step 5
        function renderAuftragsInfoStep5() {
            renderAuftragsInfoForStep('step5AuftragsInfo', 'info5');
        }

        // Wrapper für Step 6
        function renderAuftragsInfoStep6() {
            renderAuftragsInfoForStep('step6AuftragsInfo', 'info6');
        }

        /**
         * 🆕 Rendert die Service-Details in der Auftragsinformationen-Box
         * Parametrisiert für Step 3 und Step 4
         */
        function renderAuftragsServiceDetailsForStep(sectionId, containerId) {
            const section = document.getElementById(sectionId);
            const container = document.getElementById(containerId);

            if (!section || !container) return;

            const services = kalkWizardData.services || [kalkWizardData.serviceArt];
            const detailsPerService = kalkWizardData.serviceDetailsPerService || {};

            // Prüfen ob überhaupt Details vorhanden sind
            let hasAnyDetails = false;
            for (const service of services) {
                const details = detailsPerService[service];
                if (details && Object.keys(details).length > 0) {
                    hasAnyDetails = true;
                    break;
                }
            }

            if (!hasAnyDetails) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';

            // HTML für Service-Details generieren
            let html = '';

            for (const service of services) {
                const details = detailsPerService[service];
                if (!details || Object.keys(details).length === 0) continue;

                const serviceLabel = SERVICE_LABELS[service] || service;
                const serviceIcon = getServiceIcon(service);
                const config = SERVICE_CONFIG[service];

                html += `
                    <div class="service-detail-card" style="
                        background: var(--color-surface);
                        border: 1px solid var(--color-border);
                        border-radius: var(--radius-md);
                        padding: var(--space-3);
                        margin-bottom: var(--space-2);
                    ">
                        <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); font-weight: var(--font-weight-semibold); color: var(--color-primary);">
                            <span>${serviceIcon}</span>
                            <span>${serviceLabel}</span>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-2); font-size: var(--font-size-sm);">
                `;

                // 🆕 FIX (Nov 30, 2025): Nur Felder anzeigen, die in SERVICE_CONFIG.zusatzfelder definiert sind
                // UND die typischen Partner-Felder (art, info, etc.)
                const allowedFields = config?.zusatzfelder ? Object.keys(config.zusatzfelder) : [];
                // Füge auch die Original-Partner-Felder hinzu (bevor sie gemappt wurden)
                const partnerFields = ['art', 'info', 'teile', 'karosserie', 'ersatzteil', 'farbcode'];

                // Details durchlaufen - aber nur relevante Felder anzeigen
                for (const [key, value] of Object.entries(details)) {
                    if (!value || value === '' || value === 'undefined') continue;

                    // 🆕 FIX: Nur Felder anzeigen, die entweder:
                    // 1. In SERVICE_CONFIG.zusatzfelder definiert sind, ODER
                    // 2. Typische Partner-Felder sind (art, info, teile, etc.)
                    const isAllowedField = allowedFields.includes(key) || partnerFields.includes(key);
                    if (!isAllowedField && allowedFields.length > 0) {
                        // Wenn SERVICE_CONFIG.zusatzfelder existiert, nur definierte Felder anzeigen
                        continue;
                    }

                    // Label aus SERVICE_CONFIG holen oder formatieren
                    let label = key;
                    if (config?.zusatzfelder?.[key]?.label) {
                        label = config.zusatzfelder[key].label;
                    } else {
                        // CamelCase zu lesbar
                        label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    }

                    // Wert formatieren (Arrays als Liste)
                    let displayValue = value;
                    if (Array.isArray(value)) {
                        displayValue = value.join(', ');
                    } else if (typeof value === 'boolean') {
                        displayValue = value ? 'Ja' : 'Nein';
                    }

                    html += `
                        <div style="display: flex; flex-direction: column;">
                            <span style="color: var(--color-text-secondary); font-size: var(--font-size-xs);">${label}</span>
                            <span style="color: var(--color-text-primary);">${displayValue}</span>
                        </div>
                    `;
                }

                html += `
                        </div>
                    </div>
                `;
            }

            container.innerHTML = html;
        }

        // Wrapper für Step 3 (Kompatibilität)
        function renderAuftragsServiceDetails() {
            renderAuftragsServiceDetailsForStep('infoServiceDetailsSection', 'infoServiceDetails');
        }

        // Toggle Auftragsinfo ein/ausklappen (parametrisiert für Step 2, 3, 4, 5 und 6)
        function toggleAuftragsInfo(step = 'step3') {
            let contentId, toggleId;

            if (step === 'step6') {
                contentId = 'auftragsInfoContent6';
                toggleId = 'auftragsInfoToggle6';
            } else if (step === 'step5') {
                contentId = 'auftragsInfoContent5';
                toggleId = 'auftragsInfoToggle5';
            } else if (step === 'step4') {
                contentId = 'auftragsInfoContent4';
                toggleId = 'auftragsInfoToggle4';
            } else if (step === 'step2b') {
                // 🆕 Nov 30, 2025: Step 2b Support
                contentId = 'auftragsInfoContent2b';
                toggleId = 'auftragsInfoToggle2b';
            } else if (step === 'step2') {
                // 🆕 Nov 30, 2025: Step 2 Support
                contentId = 'auftragsInfoContent2';
                toggleId = 'auftragsInfoToggle2';
            } else {
                contentId = 'auftragsInfoContent';
                toggleId = 'auftragsInfoToggle';
            }

            const content = document.getElementById(contentId);
            const toggle = document.getElementById(toggleId);
            if (content && toggle) {
                content.classList.toggle('collapsed');
                const icon = toggle.querySelector('i');
                if (icon) {
                    icon.setAttribute('data-feather', content.classList.contains('collapsed') ? 'chevron-down' : 'chevron-up');
                    feather.replace();
                }
            }
        }

        let currentLightboxIndex = 0;

        function openPhotoLightbox(index) {
            const photos = kalkWizardData.entwurfPhotos || [];
            if (photos.length === 0) return;

            currentLightboxIndex = index;

            const lightbox = document.createElement('div');
            lightbox.className = 'photo-lightbox';
            lightbox.id = 'photoLightbox';
            lightbox.innerHTML = `
                <button class="photo-lightbox__close" onclick="closePhotoLightbox()">
                    <i data-feather="x"></i>
                </button>
                ${photos.length > 1 ? `
                    <button class="photo-lightbox__nav photo-lightbox__nav--prev" onclick="navigateLightbox(-1)">
                        <i data-feather="chevron-left"></i>
                    </button>
                    <button class="photo-lightbox__nav photo-lightbox__nav--next" onclick="navigateLightbox(1)">
                        <i data-feather="chevron-right"></i>
                    </button>
                ` : ''}
                <img src="${photos[index]}" class="photo-lightbox__image" id="lightboxImage">
                <div class="photo-lightbox__counter">${index + 1} / ${photos.length}</div>
            `;

            document.body.appendChild(lightbox);
            feather.replace();

            // ESC zum Schließen
            document.addEventListener('keydown', handleLightboxKeydown);
        }

        function closePhotoLightbox() {
            const lightbox = document.getElementById('photoLightbox');
            if (lightbox) {
                lightbox.remove();
                document.removeEventListener('keydown', handleLightboxKeydown);
            }
        }

        function navigateLightbox(direction) {
            const photos = kalkWizardData.entwurfPhotos || [];
            currentLightboxIndex = (currentLightboxIndex + direction + photos.length) % photos.length;

            const img = document.getElementById('lightboxImage');
            const counter = document.querySelector('.photo-lightbox__counter');
            if (img) img.src = photos[currentLightboxIndex];
            if (counter) counter.textContent = `${currentLightboxIndex + 1} / ${photos.length}`;
        }

        function handleLightboxKeydown(e) {
            if (e.key === 'Escape') closePhotoLightbox();
            if (e.key === 'ArrowLeft') navigateLightbox(-1);
            if (e.key === 'ArrowRight') navigateLightbox(1);
        }

        function togglePhotoGallery(step) {
            openPhotoLightbox(0);
        }

        // ============================================
        // 🆕 ENTWURF-FOTOS FÜR KI-ANALYSE
        // ============================================

        let selectedKIFotos = new Set();

        function renderEntwurfFotosForKI() {
            const photos = kalkWizardData.entwurfPhotos || [];
            const section = document.getElementById('entwurfFotosSection');
            const grid = document.getElementById('entwurfFotosGrid');
            const uploadTitle = document.getElementById('fotoUploadTitle');

            if (!section || !grid) return;

            // Wenn keine Fotos aus Entwurf vorhanden, Section ausblenden
            if (photos.length === 0) {
                section.style.display = 'none';
                if (uploadTitle) uploadTitle.textContent = 'Schadenfotos hochladen';
                return;
            }

            // Section anzeigen und Upload-Text anpassen
            section.style.display = 'block';
            if (uploadTitle) uploadTitle.textContent = 'Weitere Fotos hochladen';

            // Alle Fotos standardmäßig auswählen
            selectedKIFotos = new Set(photos.map((_, i) => i));

            // Foto-Grid rendern
            grid.innerHTML = photos.map((url, index) => `
                <div class="entwurf-foto-item selected" data-index="${index}" onclick="toggleKIFotoSelection(${index})">
                    <img src="${url}" alt="Foto ${index + 1}">
                    <div class="entwurf-foto-item__checkbox">
                        <i data-feather="check"></i>
                    </div>
                    <div class="entwurf-foto-item__number">Foto ${index + 1}</div>
                </div>
            `).join('');

            updateSelectedFotosCount();
            feather.replace();
        }

        function toggleKIFotoSelection(index) {
            const item = document.querySelector(`.entwurf-foto-item[data-index="${index}"]`);
            if (!item) return;

            if (selectedKIFotos.has(index)) {
                selectedKIFotos.delete(index);
                item.classList.remove('selected');
            } else {
                selectedKIFotos.add(index);
                item.classList.add('selected');
            }

            updateSelectedFotosCount();
        }

        function selectAllEntwurfFotos() {
            const photos = kalkWizardData.entwurfPhotos || [];
            selectedKIFotos = new Set(photos.map((_, i) => i));

            document.querySelectorAll('.entwurf-foto-item').forEach(item => {
                item.classList.add('selected');
            });

            updateSelectedFotosCount();
        }

        function deselectAllEntwurfFotos() {
            selectedKIFotos.clear();

            document.querySelectorAll('.entwurf-foto-item').forEach(item => {
                item.classList.remove('selected');
            });

            updateSelectedFotosCount();
        }

        function updateSelectedFotosCount() {
            const countBadge = document.getElementById('selectedFotosCount');
            const analyzeBtn = document.getElementById('btnAnalyzeEntwurfFotos');

            if (countBadge) {
                countBadge.textContent = `${selectedKIFotos.size} ausgewählt`;
            }

            if (analyzeBtn) {
                analyzeBtn.disabled = selectedKIFotos.size === 0;
                if (selectedKIFotos.size === 0) {
                    analyzeBtn.innerHTML = '<i data-feather="cpu"></i> Bitte Fotos auswählen';
                } else {
                    analyzeBtn.innerHTML = `<i data-feather="cpu"></i> ${selectedKIFotos.size} Foto${selectedKIFotos.size > 1 ? 's' : ''} analysieren`;
                }
                feather.replace();
            }
        }

        async function analyzeSelectedEntwurfFotos() {
            const photos = kalkWizardData.entwurfPhotos || [];
            const selectedPhotos = Array.from(selectedKIFotos).map(i => photos[i]).filter(Boolean);

            if (selectedPhotos.length === 0) {
                showToast('Bitte wählen Sie mindestens ein Foto aus', 'warning');
                return;
            }

            console.log('🤖 KI-Analyse starten mit', selectedPhotos.length, 'Fotos (URLs)');

            // Loading anzeigen
            const loading = document.getElementById('kiAnalyseLoading');
            const result = document.getElementById('kiAnalyseResult');
            if (loading) loading.style.display = 'block';
            if (result) result.style.display = 'none';

            try {
                // OpenAI API Key aus SettingsManager oder Firestore laden
                let apiKey = '';
                if (window.settingsManager?.currentSettings?.systemConfig?.openaiKey) {
                    apiKey = window.settingsManager.currentSettings.systemConfig.openaiKey;
                    console.log('✅ API-Key aus settingsManager geladen');
                } else {
                    // Fallback: Direkt aus Firestore laden via Multi-Tenant Helper
                    console.log('📥 Lade API-Key aus Firestore via getCollection()');
                    const settingsDoc = await window.getCollection('einstellungen').doc('config').get();
                    if (settingsDoc.exists) {
                        apiKey = settingsDoc.data()?.systemConfig?.openaiKey || '';
                        console.log('✅ API-Key aus Firestore geladen');
                    }
                }

                if (!apiKey) {
                    throw new Error('OpenAI API-Key nicht konfiguriert. Bitte in Admin-Einstellungen hinterlegen.');
                }

                // Bilder für GPT-4 Vision vorbereiten (max 4 URLs)
                const imagesToAnalyze = selectedPhotos.slice(0, 4);

                const imageContents = imagesToAnalyze.map(url => ({
                    type: 'image_url',
                    image_url: {
                        url: url,
                        detail: 'high'
                    }
                }));

                // Service-Kontext für präzisere KI-Analyse
                const serviceArt = kalkWizardData.serviceArt || 'lackier';
                const serviceLabel = SERVICE_LABELS[serviceArt] || 'Lackierung';
                const serviceConfig = SERVICE_CONFIG[serviceArt] || SERVICE_CONFIG['lackier'];
                const verfuegbareTeile = serviceConfig.teile || [];
                const verfuegbareArbeiten = serviceConfig.arbeiten || [];

                console.log('🤖 Sende', imageContents.length, 'Bilder an GPT-4 Vision...');
                console.log('📋 Service-Kontext:', serviceLabel, '- Teile:', verfuegbareTeile.length);

                // GPT-4 Vision API aufrufen mit Service-Kontext
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `Du bist ein Experte für Fahrzeugschaden-Analyse in einer Lackierwerkstatt.
Der Kunde hat den Service "${serviceLabel}" gewählt.

KONTEXT - Dieser Service umfasst typischerweise:
- Verfügbare Fahrzeugteile: ${verfuegbareTeile.join(', ')}
- Mögliche Arbeiten: ${verfuegbareArbeiten.join(', ')}

Analysiere die Bilder und identifiziere alle sichtbaren Schäden am Fahrzeug.
Fokussiere dich auf Schäden, die für den Service "${serviceLabel}" relevant sind.

WICHTIG: Antworte NUR im folgenden JSON-Format (keine Markdown, keine Erklärungen):
{
  "schaeden": [
    {
      "teil": "Exakte Bezeichnung aus der Teile-Liste oben (z.B. Stoßfänger vorne, Kotflügel vorne links)",
      "schaden": "Art des Schadens (z.B. Kratzer, Delle, Steinschlag, Rost, Riss, Lackabplatzer)",
      "schweregrad": "leicht/mittel/schwer",
      "empfohleneArbeiten": ["Array der empfohlenen Arbeiten aus der Liste oben"],
      "confidence": 0.0-1.0
    }
  ],
  "zusammenfassung": "Kurze Zusammenfassung des Gesamtschadens",
  "geschaetzteDauer": "Geschätzte Gesamtdauer in Stunden (z.B. '4-6 Stunden')"
}

REGELN:
1. Verwende NUR Teile-Bezeichnungen aus der verfügbaren Teile-Liste
2. Empfehle NUR Arbeiten aus der verfügbaren Arbeiten-Liste
3. Bei Versicherungsschäden: Dokumentiere alle Schäden gründlich
4. Bei Dellen: Fokus auf ausbeulbare Dellen ohne Lackreparatur
5. Sei präzise bei der Lokalisierung (links/rechts, vorne/hinten)`
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: `Analysiere diese Fahrzeugbilder für den Service "${serviceLabel}". Identifiziere alle relevanten Schäden und gib das Ergebnis als JSON zurück.`
                                    },
                                    ...imageContents
                                ]
                            }
                        ],
                        max_tokens: 2000,
                        temperature: 0.2
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'API-Fehler');
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';

                console.log('🤖 GPT-4 Vision Antwort erhalten');

                // JSON aus der Antwort extrahieren
                let analysisResult;
                try {
                    analysisResult = JSON.parse(content);
                } catch {
                    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                                     content.match(/\{[\s\S]*"schaeden"[\s\S]*\}/);
                    if (jsonMatch) {
                        analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    } else {
                        throw new Error('Konnte KI-Antwort nicht parsen');
                    }
                }

                // Ergebnisse anzeigen mit erweiterten Daten
                kiErkannteSchaeden = (analysisResult.schaeden || []).map((s, idx) => ({
                    id: `ki-${Date.now()}-${idx}`,
                    teil: s.teil,
                    schaden: s.schaden,
                    schweregrad: s.schweregrad || 'mittel',
                    empfohleneArbeiten: s.empfohleneArbeiten || [s.repairType || 'lackieren'],
                    confidence: s.confidence || 0.8,
                    selected: true
                }));

                // Zusätzliche KI-Infos speichern
                window.kiAnalyseResult = {
                    zusammenfassung: analysisResult.zusammenfassung,
                    geschaetzteDauer: analysisResult.geschaetzteDauer,
                    serviceKontext: serviceLabel,
                    analysiertAm: new Date().toISOString()
                };

                // UI aktualisieren
                if (loading) loading.style.display = 'none';
                if (result) result.style.display = 'block';

                renderKISchaeden(analysisResult.zusammenfassung, analysisResult.geschaetzteDauer);

                showToast(`✅ ${kiErkannteSchaeden.length} Schäden erkannt`, 'success');
                console.log('✅ KI-Analyse abgeschlossen:', kiErkannteSchaeden);

            } catch (error) {
                console.error('❌ KI-Analyse Fehler:', error);
                showToast('Fehler: ' + error.message, 'error');
                if (loading) loading.style.display = 'none';
            }
        }

        // KI-Schäden in der UI rendern mit Bearbeiten/Löschen
        function renderKISchaeden(zusammenfassung, geschaetzteDauer) {
            const liste = document.getElementById('kiSchaedenListe');
            if (!liste) return;

            const serviceArt = kalkWizardData.serviceArt || 'lackier';
            const serviceConfig = SERVICE_CONFIG[serviceArt] || SERVICE_CONFIG['lackier'];
            const verfuegbareTeile = serviceConfig.teile || [];

            liste.innerHTML = `
                <!-- Zusammenfassung -->
                <div class="ki-zusammenfassung" style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: var(--space-4); border-radius: var(--radius-md); margin-bottom: var(--space-4); border-left: 4px solid var(--color-primary);">
                    <div style="display: flex; justify-content: space-between; align-items: start; gap: var(--space-3);">
                        <div style="flex: 1;">
                            <strong style="font-size: var(--font-size-base);">📋 KI-Zusammenfassung:</strong>
                            <p style="margin: var(--space-2) 0 0 0; color: var(--color-text-secondary);">${zusammenfassung || 'Keine Zusammenfassung verfügbar'}</p>
                        </div>
                        ${geschaetzteDauer ? `
                        <div style="text-align: right; min-width: 120px;">
                            <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">Geschätzte Dauer:</div>
                            <div style="font-weight: 600; color: var(--color-primary);">${geschaetzteDauer}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Header mit Zähler und Hinzufügen-Button -->
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-3);">
                    <div style="font-weight: 600; color: var(--color-text-primary);">
                        🔧 Erkannte Teile: <span id="kiSelectedCount">${kiErkannteSchaeden.filter(s => s.selected).length}</span>/${kiErkannteSchaeden.length}
                    </div>
                    <button type="button" class="btn btn-sm btn-outline" onclick="showAddKITeilModal()">
                        <i data-feather="plus"></i> Teil hinzufügen
                    </button>
                </div>

                <!-- Schäden-Liste -->
                <div id="kiSchaedenItems">
                    ${kiErkannteSchaeden.map((schaden, index) => renderKISchadenItem(schaden, index)).join('')}
                </div>

                <!-- Manuell hinzugefügte Teile Bereich -->
                <div id="manuelleTeileSection" style="display: none; margin-top: var(--space-4); padding-top: var(--space-4); border-top: 2px dashed var(--color-border);">
                    <div style="font-weight: 600; color: var(--color-text-primary); margin-bottom: var(--space-3);">
                        ➕ Manuell hinzugefügt:
                    </div>
                    <div id="manuelleTeileItems"></div>
                </div>

                <!-- Bestätigen Button -->
                <div style="margin-top: var(--space-4); padding-top: var(--space-4); border-top: 1px solid var(--color-border);">
                    <button type="button" class="btn btn-primary btn-lg" onclick="confirmKIAnalyseAndProceed()" style="width: 100%;">
                        <i data-feather="check-circle"></i>
                        Auswahl bestätigen & zu Schritt 4
                    </button>
                    <p style="text-align: center; margin-top: var(--space-2); font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                        Die ausgewählten Teile werden in die Kalkulation übernommen
                    </p>
                </div>
            `;

            // Feather Icons aktualisieren
            if (typeof feather !== 'undefined') feather.replace();
        }

        // Einzelnen KI-Schaden rendern
        function renderKISchadenItem(schaden, index) {
            const schwereColors = {
                'leicht': { bg: '#ecfdf5', border: '#10b981', text: '#059669' },
                'mittel': { bg: '#fef3c7', border: '#f59e0b', text: '#d97706' },
                'schwer': { bg: '#fee2e2', border: '#ef4444', text: '#dc2626' }
            };
            const colors = schwereColors[schaden.schweregrad] || schwereColors['mittel'];
            const arbeitenText = Array.isArray(schaden.empfohleneArbeiten)
                ? schaden.empfohleneArbeiten.join(', ')
                : schaden.empfohleneArbeiten || '-';

            return `
                <div class="ki-schaden-item" id="kiSchaden-${index}" style="display: flex; align-items: stretch; gap: var(--space-3); padding: var(--space-3); background: ${schaden.selected ? 'white' : '#f9fafb'}; border: 1px solid ${schaden.selected ? colors.border : 'var(--color-border)'}; border-radius: var(--radius-md); margin-bottom: var(--space-2); opacity: ${schaden.selected ? '1' : '0.6'}; transition: all 0.2s;">
                    <!-- Checkbox -->
                    <div style="display: flex; align-items: center;">
                        <input type="checkbox" id="kiSchadenCheck${index}" ${schaden.selected ? 'checked' : ''}
                               onchange="toggleKISchaden(${index})"
                               style="width: 22px; height: 22px; cursor: pointer;">
                    </div>

                    <!-- Hauptinhalt -->
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-1);">
                            <span style="font-weight: 600; color: var(--color-text-primary);">${schaden.teil}</span>
                            <span class="badge" style="font-size: 10px; background: ${colors.bg}; color: ${colors.text}; border: 1px solid ${colors.border};">
                                ${schaden.schweregrad}
                            </span>
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary);">
                            <strong>Schaden:</strong> ${schaden.schaden}
                        </div>
                        <div style="font-size: var(--font-size-sm); color: var(--color-text-secondary); margin-top: 2px;">
                            <strong>Arbeiten:</strong> ${arbeitenText}
                        </div>
                    </div>

                    <!-- Aktionen -->
                    <div style="display: flex; flex-direction: column; gap: var(--space-1); justify-content: center;">
                        <span class="badge ${schaden.confidence > 0.8 ? 'badge--success' : schaden.confidence > 0.5 ? 'badge--warning' : 'badge--secondary'}"
                              style="font-size: 10px; text-align: center;">
                            ${Math.round(schaden.confidence * 100)}%
                        </span>
                        <div style="display: flex; gap: 4px;">
                            <button type="button" class="btn btn-xs btn-ghost" onclick="editKISchaden(${index})" title="Bearbeiten">
                                <i data-feather="edit-2" style="width: 14px; height: 14px;"></i>
                            </button>
                            <button type="button" class="btn btn-xs btn-ghost" onclick="deleteKISchaden(${index})" title="Löschen" style="color: var(--color-error);">
                                <i data-feather="trash-2" style="width: 14px; height: 14px;"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        // KI-Schaden auswählen/abwählen
        function toggleKISchaden(index) {
            if (kiErkannteSchaeden[index]) {
                kiErkannteSchaeden[index].selected = !kiErkannteSchaeden[index].selected;

                // UI aktualisieren
                const item = document.getElementById(`kiSchaden-${index}`);
                const schwereColors = {
                    'leicht': '#10b981', 'mittel': '#f59e0b', 'schwer': '#ef4444'
                };
                const color = schwereColors[kiErkannteSchaeden[index].schweregrad] || '#f59e0b';

                if (item) {
                    item.style.opacity = kiErkannteSchaeden[index].selected ? '1' : '0.6';
                    item.style.background = kiErkannteSchaeden[index].selected ? 'white' : '#f9fafb';
                    item.style.borderColor = kiErkannteSchaeden[index].selected ? color : 'var(--color-border)';
                }

                // Zähler aktualisieren
                const countEl = document.getElementById('kiSelectedCount');
                if (countEl) {
                    countEl.textContent = kiErkannteSchaeden.filter(s => s.selected).length;
                }
            }
        }

        // KI-Schaden bearbeiten
        function editKISchaden(index) {
            const schaden = kiErkannteSchaeden[index];
            if (!schaden) return;

            const serviceArt = kalkWizardData.serviceArt || 'lackier';
            const serviceConfig = SERVICE_CONFIG[serviceArt] || SERVICE_CONFIG['lackier'];
            const verfuegbareTeile = serviceConfig.teile || [];
            const verfuegbareArbeiten = serviceConfig.arbeiten || [];

            // Modal erstellen
            const modal = document.createElement('div');
            modal.id = 'editKISchadenModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

            modal.innerHTML = `
                <div class="modal-content" style="background: white; border-radius: var(--radius-lg); padding: var(--space-5); max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <h3 style="margin: 0 0 var(--space-4) 0; display: flex; align-items: center; gap: var(--space-2);">
                        <i data-feather="edit-2"></i> Schaden bearbeiten
                    </h3>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Fahrzeugteil</label>
                        <select id="editKITeil" class="form-select">
                            ${verfuegbareTeile.map(t => `<option value="${t}" ${t === schaden.teil ? 'selected' : ''}>${t}</option>`).join('')}
                            <option value="custom" ${!verfuegbareTeile.includes(schaden.teil) ? 'selected' : ''}>Eigene Eingabe...</option>
                        </select>
                        <input type="text" id="editKITeilCustom" class="form-input" value="${schaden.teil}"
                               style="margin-top: var(--space-2); display: ${!verfuegbareTeile.includes(schaden.teil) ? 'block' : 'none'};"
                               placeholder="Teil eingeben...">
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Schaden</label>
                        <input type="text" id="editKISchadenText" class="form-input" value="${schaden.schaden}">
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Schweregrad</label>
                        <select id="editKISchwere" class="form-select">
                            <option value="leicht" ${schaden.schweregrad === 'leicht' ? 'selected' : ''}>Leicht</option>
                            <option value="mittel" ${schaden.schweregrad === 'mittel' ? 'selected' : ''}>Mittel</option>
                            <option value="schwer" ${schaden.schweregrad === 'schwer' ? 'selected' : ''}>Schwer</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-4);">
                        <label class="form-label">Empfohlene Arbeiten</label>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
                            ${verfuegbareArbeiten.map(a => `
                                <label style="display: flex; align-items: center; gap: 4px; padding: var(--space-1) var(--space-2); background: #f3f4f6; border-radius: var(--radius-sm); cursor: pointer;">
                                    <input type="checkbox" name="editKIArbeiten" value="${a}"
                                           ${(schaden.empfohleneArbeiten || []).includes(a) ? 'checked' : ''}>
                                    ${a}
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="closeEditKIModal()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="saveKISchaden(${index})">Speichern</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Custom-Input Toggle
            document.getElementById('editKITeil').addEventListener('change', function() {
                document.getElementById('editKITeilCustom').style.display = this.value === 'custom' ? 'block' : 'none';
            });

            if (typeof feather !== 'undefined') feather.replace();
        }

        // Edit-Modal schließen
        function closeEditKIModal() {
            const modal = document.getElementById('editKISchadenModal');
            if (modal) modal.remove();
        }

        // KI-Schaden speichern
        function saveKISchaden(index) {
            const teilSelect = document.getElementById('editKITeil');
            const teilCustom = document.getElementById('editKITeilCustom');
            const teil = teilSelect.value === 'custom' ? teilCustom.value : teilSelect.value;
            const schadenText = document.getElementById('editKISchadenText').value;
            const schwere = document.getElementById('editKISchwere').value;
            const arbeitenCheckboxes = document.querySelectorAll('input[name="editKIArbeiten"]:checked');
            const arbeiten = Array.from(arbeitenCheckboxes).map(cb => cb.value);

            if (!teil || !schadenText) {
                showToast('Bitte Teil und Schaden ausfüllen', 'warning');
                return;
            }

            kiErkannteSchaeden[index] = {
                ...kiErkannteSchaeden[index],
                teil: teil,
                schaden: schadenText,
                schweregrad: schwere,
                empfohleneArbeiten: arbeiten,
                bearbeitet: true
            };

            closeEditKIModal();

            // Item neu rendern
            const itemContainer = document.getElementById(`kiSchaden-${index}`);
            if (itemContainer) {
                itemContainer.outerHTML = renderKISchadenItem(kiErkannteSchaeden[index], index);
                if (typeof feather !== 'undefined') feather.replace();
            }

            showToast('Schaden aktualisiert', 'success');
        }

        // KI-Schaden löschen
        function deleteKISchaden(index) {
            if (!confirm('Diesen Schaden wirklich entfernen?')) return;

            kiErkannteSchaeden.splice(index, 1);

            // Liste neu rendern
            if (window.kiAnalyseResult) {
                renderKISchaeden(window.kiAnalyseResult.zusammenfassung, window.kiAnalyseResult.geschaetzteDauer);
            }

            showToast('Schaden entfernt', 'info');
        }

        // Modal zum Hinzufügen eines neuen Teils
        function showAddKITeilModal() {
            const serviceArt = kalkWizardData.serviceArt || 'lackier';
            const serviceConfig = SERVICE_CONFIG[serviceArt] || SERVICE_CONFIG['lackier'];
            const verfuegbareTeile = serviceConfig.teile || [];
            const verfuegbareArbeiten = serviceConfig.arbeiten || [];

            const modal = document.createElement('div');
            modal.id = 'addKITeilModal';
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';

            modal.innerHTML = `
                <div class="modal-content" style="background: white; border-radius: var(--radius-lg); padding: var(--space-5); max-width: 500px; width: 90%; max-height: 90vh; overflow-y: auto;">
                    <h3 style="margin: 0 0 var(--space-4) 0; display: flex; align-items: center; gap: var(--space-2);">
                        <i data-feather="plus-circle"></i> Teil hinzufügen
                    </h3>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Fahrzeugteil</label>
                        <select id="addKITeil" class="form-select">
                            <option value="">Bitte wählen...</option>
                            ${verfuegbareTeile.map(t => `<option value="${t}">${t}</option>`).join('')}
                            <option value="custom">Eigene Eingabe...</option>
                        </select>
                        <input type="text" id="addKITeilCustom" class="form-input" style="margin-top: var(--space-2); display: none;" placeholder="Teil eingeben...">
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Schaden</label>
                        <input type="text" id="addKISchadenText" class="form-input" placeholder="z.B. Kratzer, Delle, Lackschaden...">
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-3);">
                        <label class="form-label">Schweregrad</label>
                        <select id="addKISchwere" class="form-select">
                            <option value="leicht">Leicht</option>
                            <option value="mittel" selected>Mittel</option>
                            <option value="schwer">Schwer</option>
                        </select>
                    </div>

                    <div class="form-group" style="margin-bottom: var(--space-4);">
                        <label class="form-label">Arbeiten</label>
                        <div style="display: flex; flex-wrap: wrap; gap: var(--space-2);">
                            ${verfuegbareArbeiten.map(a => `
                                <label style="display: flex; align-items: center; gap: 4px; padding: var(--space-1) var(--space-2); background: #f3f4f6; border-radius: var(--radius-sm); cursor: pointer;">
                                    <input type="checkbox" name="addKIArbeiten" value="${a}">
                                    ${a}
                                </label>
                            `).join('')}
                        </div>
                    </div>

                    <div style="display: flex; gap: var(--space-3); justify-content: flex-end;">
                        <button type="button" class="btn btn-outline" onclick="closeAddKIModal()">Abbrechen</button>
                        <button type="button" class="btn btn-primary" onclick="addNewKITeil()">Hinzufügen</button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            document.getElementById('addKITeil').addEventListener('change', function() {
                document.getElementById('addKITeilCustom').style.display = this.value === 'custom' ? 'block' : 'none';
            });

            if (typeof feather !== 'undefined') feather.replace();
        }

        function closeAddKIModal() {
            const modal = document.getElementById('addKITeilModal');
            if (modal) modal.remove();
        }

        function addNewKITeil() {
            const teilSelect = document.getElementById('addKITeil');
            const teilCustom = document.getElementById('addKITeilCustom');
            const teil = teilSelect.value === 'custom' ? teilCustom.value : teilSelect.value;
            const schadenText = document.getElementById('addKISchadenText').value;
            const schwere = document.getElementById('addKISchwere').value;
            const arbeitenCheckboxes = document.querySelectorAll('input[name="addKIArbeiten"]:checked');
            const arbeiten = Array.from(arbeitenCheckboxes).map(cb => cb.value);

            if (!teil || !schadenText) {
                showToast('Bitte Teil und Schaden ausfüllen', 'warning');
                return;
            }

            const newSchaden = {
                id: `manual-${Date.now()}`,
                teil: teil,
                schaden: schadenText,
                schweregrad: schwere,
                empfohleneArbeiten: arbeiten.length > 0 ? arbeiten : ['lackieren'],
                confidence: 1.0,
                selected: true,
                manuell: true
            };

            kiErkannteSchaeden.push(newSchaden);
            closeAddKIModal();

            // Liste neu rendern
            if (window.kiAnalyseResult) {
                renderKISchaeden(window.kiAnalyseResult.zusammenfassung, window.kiAnalyseResult.geschaetzteDauer);
            }

            showToast('Teil hinzugefügt', 'success');
        }

        // Bestätigen und zu Schritt 4 wechseln
        function confirmKIAnalyseAndProceed() {
            const selectedSchaeden = kiErkannteSchaeden.filter(s => s.selected);

            if (selectedSchaeden.length === 0) {
                showToast('Bitte mindestens ein Teil auswählen', 'warning');
                return;
            }

            console.log('✅ KI-Analyse bestätigt:', selectedSchaeden.length, 'Teile');

            // Teile in kalkWizardData übernehmen
            if (!kalkWizardData.teile) kalkWizardData.teile = [];

            selectedSchaeden.forEach(schaden => {
                // Prüfen ob Teil bereits existiert
                const existingIndex = kalkWizardData.teile.findIndex(t => t.name === schaden.teil);

                if (existingIndex === -1) {
                    // Neues Teil hinzufügen
                    kalkWizardData.teile.push({
                        name: schaden.teil,
                        schaden: schaden.schaden,
                        schweregrad: schaden.schweregrad,
                        arbeiten: schaden.empfohleneArbeiten || [],
                        kiErkannt: !schaden.manuell,
                        confidence: schaden.confidence
                    });
                } else {
                    // Bestehendes Teil aktualisieren
                    kalkWizardData.teile[existingIndex] = {
                        ...kalkWizardData.teile[existingIndex],
                        schaden: schaden.schaden,
                        schweregrad: schaden.schweregrad,
                        arbeiten: schaden.empfohleneArbeiten || [],
                        kiErkannt: !schaden.manuell,
                        confidence: schaden.confidence
                    };
                }
            });

            // KI-Analyse-Info speichern
            kalkWizardData.kiAnalyse = {
                durchgefuehrt: true,
                datum: new Date().toISOString(),
                erkannteTeile: selectedSchaeden.length,
                zusammenfassung: window.kiAnalyseResult?.zusammenfassung || '',
                geschaetzteDauer: window.kiAnalyseResult?.geschaetzteDauer || ''
            };

            showToast(`✅ ${selectedSchaeden.length} Teile übernommen`, 'success');

            // Zu Schritt 4 wechseln
            setTimeout(() => {
                goToStep(4);
            }, 500);
        }

        // ============================================
        // 🆕 PARTNER-ANFRAGEN INTEGRATION (Workflow: Partner → Kalkulation → KVA)
        // ============================================

        let loadedPartnerAnfragen = [];
        let selectedPartnerAnfrage = null;

        async function loadPartnerAnfragen() {
            const loading = document.getElementById('partnerLoading');
            const empty = document.getElementById('partnerEmpty');
            const listItems = document.getElementById('partnerListItems');
            const countBadge = document.getElementById('partnerCount');

            if (!loading || !listItems) return;

            try {
                loading.style.display = 'flex';
                if (empty) empty.style.display = 'none';
                listItems.innerHTML = '';

                await window.firebaseInitialized;
                if (!window.werkstattId || !window.getCollection) {
                    console.warn('⚠️ loadPartnerAnfragen: werkstattId oder getCollection nicht verfügbar');
                    loading.style.display = 'none';
                    if (empty) empty.style.display = 'flex';
                    return;
                }

                // Partner-Anfragen laden (KEINE Entwürfe, Status: neu oder warte_kva, noch kein KVA)
                const snapshot = await window.getCollection('partnerAnfragen')
                    .orderBy('timestamp', 'desc')
                    .limit(100)
                    .get();

                // Filtern: nur echte Partner-Anfragen (nicht Entwürfe), ohne KVA, status neu/warte_kva
                loadedPartnerAnfragen = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    // Nur Partner-Anfragen die:
                    // 1. KEINE Entwürfe sind (isEntwurf !== true)
                    // 2. Status 'neu' oder 'warte_kva' haben
                    // 3. Noch KEIN KVA haben (!data.kva)
                    if (!data.isEntwurf &&
                        ['neu', 'warte_kva'].includes(data.status) &&
                        !data.kva) {
                        loadedPartnerAnfragen.push({ id: doc.id, ...data });
                    }
                });

                loading.style.display = 'none';

                // Badge aktualisieren
                if (countBadge) {
                    if (loadedPartnerAnfragen.length > 0) {
                        countBadge.textContent = loadedPartnerAnfragen.length;
                        countBadge.style.display = 'inline';
                    } else {
                        countBadge.style.display = 'none';
                    }
                }

                if (loadedPartnerAnfragen.length === 0) {
                    if (empty) empty.style.display = 'flex';
                } else {
                    renderPartnerAnfragenListe(loadedPartnerAnfragen);
                }

                console.log(`🤝 ${loadedPartnerAnfragen.length} Partner-Anfragen geladen (ohne KVA)`);

            } catch (error) {
                console.error('❌ Fehler beim Laden der Partner-Anfragen:', error);
                loading.style.display = 'none';
                if (empty) empty.style.display = 'flex';
            }
        }

        function renderPartnerAnfragenListe(anfragen) {
            const container = document.getElementById('partnerListItems');
            if (!container) return;

            container.innerHTML = anfragen.map(anfrage => {
                // 🆕 FIX: Leeres Array abfangen → Fallback auf 'lackier'
                const serviceTyp = Array.isArray(anfrage.serviceTyp)
                    ? (anfrage.serviceTyp[0] || 'lackier')
                    : (anfrage.serviceTyp || 'lackier');
                const serviceLabel = SERVICE_LABELS[serviceTyp] || serviceTyp || 'Unbekannt';
                // 🆕 FIX: Fallback-Kette für konsistente Foto-Feldnamen
                // 🔧 FIX Bug #5 (2025-12-01): Fahrzeugschein-Fotos hinzufügen
                const schadenFotos = anfrage.photos || anfrage.photoUrls || anfrage.fotos || [];
                const fahrzeugscheinFotos = anfrage.fahrzeugscheinFotos || [];
                const photos = [...schadenFotos, ...fahrzeugscheinFotos];
                const hasPhotos = photos.length > 0;

                const statusText = anfrage.status === 'neu' ? 'Neu' : 'Warte auf KVA';
                const datum = anfrage.timestamp ? new Date(anfrage.timestamp).toLocaleDateString('de-DE') : '-';

                return `
                    <div class="partner-item ${selectedPartnerAnfrage?.id === anfrage.id ? 'selected' : ''}"
                         onclick="selectPartnerAnfrage('${anfrage.id}')">
                        <div class="partner-item__icon">🤝</div>
                        <div class="partner-item__info">
                            <div class="partner-item__title">
                                ${anfrage.kennzeichen || anfrage.auftragsnummer || 'Ohne Kennzeichen'}
                                ${anfrage.marke ? `- ${anfrage.marke} ${anfrage.modell || ''}` : ''}
                            </div>
                            <div class="partner-item__meta">
                                <span class="partner-item__partner-name">
                                    <i data-feather="building" style="width:12px;height:12px;"></i>
                                    ${anfrage.partnerName || 'Partner'}
                                </span>
                                <span><i data-feather="calendar" style="width:12px;height:12px;"></i> ${datum}</span>
                                <span class="partner-item__status ${anfrage.status}">${statusText}</span>
                            </div>
                            <div class="partner-item__meta" style="margin-top: 4px;">
                                <span class="entwurf-item__service">${serviceLabel}</span>
                            </div>
                            ${hasPhotos ? `
                                <div class="partner-item__photos">
                                    ${photos.slice(0, 3).map(url => `
                                        <img src="${url}" class="partner-item__photo" alt="Foto">
                                    `).join('')}
                                    ${photos.length > 3 ? `
                                        <div class="partner-item__photo-more">+${photos.length - 3}</div>
                                    ` : ''}
                                </div>
                            ` : ''}
                        </div>
                        <div class="partner-item__arrow">
                            <i data-feather="chevron-right"></i>
                        </div>
                    </div>
                `;
            }).join('');

            feather.replace();
        }

        function selectPartnerAnfrage(anfrageId) {
            selectedPartnerAnfrage = loadedPartnerAnfragen.find(a => a.id === anfrageId);
            if (!selectedPartnerAnfrage) {
                console.error('Partner-Anfrage nicht gefunden:', anfrageId);
                return;
            }

            console.log('🤝 Partner-Anfrage ausgewählt:', selectedPartnerAnfrage);

            // Highlight selected item
            document.querySelectorAll('.partner-item').forEach(item => {
                item.classList.remove('selected');
            });
            event.currentTarget.classList.add('selected');

            // Fahrzeugdaten aus Partner-Anfrage übernehmen
            kalkWizardData.partnerAnfrageId = selectedPartnerAnfrage.id;
            kalkWizardData.fahrzeug = {
                marke: selectedPartnerAnfrage.marke || '',
                modell: selectedPartnerAnfrage.modell || '',
                baujahr: selectedPartnerAnfrage.baujahrVon || selectedPartnerAnfrage.baujahr || '',
                kennzeichen: selectedPartnerAnfrage.kennzeichen || selectedPartnerAnfrage.auftragsnummer || '',
                farbcode: selectedPartnerAnfrage.farbnummer || selectedPartnerAnfrage.farbe || '',
                kunde: selectedPartnerAnfrage.kundenname || '',
                // 🆕 FIX (Nov 30, 2025): Zusätzliche Felder für Meister-Übersicht
                kmstand: selectedPartnerAnfrage.kmstand || selectedPartnerAnfrage.kilometerstand || '',
                anliefertermin: selectedPartnerAnfrage.anliefertermin || selectedPartnerAnfrage.liefertermin || '',
                abholtermin: selectedPartnerAnfrage.abholtermin || selectedPartnerAnfrage.fertigstellungsdatum || '',
                ersatzfahrzeug: selectedPartnerAnfrage.ersatzfahrzeug || selectedPartnerAnfrage.ersatzfahrzeugGewuenscht || ''
            };

            // 🆕 Auch auf Root-Level für einfacheren Zugriff
            kalkWizardData.kmstand = kalkWizardData.fahrzeug.kmstand;
            kalkWizardData.anliefertermin = kalkWizardData.fahrzeug.anliefertermin;
            kalkWizardData.abholtermin = kalkWizardData.fahrzeug.abholtermin;

            // 🚗 Ersatzfahrzeug-Daten als Objekt übernehmen (FIX: Nov 30, 2025)
            const ersatzfahrzeugFromAnfrage = selectedPartnerAnfrage.kalkulationData?.ersatzfahrzeug;
            if (ersatzfahrzeugFromAnfrage && typeof ersatzfahrzeugFromAnfrage === 'object') {
                kalkWizardData.ersatzfahrzeug = ersatzfahrzeugFromAnfrage;
                console.log('🚗 Ersatzfahrzeug-Kosten aus Partner-Anfrage geladen:', ersatzfahrzeugFromAnfrage);
            } else {
                kalkWizardData.ersatzfahrzeug = kalkWizardData.fahrzeug.ersatzfahrzeug;
            }

            // Schadensbeschreibung/Notizen aus Partner-Anfrage
            kalkWizardData.schadenBeschreibung = selectedPartnerAnfrage.schadenBeschreibung || selectedPartnerAnfrage.beschreibung || '';
            kalkWizardData.notizen = selectedPartnerAnfrage.notizen || '';
            kalkWizardData.partnerName = selectedPartnerAnfrage.partnerName || '';

            // 🆕 MULTI-SERVICE SUPPORT (2025-11-30) - auch für Partner-Anfragen
            // Service-Art(en) übernehmen
            if (Array.isArray(selectedPartnerAnfrage.serviceTyp) && selectedPartnerAnfrage.serviceTyp.length > 0) {
                kalkWizardData.services = [...selectedPartnerAnfrage.serviceTyp];
                kalkWizardData.isMultiService = selectedPartnerAnfrage.serviceTyp.length > 1;
            } else if (selectedPartnerAnfrage.serviceLabels && Array.isArray(selectedPartnerAnfrage.serviceLabels) && selectedPartnerAnfrage.serviceLabels.length > 1) {
                // Fallback: serviceLabels verwenden
                kalkWizardData.services = [...selectedPartnerAnfrage.serviceLabels];
                kalkWizardData.isMultiService = true;
            } else {
                kalkWizardData.services = [selectedPartnerAnfrage.serviceTyp || 'lackier'];
                kalkWizardData.isMultiService = false;
            }
            kalkWizardData.serviceArt = kalkWizardData.services[0]; // Backwards-Compat
            kalkWizardData.currentServiceIndex = 0;
            kalkWizardData.serviceDetailsPerService = {};

            // additionalServices aus Partner-Anfrage laden
            if (selectedPartnerAnfrage.additionalServices && Array.isArray(selectedPartnerAnfrage.additionalServices)) {
                kalkWizardData.additionalServicesFromEntwurf = selectedPartnerAnfrage.additionalServices;
            } else {
                kalkWizardData.additionalServicesFromEntwurf = [];
            }

            // 🔧 FIX (2025-11-30): Service-Details aus Partner-Anfrage in serviceDetailsPerService vorausfüllen
            // ============================================
            // 🔄 FELDNAMEN-MAPPING: Partner-App → kalkulation.html
            // ============================================
            // VOLLSTÄNDIGE MAPPING-TABELLE (Nov 30, 2025)
            // multi-service-anfrage.html speichert ohne Prefix: lackier_farbcode → farbcode
            // kalkulation.html SERVICE_CONFIG hat andere Feldnamen
            //
            // 🆕 FIX (Nov 30, 2025): serviceTyp-Parameter hinzugefügt!
            // Die Mappings werden jetzt NUR für den jeweiligen Service-Typ angewendet,
            // um zu verhindern dass z.B. Lackier-"art" zu "klimaservice" gemappt wird.
            const normalizeServiceDetailsPartner = (details, serviceTyp = null) => {
                if (!details || typeof details !== 'object') return {};
                const normalized = { ...details };

                // ===== REIFEN-MAPPING (nur für 'reifen') =====
                if (serviceTyp === 'reifen') {
                    if (normalized.reifentyp !== undefined) {
                        normalized.reifenTyp = normalized.reifentyp;
                    }
                    if (normalized.typ !== undefined && normalized.reifenTyp === undefined) {
                        normalized.reifenTyp = normalized.typ;
                    }
                    // Wert-Mapping: Partner "ganzjahr" → Kalkulation "allseason"
                    if (normalized.reifenTyp === 'ganzjahr') {
                        normalized.reifenTyp = 'allseason';
                    }
                    if (normalized.groesse !== undefined) {
                        normalized.reifengroesse = normalized.groesse;
                    }
                    if (normalized.anzahl !== undefined) {
                        normalized.reifenanzahl = String(normalized.anzahl);
                    }
                }

                // ===== LACKIER-MAPPING (nur für 'lackier') =====
                if (serviceTyp === 'lackier') {
                    if (normalized.farbcode !== undefined && normalized.farbnummer === undefined) {
                        normalized.farbnummer = normalized.farbcode;
                    }
                    if (normalized.info !== undefined && normalized.schadenBeschreibung === undefined) {
                        normalized.schadenBeschreibung = normalized.info;
                    }
                }

                // ===== PFLEGE-MAPPING (nur für 'pflege') =====
                if (serviceTyp === 'pflege') {
                    if (normalized.paket !== undefined && normalized.pflegePaket === undefined) {
                        const pflegePaketMapping = {
                            'basis': 'basis',
                            'premium': 'premium',
                            'komplett': 'premium'
                        };
                        normalized.pflegePaket = pflegePaketMapping[normalized.paket] || normalized.paket;
                    }
                    // Sammle Checkbox-Werte zu einem String
                    const pflegeExtras = [];
                    if (normalized.polieren === true) pflegeExtras.push('Polieren');
                    if (normalized.motor === true) pflegeExtras.push('Motorraumreinigung');
                    if (normalized.ozon === true) pflegeExtras.push('Ozonbehandlung');
                    if (pflegeExtras.length > 0 && normalized.zusatzleistungen === undefined) {
                        normalized.zusatzleistungen = pflegeExtras.join(', ');
                    }
                }

                // ===== MECHANIK-MAPPING (nur für 'mechanik') =====
                if (serviceTyp === 'mechanik') {
                    if (normalized.beschreibung !== undefined && normalized.problem === undefined) {
                        normalized.problem = normalized.beschreibung;
                    }
                    if (normalized.beschreibung !== undefined && normalized.symptome === undefined) {
                        normalized.symptome = normalized.beschreibung;
                    }
                }

                // ===== TUEV-MAPPING (nur für 'tuev') =====
                if (serviceTyp === 'tuev') {
                    if (normalized.ablauf !== undefined && normalized.huDatum === undefined) {
                        normalized.huDatum = normalized.ablauf;
                    }
                    if (normalized.info !== undefined && normalized.bekannteMaengel === undefined) {
                        normalized.bekannteMaengel = normalized.info;
                    }
                    // Konvertiere HU/AU Checkboxes zu pruefart
                    if (normalized.pruefart === undefined) {
                        const hasHU = normalized.hau === true;
                        const hasAU = normalized.au === true;
                        if (hasHU && hasAU) normalized.pruefart = 'hu-au';
                        else if (hasHU) normalized.pruefart = 'hu';
                        else if (hasAU) normalized.pruefart = 'au';
                    }
                }

                // ===== KLIMA-MAPPING (nur für 'klima') =====
                if (serviceTyp === 'klima') {
                    if (normalized.art !== undefined && normalized.klimaservice === undefined) {
                        normalized.klimaservice = normalized.art;
                    }
                    if (normalized.problem !== undefined && normalized.klimaproblem === undefined) {
                        normalized.klimaproblem = normalized.problem;
                    }
                    if (normalized.kaeltemittel === 'unbekannt') {
                        normalized.kaeltemittel = '';
                    }
                }

                // ===== GLAS-MAPPING (nur für 'glas') =====
                if (serviceTyp === 'glas') {
                    if (normalized.schadensart !== undefined && normalized.schadensgroesse === undefined) {
                        const schadensartMapping = {
                            'steinschlag': 'klein',
                            'riss': 'riss',
                            'bruch': 'gross'
                        };
                        normalized.schadensgroesse = schadensartMapping[normalized.schadensart] || normalized.schadensart;
                    }
                    if (normalized.position !== undefined && normalized.glasposition === undefined) {
                        normalized.glasposition = normalized.position;
                    }
                }

                // ===== DELLEN-MAPPING (nur für 'dellen') =====
                if (serviceTyp === 'dellen') {
                    if (normalized.anzahl !== undefined && normalized.dellenanzahl === undefined) {
                        const anzahl = parseInt(normalized.anzahl, 10);
                        // 🆕 FIX: NaN-Check verhindert falsche Zuordnung
                        if (isNaN(anzahl)) normalized.dellenanzahl = '1-5';
                        else if (anzahl <= 5) normalized.dellenanzahl = '1-5';
                        else if (anzahl <= 15) normalized.dellenanzahl = '6-15';
                        else if (anzahl <= 30) normalized.dellenanzahl = '16-30';
                        else normalized.dellenanzahl = '30+';
                    }
                    if (normalized.groesse !== undefined && normalized.dellengroesse === undefined) {
                        normalized.dellengroesse = normalized.groesse;
                    }
                    if (normalized.position !== undefined && normalized.dellenpositionen === undefined) {
                        normalized.dellenpositionen = normalized.position;
                    }
                    // Radio-Button: "true"/"false" → "ja"/"nein"
                    if (normalized.lackschaden === 'true') normalized.lackschaden = 'ja';
                    if (normalized.lackschaden === 'false') normalized.lackschaden = 'nein';
                }

                // ===== FOLIERUNG-MAPPING (nur für 'folierung') =====
                if (serviceTyp === 'folierung') {
                    if (normalized.art !== undefined && normalized.folierungArt === undefined) {
                        normalized.folierungArt = normalized.art;
                    }
                    if (normalized.folienart !== undefined && normalized.folienTyp === undefined) {
                        normalized.folienTyp = normalized.folienart;
                    }
                    if (normalized.farbe !== undefined && normalized.folienFarbe === undefined) {
                        normalized.folienFarbe = normalized.farbe;
                    }
                    if (normalized.info !== undefined && normalized.folierungInfo === undefined) {
                        normalized.folierungInfo = normalized.info;
                    }
                    // Legacy-Mappings
                    if (normalized.folierungMaterial !== undefined && normalized.folienTyp === undefined) {
                        normalized.folienTyp = normalized.folierungMaterial;
                    }
                    if (normalized.folierungFarbe !== undefined && normalized.folienFarbe === undefined) {
                        normalized.folienFarbe = normalized.folierungFarbe;
                    }
                    if (normalized.folierungDesign !== undefined && normalized.designBeschreibung === undefined) {
                        normalized.designBeschreibung = normalized.folierungDesign;
                    }
                }

                // ===== STEINSCHUTZ-MAPPING (nur für 'steinschutz') =====
                if (serviceTyp === 'steinschutz') {
                    if (normalized.umfang !== undefined && normalized.steinschutzUmfang === undefined) {
                        normalized.steinschutzUmfang = normalized.umfang;
                    }
                    if (normalized.material !== undefined && normalized.folienTyp === undefined) {
                        normalized.folienTyp = normalized.material;
                    }
                    if (normalized.bereiche !== undefined && normalized.steinschutzBereiche === undefined) {
                        normalized.steinschutzBereiche = normalized.bereiche;
                    }
                    // Legacy
                    if (normalized.steinschutzMaterial !== undefined && normalized.folienTyp === undefined) {
                        normalized.folienTyp = normalized.steinschutzMaterial;
                    }
                }

                // ===== WERBEBEKLEBUNG-MAPPING (nur für 'werbebeklebung') =====
                if (serviceTyp === 'werbebeklebung') {
                    if (normalized.art !== undefined && normalized.werbebeklebungUmfang === undefined) {
                        normalized.werbebeklebungUmfang = normalized.art;
                    }
                    if (normalized.komplexitaet !== undefined && normalized.designKomplexitaet === undefined) {
                        normalized.designKomplexitaet = normalized.komplexitaet;
                    }
                    // Legacy
                    if (normalized.werbebeklebungKomplexitaet !== undefined && normalized.designKomplexitaet === undefined) {
                        normalized.designKomplexitaet = normalized.werbebeklebungKomplexitaet;
                    }
                    if (normalized.werbebeklebungFarbanzahl !== undefined && normalized.farbanzahl === undefined) {
                        normalized.farbanzahl = parseInt(normalized.werbebeklebungFarbanzahl) || 2;
                    }
                    if (normalized.werbebeklebungText !== undefined && normalized.kontaktdaten === undefined) {
                        normalized.kontaktdaten = normalized.werbebeklebungText;
                    }
                }

                // ===== VERSICHERUNG-MAPPING (nur für 'versicherung') =====
                if (serviceTyp === 'versicherung') {
                    if (normalized.schadennummer !== undefined && normalized.schadensnummer === undefined) {
                        normalized.schadensnummer = normalized.schadennummer;
                    }
                    if (normalized.hergang !== undefined && normalized.unfallhergang === undefined) {
                        normalized.unfallhergang = normalized.hergang;
                    }
                }

                console.log(`📋 Normalisierte Partner-Service-Details für "${serviceTyp}":`, normalized);
                return normalized;
            };

            // 🆕 FIX (2025-11-30): Multi-Service serviceData korrekt laden
            // Bei Multi-Service Anfragen ist serviceData bereits pro Service-Key strukturiert:
            // serviceData = { 'lackier': {...}, 'reifen': {...} }
            // Bei Single-Service Anfragen ist serviceData direkt das Details-Objekt:
            // serviceData = { art: '...', teile: '...' }

            const serviceDataFromAnfrage = selectedPartnerAnfrage.serviceData || {};

            // Prüfen ob serviceData pro-Service-Key strukturiert ist (Multi-Service Format)
            const isMultiServiceFormat = kalkWizardData.isMultiService &&
                kalkWizardData.services.some(svc => serviceDataFromAnfrage[svc] !== undefined);

            if (isMultiServiceFormat) {
                // MULTI-SERVICE FORMAT: serviceData[serviceTyp] = Details
                console.log('📦 [MULTI-SERVICE] Lade Service-Details pro Service-Key...');
                kalkWizardData.services.forEach(serviceTyp => {
                    const serviceDetails = serviceDataFromAnfrage[serviceTyp];
                    if (serviceDetails && typeof serviceDetails === 'object' && Object.keys(serviceDetails).length > 0) {
                        // 🆕 FIX: serviceTyp als 2. Parameter übergeben!
                        kalkWizardData.serviceDetailsPerService[serviceTyp] = normalizeServiceDetailsPartner(serviceDetails, serviceTyp);
                        console.log(`   ✅ "${serviceTyp}" Details geladen:`, kalkWizardData.serviceDetailsPerService[serviceTyp]);
                    } else {
                        console.log(`   ⚠️ "${serviceTyp}" hat keine Details`);
                    }
                });
            } else {
                // SINGLE-SERVICE FORMAT: serviceData = Details (oder serviceDetails)
                console.log('📦 [SINGLE-SERVICE] Lade Service-Details als einzelnes Objekt...');
                const primaryServicePartner = kalkWizardData.services[0];
                const primaryDetails = selectedPartnerAnfrage.serviceDetails || serviceDataFromAnfrage || {};
                if (primaryDetails && typeof primaryDetails === 'object' && Object.keys(primaryDetails).length > 0) {
                    // 🆕 FIX: serviceTyp als 2. Parameter übergeben!
                    kalkWizardData.serviceDetailsPerService[primaryServicePartner] = normalizeServiceDetailsPartner(primaryDetails, primaryServicePartner);
                    console.log(`   ✅ "${primaryServicePartner}" Details vorausgefüllt:`, kalkWizardData.serviceDetailsPerService[primaryServicePartner]);
                }
            }

            // 2. Additional Services Details laden (falls additionalServices Array vorhanden)
            if (kalkWizardData.additionalServicesFromEntwurf.length > 0) {
                kalkWizardData.additionalServicesFromEntwurf.forEach(addService => {
                    if (addService.serviceTyp && addService.serviceDetails && typeof addService.serviceDetails === 'object') {
                        // 🆕 FIX: serviceTyp als 2. Parameter übergeben!
                        kalkWizardData.serviceDetailsPerService[addService.serviceTyp] = normalizeServiceDetailsPartner(addService.serviceDetails, addService.serviceTyp);
                        console.log(`📋 Partner Additional Service "${addService.serviceTyp}" Details vorausgefüllt:`, kalkWizardData.serviceDetailsPerService[addService.serviceTyp]);
                    }
                });
            }

            // 3. Falls bereits serviceDetailsPerService vom vorherigen Kalkulations-Durchlauf existiert (Priorität!)
            if (selectedPartnerAnfrage.serviceDetailsPerService && typeof selectedPartnerAnfrage.serviceDetailsPerService === 'object') {
                Object.keys(selectedPartnerAnfrage.serviceDetailsPerService).forEach(serviceKey => {
                    kalkWizardData.serviceDetailsPerService[serviceKey] = {
                        ...kalkWizardData.serviceDetailsPerService[serviceKey],
                        ...selectedPartnerAnfrage.serviceDetailsPerService[serviceKey]
                    };
                    console.log(`📋 Partner Kalkulations-Details für "${serviceKey}" übernommen:`, kalkWizardData.serviceDetailsPerService[serviceKey]);
                });
            }

            console.log('✅ Partner serviceDetailsPerService vollständig geladen:', kalkWizardData.serviceDetailsPerService);

            console.log(`🆕 Partner-Anfrage Multi-Service Modus: ${kalkWizardData.isMultiService ? 'JA' : 'NEIN'}, Services:`, kalkWizardData.services);

            // 🆕 FIX: Fotos mit Fallback-Kette speichern für Step 3 und 4
            // 🔧 FIX Bug #5 (2025-12-01): Fahrzeugschein-Fotos hinzufügen
            const schadenFotosPartner = selectedPartnerAnfrage.photos ||
                                        selectedPartnerAnfrage.photoUrls ||
                                        selectedPartnerAnfrage.fotos || [];
            const fahrzeugscheinFotosPartner = selectedPartnerAnfrage.fahrzeugscheinFotos || [];
            kalkWizardData.entwurfPhotos = [...schadenFotosPartner, ...fahrzeugscheinFotosPartner];

            // Zusätzliche Partner-Daten speichern
            kalkWizardData.partnerName = selectedPartnerAnfrage.partnerName || '';
            kalkWizardData.partnerId = selectedPartnerAnfrage.partnerId || '';
            kalkWizardData.schadenBeschreibung = selectedPartnerAnfrage.schadenBeschreibung ||
                                                  selectedPartnerAnfrage.notizen || '';
            kalkWizardData.serviceData = selectedPartnerAnfrage.serviceData || {};
            kalkWizardData.farbe = selectedPartnerAnfrage.farbe || selectedPartnerAnfrage.farbname || '';
            kalkWizardData.datum = selectedPartnerAnfrage.timestamp
                ? new Date(selectedPartnerAnfrage.timestamp).toLocaleDateString('de-DE')
                : '-';
            kalkWizardData.notizen = selectedPartnerAnfrage.notizen || '';
            kalkWizardData.dringlichkeit = selectedPartnerAnfrage.dringlichkeit || '';
            kalkWizardData.quelle = 'partner';

            // Zeige ausgewähltes Fahrzeug
            const selectedBox = document.getElementById('selectedDbVehicle');
            if (selectedBox) {
                selectedBox.style.display = 'block';
                document.getElementById('selectedVehicleName').textContent =
                    `${selectedPartnerAnfrage.marke || '-'} ${selectedPartnerAnfrage.modell || ''}`;
                document.getElementById('selectedVehicleKennzeichen').textContent =
                    selectedPartnerAnfrage.kennzeichen || selectedPartnerAnfrage.auftragsnummer || '-';
                document.getElementById('selectedVehicleKunde').textContent =
                    `Partner: ${selectedPartnerAnfrage.partnerName || '-'}`;
            }

            // Tabs ausblenden
            const tabsContainer = document.querySelector('.kalk-vehicle-tabs');
            const tabPartner = document.getElementById('tabPartner');
            if (tabsContainer) tabsContainer.style.display = 'none';
            if (tabPartner) tabPartner.style.display = 'none';

            // Service-Art Radio-Button in Step 2 vorauswählen
            setTimeout(() => {
                const serviceRadio = document.querySelector(`input[name="serviceArt"][value="${kalkWizardData.serviceArt}"]`);
                if (serviceRadio) {
                    serviceRadio.checked = true;
                    // Trigger change event um UI zu aktualisieren
                    serviceRadio.dispatchEvent(new Event('change', { bubbles: true }));
                    console.log('✅ Service vorausgewählt:', kalkWizardData.serviceArt);
                } else {
                    console.warn('⚠️ Service-Radio nicht gefunden für:', kalkWizardData.serviceArt);
                }
            }, 100);

            showToast(`✅ Partner-Anfrage "${selectedPartnerAnfrage.kennzeichen || selectedPartnerAnfrage.auftragsnummer}" übernommen`, 'success');

            // 🔧 FIX (2025-11-30): Bei Multi-Service zu Step 2b mit ALLEN Services auf einer Seite
            setTimeout(() => {
                // Prüfe ob irgendein Service Details hat
                const hasAnyServiceDetails = kalkWizardData.services.some(service => {
                    const config = SERVICE_CONFIG[service];
                    return config?.zusatzfelder && Object.keys(config.zusatzfelder).length > 0;
                });

                if (hasAnyServiceDetails) {
                    console.log('🆕 Partner-Anfrage: Services haben Details, gehe zu Step 2b');
                    console.log('   Services:', kalkWizardData.services);

                    // Step 2b anzeigen mit ALLEN Services
                    currentStep = '2b';
                    renderAllServiceDetails(); // 🆕 NEU: Alle Services auf einer Seite!
                    updateStepUI();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    // Keine Service-Details nötig → Direkt zu Step 3
                    console.log('🆕 Keine Service-Details nötig, gehe direkt zu Step 3');
                    goToStep(3);
                }
            }, 500);
        }

        // Service-Art Labels (echte 12 App-Services)
        const SERVICE_LABELS = {
            'lackier': 'Lackierung',
            'versicherung': 'Versicherungsschaden',
            'dellen': 'Dellendrücken (PDR)',
            'glas': 'Glasreparatur',
            'reifen': 'Reifen-Service',
            'mechanik': 'Mechanik',
            'pflege': 'Fahrzeugpflege',
            'tuev': 'TÜV/AU',
            'klima': 'Klimaservice',
            'folierung': 'Folierung',
            'steinschutz': 'Steinschutzfolie',
            'werbebeklebung': 'Werbebeklebung'
        };

        // Service-spezifische Konfiguration für Step 3 (Teile) und Step 4 (Arbeiten)
        const SERVICE_CONFIG = {
            'lackier': {
                teile: ['Stoßfänger vorne', 'Stoßfänger hinten', 'Motorhaube', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Seitenwand links', 'Seitenwand rechts', 'Dach', 'Heckklappe', 'Schweller links', 'Schweller rechts', 'A-Säule', 'B-Säule', 'C-Säule', 'Spiegel links', 'Spiegel rechts'],
                arbeiten: ['lackieren', 'grundieren', 'spachteln', 'schleifen', 'polieren', 'demontieren', 'montieren', 'ersetzen', 'austauschen'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: true, materialien: false },
                // 🆕 Nov 30, 2025: Zusatzfelder für Lackierung (aus Partner-Anfrage)
                zusatzfelder: {
                    farbcode: {
                        label: 'Farbcode',
                        typ: 'text',
                        placeholder: 'z.B. LY9T, LA7W, LC9X...',
                        required: false
                    },
                    karosserie: {
                        label: 'Demontage benötigt?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ja', label: 'Ja - Demontage erforderlich' },
                            { value: 'nein', label: 'Nein - keine Demontage' }
                        ]
                    },
                    ersatzteil: {
                        label: 'Ersatzteil-Präferenz',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'original', label: 'Original (OEM)' },
                            { value: 'nachbau', label: 'Nachbau / Aftermarket' },
                            { value: 'egal', label: 'Egal' }
                        ]
                    },
                    teile: {
                        label: 'Zu lackierende Teile',
                        typ: 'textarea',
                        placeholder: 'z.B. Motorhaube, Kotflügel vorne links...',
                        required: false
                    },
                    schadenBeschreibung: {
                        label: 'Schadensbeschreibung',
                        typ: 'textarea',
                        placeholder: 'Beschreiben Sie den Schaden oder die gewünschte Lackierung...',
                        required: false
                    }
                }
            },
            'versicherung': {
                teile: ['Stoßfänger vorne', 'Stoßfänger hinten', 'Motorhaube', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Seitenwand links', 'Seitenwand rechts', 'Dach', 'Heckklappe', 'Rahmen/Struktur', 'Airbag', 'Lenkung', 'Achse vorne', 'Achse hinten'],
                arbeiten: ['lackieren', 'austauschen', 'richten', 'schweissen', 'demontieren', 'montieren', 'grundieren', 'spachteln'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: true, materialien: false }
            },
            'dellen': {
                teile: ['Motorhaube', 'Dach', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Heckklappe', 'Seitenwand links', 'Seitenwand rechts'],
                arbeiten: ['ausbeulen', 'drücken', 'kleben', 'lackieren', 'ersetzen', 'austauschen'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false }
            },
            'folierung': {
                teile: ['Fahrzeug komplett', 'Motorhaube', 'Dach', 'Stoßfänger vorne', 'Stoßfänger hinten', 'Seitenwände', 'Türen', 'Spiegel', 'Dachkanten', 'Einstiege'],
                arbeiten: ['folieren', 'entfolieren', 'reinigen', 'vorbereiten'],
                tabellen: { ersatzteile: false, arbeitslohn: true, lackierung: true, materialien: true },
                // 🆕 Service-spezifische Zusatzfelder (erweitert Nov 30, 2025)
                zusatzfelder: {
                    // 🆕 NEU: Felder aus annahme.html
                    folierungArt: {
                        label: 'Folierungs-Art',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'vollfolierung', label: 'Vollfolierung' },
                            { value: 'teilfolierung', label: 'Teilfolierung' },
                            { value: 'akzente', label: 'Akzente / Details' }
                        ]
                    },
                    folienTyp: {
                        label: 'Folien-Typ / Material',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'glanz', label: 'Glanz (Glossy)' },
                            { value: 'matt', label: 'Matt' },
                            { value: 'satin', label: 'Satin' },
                            { value: 'metallic', label: 'Metallic' },
                            { value: 'chrome', label: 'Chrom' },
                            { value: 'satin-chrome', label: 'Satin Chrom' },
                            { value: 'carbon', label: 'Carbon-Look' },
                            { value: 'carbon-3d', label: 'Carbon 3D Struktur' },
                            { value: 'brushed', label: 'Brushed (Gebürstet)' },
                            { value: 'color-shift', label: 'Color-Shift / Flip-Flop' }
                        ]
                    },
                    folierungSpezialTyp: {
                        label: 'Spezial-Effekt (optional)',
                        typ: 'text',
                        placeholder: 'z.B. Chamäleon, Perlmutt, Hologramm...',
                        required: false
                    },
                    folienFarbe: {
                        label: 'Wunschfarbe',
                        typ: 'text',
                        placeholder: 'z.B. Nardo Grau, Racing Green, Midnight Purple...',
                        required: false
                    },
                    folierungBereiche: {
                        label: 'Bereiche',
                        typ: 'textarea',
                        placeholder: 'z.B. Dach, Motorhaube, Spiegel...',
                        required: false
                    },
                    designBeschreibung: {
                        label: 'Design-Beschreibung',
                        typ: 'textarea',
                        placeholder: 'Beschreiben Sie Ihre Design-Vorstellungen (Muster, Streifen, Akzente, etc.)...',
                        required: false
                    },
                    folierungInfo: {
                        label: 'Zusätzliche Informationen',
                        typ: 'textarea',
                        placeholder: 'Weitere Wünsche oder Anmerkungen...',
                        required: false
                    },
                    designUpload: {
                        label: 'Design/Grafik hochladen (optional)',
                        typ: 'file',
                        accept: 'image/*,.pdf,.ai,.psd,.svg',
                        multiple: true,
                        required: false,
                        help: 'Design-Dateien: JPG, PNG, PDF, AI, PSD, SVG'
                    }
                }
            },
            'steinschutz': {
                teile: ['Motorhaube', 'Stoßfänger vorne', 'Kotflügel', 'Spiegel', 'A-Säule', 'Dachkante vorne', 'Schweller', 'Türkanten'],
                arbeiten: ['folieren', 'reinigen', 'vorbereiten', 'schneiden'],
                tabellen: { ersatzteile: false, arbeitslohn: true, lackierung: true, materialien: true },
                // 🆕 Erweitert mit Feldern aus annahme.html (Nov 30, 2025)
                zusatzfelder: {
                    steinschutzUmfang: {
                        label: 'Umfang',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'basis', label: 'Basis (Frontstoßstange, Motorhaube vorne)' },
                            { value: 'standard', label: 'Standard (+ Kotflügel, Spiegel)' },
                            { value: 'premium', label: 'Premium (komplette Front)' },
                            { value: 'vollschutz', label: 'Vollschutz (ganzes Fahrzeug)' }
                        ]
                    },
                    folienTyp: {
                        label: 'Schutzfolien-Typ / Material',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ppf-glanz', label: 'PPF Glanz (Paint Protection Film)' },
                            { value: 'ppf-matt', label: 'PPF Matt' },
                            { value: 'ppf-selbstheilend', label: 'PPF Selbstheilend' },
                            { value: 'standard', label: 'Standard Schutzfolie' }
                        ]
                    },
                    folienMarke: {
                        label: 'Bevorzugte Marke (optional)',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Keine Präferenz' },
                            { value: 'xpel', label: 'XPEL' },
                            { value: 'suntek', label: 'SunTek' },
                            { value: '3m', label: '3M' },
                            { value: 'hexis', label: 'Hexis' },
                            { value: 'llumar', label: 'LLumar' }
                        ]
                    },
                    steinschutzBereiche: {
                        label: 'Bereiche (Details)',
                        typ: 'textarea',
                        placeholder: 'z.B. Motorhaube komplett, Stoßfänger vorne, Spiegel...',
                        required: false
                    },
                    steinschutzInfo: {
                        label: 'Zusätzliche Informationen',
                        typ: 'textarea',
                        placeholder: 'Weitere Wünsche oder Anmerkungen...',
                        required: false
                    }
                }
            },
            'werbebeklebung': {
                teile: ['Fahrzeug komplett', 'Seitenflächen', 'Heck', 'Motorhaube', 'Dach', 'Türen', 'Fenster'],
                arbeiten: ['bekleben', 'entfernen', 'gestalten', 'drucken', 'vorbereiten'],
                tabellen: { ersatzteile: false, arbeitslohn: true, lackierung: true, materialien: true },
                // 🆕 Erweitert mit Feldern aus annahme.html (Nov 30, 2025)
                zusatzfelder: {
                    werbebeklebungUmfang: {
                        label: 'Umfang',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'klein', label: 'Klein (Logo / Schriftzug)' },
                            { value: 'mittel', label: 'Mittel (Türen, Heck)' },
                            { value: 'gross', label: 'Groß (Teilfolierung)' },
                            { value: 'komplett', label: 'Komplett (Vollfolierung)' }
                        ]
                    },
                    logoUpload: {
                        label: 'Logo hochladen',
                        typ: 'file',
                        accept: 'image/*,.pdf,.ai,.svg,.eps',
                        multiple: true,
                        required: false,
                        help: 'Firmenlogo in hoher Auflösung (mind. 300dpi): PNG, SVG, AI, EPS, PDF'
                    },
                    designVorlage: {
                        label: 'Design-Vorlage (falls vorhanden)',
                        typ: 'file',
                        accept: 'image/*,.pdf,.ai,.psd',
                        multiple: true,
                        required: false,
                        help: 'Fertige Design-Vorlage für die Beklebung'
                    },
                    designKomplexitaet: {
                        label: 'Design-Komplexität',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'einfach', label: 'Einfach - nur Logo (1-2 Farben)' },
                            { value: 'mittel', label: 'Mittel - Logo + Text + Grafiken (3-5 Farben)' },
                            { value: 'komplex', label: 'Komplex - Vollflächiges Design (6+ Farben)' }
                        ]
                    },
                    logoStatus: {
                        label: 'Logo/Design Status',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'vorhanden', label: 'Logo & Design liegen bereits vor' },
                            { value: 'nur-logo', label: 'Nur Logo vorhanden, Design wird benötigt' },
                            { value: 'design-service', label: 'Logo & Design müssen erstellt werden' }
                        ]
                    },
                    farbanzahl: {
                        label: 'Anzahl Farben im Design',
                        typ: 'number',
                        min: 1,
                        max: 10,
                        default: 2,
                        required: false
                    },
                    firmenname: {
                        label: 'Firmenname (für Beschriftung)',
                        typ: 'text',
                        placeholder: 'z.B. Mustermann GmbH',
                        required: false
                    },
                    werbebeklebungText: {
                        label: 'Beschriftungstext',
                        typ: 'textarea',
                        placeholder: 'z.B. Slogan, Telefonnummer, Website...',
                        required: false
                    },
                    kontaktdaten: {
                        label: 'Kontaktdaten für Beschriftung',
                        typ: 'textarea',
                        placeholder: 'Tel: 0123-456789\nwww.mustermann.de\ninfo@mustermann.de',
                        required: false
                    },
                    werbebeklebungInfo: {
                        label: 'Zusätzliche Informationen',
                        typ: 'textarea',
                        placeholder: 'Weitere Wünsche oder Anmerkungen...',
                        required: false
                    }
                }
            },
            // 🆕 Zusatzfelder für andere Services
            'reifen': {
                teile: ['Reifen vorne links', 'Reifen vorne rechts', 'Reifen hinten links', 'Reifen hinten rechts', 'Felge vorne links', 'Felge vorne rechts', 'Felge hinten links', 'Felge hinten rechts', 'Ersatzrad'],
                arbeiten: ['wechseln', 'auswuchten', 'montieren', 'demontieren', 'reparieren', 'lackieren'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    reifengroesse: {
                        label: 'Reifengröße',
                        typ: 'text',
                        placeholder: 'z.B. 225/45 R17',
                        required: false
                    },
                    reifenTyp: {
                        label: 'Reifen-Typ',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'sommer', label: 'Sommerreifen' },
                            { value: 'winter', label: 'Winterreifen' },
                            { value: 'allseason', label: 'Ganzjahresreifen' }
                        ]
                    },
                    felgenTyp: {
                        label: 'Felgen-Typ',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'stahl', label: 'Stahlfelgen' },
                            { value: 'alu', label: 'Alufelgen' }
                        ]
                    },
                    // 🆕 NEU: Feld aus annahme.html (Nov 30, 2025)
                    reifenanzahl: {
                        label: 'Anzahl Reifen',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: '1', label: '1 Reifen' },
                            { value: '2', label: '2 Reifen' },
                            { value: '4', label: '4 Reifen' },
                            { value: '5', label: '5 Reifen (inkl. Ersatzrad)' }
                        ]
                    }
                }
            },
            'glas': {
                teile: ['Frontscheibe', 'Heckscheibe', 'Seitenscheibe vorne links', 'Seitenscheibe vorne rechts', 'Seitenscheibe hinten links', 'Seitenscheibe hinten rechts', 'Dreiecksfenster', 'Panoramadach'],
                arbeiten: ['austauschen', 'reparieren', 'steinschlag-reparatur', 'demontieren', 'montieren', 'kalibrieren'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    // 🆕 NEU: Felder aus annahme.html (Nov 30, 2025)
                    scheibentyp: {
                        label: 'Scheibentyp',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'frontscheibe', label: 'Frontscheibe' },
                            { value: 'heckscheibe', label: 'Heckscheibe' },
                            { value: 'seitenscheibe', label: 'Seitenscheibe' },
                            { value: 'dreiecksfenster', label: 'Dreiecksfenster' }
                        ]
                    },
                    glasposition: {
                        label: 'Position',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'vorne', label: 'Vorne' },
                            { value: 'hinten', label: 'Hinten' },
                            { value: 'links', label: 'Links' },
                            { value: 'rechts', label: 'Rechts' }
                        ]
                    },
                    schadensgroesse: {
                        label: 'Schadensgröße',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'klein', label: 'Klein (< 2cm, reparierbar)' },
                            { value: 'mittel', label: 'Mittel (2-5cm)' },
                            { value: 'gross', label: 'Groß (> 5cm, Austausch nötig)' },
                            { value: 'riss', label: 'Riss' }
                        ]
                    },
                    kalibrierungNoetig: {
                        label: 'Kamera-Kalibrierung nötig?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Unbekannt' },
                            { value: 'ja', label: 'Ja - Fahrassistenzsysteme vorhanden' },
                            { value: 'nein', label: 'Nein - keine Kalibrierung nötig' }
                        ],
                        help: 'Bei Fahrzeugen mit Spurhalteassistent, Notbremsassistent etc.'
                    }
                }
            },
            'klima': {
                teile: ['Klimakompressor', 'Kondensator', 'Verdampfer', 'Trockner', 'Leitungen', 'Innenraumfilter', 'Klimabedienteil'],
                arbeiten: ['prüfen', 'befüllen', 'austauschen', 'desinfizieren', 'reinigen'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    // 🆕 NEU: Felder aus annahme.html (Nov 30, 2025)
                    klimaservice: {
                        label: 'Gewünschter Service',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'wartung', label: 'Klimawartung' },
                            { value: 'reparatur', label: 'Klimareparatur' },
                            { value: 'befuellung', label: 'Kältemittel-Befüllung' },
                            { value: 'desinfektion', label: 'Desinfektion' }
                        ]
                    },
                    kaeltemittel: {
                        label: 'Kältemittel-Typ',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Unbekannt' },
                            { value: 'r134a', label: 'R134a (bis ca. 2017)' },
                            { value: 'r1234yf', label: 'R1234yf (ab ca. 2017)' }
                        ]
                    },
                    klimaproblem: {
                        label: 'Problembeschreibung',
                        typ: 'textarea',
                        placeholder: 'z.B. Klima kühlt nicht mehr, unangenehmer Geruch...',
                        required: false
                    },
                    desinfektion: {
                        label: 'Desinfektion gewünscht?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ja', label: 'Ja - Ozon-Desinfektion' },
                            { value: 'nein', label: 'Nein' }
                        ]
                    }
                }
            },
            'tuev': {
                teile: ['Bremsen', 'Beleuchtung', 'Lenkung', 'Fahrwerk', 'Abgasanlage', 'Karosserie', 'Reifen', 'Elektronik'],
                arbeiten: ['prüfen', 'einstellen', 'reparieren', 'austauschen'],
                tabellen: { ersatzteile: false, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    // 🆕 NEU: Feld aus annahme.html (Nov 30, 2025)
                    pruefart: {
                        label: 'Prüfart',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'hu', label: 'Hauptuntersuchung (HU)' },
                            { value: 'au', label: 'Abgasuntersuchung (AU)' },
                            { value: 'hu-au', label: 'HU + AU' }
                        ]
                    },
                    huDatum: {
                        label: 'Letztes HU-Datum / Fälligkeit',
                        typ: 'date',
                        required: false
                    },
                    bekannteMaengel: {
                        label: 'Bekannte Mängel',
                        typ: 'textarea',
                        placeholder: 'z.B. Licht defekt, Bremsen verschlissen...',
                        required: false
                    }
                }
            },
            'mechanik': {
                teile: ['Motor', 'Getriebe', 'Kupplung', 'Bremsen vorne', 'Bremsen hinten', 'Auspuff', 'Lenkung', 'Fahrwerk', 'Achse vorne', 'Achse hinten', 'Anlasser', 'Lichtmaschine', 'Batterie', 'Kraftstoffpumpe', 'Wasserpumpe', 'Zahnriemen', 'Keilriemen'],
                arbeiten: ['austauschen', 'reparieren', 'einstellen', 'prüfen', 'demontieren', 'montieren'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    // 🆕 NEU: Feld aus annahme.html (Nov 30, 2025)
                    problem: {
                        label: 'Problem / Auftrag',
                        typ: 'textarea',
                        placeholder: 'z.B. Ölwechsel, Bremsen erneuern, Inspektion...',
                        required: false
                    },
                    symptome: {
                        label: 'Symptome / Beschreibung',
                        typ: 'textarea',
                        placeholder: 'z.B. Geräusche beim Bremsen, Motor ruckelt...',
                        required: false
                    },
                    fehlercode: {
                        label: 'Fehlercodes (falls bekannt)',
                        typ: 'text',
                        placeholder: 'z.B. P0300, P0171...',
                        required: false
                    }
                }
            },
            'pflege': {
                teile: ['Außen komplett', 'Innenraum komplett', 'Motorraum', 'Felgen', 'Scheiben', 'Lack', 'Leder/Stoff', 'Kunststoffe'],
                arbeiten: ['waschen', 'polieren', 'versiegeln', 'reinigen', 'aufbereiten', 'pflegen'],
                tabellen: { ersatzteile: false, arbeitslohn: true, lackierung: false, materialien: true },
                zusatzfelder: {
                    pflegePaket: {
                        label: 'Pflege-Paket',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Individuell' },
                            { value: 'basis', label: 'Basis-Pflege (Außenwäsche)' },
                            { value: 'komfort', label: 'Komfort (Außen + Innen)' },
                            { value: 'premium', label: 'Premium (Komplett + Politur)' },
                            { value: 'keramik', label: 'Keramik-Versiegelung' }
                        ]
                    },
                    // 🆕 NEU: Feld aus annahme.html (Nov 30, 2025)
                    zusatzleistungen: {
                        label: 'Zusatzleistungen',
                        typ: 'textarea',
                        placeholder: 'z.B. Lederpflege, Felgenversiegelung, Geruchsentfernung...',
                        required: false
                    }
                }
            },
            // 🆕 NEU: Services die vorher KEINE zusatzfelder hatten (Nov 30, 2025)
            'dellen': {
                teile: ['Motorhaube', 'Dach', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Heckklappe', 'Seitenwand links', 'Seitenwand rechts'],
                arbeiten: ['ausbeulen', 'drücken', 'kleben', 'lackieren', 'ersetzen', 'austauschen'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: false, materialien: false },
                zusatzfelder: {
                    dellenanzahl: {
                        label: 'Anzahl Dellen',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: '1-5', label: '1-5 Dellen' },
                            { value: '6-15', label: '6-15 Dellen' },
                            { value: '16-30', label: '16-30 Dellen' },
                            { value: '30+', label: 'Mehr als 30 Dellen' }
                        ]
                    },
                    dellengroesse: {
                        label: 'Durchschnittliche Größe',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'klein', label: 'Klein (< 1cm)' },
                            { value: 'mittel', label: 'Mittel (1-3cm)' },
                            { value: 'gross', label: 'Groß (> 3cm)' }
                        ]
                    },
                    lackschaden: {
                        label: 'Lackschaden vorhanden?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ja', label: 'Ja - Lack beschädigt' },
                            { value: 'nein', label: 'Nein - nur Delle' }
                        ]
                    },
                    dellenpositionen: {
                        label: 'Positionen / Beschreibung',
                        typ: 'textarea',
                        placeholder: 'z.B. Hagelschaden Dach und Motorhaube, Parkrempler Tür links...',
                        required: false
                    }
                }
            },
            'versicherung': {
                teile: ['Stoßfänger vorne', 'Stoßfänger hinten', 'Motorhaube', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Seitenwand links', 'Seitenwand rechts', 'Dach', 'Heckklappe', 'Rahmen/Struktur', 'Airbag', 'Lenkung', 'Achse vorne', 'Achse hinten'],
                arbeiten: ['lackieren', 'austauschen', 'richten', 'schweissen', 'demontieren', 'montieren', 'grundieren', 'spachteln'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: true, materialien: false },
                zusatzfelder: {
                    schadensnummer: {
                        label: 'Schadensnummer',
                        typ: 'text',
                        placeholder: 'z.B. 2024-123456',
                        required: false
                    },
                    versicherung: {
                        label: 'Versicherung',
                        typ: 'text',
                        placeholder: 'z.B. Allianz, HUK-Coburg, ADAC...',
                        required: false
                    },
                    schadendatum: {
                        label: 'Schadendatum',
                        typ: 'date',
                        required: false
                    },
                    unfallhergang: {
                        label: 'Unfallhergang / Beschreibung',
                        typ: 'textarea',
                        placeholder: 'Kurze Beschreibung des Unfallhergangs...',
                        required: false
                    }
                }
            },
            'lackier': {
                teile: ['Stoßfänger vorne', 'Stoßfänger hinten', 'Motorhaube', 'Kotflügel vorne links', 'Kotflügel vorne rechts', 'Tür vorne links', 'Tür vorne rechts', 'Tür hinten links', 'Tür hinten rechts', 'Seitenwand links', 'Seitenwand rechts', 'Dach', 'Heckklappe', 'Schweller links', 'Schweller rechts', 'A-Säule', 'B-Säule', 'C-Säule', 'Spiegel links', 'Spiegel rechts'],
                arbeiten: ['lackieren', 'grundieren', 'spachteln', 'schleifen', 'polieren', 'demontieren', 'montieren', 'ersetzen', 'austauschen'],
                tabellen: { ersatzteile: true, arbeitslohn: true, lackierung: true, materialien: false },
                zusatzfelder: {
                    // 🆕 Nov 30, 2025: Felder aus multi-service-anfrage.html hinzugefügt
                    farbnummer: {
                        label: 'Farbcode',
                        typ: 'text',
                        placeholder: 'z.B. LC9X, LY9T, Lc92...',
                        required: false
                    },
                    karosserie: {
                        label: 'Demontage benötigt?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ja', label: 'Ja - Demontage erforderlich' },
                            { value: 'nein', label: 'Nein - keine Demontage' }
                        ]
                    },
                    ersatzteil: {
                        label: 'Ersatzteil-Präferenz',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'original', label: 'Originalteile (OEM)' },
                            { value: 'aftermarket', label: 'Zubehörteile (Aftermarket)' },
                            { value: 'gebraucht', label: 'Gebrauchte Teile' }
                        ]
                    },
                    teile: {
                        label: 'Zu lackierende Teile',
                        typ: 'textarea',
                        placeholder: 'z.B. Motorhaube, Kotflügel vorne links...',
                        required: false
                    },
                    schadenBeschreibung: {
                        label: 'Schadensbeschreibung',
                        typ: 'textarea',
                        placeholder: 'Beschreiben Sie den Schaden...',
                        required: false
                    },
                    ersatzfahrzeugGewuenscht: {
                        label: 'Ersatzfahrzeug gewünscht?',
                        typ: 'select',
                        required: false,
                        options: [
                            { value: '', label: 'Nicht angegeben' },
                            { value: 'ja', label: 'Ja' },
                            { value: 'nein', label: 'Nein' }
                        ]
                    }
                }
            }
        };

        // ============================================
        // 🚗 FAHRZEUG-DIAGRAMM & SCHADENS-WIZARD STATE
        // ============================================
        let selectedPart = null;
        let selectedDamageType = null;
        let selectedDamageSize = null;
        let suggestedItems = [];

        // Mapping: Bauteil → passende Arbeitspositionen (Keywords)
        const partWorkMapping = {
            'Stoßfänger vorne': {
                kratzer: ['Stoßfänger vorne lackieren', 'Spot-Repair'],
                delle: ['Stoßfänger vorne lackieren', 'Kunststoffschweißen', 'Spachteln'],
                riss: ['Stoßfänger vorne lackieren', 'Kunststoffschweißen', 'Klebereparatur Kunststoff'],
                ersatz: ['Stoßfänger vorne dem./mont.', 'Stoßfänger vorne lackieren']
            },
            'Stoßfänger hinten': {
                kratzer: ['Stoßfänger hinten lackieren', 'Spot-Repair'],
                delle: ['Stoßfänger hinten lackieren', 'Kunststoffschweißen', 'Spachteln'],
                riss: ['Stoßfänger hinten lackieren', 'Kunststoffschweißen', 'Klebereparatur Kunststoff'],
                ersatz: ['Stoßfänger hinten dem./mont.', 'Stoßfänger hinten lackieren']
            },
            'Motorhaube': {
                kratzer: ['Motorhaube lackieren', 'Spot-Repair'],
                delle: ['Motorhaube lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Motorhaube lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Motorhaube dem./mont.', 'Motorhaube lackieren']
            },
            'Kotflügel vorne links': {
                kratzer: ['Kotflügel vorne lackieren', 'Spot-Repair'],
                delle: ['Kotflügel vorne lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Kotflügel vorne lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Kotflügel vorne dem./mont.', 'Kotflügel vorne lackieren']
            },
            'Kotflügel vorne rechts': {
                kratzer: ['Kotflügel vorne lackieren', 'Spot-Repair'],
                delle: ['Kotflügel vorne lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Kotflügel vorne lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Kotflügel vorne dem./mont.', 'Kotflügel vorne lackieren']
            },
            'Tür vorne links': {
                kratzer: ['Tür lackieren', 'Spot-Repair'],
                delle: ['Tür lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Tür lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Tür vorne dem./mont.', 'Tür lackieren', 'Türverkleidung dem./mont.']
            },
            'Tür vorne rechts': {
                kratzer: ['Tür lackieren', 'Spot-Repair'],
                delle: ['Tür lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Tür lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Tür vorne dem./mont.', 'Tür lackieren', 'Türverkleidung dem./mont.']
            },
            'Tür hinten links': {
                kratzer: ['Tür lackieren', 'Spot-Repair'],
                delle: ['Tür lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Tür lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Tür hinten dem./mont.', 'Tür lackieren', 'Türverkleidung dem./mont.']
            },
            'Tür hinten rechts': {
                kratzer: ['Tür lackieren', 'Spot-Repair'],
                delle: ['Tür lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Tür lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Tür hinten dem./mont.', 'Tür lackieren', 'Türverkleidung dem./mont.']
            },
            'Dach': {
                kratzer: ['Dach lackieren', 'Spot-Repair'],
                delle: ['Dach lackieren', 'Delle ausbeulen', 'Hagelschaden'],
                riss: ['Dach lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Dach lackieren']
            },
            'Heckklappe': {
                kratzer: ['Heckklappe lackieren', 'Spot-Repair'],
                delle: ['Heckklappe lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Heckklappe lackieren', 'Schweißnaht', 'Spachteln'],
                ersatz: ['Heckklappe dem./mont.', 'Heckklappe lackieren']
            },
            'Seitenteil links': {
                kratzer: ['Seitenteil lackieren', 'Spot-Repair'],
                delle: ['Seitenteil lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Seitenteil lackieren', 'Seitenteil ersetzen', 'Schweißnaht'],
                ersatz: ['Seitenteil ersetzen', 'Seitenteil lackieren']
            },
            'Seitenteil rechts': {
                kratzer: ['Seitenteil lackieren', 'Spot-Repair'],
                delle: ['Seitenteil lackieren', 'Delle ausbeulen', 'Spachteln'],
                riss: ['Seitenteil lackieren', 'Seitenteil ersetzen', 'Schweißnaht'],
                ersatz: ['Seitenteil ersetzen', 'Seitenteil lackieren']
            },
            'Seitenspiegel links': {
                kratzer: ['Spiegel lackieren'],
                delle: ['Spiegel lackieren'],
                riss: ['Seitenspiegel dem./mont.'],
                ersatz: ['Seitenspiegel dem./mont.', 'Spiegel lackieren']
            },
            'Seitenspiegel rechts': {
                kratzer: ['Spiegel lackieren'],
                delle: ['Spiegel lackieren'],
                riss: ['Seitenspiegel dem./mont.'],
                ersatz: ['Seitenspiegel dem./mont.', 'Spiegel lackieren']
            },
            'Schweller links': {
                kratzer: ['Schweller lackieren', 'Spot-Repair'],
                delle: ['Schweller lackieren', 'Spachteln'],
                riss: ['Schweller lackieren', 'Schweller ersetzen'],
                ersatz: ['Schweller ersetzen', 'Schweller lackieren']
            },
            'Schweller rechts': {
                kratzer: ['Schweller lackieren', 'Spot-Repair'],
                delle: ['Schweller lackieren', 'Spachteln'],
                riss: ['Schweller lackieren', 'Schweller ersetzen'],
                ersatz: ['Schweller ersetzen', 'Schweller lackieren']
            }
        };

        // Größen-Suffix für Spot-Repair und Dellen
        const sizeMapping = {
            klein: { spotRepair: 'Spot-Repair XS', delle: 'PDR XS', spachteln: 'Spachteln klein' },
            mittel: { spotRepair: 'Spot-Repair M', delle: 'PDR M', spachteln: 'Spachteln mittel' },
            gross: { spotRepair: 'Spot-Repair XL', delle: 'PDR XL', spachteln: 'Spachteln groß' }
        };

        // Initialize Feather Icons
        feather.replace();

        // Wait for Firebase AND werkstattId
        window.addEventListener('DOMContentLoaded', async () => {
            try {
                await window.initFirebase();
                console.log('✅ Firebase initialisiert');

                // 🆕 FIX (2025-11-29): Wait for werkstattId (auth-manager sets it after auth state)
                let attempts = 0;
                while (!window.werkstattId && attempts < 50) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    attempts++;
                }

                if (!window.werkstattId) {
                    console.warn('⚠️ werkstattId nicht gefunden nach 5s - Benutzer nicht eingeloggt?');
                    showToast('Bitte einloggen um fortzufahren', 'error');
                    setTimeout(() => safeNavigate('index.html'), 2000);
                    return;
                }

                console.log('✅ werkstattId:', window.werkstattId);

                // Load saved settings
                await loadSaetze();
                await loadKatalog();
                await loadMaterial();
                await loadFahrzeuge();

                // Check URL params for tab
                const urlParams = new URLSearchParams(window.location.search);
                const tab = urlParams.get('tab');
                if (tab) {
                    switchTab(tab);
                }

                // Fahrzeug-Diagramm initialisieren
                initVehicleDiagram();

                // OE-Nummern Ersatzteile-Suche initialisieren
                initOeSearch();

                // 🆕 Neuen Kalkulations-Wizard initialisieren
                initKalkWizard();

                console.log('✅ Kalkulation-Modul geladen');
            } catch (error) {
                console.error('❌ Fehler beim Initialisieren:', error);
                showToast('Fehler beim Laden der Daten', 'error');
            }
        });

        // ============================================
        // 🆕 NEUER KALKULATIONS-WIZARD FUNKTIONEN
        // ============================================

        function initKalkWizard() {
            // Marken-Dropdown befüllen aus ERSATZTEILE_DB
            const markeSelect = document.getElementById('kalkMarke');
            if (markeSelect && typeof ERSATZTEILE_DB !== 'undefined') {
                markeSelect.innerHTML = '<option value="">-- Marke wählen --</option>';
                Object.keys(ERSATZTEILE_DB.marken).sort().forEach(key => {
                    const marke = ERSATZTEILE_DB.marken[key];
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = marke.name;
                    markeSelect.appendChild(option);
                });
            }

            // Baujahr-Dropdown befüllen (2010-2025)
            const baujahrSelect = document.getElementById('kalkBaujahr');
            if (baujahrSelect) {
                baujahrSelect.innerHTML = '<option value="">-- Baujahr --</option>';
                for (let year = 2025; year >= 2005; year--) {
                    const option = document.createElement('option');
                    option.value = year;
                    option.textContent = year;
                    baujahrSelect.appendChild(option);
                }
            }

            // Event-Listener für Fahrzeugdaten
            ['kalkMarke', 'kalkModell', 'kalkBaujahr', 'kalkKennzeichen', 'kalkFarbe', 'kalkKunde'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.addEventListener('change', updateVehicleInfo);
                if (el) el.addEventListener('input', updateVehicleInfo);
            });

            console.log('✅ Kalkulations-Wizard initialisiert');
        }

        function updateKalkModelle() {
            const markeEl = document.getElementById('kalkMarke');
            const modellSelect = document.getElementById('kalkModell');
            if (!markeEl || !modellSelect) return;

            const markeKey = markeEl.value;
            modellSelect.innerHTML = '<option value="">-- Modell wählen --</option>';

            if (markeKey && ERSATZTEILE_DB?.marken?.[markeKey]) {
                const marke = ERSATZTEILE_DB.marken[markeKey];
                Object.keys(marke.modelle).sort().forEach(key => {
                    const modell = marke.modelle[key];
                    const option = document.createElement('option');
                    option.value = key;
                    option.textContent = `${modell.name} (${modell.baujahre})`;
                    modellSelect.appendChild(option);
                });
            }

            updateVehicleInfo();
        }

        function updateVehicleInfo() {
            const marke = document.getElementById('kalkMarke');
            const modell = document.getElementById('kalkModell');
            const baujahr = document.getElementById('kalkBaujahr');
            const kennzeichen = document.getElementById('kalkKennzeichen');
            const farbe = document.getElementById('kalkFarbe');
            const kunde = document.getElementById('kalkKunde');

            // Speichern
            kalkWizardData.fahrzeug = {
                marke: marke?.options[marke.selectedIndex]?.text || '',
                markeKey: marke?.value || '',
                modell: modell?.options[modell.selectedIndex]?.text || '',
                modellKey: modell?.value || '',
                baujahr: baujahr?.value || '',
                kennzeichen: kennzeichen?.value || '',
                farbcode: farbe?.value || '',
                kunde: kunde?.value || ''
            };

            // Info-Box anzeigen wenn Marke + Modell gewählt
            const infoBox = document.getElementById('kalkVehicleInfo');
            if (infoBox && kalkWizardData.fahrzeug.marke && kalkWizardData.fahrzeug.modell && kalkWizardData.fahrzeug.modell !== '-- Modell wählen --') {
                infoBox.style.display = 'flex';
                document.getElementById('kalkVehicleDisplay').textContent =
                    `${kalkWizardData.fahrzeug.marke} ${kalkWizardData.fahrzeug.modell}`;

                let extra = [];
                if (kalkWizardData.fahrzeug.baujahr) extra.push(`Bj. ${kalkWizardData.fahrzeug.baujahr}`);
                if (kalkWizardData.fahrzeug.kennzeichen) extra.push(kalkWizardData.fahrzeug.kennzeichen);
                if (kalkWizardData.fahrzeug.farbcode) extra.push(`Farbe: ${kalkWizardData.fahrzeug.farbcode}`);
                document.getElementById('kalkVehicleExtra').textContent = extra.join(' | ') || '-';
            } else if (infoBox) {
                infoBox.style.display = 'none';
            }
        }

        function goToStep(step) {
            // Validierung vor Schrittwechsel (nur für numerische Steps)
            const numericCurrent = typeof currentStep === 'string' ? parseInt(currentStep) : currentStep;
            const numericTarget = typeof step === 'string' ? parseInt(step) : step;

            if (numericTarget > numericCurrent) {
                if (!validateStep(currentStep)) {
                    return;
                }
            }

            // Schritt aktualisieren
            currentStep = step;
            updateStepUI();

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // ============================================
        // 🆕 MULTI-SERVICE INFO-BOX & AKKORDEON (2025-11-30)
        // ============================================

        /**
         * Zeigt die Multi-Service Info-Box in Step 2 an
         * Akkordeon mit allen Services und deren Status
         */
        function showMultiServiceInfoBox() {
            if (!kalkWizardData.isMultiService) return;

            // Container für Info-Box finden oder erstellen
            let infoBox = document.getElementById('multiServiceInfoBox');
            const step2Content = document.querySelector('.wizard-step[data-step="2"]');

            if (!infoBox && step2Content) {
                infoBox = document.createElement('div');
                infoBox.id = 'multiServiceInfoBox';
                step2Content.insertBefore(infoBox, step2Content.firstChild);
            }

            if (!infoBox) return;

            const services = kalkWizardData.services;
            const currentIndex = kalkWizardData.currentServiceIndex;

            // Akkordeon-HTML generieren
            let accordionHTML = `
                <div class="multi-service-info" style="
                    background: linear-gradient(135deg, rgba(102, 126, 234, 0.1), rgba(118, 75, 162, 0.1));
                    border: 2px solid #667eea;
                    border-radius: 16px;
                    padding: 20px;
                    margin-bottom: 24px;
                ">
                    <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                        <span style="font-size: 24px;">📦</span>
                        <div>
                            <h3 style="margin: 0; color: #667eea; font-size: 18px;">Multi-Service Auftrag</h3>
                            <p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">
                                ${services.length} Services ausgewählt - bitte für jeden Service die Details eingeben
                            </p>
                        </div>
                    </div>

                    <div class="service-accordion" style="display: flex; flex-direction: column; gap: 8px;">
            `;

            services.forEach((service, index) => {
                const serviceLabel = SERVICE_LABELS[service] || service;
                const config = SERVICE_CONFIG[service];
                const hasDetails = config?.zusatzfelder && Object.keys(config.zusatzfelder).length > 0;
                const isCompleted = kalkWizardData.serviceDetailsPerService[service] &&
                    Object.keys(kalkWizardData.serviceDetailsPerService[service]).length > 0;
                const isCurrent = index === currentIndex;

                let statusIcon = '⏳';
                let statusColor = '#999';
                let statusText = 'Ausstehend';

                if (isCompleted) {
                    statusIcon = '✅';
                    statusColor = '#10b981';
                    statusText = 'Abgeschlossen';
                } else if (isCurrent) {
                    statusIcon = '📝';
                    statusColor = '#667eea';
                    statusText = 'Aktuell';
                }

                if (!hasDetails) {
                    statusIcon = '➖';
                    statusColor = '#999';
                    statusText = 'Keine Details nötig';
                }

                accordionHTML += `
                    <div class="service-accordion-item" style="
                        background: ${isCurrent ? 'rgba(102, 126, 234, 0.15)' : 'white'};
                        border: 1px solid ${isCurrent ? '#667eea' : '#e5e7eb'};
                        border-radius: 12px;
                        padding: 12px 16px;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        ${isCurrent ? 'box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);' : ''}
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 20px;">${statusIcon}</span>
                            <div>
                                <div style="font-weight: 600; color: #1f2937;">${serviceLabel}</div>
                                <div style="font-size: 12px; color: ${statusColor};">${statusText}</div>
                            </div>
                        </div>
                        <span style="
                            background: ${statusColor}20;
                            color: ${statusColor};
                            padding: 4px 10px;
                            border-radius: 20px;
                            font-size: 12px;
                            font-weight: 500;
                        ">${index + 1}/${services.length}</span>
                    </div>
                `;
            });

            accordionHTML += `
                    </div>
                </div>
            `;

            infoBox.innerHTML = accordionHTML;
        }

        /**
         * Geht zum nächsten Service oder zu Step 3 wenn alle fertig
         */
        function moveToNextServiceOrStep3() {
            kalkWizardData.currentServiceIndex++;

            if (kalkWizardData.currentServiceIndex < kalkWizardData.services.length) {
                // Nächster Service
                const nextService = kalkWizardData.services[kalkWizardData.currentServiceIndex];
                kalkWizardData.serviceArt = nextService; // Backwards-Compat update

                console.log(`🆕 Multi-Service: Wechsle zu Service ${kalkWizardData.currentServiceIndex + 1}/${kalkWizardData.services.length}: ${nextService}`);

                const config = SERVICE_CONFIG[nextService];
                if (config?.zusatzfelder && Object.keys(config.zusatzfelder).length > 0) {
                    // Service hat Details → Step 2b anzeigen
                    currentStep = '2b';
                    renderServiceDetails(nextService, config.zusatzfelder);
                    updateStepUI();
                    showMultiServiceInfoBox(); // Info-Box aktualisieren
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                } else {
                    // Service hat keine Details → nächsten prüfen
                    moveToNextServiceOrStep3();
                }
            } else {
                // Alle Services durch → Step 3
                console.log('🆕 Multi-Service: Alle Services abgeschlossen, gehe zu Step 3');
                goToStep(3);
            }
        }

        // ============================================
        // 🆕 STEP 2 → 2b NAVIGATION (Konditional)
        // ============================================
        function goToStep2Next() {
            // Validierung Step 2
            if (!validateStep(2)) return;

            // 🆕 MULTI-SERVICE: Prüfe ob Multi-Service Modus
            if (kalkWizardData.isMultiService) {
                // Bei Multi-Service: currentServiceIndex auf 0 setzen und ersten Service prüfen
                kalkWizardData.currentServiceIndex = 0;
                kalkWizardData.serviceArt = kalkWizardData.services[0];
            }

            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];

            // Check ob der Service zusatzfelder hat
            if (config && config.zusatzfelder && Object.keys(config.zusatzfelder).length > 0) {
                // Zu Step 2b wechseln
                currentStep = '2b';
                renderServiceDetails(serviceArt, config.zusatzfelder);
                updateStepUI();
                if (kalkWizardData.isMultiService) {
                    showMultiServiceInfoBox(); // Info-Box aktualisieren
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                // 🆕 MULTI-SERVICE: Wenn erster Service keine Details hat, zum nächsten
                if (kalkWizardData.isMultiService && kalkWizardData.services.length > 1) {
                    moveToNextServiceOrStep3();
                } else {
                    // Direkt zu Step 3 (keine zusatzfelder)
                    goToStep(3);
                }
            }
        }

        /**
         * 🆕 Step 2b "Weiter" Button Handler (2025-11-30)
         * 🔧 VEREINFACHT (2025-11-30): Alle Services sind jetzt auf einer Seite
         * Direkt zu Step 3 gehen
         */
        function goToStep2bNext() {
            // Validierung (optional - kann deaktiviert werden wenn gewünscht)
            // if (!validateStep('2b')) return;

            console.log('🆕 Step 2b abgeschlossen, alle Service-Details erfasst');
            console.log('   serviceDetailsPerService:', kalkWizardData.serviceDetailsPerService);

            // Direkt zu Step 3 (Teile)
            goToStep(3);
        }

        /**
         * 🆕 Step 2b "Zurück" Button Handler (2025-11-30)
         * Zurück zu Step 1 (Fahrzeug-Auswahl)
         */
        function goToStep2bBack() {
            console.log('🆕 Step 2b: Zurück zu Step 1');
            goToStep(1);
        }

        // ============================================
        // 🆕 SERVICE-DETAILS FORM RENDERING
        // ============================================
        // Storage für hochgeladene Design-Dateien
        let uploadedDesignFiles = {};

        /**
         * 🆕 NEU (2025-11-30): Rendert ALLE Service-Details auf einer Seite
         * Bei Multi-Service: Akkordeons für jeden Service
         * Bei Single-Service: Nur ein Formular
         */
        function renderAllServiceDetails() {
            const formContainer = document.getElementById('serviceDetailsForm');
            if (!formContainer) return;

            const services = kalkWizardData.services || [kalkWizardData.serviceArt];
            const isMulti = kalkWizardData.isMultiService && services.length > 1;

            console.log('🆕 renderAllServiceDetails:', { services, isMulti });

            // Header aktualisieren
            const serviceNameEl = document.getElementById('step2bServiceName');
            if (serviceNameEl) {
                if (isMulti) {
                    serviceNameEl.textContent = `${services.length} Services`;
                } else {
                    serviceNameEl.textContent = SERVICE_LABELS[services[0]] || services[0];
                }
            }

            // Badge aktualisieren
            const badgeEl = document.getElementById('step2bServiceBadge');
            if (badgeEl) {
                if (isMulti) {
                    badgeEl.innerHTML = services.map(s => `<span style="margin-right: 8px;">${SERVICE_LABELS[s] || s}</span>`).join(' + ');
                } else {
                    badgeEl.textContent = SERVICE_LABELS[services[0]] || services[0];
                }
            }

            // Fahrzeug-Info aktualisieren
            const vehicleDisplay = document.getElementById('step2bVehicleDisplay');
            if (vehicleDisplay) {
                vehicleDisplay.textContent = `${kalkWizardData.fahrzeug.marke || '-'} ${kalkWizardData.fahrzeug.modell || '-'}`;
                if (kalkWizardData.fahrzeug.baujahr) {
                    vehicleDisplay.textContent += ` (${kalkWizardData.fahrzeug.baujahr})`;
                }
            }

            let html = '';

            if (isMulti) {
                // 🆕 MULTI-SERVICE: Akkordeons für JEDEN Service (auch ohne zusatzfelder!)
                html = '<div class="multi-service-accordions">';

                services.forEach((service, index) => {
                    const config = SERVICE_CONFIG[service] || {};
                    const serviceLabel = SERVICE_LABELS[service] || service;
                    const isFirst = index === 0;
                    const hasDetails = config.zusatzfelder && Object.keys(config.zusatzfelder).length > 0;

                    html += `
                        <div class="service-accordion" data-service="${service}">
                            <div class="service-accordion__header ${isFirst ? 'active' : ''}" onclick="toggleServiceAccordion('${service}')">
                                <div class="service-accordion__title">
                                    <span class="service-accordion__icon">${getServiceIcon(service)}</span>
                                    <span class="service-accordion__label">${serviceLabel}</span>
                                    <span class="service-accordion__badge">${index + 1}/${services.length}</span>
                                </div>
                                <span class="service-accordion__chevron">
                                    <i data-feather="${isFirst ? 'chevron-up' : 'chevron-down'}"></i>
                                </span>
                            </div>
                            <div class="service-accordion__content" id="accordion_${service}" style="display: ${isFirst ? 'block' : 'none'};">
                                <div class="service-accordion__form">
                    `;

                    if (hasDetails) {
                        // Felder für diesen Service
                        for (const [fieldId, fieldConfig] of Object.entries(config.zusatzfelder)) {
                            html += renderServiceFieldForMulti(service, fieldId, fieldConfig);
                        }
                    } else {
                        // Keine zusätzlichen Felder nötig
                        html += `
                            <div class="no-details-info" style="
                                background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
                                border: 1px solid #86efac;
                                border-radius: 8px;
                                padding: 16px;
                                text-align: center;
                                color: #166534;
                            ">
                                <div style="font-size: 32px; margin-bottom: 8px;">✅</div>
                                <div style="font-weight: 600;">Keine zusätzlichen Details erforderlich</div>
                                <div style="font-size: 14px; color: #4ade80; margin-top: 4px;">
                                    Die Teile und Arbeiten werden in Schritt 3 erfasst
                                </div>
                            </div>
                        `;
                    }

                    html += `
                                </div>
                            </div>
                        </div>
                    `;
                });

                html += '</div>';

                // CSS für Akkordeons hinzufügen
                html += `
                    <style>
                        .multi-service-accordions {
                            display: flex;
                            flex-direction: column;
                            gap: 16px;
                        }
                        .service-accordion {
                            border: 1px solid #e5e7eb;
                            border-radius: 12px;
                            overflow: hidden;
                            background: white;
                        }
                        .service-accordion__header {
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                            padding: 16px 20px;
                            background: #f9fafb;
                            cursor: pointer;
                            transition: background 0.2s;
                        }
                        .service-accordion__header:hover {
                            background: #f3f4f6;
                        }
                        .service-accordion__header.active {
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                        }
                        .service-accordion__title {
                            display: flex;
                            align-items: center;
                            gap: 12px;
                            font-weight: 600;
                        }
                        .service-accordion__icon {
                            font-size: 24px;
                        }
                        .service-accordion__label {
                            font-size: 16px;
                        }
                        .service-accordion__badge {
                            background: rgba(255,255,255,0.2);
                            padding: 4px 10px;
                            border-radius: 20px;
                            font-size: 12px;
                        }
                        .service-accordion__header:not(.active) .service-accordion__badge {
                            background: #e5e7eb;
                            color: #6b7280;
                        }
                        .service-accordion__chevron {
                            display: flex;
                            align-items: center;
                        }
                        .service-accordion__content {
                            padding: 20px;
                            border-top: 1px solid #e5e7eb;
                        }
                        .service-accordion__form {
                            display: flex;
                            flex-direction: column;
                            gap: 16px;
                        }
                    </style>
                `;

            } else {
                // SINGLE-SERVICE: Normales Formular (wie bisher)
                const service = services[0];
                const config = SERVICE_CONFIG[service] || {};
                const hasDetails = config.zusatzfelder && Object.keys(config.zusatzfelder).length > 0;

                if (hasDetails) {
                    for (const [fieldId, fieldConfig] of Object.entries(config.zusatzfelder)) {
                        html += renderServiceFieldForMulti(service, fieldId, fieldConfig);
                    }
                } else {
                    // Keine Details nötig → direkt zu Step 3
                    console.log('🆕 Single-Service ohne zusatzfelder, gehe direkt zu Step 3');
                    goToStep(3);
                    return;
                }
            }

            formContainer.innerHTML = html;

            // File-Upload Event-Listeners hinzufügen
            setupFileUploadListeners();

            // Vorausgefüllte Werte laden
            setTimeout(() => {
                services.forEach(service => {
                    const savedDetails = kalkWizardData.serviceDetailsPerService[service];
                    if (savedDetails && typeof savedDetails === 'object') {
                        console.log(`📋 Lade vorausgefüllte Werte für "${service}":`, savedDetails);
                        for (const [fieldId, fieldValue] of Object.entries(savedDetails)) {
                            const input = document.getElementById(`serviceField_${service}_${fieldId}`);
                            if (input && fieldValue !== undefined && fieldValue !== null) {
                                input.value = fieldValue;
                                console.log(`   ✅ Feld "${service}.${fieldId}" vorausgefüllt mit: "${fieldValue}"`);
                            }
                        }
                    }
                });
            }, 100);

            // Feather Icons neu rendern
            if (typeof feather !== 'undefined') feather.replace();
        }

        /**
         * Service-Icon basierend auf Service-Typ
         */
        function getServiceIcon(service) {
            const icons = {
                'lackier': '🎨',
                'versicherung': '🛡️',
                'dellen': '🔨',
                'glas': '🪟',
                'reifen': '🛞',
                'mechanik': '🔧',
                'klima': '❄️',
                'pflege': '✨',
                'tuev': '📋',
                'folierung': '🎭',
                'steinschutz': '🛡️',
                'werbebeklebung': '📢'
            };
            return icons[service] || '⚙️';
        }

        /**
         * Toggle Akkordeon für einen Service
         */
        function toggleServiceAccordion(service) {
            const content = document.getElementById(`accordion_${service}`);
            const header = content?.previousElementSibling;
            const chevron = header?.querySelector('.service-accordion__chevron i');

            if (!content) return;

            const isOpen = content.style.display !== 'none';

            if (isOpen) {
                content.style.display = 'none';
                header?.classList.remove('active');
                if (chevron) chevron.setAttribute('data-feather', 'chevron-down');
            } else {
                content.style.display = 'block';
                header?.classList.add('active');
                if (chevron) chevron.setAttribute('data-feather', 'chevron-up');
            }

            if (typeof feather !== 'undefined') feather.replace();
        }

        /**
         * Rendert ein Feld für Multi-Service (mit Service-Prefix in ID)
         * 🆕 FIX (2025-11-30): Vorausgefüllte Werte aus serviceDetailsPerService laden
         */
        function renderServiceFieldForMulti(service, fieldId, config) {
            const required = config.required ? '<span class="required-star">*</span>' : '';
            const requiredAttr = config.required ? 'required' : '';
            const fullFieldId = `serviceField_${service}_${fieldId}`;

            // 🆕 FIX: Vorausgefüllten Wert aus serviceDetailsPerService holen
            const prefillData = kalkWizardData.serviceDetailsPerService[service] || {};
            const prefillValue = prefillData[fieldId] || '';

            let inputHtml = '';

            switch (config.typ) {
                case 'select':
                    inputHtml = `
                        <select id="${fullFieldId}" name="${fieldId}" ${requiredAttr} onchange="saveServiceFieldValueMulti('${service}', '${fieldId}')">
                            <option value="">-- Bitte wählen --</option>
                            ${config.options.map(opt => `<option value="${opt.value}" ${prefillValue === opt.value ? 'selected' : ''}>${opt.label}</option>`).join('')}
                        </select>
                    `;
                    break;

                case 'text':
                    inputHtml = `
                        <input type="text" id="${fullFieldId}" name="${fieldId}" ${requiredAttr}
                               placeholder="${config.placeholder || ''}"
                               value="${prefillValue}"
                               onchange="saveServiceFieldValueMulti('${service}', '${fieldId}')">
                    `;
                    break;

                case 'textarea':
                    inputHtml = `
                        <textarea id="${fullFieldId}" name="${fieldId}" ${requiredAttr}
                                  placeholder="${config.placeholder || ''}"
                                  onchange="saveServiceFieldValueMulti('${service}', '${fieldId}')">${prefillValue}</textarea>
                    `;
                    break;

                case 'number':
                    inputHtml = `
                        <input type="number" id="${fullFieldId}" name="${fieldId}" ${requiredAttr}
                               min="${config.min || ''}" max="${config.max || ''}" value="${prefillValue || config.default || ''}"
                               onchange="saveServiceFieldValueMulti('${service}', '${fieldId}')">
                    `;
                    break;

                case 'date':
                    inputHtml = `
                        <input type="date" id="${fullFieldId}" name="${fieldId}" ${requiredAttr}
                               value="${prefillValue}"
                               onchange="saveServiceFieldValueMulti('${service}', '${fieldId}')">
                    `;
                    break;

                case 'file':
                    const acceptAttr = config.accept || 'image/*';
                    const multipleAttr = config.multiple ? 'multiple' : '';
                    inputHtml = `
                        <div class="file-upload-field">
                            <input type="file" id="${fullFieldId}" name="${fieldId}"
                                   accept="${acceptAttr}" ${multipleAttr}
                                   onchange="handleDesignUpload(this, '${service}', '${fieldId}')">
                            <label for="${fullFieldId}" class="file-upload-label">
                                <i data-feather="upload"></i>
                                <span>${config.placeholder || 'Datei hochladen'}</span>
                            </label>
                            ${prefillValue ? `<div class="file-uploaded-info" style="margin-top: 8px; font-size: 12px; color: #4caf50;">✅ Datei vorhanden</div>` : ''}
                        </div>
                    `;
                    break;

                default:
                    inputHtml = `<input type="text" id="${fullFieldId}" name="${fieldId}" ${requiredAttr} value="${prefillValue}">`;
            }

            // 🆕 FIX: Zeige an wenn Wert vorausgefüllt wurde
            const prefillBadge = prefillValue ? '<span style="font-size: 10px; color: #4caf50; margin-left: 6px;">✓ Vom Partner</span>' : '';

            return `
                <div class="form-group">
                    <label for="${fullFieldId}">${config.label} ${required}${prefillBadge}</label>
                    ${inputHtml}
                    ${config.help ? `<small class="form-help">${config.help}</small>` : ''}
                </div>
            `;
        }

        /**
         * Speichert Feldwert für Multi-Service
         */
        function saveServiceFieldValueMulti(service, fieldId) {
            const input = document.getElementById(`serviceField_${service}_${fieldId}`);
            if (!input) return;

            if (!kalkWizardData.serviceDetailsPerService[service]) {
                kalkWizardData.serviceDetailsPerService[service] = {};
            }

            kalkWizardData.serviceDetailsPerService[service][fieldId] = input.value;
            console.log(`📝 Multi-Service Details gespeichert für ${service}.${fieldId}:`, input.value);
        }

        // Legacy Funktion für Backwards-Compatibility
        function renderServiceDetails(serviceArt, zusatzfelder) {
            const formContainer = document.getElementById('serviceDetailsForm');
            const previewContainer = document.getElementById('designUploadPreview');
            const previewGrid = document.getElementById('designPreviewGrid');

            if (!formContainer) return;

            // Service-Name in Header anzeigen
            const serviceNameEl = document.getElementById('step2bServiceName');
            if (serviceNameEl) {
                serviceNameEl.textContent = SERVICE_LABELS[serviceArt] || serviceArt;
            }

            // Badge aktualisieren
            const badgeEl = document.getElementById('step2bServiceBadge');
            if (badgeEl) {
                badgeEl.textContent = SERVICE_LABELS[serviceArt] || serviceArt;
            }

            // Fahrzeug-Info aktualisieren
            const vehicleDisplay = document.getElementById('step2bVehicleDisplay');
            if (vehicleDisplay) {
                vehicleDisplay.textContent = `${kalkWizardData.fahrzeug.marke || '-'} ${kalkWizardData.fahrzeug.modell || '-'}`;
                if (kalkWizardData.fahrzeug.baujahr) {
                    vehicleDisplay.textContent += ` (${kalkWizardData.fahrzeug.baujahr})`;
                }
            }

            // Form-Inhalt generieren
            let html = '';
            for (const [fieldId, fieldConfig] of Object.entries(zusatzfelder)) {
                html += renderServiceField(fieldId, fieldConfig);
            }
            formContainer.innerHTML = html;

            // File-Upload Event-Listeners hinzufügen
            setupFileUploadListeners();

            // 🔧 FIX (2025-11-30): Vorausgefüllte Werte aus serviceDetailsPerService laden
            const savedDetails = kalkWizardData.serviceDetailsPerService[serviceArt];
            if (savedDetails && typeof savedDetails === 'object') {
                console.log(`📋 Lade vorausgefüllte Werte für "${serviceArt}":`, savedDetails);

                // Warte kurz, damit DOM vollständig gerendert ist
                setTimeout(() => {
                    for (const [fieldId, fieldValue] of Object.entries(savedDetails)) {
                        const input = document.getElementById(`serviceField_${fieldId}`);
                        if (input && fieldValue !== undefined && fieldValue !== null) {
                            input.value = fieldValue;
                            console.log(`   ✅ Feld "${fieldId}" vorausgefüllt mit: "${fieldValue}"`);
                        }
                    }
                }, 50);
            }

            // Design-Preview ausblenden initial
            if (previewContainer) previewContainer.style.display = 'none';
            if (previewGrid) previewGrid.innerHTML = '';

            // Feather Icons neu rendern
            if (typeof feather !== 'undefined') feather.replace();
        }

        function renderServiceField(fieldId, config) {
            const required = config.required ? '<span class="required-star">*</span>' : '';
            const requiredAttr = config.required ? 'required' : '';

            let inputHtml = '';

            switch (config.typ) {
                case 'select':
                    inputHtml = `
                        <select id="serviceField_${fieldId}" name="${fieldId}" ${requiredAttr} onchange="saveServiceFieldValue('${fieldId}')">
                            <option value="">-- Bitte wählen --</option>
                            ${config.options.map(opt => `<option value="${opt.value}">${opt.label}</option>`).join('')}
                        </select>
                    `;
                    break;

                case 'text':
                    inputHtml = `
                        <input type="text" id="serviceField_${fieldId}" name="${fieldId}" ${requiredAttr}
                               placeholder="${config.placeholder || ''}"
                               onchange="saveServiceFieldValue('${fieldId}')">
                    `;
                    break;

                case 'textarea':
                    inputHtml = `
                        <textarea id="serviceField_${fieldId}" name="${fieldId}" ${requiredAttr}
                                  placeholder="${config.placeholder || ''}"
                                  onchange="saveServiceFieldValue('${fieldId}')"></textarea>
                    `;
                    break;

                case 'number':
                    inputHtml = `
                        <input type="number" id="serviceField_${fieldId}" name="${fieldId}" ${requiredAttr}
                               min="${config.min || ''}" max="${config.max || ''}" value="${config.default || ''}"
                               onchange="saveServiceFieldValue('${fieldId}')">
                    `;
                    break;

                case 'date':
                    inputHtml = `
                        <input type="date" id="serviceField_${fieldId}" name="${fieldId}" ${requiredAttr}
                               onchange="saveServiceFieldValue('${fieldId}')">
                    `;
                    break;

                case 'file':
                    const acceptAttr = config.accept || 'image/*';
                    const multipleAttr = config.multiple ? 'multiple' : '';
                    inputHtml = `
                        <div class="service-file-upload" id="fileUpload_${fieldId}">
                            <input type="file" id="serviceField_${fieldId}" name="${fieldId}"
                                   accept="${acceptAttr}" ${multipleAttr}
                                   onchange="handleDesignUpload('${fieldId}', this.files)">
                            <div class="service-file-upload__icon">📁</div>
                            <div class="service-file-upload__text">Dateien hierher ziehen oder klicken</div>
                            <div class="service-file-upload__hint">${config.help || acceptAttr}</div>
                        </div>
                    `;
                    break;

                default:
                    inputHtml = `<input type="text" id="serviceField_${fieldId}" name="${fieldId}">`;
            }

            return `
                <div class="service-field-group">
                    <label for="serviceField_${fieldId}">${config.label} ${required}</label>
                    ${inputHtml}
                    ${config.help && config.typ !== 'file' ? `<span class="service-field-help">${config.help}</span>` : ''}
                </div>
            `;
        }

        function saveServiceFieldValue(fieldId) {
            const input = document.getElementById(`serviceField_${fieldId}`);
            if (!input) return;

            // Service-Details im kalkWizardData speichern
            if (!kalkWizardData.serviceDetails) {
                kalkWizardData.serviceDetails = {};
            }
            kalkWizardData.serviceDetails[fieldId] = input.value;

            // 🆕 MULTI-SERVICE: Details pro Service speichern (2025-11-30)
            const currentService = kalkWizardData.services[kalkWizardData.currentServiceIndex] || kalkWizardData.serviceArt;
            if (!kalkWizardData.serviceDetailsPerService[currentService]) {
                kalkWizardData.serviceDetailsPerService[currentService] = {};
            }
            kalkWizardData.serviceDetailsPerService[currentService][fieldId] = input.value;

            console.log(`📝 Service-Details gespeichert für ${currentService}:`, kalkWizardData.serviceDetailsPerService[currentService]);
        }

        function setupFileUploadListeners() {
            // Drag & Drop für File-Upload-Bereiche
            document.querySelectorAll('.service-file-upload').forEach(uploadArea => {
                uploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    uploadArea.classList.add('drag-over');
                });

                uploadArea.addEventListener('dragleave', () => {
                    uploadArea.classList.remove('drag-over');
                });

                uploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    uploadArea.classList.remove('drag-over');
                    const input = uploadArea.querySelector('input[type="file"]');
                    if (input && e.dataTransfer.files.length > 0) {
                        input.files = e.dataTransfer.files;
                        const fieldId = input.name;
                        handleDesignUpload(fieldId, e.dataTransfer.files);
                    }
                });
            });
        }

        async function handleDesignUpload(fieldId, files) {
            if (!files || files.length === 0) return;

            console.log(`📸 Design-Upload für ${fieldId}:`, files.length, 'Dateien');

            // Initialize storage für dieses Feld
            if (!uploadedDesignFiles[fieldId]) {
                uploadedDesignFiles[fieldId] = [];
            }

            // Dateien verarbeiten
            for (const file of files) {
                // Validierung
                const maxSize = 10 * 1024 * 1024; // 10MB
                if (file.size > maxSize) {
                    showToast(`Datei "${file.name}" ist zu groß (max 10MB)`, 'warning');
                    continue;
                }

                // Base64 konvertieren für Preview und später Upload
                const base64 = await fileToBase64(file);
                uploadedDesignFiles[fieldId].push({
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    base64: base64,
                    file: file // Original-File für späteren Storage-Upload
                });
            }

            // Preview aktualisieren
            updateDesignPreview();

            // In kalkWizardData speichern (ohne Base64 für Firestore)
            if (!kalkWizardData.serviceDetails) {
                kalkWizardData.serviceDetails = {};
            }
            kalkWizardData.serviceDetails[fieldId] = uploadedDesignFiles[fieldId].map(f => ({
                name: f.name,
                type: f.type,
                size: f.size
            }));

            showToast(`${files.length} Design-Datei(en) hinzugefügt`, 'success');
        }

        function fileToBase64(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });
        }

        function updateDesignPreview() {
            const previewContainer = document.getElementById('designUploadPreview');
            const previewGrid = document.getElementById('designPreviewGrid');

            if (!previewContainer || !previewGrid) return;

            // Alle Dateien sammeln
            let allFiles = [];
            for (const [fieldId, files] of Object.entries(uploadedDesignFiles)) {
                files.forEach((f, idx) => {
                    allFiles.push({ ...f, fieldId, index: idx });
                });
            }

            if (allFiles.length === 0) {
                previewContainer.style.display = 'none';
                return;
            }

            previewContainer.style.display = 'block';

            previewGrid.innerHTML = allFiles.map(file => {
                const isImage = file.type.startsWith('image/');
                return `
                    <div class="design-preview-item">
                        ${isImage
                            ? `<img src="${file.base64}" alt="${file.name}">`
                            : `<div class="design-preview-item__file-icon">${getFileIcon(file.type)}</div>`
                        }
                        <div class="design-preview-item__name">${file.name}</div>
                        <button class="design-preview-item__remove" onclick="removeDesignFile('${file.fieldId}', ${file.index})" title="Entfernen">×</button>
                    </div>
                `;
            }).join('');
        }

        function getFileIcon(mimeType) {
            if (mimeType.includes('pdf')) return '📄';
            if (mimeType.includes('illustrator') || mimeType.includes('ai')) return '🎨';
            if (mimeType.includes('photoshop') || mimeType.includes('psd')) return '🖼️';
            if (mimeType.includes('svg')) return '✏️';
            return '📁';
        }

        function removeDesignFile(fieldId, index) {
            if (uploadedDesignFiles[fieldId]) {
                uploadedDesignFiles[fieldId].splice(index, 1);
                updateDesignPreview();

                // kalkWizardData aktualisieren
                if (kalkWizardData.serviceDetails) {
                    kalkWizardData.serviceDetails[fieldId] = uploadedDesignFiles[fieldId].map(f => ({
                        name: f.name,
                        type: f.type,
                        size: f.size
                    }));
                }
            }
        }

        // ============================================
        // 🆕 DESIGN-UPLOAD ZU FIREBASE STORAGE
        // ============================================
        async function uploadDesignFilesToStorage(targetId) {
            const designUrls = {};
            const storage = firebase.storage();
            const werkstattId = window.werkstattId || 'mosbach';

            for (const [fieldId, files] of Object.entries(uploadedDesignFiles)) {
                designUrls[fieldId] = [];

                for (let i = 0; i < files.length; i++) {
                    const fileData = files[i];

                    try {
                        // Datei aus Base64 in Blob konvertieren
                        const blob = await base64ToBlob(fileData.base64, fileData.type);

                        // Eindeutiger Pfad in Firebase Storage
                        const timestamp = Date.now();
                        const fileName = `${timestamp}_${fileData.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                        const storagePath = `${werkstattId}/designs/${targetId}/${fieldId}/${fileName}`;

                        // Hochladen zu Firebase Storage
                        const storageRef = storage.ref(storagePath);
                        const uploadResult = await storageRef.put(blob);

                        // Download-URL abrufen
                        const downloadUrl = await uploadResult.ref.getDownloadURL();

                        console.log(`✅ Design hochgeladen: ${fileName} → ${downloadUrl}`);

                        designUrls[fieldId].push({
                            name: fileData.name,
                            type: fileData.type,
                            size: fileData.size,
                            url: downloadUrl,
                            storagePath: storagePath,
                            uploadedAt: new Date().toISOString()
                        });

                    } catch (error) {
                        console.error(`❌ Fehler beim Hochladen von ${fileData.name}:`, error);
                        // Fallback: Base64-Bild direkt speichern (für kleine Bilder)
                        if (fileData.size < 1024 * 500) { // < 500KB
                            designUrls[fieldId].push({
                                name: fileData.name,
                                type: fileData.type,
                                size: fileData.size,
                                base64: fileData.base64, // Direkter Base64-Fallback
                                uploadedAt: new Date().toISOString()
                            });
                        }
                    }
                }
            }

            return designUrls;
        }

        // Helper: Base64 zu Blob konvertieren
        function base64ToBlob(base64, mimeType) {
            return new Promise((resolve, reject) => {
                try {
                    // Base64-Präfix entfernen falls vorhanden
                    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);

                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }

                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: mimeType });
                    resolve(blob);
                } catch (error) {
                    reject(error);
                }
            });
        }

        // Validierung für Step 2b
        function validateStep2b() {
            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];

            if (!config || !config.zusatzfelder) return true;

            for (const [fieldId, fieldConfig] of Object.entries(config.zusatzfelder)) {
                if (fieldConfig.required) {
                    if (fieldConfig.typ === 'file') {
                        // Für File-Felder: mindestens eine Datei muss hochgeladen sein
                        if (!uploadedDesignFiles[fieldId] || uploadedDesignFiles[fieldId].length === 0) {
                            showToast(`Bitte laden Sie mindestens eine Datei für "${fieldConfig.label}" hoch`, 'warning');
                            return false;
                        }
                    } else {
                        // Für andere Felder: Wert muss vorhanden sein
                        const input = document.getElementById(`serviceField_${fieldId}`);
                        if (!input || !input.value) {
                            showToast(`Bitte füllen Sie "${fieldConfig.label}" aus`, 'warning');
                            return false;
                        }
                    }
                }
            }
            return true;
        }

        // 🆕 Step 3 Zurück-Navigation (konditional zu 2b oder 2)
        function goToStep3Back() {
            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];

            // Check ob der Service zusatzfelder hat
            if (config && config.zusatzfelder && Object.keys(config.zusatzfelder).length > 0) {
                // Zurück zu Step 2b
                currentStep = '2b';
                renderServiceDetails(serviceArt, config.zusatzfelder);
                updateStepUI();
            } else {
                // Zurück zu Step 2
                goToStep(2);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function validateStep(step) {
            switch(step) {
                case 1:
                    // Entwurf ODER Fahrzeug (Marke + Modell) muss gewählt sein
                    if (selectedEntwurf) {
                        return true; // Entwurf gewählt = OK
                    }
                    if (kalkWizardData.fahrzeug?.marke && kalkWizardData.fahrzeug?.modell) {
                        return true; // Fahrzeug aus DB gewählt = OK
                    }
                    const markeEl = document.getElementById('kalkMarke');
                    const modellEl = document.getElementById('kalkModell');
                    const marke = markeEl?.value || '';
                    const modell = modellEl?.value || '';
                    if (!marke || !modell) {
                        showToast('Bitte wählen Sie einen Entwurf oder ein Fahrzeug', 'warning');
                        return false;
                    }
                    return true;

                case 2:
                    // NEU: Service-Art muss gewählt sein
                    if (!kalkWizardData.serviceArt) {
                        showToast('Bitte wählen Sie eine Service-Art', 'warning');
                        return false;
                    }
                    return true;

                case '2b':
                    // 🆕 Validierung für Step 2b (Service-Details)
                    return validateStep2b();

                case 3:
                    // 🆕 Nov 30, 2025: Multi-Service Support
                    // Teil muss ausgewählt sein (aus teilePerService ODER altes System)
                    let totalPartsSelected = 0;

                    // Neue Multi-Service Teile zählen
                    if (kalkWizardData.teilePerService) {
                        for (const service of Object.keys(kalkWizardData.teilePerService)) {
                            totalPartsSelected += kalkWizardData.teilePerService[service].length;
                        }
                    }

                    // Fallback: Altes System (currentPart oder teile Array)
                    if (totalPartsSelected === 0 && !kalkWizardData.currentPart && kalkWizardData.teile.length === 0) {
                        showToast('Bitte wählen Sie mindestens ein Teil aus', 'warning');
                        return false;
                    }

                    // 🆕 teilePerService in kalkWizardData.teile zusammenführen für Step 4/5
                    mergeTeilePerServiceIntoTeile();

                    return true;

                case 4:
                    // 🆕 Nov 30, 2025: Multi-Service - Arbeiten für aktuelles Teil speichern
                    saveCurrentPartArbeiten();

                    // Prüfen ob alle Teile mindestens eine Arbeit haben
                    const teile = kalkWizardData.teile || [];

                    // Wenn es Teile gibt
                    if (teile.length > 0) {
                        // Prüfe ob alle Teile Arbeiten haben
                        const teileOhneArbeiten = teile.filter(t => !t.arbeiten || t.arbeiten.length === 0);

                        if (teileOhneArbeiten.length > 0) {
                            // Finde das erste Teil ohne Arbeiten und wechsle dorthin
                            const firstMissingIndex = teile.findIndex(t => !t.arbeiten || t.arbeiten.length === 0);
                            if (firstMissingIndex !== kalkWizardData.step4ActivePartIndex) {
                                switchStep4Part(firstMissingIndex);
                            }
                            showToast(`Bitte wählen Sie Arbeiten für "${teileOhneArbeiten[0].teil}" aus`, 'warning');
                            return false;
                        }
                        return true;
                    }

                    // Fallback: Kein Teil vorhanden
                    showToast('Bitte wählen Sie mindestens ein Teil in Schritt 3', 'warning');
                    return false;

                default:
                    return true;
            }
        }

        function updateStepUI() {
            // Step-Indikatoren aktualisieren
            document.querySelectorAll('.kalk-step').forEach((step, index) => {
                const stepNum = index + 1;
                step.classList.remove('active', 'completed');
                if (stepNum === currentStep) {
                    step.classList.add('active');
                } else if (stepNum < currentStep) {
                    step.classList.add('completed');
                }
            });

            // Step-Content aktualisieren (inkl. Step 2b Handling)
            document.querySelectorAll('.kalk-step-content').forEach((content) => {
                content.classList.remove('active');
            });

            // Spezielles Handling für Step 2b
            if (currentStep === '2b') {
                const step2bContent = document.getElementById('stepContent2b');
                if (step2bContent) {
                    step2bContent.style.display = 'block';
                    step2bContent.classList.add('active');
                }
            } else {
                // Step 2b ausblenden wenn nicht aktiv
                const step2bContent = document.getElementById('stepContent2b');
                if (step2bContent) step2bContent.style.display = 'none';

                // Normales Step-Content aktivieren
                const stepContent = document.getElementById(`stepContent${currentStep}`);
                if (stepContent) stepContent.classList.add('active');
            }

            // Step-spezifische Updates
            switch(currentStep) {
                case 2:
                    // 🆕 Nov 30, 2025: Auftragsinfo in Step 2 anzeigen
                    renderAuftragsInfoStep2();
                    break;

                case '2b':
                    // 🆕 Nov 30, 2025: Auftragsinfo in Step 2b anzeigen
                    renderAuftragsInfoStep2b();
                    // 🆕 Nov 30, 2025: Fotos aus Entwurf auch in Step 2b anzeigen
                    renderEntwurfPhotos();
                    break;

                case 3:
                    // 🆕 Auftragsinfo anzeigen (alle Infos aus Entwurf/Partner-Anfrage)
                    renderAuftragsInfo();
                    // 🆕 Fotos aus Entwurf anzeigen
                    renderEntwurfPhotos();
                    // 🆕 Multi-Service Tabs rendern (Nov 30, 2025)
                    renderStep3ServiceTabs();
                    break;

                case 4:
                    // 🆕 Nov 30, 2025: Auftragsinfo in Step 4 anzeigen
                    renderAuftragsInfoStep4();
                    // Multi-Service Teile-Tabs rendern
                    renderStep4PartsTabs();
                    // Service-Name anzeigen
                    const step4ServiceName = document.getElementById('step4ServiceName');
                    if (step4ServiceName && kalkWizardData.serviceArt) {
                        step4ServiceName.textContent = SERVICE_LABELS[kalkWizardData.serviceArt] || kalkWizardData.serviceArt;
                    }
                    // Dynamische Arbeiten für den gewählten Service laden
                    renderServiceRepairOptions();
                    // Button-Status aktualisieren (aktivieren wenn schon Teile vorhanden)
                    updateRepairSelection();
                    break;

                case 5:
                    // 🆕 Nov 30, 2025: Auftragsinfo in Step 5 anzeigen
                    renderAuftragsInfoStep5();
                    // Step 5: Ersatzteile-Übersicht
                    updateStep5Ersatzteile();
                    updateKIErsatzteilKontext(); // KI-Suche Kontext aktualisieren
                    break;

                case 6:
                    // 🆕 Nov 30, 2025: Auftragsinfo in Step 6 anzeigen
                    renderAuftragsInfoStep6();
                    // Step 6: Zusammenfassung & Kalkulation
                    updateStep6Summary();
                    break;
            }

            feather.replace();
        }

        function selectVehiclePartNew(partName, element) {
            // Vorherige Auswahl entfernen
            document.querySelectorAll('.vehicle-part.selected').forEach(p => {
                p.classList.remove('selected');
            });

            // Neue Auswahl markieren
            if (element) element.classList.add('selected');
            kalkWizardData.currentPart = partName;

            // Anzeige aktualisieren
            const display = document.getElementById('selectedPartDisplay');
            const nameSpan = document.getElementById('selectedPartName');
            if (display && nameSpan) {
                display.style.display = 'flex';
                nameSpan.textContent = partName;
            }

            // Weiter-Button aktivieren (Step 3 = Teil wählen)
            const nextBtn = document.getElementById('btnStep3Next');
            if (nextBtn) nextBtn.disabled = false;

            feather.replace();
        }

        function clearSelectedPart() {
            kalkWizardData.currentPart = null;

            // Markierung entfernen
            document.querySelectorAll('.vehicle-part.selected').forEach(p => {
                p.classList.remove('selected');
            });

            // Anzeige verstecken
            const display = document.getElementById('selectedPartDisplay');
            if (display) display.style.display = 'none';

            // Weiter-Button deaktivieren (wenn keine Teile in Liste)
            if (kalkWizardData.teile.length === 0) {
                const nextBtn = document.getElementById('btnStep3Next');
                if (nextBtn) nextBtn.disabled = true;
            }
        }

        // NEU: Service-Art Auswahl aktualisieren (Step 2)
        function updateServiceSelection() {
            const selectedService = document.querySelector('input[name="serviceArt"]:checked');
            const nextBtn = document.getElementById('btnStep2Next');

            if (selectedService) {
                kalkWizardData.serviceArt = selectedService.value;
                if (nextBtn) nextBtn.disabled = false;

                // Visuelles Feedback
                console.log('📋 Service gewählt:', SERVICE_LABELS[selectedService.value] || selectedService.value);
            } else {
                kalkWizardData.serviceArt = '';
                if (nextBtn) nextBtn.disabled = true;
            }
        }

        function updateRepairSelection() {
            const checkedRepairs = document.querySelectorAll('input[name="repair"]:checked');
            const nextBtn = document.getElementById('btnStep4Next');
            if (nextBtn) {
                // Button aktivieren wenn: Reparaturen gewählt ODER bereits Teile in Liste
                const hasRepairs = checkedRepairs.length > 0;
                const hasExistingParts = kalkWizardData.teile.length > 0;
                nextBtn.disabled = !hasRepairs && !hasExistingParts;
            }

            // NEU: Ersatzteil-Formular wird NICHT mehr in Schritt 4 angezeigt
            // Die Ersatzteil-Suche erfolgt in Schritt 5 (KI-Suche oder manuell)
            // Hier nur Info anzeigen, dass Ersatzteil in Schritt 5 gesucht wird
            const ersatzteilForm = document.getElementById('ersatzteilInlineForm');
            const ersatzteilHinweis = document.getElementById('ersatzteilHinweis');

            const needsErsatzteil = Array.from(checkedRepairs).some(cb =>
                ['austauschen', 'ersetzen', 'wechseln'].includes(cb.value.toLowerCase())
            );

            // Formular verstecken (wird in Schritt 5 erledigt)
            if (ersatzteilForm) {
                ersatzteilForm.style.display = 'none';
            }

            // Hinweis anzeigen wenn Ersatzteil benötigt wird
            if (ersatzteilHinweis) {
                ersatzteilHinweis.style.display = needsErsatzteil ? 'block' : 'none';
            } else if (needsErsatzteil) {
                // Hinweis dynamisch erstellen falls nicht vorhanden
                const hinweisDiv = document.createElement('div');
                hinweisDiv.id = 'ersatzteilHinweis';
                hinweisDiv.className = 'ersatzteil-hinweis';
                hinweisDiv.innerHTML = `
                    <div style="background: linear-gradient(135deg, #fef3c7, #fde68a); padding: var(--space-3); border-radius: var(--radius-card); margin-top: var(--space-3); border-left: 4px solid #f59e0b;">
                        <p style="margin: 0; color: #92400e; font-weight: 500;">
                            <span style="font-size: 1.2em;">🔍</span>
                            <strong>Ersatzteil wird in Schritt 5 gesucht</strong>
                        </p>
                        <p style="margin: var(--space-1) 0 0 0; font-size: var(--font-size-sm); color: #78350f;">
                            Die KI sucht automatisch nach dem besten Angebot für "${kalkWizardData.currentPart}" oder Sie können manuell suchen.
                        </p>
                    </div>
                `;
                const repairGrid = document.getElementById('repairOptionsGrid');
                if (repairGrid) {
                    repairGrid.parentNode.insertBefore(hinweisDiv, repairGrid.nextSibling);
                }
            }
        }

        function addCurrentPartAndGoBack() {
            // Aktuelle Reparaturen sammeln
            const repairs = Array.from(document.querySelectorAll('input[name="repair"]:checked'))
                .map(cb => cb.value);

            if (repairs.length === 0) {
                showToast('Bitte wählen Sie mindestens eine Reparaturart', 'warning');
                return;
            }

            // NEU: Prüfen ob Ersatzteil benötigt wird (wird in Schritt 5 gesucht)
            const needsErsatzteil = repairs.some(r => ['austauschen', 'ersetzen', 'wechseln'].includes(r.toLowerCase()));

            // Teil zur Liste hinzufügen
            // ersatzteil ist erstmal null - wird in Schritt 5 ausgefüllt
            kalkWizardData.teile.push({
                teil: kalkWizardData.currentPart,
                reparaturen: repairs,
                ersatzteil: null,  // Wird in Schritt 5 per KI-Suche oder manuell gesetzt
                needsErsatzteil: needsErsatzteil  // Flag für Schritt 5
            });

            console.log('📦 Teil hinzugefügt:', kalkWizardData.currentPart, 'Reparaturen:', repairs, 'Braucht Ersatzteil:', needsErsatzteil);

            // Formularfelder zurücksetzen
            document.querySelectorAll('input[name="repair"]').forEach(cb => cb.checked = false);

            // Ersatzteil-Hinweis entfernen falls vorhanden
            const hinweis = document.getElementById('ersatzteilHinweis');
            if (hinweis) hinweis.remove();

            // CurrentPart zurücksetzen
            kalkWizardData.currentPart = null;

            showToast(`${kalkWizardData.teile[kalkWizardData.teile.length - 1].teil} hinzugefügt`, 'success');

            // Zurück zu Step 3 (Teil wählen)
            goToStep(3);

            // Parts-Liste aktualisieren
            updatePartsListDisplay();
        }

        // NEU: Speichert aktuelles Teil und geht zu Schritt 5
        function saveCurrentPartAndGoToStep5() {
            // Aktuelle Reparaturen sammeln
            const repairs = Array.from(document.querySelectorAll('input[name="repair"]:checked'))
                .map(cb => cb.value);

            const currentPart = kalkWizardData.currentPart;

            // Fall 1: Aktuelles Teil wird bearbeitet → speichern wenn Reparaturen gewählt
            if (currentPart && repairs.length > 0) {
                // Prüfen ob dieses Teil schon in der Liste ist
                const alreadyExists = kalkWizardData.teile.some(t => t.teil === currentPart);

                if (!alreadyExists) {
                    // Prüfen ob Ersatzteil benötigt wird
                    const needsErsatzteil = repairs.some(r => ['austauschen', 'ersetzen', 'wechseln'].includes(r.toLowerCase()));

                    // Teil zur Liste hinzufügen
                    kalkWizardData.teile.push({
                        teil: currentPart,
                        reparaturen: repairs,
                        ersatzteil: null,
                        needsErsatzteil: needsErsatzteil
                    });

                    console.log('📦 Teil automatisch hinzugefügt:', currentPart, 'Reparaturen:', repairs, 'Braucht Ersatzteil:', needsErsatzteil);
                    showToast(`${currentPart} hinzugefügt`, 'success');
                }

                // Formularfelder zurücksetzen
                document.querySelectorAll('input[name="repair"]').forEach(cb => cb.checked = false);
                kalkWizardData.currentPart = null;

                // Ersatzteil-Hinweis entfernen
                const hinweis = document.getElementById('ersatzteilHinweis');
                if (hinweis) hinweis.remove();
            }

            // Fall 2: Kein aktuelles Teil aber Teile in Liste → direkt weiter
            else if (kalkWizardData.teile.length > 0) {
                console.log('📋 Bereits Teile vorhanden, gehe direkt zu Schritt 5');
            }

            // Fall 3: Weder aktuelles Teil noch Teile in Liste → Fehler
            else {
                showToast('Bitte wählen Sie mindestens ein Teil und eine Reparaturart', 'warning');
                return;
            }

            // Zu Schritt 5 gehen
            console.log('📋 Gehe zu Schritt 5 mit Teilen:', kalkWizardData.teile);
            goToStep(5);
        }

        function updatePartsListDisplay() {
            const listContainer = document.getElementById('selectedPartsList');
            const listContent = document.getElementById('partsListContent');

            if (kalkWizardData.teile.length > 0 && listContainer && listContent) {
                listContainer.style.display = 'block';
                listContent.innerHTML = kalkWizardData.teile.map((item, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-2); background: var(--color-background); border-radius: var(--radius-button); margin-bottom: var(--space-2);">
                        <div>
                            <strong>${item.teil}</strong>
                            <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block;">
                                ${item.reparaturen.join(', ')}
                            </span>
                        </div>
                        <button class="btn btn-sm btn-error" onclick="removePartFromList(${index})">
                            <i data-feather="trash-2"></i>
                        </button>
                    </div>
                `).join('');
                feather.replace();

                // Weiter-Button aktivieren (Step 3 = Teil wählen)
                const nextBtn = document.getElementById('btnStep3Next');
                if (nextBtn) nextBtn.disabled = false;
            } else if (listContainer) {
                listContainer.style.display = 'none';
            }
        }

        function removePartFromList(index) {
            kalkWizardData.teile.splice(index, 1);
            updatePartsListDisplay();

            if (kalkWizardData.teile.length === 0 && !kalkWizardData.currentPart) {
                const nextBtn = document.getElementById('btnStep3Next');
                if (nextBtn) nextBtn.disabled = true;
            }
        }

        // ============================================
        // 🔧 ERSATZTEILE FUNKTIONEN
        // ============================================

        // Ersatzteile aus Firestore laden (für Autocomplete)
        async function loadErsatzteileDB() {
            try {
                await window.firebaseInitialized;
                const werkstattId = window.werkstattId;
                if (!werkstattId) return;
                if (!window.getCollection) {
                    console.warn('⏳ loadErsatzteileDB: getCollection nicht verfügbar');
                    return;
                }

                const snapshot = await window.getCollection('ersatzteile')
                    .orderBy('verwendetAnzahl', 'desc')
                    .limit(200)
                    .get();

                ersatzteileDB = [];
                snapshot.forEach(doc => {
                    ersatzteileDB.push({ id: doc.id, ...doc.data() });
                });

                console.log(`📦 ${ersatzteileDB.length} Ersatzteile aus DB geladen`);
            } catch (error) {
                console.warn('Ersatzteile-DB konnte nicht geladen werden:', error);
            }
        }

        // Ersatzteil in Firestore speichern (mit Preis-Historie & Fahrzeug-Verknüpfung)
        async function saveErsatzteilToDB(ersatzteil) {
            try {
                await window.firebaseInitialized;
                const werkstattId = window.werkstattId;
                if (!werkstattId || !ersatzteil.name) return;
                if (!window.getCollection) {
                    console.warn('⏳ saveErsatzteilToDB: getCollection nicht verfügbar');
                    return;
                }

                // Fahrzeug-Info aus aktuellem Wizard
                const fahrzeugMarke = kalkWizardData.fahrzeug?.marke || '';
                const fahrzeugModell = kalkWizardData.fahrzeug?.modell || '';

                // Prüfen ob Ersatzteil schon existiert (nach Name + Teilenummer)
                const existing = await window.getCollection('ersatzteile')
                    .where('name', '==', ersatzteil.name)
                    .where('teilenummer', '==', ersatzteil.teilenummer || '')
                    .limit(1)
                    .get();

                if (!existing.empty) {
                    // Existiert bereits - Preis-Historie aktualisieren
                    const docRef = existing.docs[0].ref;
                    const existingData = existing.docs[0].data();

                    // Preis-Historie Array (max. 10 Einträge)
                    let preisHistorie = existingData.preisHistorie || [];
                    if (ersatzteil.preis && ersatzteil.preis > 0) {
                        preisHistorie.push({
                            preis: ersatzteil.preis,
                            datum: new Date().toISOString(),
                            lieferant: ersatzteil.lieferant || ''
                        });
                        // Nur letzte 10 behalten
                        if (preisHistorie.length > 10) {
                            preisHistorie = preisHistorie.slice(-10);
                        }
                    }

                    // Fahrzeuge Array erweitern
                    let fahrzeuge = existingData.fahrzeuge || [];
                    if (fahrzeugMarke && fahrzeugModell) {
                        const fahrzeugKey = `${fahrzeugMarke}|${fahrzeugModell}`;
                        if (!fahrzeuge.includes(fahrzeugKey)) {
                            fahrzeuge.push(fahrzeugKey);
                        }
                    }

                    // Lieferanten Array erweitern
                    let lieferanten = existingData.lieferanten || [];
                    if (ersatzteil.lieferant && !lieferanten.find(l => l.name === ersatzteil.lieferant)) {
                        lieferanten.push({
                            name: ersatzteil.lieferant,
                            preis: ersatzteil.preis || 0,
                            datum: new Date().toISOString()
                        });
                    } else if (ersatzteil.lieferant) {
                        // Preis aktualisieren für existierenden Lieferanten
                        const lIdx = lieferanten.findIndex(l => l.name === ersatzteil.lieferant);
                        if (lIdx >= 0 && ersatzteil.preis) {
                            lieferanten[lIdx].preis = ersatzteil.preis;
                            lieferanten[lIdx].datum = new Date().toISOString();
                        }
                    }

                    // Durchschnittspreis berechnen
                    const allePreise = preisHistorie.map(p => p.preis).filter(p => p > 0);
                    const durchschnittsPreis = allePreise.length > 0
                        ? allePreise.reduce((a, b) => a + b, 0) / allePreise.length
                        : ersatzteil.preis || 0;

                    await docRef.update({
                        verwendetAnzahl: firebase.firestore.FieldValue.increment(1),
                        letzteVerwendung: firebase.firestore.FieldValue.serverTimestamp(),
                        preis: ersatzteil.preis || existingData.preis,
                        preisHistorie: preisHistorie,
                        durchschnittsPreis: durchschnittsPreis,
                        fahrzeuge: fahrzeuge,
                        lieferanten: lieferanten
                    });
                    console.log('📦 Ersatzteil aktualisiert:', ersatzteil.name, '| Ø-Preis:', durchschnittsPreis.toFixed(2));
                } else {
                    // Neues Ersatzteil anlegen
                    const neuesErsatzteil = {
                        name: ersatzteil.name,
                        teilenummer: ersatzteil.teilenummer || '',
                        preis: ersatzteil.preis || 0,
                        durchschnittsPreis: ersatzteil.preis || 0,
                        preisHistorie: ersatzteil.preis ? [{
                            preis: ersatzteil.preis,
                            datum: new Date().toISOString(),
                            lieferant: ersatzteil.lieferant || ''
                        }] : [],
                        lieferant: ersatzteil.lieferant || '',
                        lieferanten: ersatzteil.lieferant ? [{
                            name: ersatzteil.lieferant,
                            preis: ersatzteil.preis || 0,
                            datum: new Date().toISOString()
                        }] : [],
                        kategorie: ersatzteil.zuTeil || '',
                        fahrzeuge: (fahrzeugMarke && fahrzeugModell) ? [`${fahrzeugMarke}|${fahrzeugModell}`] : [],
                        verwendetAnzahl: 1,
                        erstelltAm: firebase.firestore.FieldValue.serverTimestamp(),
                        letzteVerwendung: firebase.firestore.FieldValue.serverTimestamp(),
                        werkstattId: werkstattId
                    };

                    await window.getCollection('ersatzteile').add(neuesErsatzteil);
                    console.log('📦 Neues Ersatzteil gespeichert:', ersatzteil.name);

                    // Lokale DB aktualisieren
                    ersatzteileDB.push({ ...neuesErsatzteil, id: 'new-' + Date.now() });
                }
            } catch (error) {
                console.error('Fehler beim Speichern des Ersatzteils:', error);
            }
        }

        // Autocomplete-Suche in Step 4 (Inline) - mit Fahrzeug-Priorisierung
        function searchErsatzteileDB(query) {
            const autocomplete = document.getElementById('ersatzteilAutocomplete');
            if (!autocomplete || !query || query.length < 2) {
                if (autocomplete) autocomplete.style.display = 'none';
                return;
            }

            const queryLower = query.toLowerCase();
            const fahrzeugKey = kalkWizardData.fahrzeug?.marke && kalkWizardData.fahrzeug?.modell
                ? `${kalkWizardData.fahrzeug.marke}|${kalkWizardData.fahrzeug.modell}`
                : null;

            // Filtern und sortieren (Fahrzeug-Match zuerst, dann nach Verwendung)
            let matches = ersatzteileDB.filter(e =>
                e.name?.toLowerCase().includes(queryLower) ||
                e.teilenummer?.toLowerCase().includes(queryLower)
            );

            // Fahrzeug-spezifische Teile nach oben sortieren
            if (fahrzeugKey) {
                matches.sort((a, b) => {
                    const aMatch = a.fahrzeuge?.includes(fahrzeugKey) ? 1 : 0;
                    const bMatch = b.fahrzeuge?.includes(fahrzeugKey) ? 1 : 0;
                    if (aMatch !== bMatch) return bMatch - aMatch;
                    return (b.verwendetAnzahl || 0) - (a.verwendetAnzahl || 0);
                });
            }

            matches = matches.slice(0, 10);

            if (matches.length === 0) {
                autocomplete.style.display = 'none';
                return;
            }

            autocomplete.innerHTML = matches.map(e => {
                const isVehicleMatch = fahrzeugKey && e.fahrzeuge?.includes(fahrzeugKey);
                const preisTrend = getPreisTrend(e);
                const avgPreis = e.durchschnittsPreis || e.preis || 0;

                return `
                    <div class="ersatzteil-autocomplete-item ${isVehicleMatch ? 'vehicle-match' : ''}" onclick="selectErsatzteilFromDB('${e.id}', 'inline')">
                        <div class="ersatzteil-autocomplete-item__name">
                            ${isVehicleMatch ? '<span class="vehicle-badge">🚗</span>' : ''}
                            ${e.name}
                        </div>
                        <div class="ersatzteil-autocomplete-item__details">
                            ${e.teilenummer ? `Nr: ${e.teilenummer}` : ''}
                            ${avgPreis > 0 ? `| Ø ${avgPreis.toFixed(2)} € ${preisTrend}` : ''}
                            ${e.lieferanten?.length > 1 ? `| ${e.lieferanten.length} Lieferanten` : (e.lieferant ? `| ${e.lieferant}` : '')}
                        </div>
                    </div>
                `;
            }).join('');
            autocomplete.style.display = 'block';
        }

        // Preis-Trend berechnen (↑↓→)
        function getPreisTrend(ersatzteil) {
            if (!ersatzteil.preisHistorie || ersatzteil.preisHistorie.length < 2) return '';
            const preise = ersatzteil.preisHistorie.map(p => p.preis);
            const letzter = preise[preise.length - 1];
            const vorletzter = preise[preise.length - 2];
            const diff = ((letzter - vorletzter) / vorletzter) * 100;

            if (diff > 5) return '<span style="color: #ef4444;">↑</span>';
            if (diff < -5) return '<span style="color: #22c55e;">↓</span>';
            return '<span style="color: #6b7280;">→</span>';
        }

        // Autocomplete-Suche in Step 5 - mit Fahrzeug-Priorisierung
        function searchErsatzteileDBStep5(query) {
            const autocomplete = document.getElementById('ersatzteilAutocompleteStep5');
            if (!autocomplete || !query || query.length < 2) {
                if (autocomplete) autocomplete.style.display = 'none';
                return;
            }

            const queryLower = query.toLowerCase();
            const fahrzeugKey = kalkWizardData.fahrzeug?.marke && kalkWizardData.fahrzeug?.modell
                ? `${kalkWizardData.fahrzeug.marke}|${kalkWizardData.fahrzeug.modell}`
                : null;

            let matches = ersatzteileDB.filter(e =>
                e.name?.toLowerCase().includes(queryLower) ||
                e.teilenummer?.toLowerCase().includes(queryLower)
            );

            // Fahrzeug-spezifische Teile nach oben sortieren
            if (fahrzeugKey) {
                matches.sort((a, b) => {
                    const aMatch = a.fahrzeuge?.includes(fahrzeugKey) ? 1 : 0;
                    const bMatch = b.fahrzeuge?.includes(fahrzeugKey) ? 1 : 0;
                    if (aMatch !== bMatch) return bMatch - aMatch;
                    return (b.verwendetAnzahl || 0) - (a.verwendetAnzahl || 0);
                });
            }

            matches = matches.slice(0, 10);

            if (matches.length === 0) {
                autocomplete.style.display = 'none';
                return;
            }

            autocomplete.innerHTML = matches.map(e => {
                const isVehicleMatch = fahrzeugKey && e.fahrzeuge?.includes(fahrzeugKey);
                const preisTrend = getPreisTrend(e);
                const avgPreis = e.durchschnittsPreis ? `Ø ${e.durchschnittsPreis.toFixed(2)} €` : '';
                const lieferantenCount = e.lieferanten?.length || 0;

                return `
                <div class="ersatzteil-autocomplete-item ${isVehicleMatch ? 'vehicle-match' : ''}" onclick="selectErsatzteilFromDB('${e.id}', 'step5')">
                    <div class="ersatzteil-autocomplete-item__name">
                        ${isVehicleMatch ? '<span class="vehicle-badge">🚗</span>' : ''}
                        ${e.name}
                        ${preisTrend}
                    </div>
                    <div class="ersatzteil-autocomplete-item__details">
                        ${e.teilenummer ? `Nr: ${e.teilenummer}` : ''}
                        ${e.preis ? `| ${e.preis.toFixed(2)} €` : ''}
                        ${avgPreis ? `| ${avgPreis}` : ''}
                        ${lieferantenCount > 1 ? `| ${lieferantenCount} Lieferanten` : (e.lieferant ? `| ${e.lieferant}` : '')}
                    </div>
                </div>
            `}).join('');
            autocomplete.style.display = 'block';
        }

        // Ersatzteil aus Autocomplete auswählen
        function selectErsatzteilFromDB(id, target) {
            const ersatzteil = ersatzteileDB.find(e => e.id === id);
            if (!ersatzteil) return;

            if (target === 'inline') {
                const inlineName = document.getElementById('ersatzteilInlineName');
                const inlineTeilenr = document.getElementById('ersatzteilInlineTeilenr');
                const inlinePreis = document.getElementById('ersatzteilInlinePreis');
                const inlineLieferant = document.getElementById('ersatzteilInlineLieferant');
                const autocomplete = document.getElementById('ersatzteilAutocomplete');
                if (inlineName) inlineName.value = ersatzteil.name || '';
                if (inlineTeilenr) inlineTeilenr.value = ersatzteil.teilenummer || '';
                if (inlinePreis) inlinePreis.value = ersatzteil.preis || '';
                if (inlineLieferant) inlineLieferant.value = ersatzteil.lieferant || '';
                if (autocomplete) autocomplete.style.display = 'none';
            } else if (target === 'step5') {
                const addName = document.getElementById('ersatzteilAddName');
                const addTeilenr = document.getElementById('ersatzteilAddTeilenr');
                const addPreis = document.getElementById('ersatzteilAddPreis');
                const addLieferant = document.getElementById('ersatzteilAddLieferant');
                const autocomplete5 = document.getElementById('ersatzteilAutocompleteStep5');
                if (addName) addName.value = ersatzteil.name || '';
                if (addTeilenr) addTeilenr.value = ersatzteil.teilenummer || '';
                if (addPreis) addPreis.value = ersatzteil.preis || '';
                if (addLieferant) addLieferant.value = ersatzteil.lieferant || '';
                if (autocomplete5) autocomplete5.style.display = 'none';
            }
        }

        // ============================================
        // 🆕 KI-GESTÜTZTE ERSATZTEILSUCHE
        // ============================================

        let kiErsatzteileAngebote = []; // Alle gefundenen Angebote
        let selectedKIErsatzteile = new Set(); // Ausgewählte Angebot-IDs

        // Kontext für Ersatzteilsuche aktualisieren (wird beim Laden von Step 5 aufgerufen)
        function updateKIErsatzteilKontext() {
            // Fahrzeug-Info - KORREKTE Feldnamen aus kalkWizardData.fahrzeug
            const fahrzeugEl = document.getElementById('kiKontextFahrzeug');
            if (fahrzeugEl) {
                const marke = kalkWizardData.fahrzeug?.marke || '';
                const modell = kalkWizardData.fahrzeug?.modell || '';
                const baujahr = kalkWizardData.fahrzeug?.baujahr || '';
                const kennzeichen = kalkWizardData.fahrzeug?.kennzeichen || '';
                let fahrzeugText = `${marke} ${modell}`.trim();
                if (baujahr) fahrzeugText += ` (${baujahr})`;
                if (kennzeichen) fahrzeugText += ` - ${kennzeichen}`;
                fahrzeugEl.textContent = fahrzeugText || '-';
                console.log('🚗 KI-Kontext Fahrzeug:', fahrzeugText);
            }

            // Teile-Info - KORREKTE Feldnamen: teil (nicht name), reparaturen (nicht arbeiten)
            const teileEl = document.getElementById('kiKontextTeile');
            if (teileEl) {
                const teileZuErsetzen = (kalkWizardData.teile || []).filter(t => {
                    const reparaturen = t.reparaturen || t.arbeiten || [];
                    return t.needsErsatzteil ||
                        reparaturen.includes('ersetzen') ||
                        reparaturen.includes('austauschen') ||
                        reparaturen.includes('wechseln');
                }).map(t => t.teil || t.name);

                teileEl.textContent = teileZuErsetzen.length > 0 ? teileZuErsetzen.join(', ') : 'Keine Ersatzteile benötigt';
                console.log('📦 KI-Kontext Teile:', teileZuErsetzen);
            }

            console.log('📋 kalkWizardData.teile:', kalkWizardData.teile);
            console.log('📋 kalkWizardData.fahrzeug:', kalkWizardData.fahrzeug);
        }

        // KI-Ersatzteilsuche starten
        async function startKIErsatzteilSuche() {
            const btn = document.getElementById('btnStartKISuche');
            const loading = document.getElementById('kiErsatzteileLoading');
            const results = document.getElementById('kiErsatzteileResults');
            const statusText = document.getElementById('kiLoadingStatus');

            // Teile ermitteln die ersetzt werden müssen
            // Hinweis: teile können verschiedene Strukturen haben:
            // - Von Step 3/4: { teil: "Name", reparaturen: ["ersetzen", ...], needsErsatzteil: true }
            // - Von KI-Analyse: { name: "Name", arbeiten: ["ersetzen", ...] }
            const teileZuErsetzen = [];

            (kalkWizardData.teile || []).forEach(t => {
                // Teil-Name kann in 'teil' oder 'name' sein
                const teilName = t.teil || t.name;
                // Reparaturen können in 'reparaturen' oder 'arbeiten' sein
                const reparaturen = t.reparaturen || t.arbeiten || [];

                // Prüfen ob ersetzt werden soll (3 Wege)
                const sollErsetzen = t.needsErsatzteil ||  // NEU: Flag aus Schritt 4
                    reparaturen.includes('ersetzen') ||
                    reparaturen.includes('austauschen') ||
                    reparaturen.includes('wechseln');

                if (sollErsetzen && teilName && !teileZuErsetzen.includes(teilName)) {
                    teileZuErsetzen.push(teilName);
                    console.log('📦 Teil zum Ersetzen gefunden:', teilName, 'Reparaturen:', reparaturen, 'Flag:', t.needsErsatzteil);
                }
            });

            // Auch aus KI-Analyse übernommene Teile
            if (kiErkannteSchaeden && kiErkannteSchaeden.length > 0) {
                kiErkannteSchaeden.forEach(s => {
                    if (s.selected && (s.empfohleneArbeiten?.includes('ersetzen') || s.empfohleneArbeiten?.includes('austauschen'))) {
                        if (!teileZuErsetzen.includes(s.teil)) {
                            teileZuErsetzen.push(s.teil);
                            console.log('📦 KI-Teil zum Ersetzen:', s.teil);
                        }
                    }
                });
            }

            console.log('🔍 Gesamt Teile zum Ersetzen:', teileZuErsetzen);
            console.log('📋 kalkWizardData.teile:', kalkWizardData.teile);

            if (teileZuErsetzen.length === 0) {
                showToast('Keine Ersatzteile zum Suchen gefunden. Bitte "ersetzen" oder "austauschen" in Schritt 4 auswählen.', 'warning');
                return;
            }

            // UI Update
            if (btn) btn.disabled = true;
            if (loading) loading.style.display = 'flex';
            if (results) results.style.display = 'none';

            // KORREKTE Feldnamen aus kalkWizardData.fahrzeug
            const fahrzeug = {
                marke: kalkWizardData.fahrzeug?.marke || '',
                modell: kalkWizardData.fahrzeug?.modell || '',
                baujahr: kalkWizardData.fahrzeug?.baujahr || '',
                kennzeichen: kalkWizardData.fahrzeug?.kennzeichen || ''
            };

            console.log('🚗 Fahrzeug für KI-Suche:', fahrzeug);

            console.log('🔍 Starte KI-Ersatzteilsuche für:', teileZuErsetzen);

            try {
                kiErsatzteileAngebote = [];

                // Für jedes Teil eine Suche durchführen
                for (let i = 0; i < teileZuErsetzen.length; i++) {
                    const teil = teileZuErsetzen[i];
                    if (statusText) statusText.textContent = `Suche nach "${teil}" (${i + 1}/${teileZuErsetzen.length})...`;

                    const angebote = await searchErsatzteilOnline(teil, fahrzeug);
                    kiErsatzteileAngebote.push(...angebote);

                    // Kleine Pause zwischen Anfragen
                    await new Promise(resolve => setTimeout(resolve, 300));
                }

                // Ergebnisse anzeigen
                if (loading) loading.style.display = 'none';
                if (results) results.style.display = 'block';

                renderKIErsatzteileResults();

                showToast(`✅ ${kiErsatzteileAngebote.length} Angebote gefunden`, 'success');

            } catch (error) {
                console.error('❌ KI-Ersatzteilsuche Fehler:', error);
                showToast('Fehler bei der Suche: ' + error.message, 'error');
                if (loading) loading.style.display = 'none';
            } finally {
                if (btn) btn.disabled = false;
            }
        }

        // Online-Suche für ein einzelnes Teil
        // ============================================
        // 🔍 ERSATZTEIL-SUCHE MIT ECHTEN SHOP-LINKS
        // ============================================

        // Echte Shop-URLs für Ersatzteilsuche
        const ERSATZTEIL_SHOPS = {
            'eBay': {
                name: 'eBay Kleinanzeigen & Motors',
                icon: '🛒',
                color: '#e53238',
                buildUrl: (teil, fahrzeug) => {
                    const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teil}`.trim();
                    return `https://www.ebay.de/sch/i.html?_nkw=${encodeURIComponent(query)}&_sacat=6028`;
                },
                beschreibung: 'Gebraucht & Neu, oft günstig'
            },
            'Autodoc': {
                name: 'Autodoc',
                icon: '🚗',
                color: '#ff6600',
                buildUrl: (teil, fahrzeug) => {
                    const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teil}`.trim();
                    return `https://www.autodoc.de/search?keyword=${encodeURIComponent(query)}`;
                },
                beschreibung: 'Große Auswahl, schneller Versand'
            },
            'kfzteile24': {
                name: 'kfzteile24',
                icon: '🔧',
                color: '#0066cc',
                buildUrl: (teil, fahrzeug) => {
                    const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teil}`.trim();
                    return `https://www.kfzteile24.de/suche/${encodeURIComponent(query)}`;
                },
                beschreibung: 'OE & Aftermarket Teile'
            },
            'Daparto': {
                name: 'Daparto',
                icon: '⚙️',
                color: '#00aa00',
                buildUrl: (teil, fahrzeug) => {
                    const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teil}`.trim();
                    return `https://www.daparto.de/Suche?s=${encodeURIComponent(query)}`;
                },
                beschreibung: 'Preisvergleich vieler Anbieter'
            },
            'Autoteile-Markt': {
                name: 'Autoteile-Markt.de',
                icon: '🏪',
                color: '#993399',
                buildUrl: (teil, fahrzeug) => {
                    const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teil}`.trim();
                    return `https://www.autoteile-markt.de/suche?q=${encodeURIComponent(query)}`;
                },
                beschreibung: 'Gebrauchtteile von Verwertern'
            }
        };

        // Generiert echte Such-Links für alle Shops
        function generateShopSearchLinks(teilName, fahrzeug) {
            console.log('🔗 Generiere Such-Links für:', teilName, fahrzeug);

            return Object.entries(ERSATZTEIL_SHOPS).map(([key, shop], idx) => ({
                id: `link-${key}-${teilName.replace(/\s+/g, '-')}-${Date.now()}`,
                teilName: teilName,
                shop: shop.name,
                shopKey: key,
                icon: shop.icon,
                color: shop.color,
                titel: `${teilName} bei ${shop.name} suchen`,
                beschreibung: shop.beschreibung,
                url: shop.buildUrl(teilName, fahrzeug),
                isDirectLink: true,  // Markierung: Das ist ein echter Link!
                selected: false
            }));
        }

        // Hauptfunktion: Sucht Ersatzteile online
        async function searchErsatzteilOnline(teilName, fahrzeug) {
            const searchQuery = `${fahrzeug.marke} ${fahrzeug.modell} ${teilName}`;
            console.log('🔎 Suche:', searchQuery);

            // IMMER echte Shop-Links generieren
            const shopLinks = generateShopSearchLinks(teilName, fahrzeug);

            // Versuche eBay API für echte Ergebnisse (wenn API-Key vorhanden)
            let ebayResults = [];
            const ebayAppId = await getEbayAppId();

            if (ebayAppId) {
                try {
                    ebayResults = await searchEbayAPI(teilName, fahrzeug, ebayAppId);
                    console.log('✅ eBay API Ergebnisse:', ebayResults.length);
                } catch (error) {
                    console.warn('⚠️ eBay API fehlgeschlagen:', error);
                }
            }

            // GPT-Preisschätzung als Zusatz (mit GESCHÄTZT-Label)
            let preisSchaetzung = null;
            const openaiKey = await getOpenAIKey();

            if (openaiKey) {
                try {
                    preisSchaetzung = await getGPTPreisSchaetzung(teilName, fahrzeug, openaiKey);
                    console.log('💡 GPT Preisschätzung:', preisSchaetzung);
                } catch (error) {
                    console.warn('⚠️ GPT Schätzung fehlgeschlagen:', error);
                }
            }

            // Kombiniere alle Ergebnisse
            const allResults = [
                ...ebayResults,
                ...shopLinks
            ];

            // Preisschätzung als Info-Objekt hinzufügen (falls vorhanden)
            if (preisSchaetzung) {
                allResults.unshift({
                    id: `schaetzung-${teilName.replace(/\s+/g, '-')}-${Date.now()}`,
                    teilName: teilName,
                    shop: '💡 KI-Preisschätzung',
                    titel: `${teilName} - Marktpreis-Schätzung`,
                    beschreibung: preisSchaetzung.erklaerung || 'Basierend auf aktuellen Marktdaten',
                    preis: preisSchaetzung.mittelpreis,
                    preisVon: preisSchaetzung.preisVon,
                    preisBis: preisSchaetzung.preisBis,
                    isSchaetzung: true,  // Markierung: Das ist eine Schätzung!
                    selected: false
                });
            }

            return allResults;
        }

        // eBay API Key aus Einstellungen holen
        async function getEbayAppId() {
            try {
                if (window.settingsManager?.currentSettings?.systemConfig?.ebayAppId) {
                    return window.settingsManager.currentSettings.systemConfig.ebayAppId;
                }
                // Multi-Tenant Helper für konsistenten Collection-Zugriff
                const settingsDoc = await window.getCollection('einstellungen').doc('config').get();
                return settingsDoc.exists ? settingsDoc.data()?.systemConfig?.ebayAppId : null;
            } catch (e) {
                return null;
            }
        }

        // OpenAI Key aus Einstellungen holen
        async function getOpenAIKey() {
            try {
                if (window.settingsManager?.currentSettings?.systemConfig?.openaiKey) {
                    return window.settingsManager.currentSettings.systemConfig.openaiKey;
                }
                // Multi-Tenant Helper für konsistenten Collection-Zugriff
                const settingsDoc = await window.getCollection('einstellungen').doc('config').get();
                return settingsDoc.exists ? settingsDoc.data()?.systemConfig?.openaiKey : null;
            } catch (e) {
                return null;
            }
        }

        // eBay Finding API - Echte Suchergebnisse
        async function searchEbayAPI(teilName, fahrzeug, appId) {
            const query = `${fahrzeug.marke} ${fahrzeug.modell} ${teilName}`;

            // eBay Finding API (CORS-Problem: muss über Backend laufen)
            // Für jetzt: Direkte Links zu eBay Suche
            console.log('ℹ️ eBay API benötigt Backend-Proxy wegen CORS');

            // Placeholder für zukünftige Backend-Integration
            return [];
        }

        // GPT-4 für Preisschätzung (NICHT für fake Angebote!)
        async function getGPTPreisSchaetzung(teilName, fahrzeug, apiKey) {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o',
                    messages: [
                        {
                            role: 'system',
                            content: `Du bist ein Experte für Kfz-Ersatzteile.
Gib eine REALISTISCHE Preisschätzung basierend auf deinem Wissen über den deutschen Markt.

WICHTIG: Dies ist NUR eine Schätzung! Antworte NUR im JSON-Format:
{
    "preisVon": 50,
    "preisBis": 150,
    "mittelpreis": 100,
    "erklaerung": "Kurze Erklärung warum dieser Preis"
}

Berücksichtige:
- Marke (Premium-Marken teurer)
- Teil-Typ (Karosserie, Mechanik, etc.)
- Qualität (OE vs Aftermarket)
- Deutscher Markt 2024`
                        },
                        {
                            role: 'user',
                            content: `Schätze den Marktpreis für:
Fahrzeug: ${fahrzeug.marke} ${fahrzeug.modell} ${fahrzeug.baujahr || ''}
Teil: ${teilName}

Gib eine realistische Preisspanne für den deutschen Markt.`
                        }
                    ],
                    max_tokens: 300,
                    temperature: 0.3
                })
            });

            if (!response.ok) throw new Error('API-Fehler');

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content || '';

            try {
                return JSON.parse(content);
            } catch {
                const jsonMatch = content.match(/\{[\s\S]*\}/);
                return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
            }
        }

        // Ergebnisse rendern (gruppiert nach Teil)
        function renderKIErsatzteileResults() {
            const container = document.getElementById('kiErsatzteileGrouped');
            const countEl = document.getElementById('kiResultsCount');
            if (!container) return;

            // Zähle nur echte Shop-Links (nicht Schätzungen)
            const shopLinks = kiErsatzteileAngebote.filter(a => a.isDirectLink);
            const schaetzungen = kiErsatzteileAngebote.filter(a => a.isSchaetzung);

            if (countEl) countEl.textContent = `${shopLinks.length} Shop-Links`;

            // Nach Teilname gruppieren
            const grouped = {};
            kiErsatzteileAngebote.forEach(a => {
                if (!grouped[a.teilName]) grouped[a.teilName] = [];
                grouped[a.teilName].push(a);
            });

            container.innerHTML = Object.entries(grouped).map(([teilName, angebote]) => {
                const links = angebote.filter(a => a.isDirectLink);
                const schaetzung = angebote.find(a => a.isSchaetzung);

                return `
                <div class="ki-teil-gruppe">
                    <div class="ki-teil-gruppe__header">
                        <div class="ki-teil-gruppe__name">
                            <i data-feather="package"></i>
                            ${teilName}
                        </div>
                        <div class="ki-teil-gruppe__angebote">${links.length} Shops</div>
                    </div>

                    ${schaetzung ? renderPreisSchaetzung(schaetzung) : ''}

                    <div class="ki-shop-links-header" style="padding: 8px 16px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; font-weight: 600; color: #495057;">
                        🔗 Direkt zu den Shops (echte Links):
                    </div>

                    ${links.map(a => renderShopLink(a)).join('')}
                </div>
            `;
            }).join('');

            updateKIErsatzteileSelection();
            if (typeof feather !== 'undefined') feather.replace();
        }

        // KI-Preisschätzung rendern (mit GESCHÄTZT-Label!)
        function renderPreisSchaetzung(schaetzung) {
            return `
                <div class="ki-preisschaetzung" style="background: linear-gradient(135deg, #fff3cd, #ffeeba); padding: 16px; border-radius: 8px; margin: 8px 16px; border-left: 4px solid #ffc107;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 1.5em;">💡</span>
                        <strong style="color: #856404;">KI-Preisschätzung</strong>
                        <span style="background: #ffc107; color: #000; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700;">GESCHÄTZT</span>
                    </div>
                    <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px;">
                        <span style="font-size: 1.3em; font-weight: 700; color: #856404;">
                            ${schaetzung.preisVon?.toFixed(0) || '?'} € - ${schaetzung.preisBis?.toFixed(0) || '?'} €
                        </span>
                        <span style="color: #856404; font-size: 0.9em;">(Mittel: ~${schaetzung.preis?.toFixed(0) || '?'} €)</span>
                    </div>
                    <p style="margin: 0; font-size: 0.85em; color: #6c757d;">
                        ${schaetzung.beschreibung || 'Basierend auf aktuellen Marktdaten'}
                    </p>
                    <p style="margin: 4px 0 0 0; font-size: 0.75em; color: #999; font-style: italic;">
                        ⚠️ Dies ist nur eine Schätzung! Bitte Preise in den Shops unten vergleichen.
                    </p>
                </div>
            `;
        }

        // Shop-Link rendern (echter Link zum Shop!)
        function renderShopLink(link) {
            return `
                <a href="${link.url}" target="_blank" class="ki-shop-link" style="display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid #e9ecef; text-decoration: none; color: inherit; transition: background 0.2s;" onmouseover="this.style.background='#f8f9fa'" onmouseout="this.style.background='white'">
                    <span style="font-size: 1.5em; margin-right: 12px;">${link.icon}</span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: ${link.color};">${link.shop}</div>
                        <div style="font-size: 0.85em; color: #6c757d;">${link.beschreibung}</div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="background: #28a745; color: white; padding: 4px 12px; border-radius: 16px; font-size: 0.8em; font-weight: 600;">
                            Jetzt suchen
                        </span>
                        <i data-feather="external-link" style="width: 16px; height: 16px; color: #6c757d;"></i>
                    </div>
                </a>
            `;
        }

        // Legacy: Einzelnes Angebot rendern (für eBay API Ergebnisse)
        function renderKIAngebot(angebot) {
            // Wenn es ein direkter Link ist, nutze die neue Darstellung
            if (angebot.isDirectLink) return renderShopLink(angebot);
            if (angebot.isSchaetzung) return renderPreisSchaetzung(angebot);

            const isSelected = selectedKIErsatzteile.has(angebot.id);
            const gesamtPreis = angebot.preis + (angebot.versand || 0);
            const qualBadgeClass = angebot.qualitaet === 'OE' ? 'ki-badge--oe' :
                                   (angebot.qualitaet === 'Gebraucht' ? 'ki-badge--gebraucht' : 'ki-badge--aftermarket');

            return `
                <div class="ki-angebot ${isSelected ? 'selected' : ''}" data-id="${angebot.id}">
                    <input type="checkbox" class="ki-angebot__checkbox"
                           ${isSelected ? 'checked' : ''}
                           onchange="toggleKIErsatzteil('${angebot.id}')">
                    <div class="ki-angebot__info">
                        <div class="ki-angebot__title">${angebot.titel}</div>
                        <div class="ki-angebot__details">
                            <span class="ki-badge ${qualBadgeClass}">${angebot.qualitaet || 'Unbekannt'}</span>
                            ${angebot.teilenummer ? `<span>Nr: ${angebot.teilenummer}</span>` : ''}
                            <span class="ki-badge ${angebot.verfuegbar ? 'ki-badge--lieferbar' : 'ki-badge--bestellen'}">
                                ${angebot.verfuegbar ? '✓ Lieferbar' : '⏱ Bestellbar'}
                            </span>
                            <span>${angebot.lieferzeit || ''}</span>
                        </div>
                    </div>
                    <div class="ki-angebot__anbieter">
                        <span class="ki-angebot__anbieter-name">${angebot.shop}</span>
                    </div>
                    <div class="ki-angebot__preis">
                        <div class="ki-angebot__preis-wert">${gesamtPreis.toFixed(2)} €</div>
                        <div class="ki-angebot__preis-label">
                            ${angebot.versand > 0 ? `inkl. ${angebot.versand.toFixed(2)} € Versand` : 'Versandkostenfrei'}
                        </div>
                    </div>
                    <a href="${angebot.url}" target="_blank" class="ki-angebot__link" title="Im Shop öffnen">
                        <i data-feather="external-link"></i>
                    </a>
                </div>
            `;
        }

        // Einzelnes Angebot auswählen/abwählen
        function toggleKIErsatzteil(id) {
            if (selectedKIErsatzteile.has(id)) {
                selectedKIErsatzteile.delete(id);
            } else {
                selectedKIErsatzteile.add(id);
            }
            updateKIErsatzteileSelection();

            // Visual Update
            const el = document.querySelector(`.ki-angebot[data-id="${id}"]`);
            if (el) el.classList.toggle('selected', selectedKIErsatzteile.has(id));
        }

        // Alle auswählen
        function selectAllKIErsatzteile() {
            kiErsatzteileAngebote.forEach(a => selectedKIErsatzteile.add(a.id));
            renderKIErsatzteileResults();
        }

        // Günstigste pro Teil auswählen
        function selectCheapestKIErsatzteile() {
            selectedKIErsatzteile.clear();

            // Nach Teil gruppieren und günstigstes pro Gruppe wählen
            const grouped = {};
            kiErsatzteileAngebote.forEach(a => {
                if (!grouped[a.teilName]) grouped[a.teilName] = [];
                grouped[a.teilName].push(a);
            });

            Object.values(grouped).forEach(angebote => {
                const cheapest = angebote.reduce((min, a) =>
                    (a.preis + (a.versand || 0)) < (min.preis + (min.versand || 0)) ? a : min
                );
                selectedKIErsatzteile.add(cheapest.id);
            });

            renderKIErsatzteileResults();
        }

        // Auswahl-Zusammenfassung aktualisieren
        function updateKIErsatzteileSelection() {
            const countEl = document.getElementById('kiSelectedCount');
            const totalEl = document.getElementById('kiSelectedTotal');

            const selectedAngebote = kiErsatzteileAngebote.filter(a => selectedKIErsatzteile.has(a.id));
            const total = selectedAngebote.reduce((sum, a) => sum + a.preis + (a.versand || 0), 0);

            if (countEl) countEl.textContent = selectedAngebote.length;
            if (totalEl) totalEl.textContent = `${total.toFixed(2)} €`;
        }

        // Ausgewählte zur Bestellliste hinzufügen
        function addSelectedKIErsatzteile() {
            const selectedAngebote = kiErsatzteileAngebote.filter(a => selectedKIErsatzteile.has(a.id));

            if (selectedAngebote.length === 0) {
                showToast('Bitte mindestens ein Angebot auswählen', 'warning');
                return;
            }

            selectedAngebote.forEach(a => {
                kalkWizardData.ersatzteile.push({
                    name: a.titel,
                    teilenummer: a.teilenummer,
                    preis: a.preis + (a.versand || 0),
                    menge: 1,
                    lieferant: a.shop,
                    qualitaet: a.qualitaet,
                    url: a.url,
                    kiGefunden: true
                });
            });

            // Tabelle aktualisieren
            renderErsatzteileTable();

            // Auswahl zurücksetzen
            selectedKIErsatzteile.clear();
            updateKIErsatzteileSelection();

            showToast(`✅ ${selectedAngebote.length} Teile zur Bestellliste hinzugefügt`, 'success');
        }

        // ============================================

        // Ersatzteil zur Liste hinzufügen (Step 5)
        // 🆕 Nov 30, 2025: Zwei Preise (Original + Aftermarket) für KVA-Varianten
        function addErsatzteilToList() {
            const name = document.getElementById('ersatzteilAddName')?.value?.trim();
            const teilenummer = document.getElementById('ersatzteilAddTeilenr')?.value?.trim();
            // 🆕 Zwei Preis-Felder
            const preisOriginal = parseFloat(document.getElementById('ersatzteilAddPreisOriginal')?.value) || 0;
            const preisAftermarket = parseFloat(document.getElementById('ersatzteilAddPreisAftermarket')?.value) || 0;
            const menge = parseInt(document.getElementById('ersatzteilAddMenge')?.value) || 1;
            const lieferant = document.getElementById('ersatzteilAddLieferant')?.value?.trim() || '';
            const bestellLink = document.getElementById('ersatzteilAddLink')?.value?.trim() || '';

            if (!name) {
                showToast('Bitte geben Sie einen Teilenamen ein', 'warning');
                return;
            }

            if (preisOriginal <= 0) {
                showToast('Bitte geben Sie mindestens den Original-Preis ein', 'warning');
                return;
            }

            // 🆕 Dec 1, 2025: Service-Zuordnung für Multi-Service
            const serviceSelect = document.getElementById('ersatzteilAddService');
            const selectedService = serviceSelect ? serviceSelect.value : '';

            const ersatzteil = {
                name: name,
                teilenummer: teilenummer,
                // 🆕 Zwei Preise speichern
                preisOriginal: preisOriginal,
                preisAftermarket: preisAftermarket > 0 ? preisAftermarket : preisOriginal, // Fallback auf Original wenn leer
                // Backwards-Kompatibilität: preis = Original (für alte Logik)
                preis: preisOriginal,
                menge: menge,
                lieferant: lieferant,
                bestellLink: bestellLink,
                // 🆕 Dec 1, 2025: Service-Zuordnung
                serviceTyp: selectedService || kalkWizardData.serviceArt || ''
            };

            kalkWizardData.ersatzteile.push(ersatzteil);

            // Log für Debugging
            if (selectedService) {
                console.log(`📦 Ersatzteil "${name}" → Service: ${selectedService}`);
            }

            // In DB speichern
            saveErsatzteilToDB(ersatzteil);

            // Formular zurücksetzen
            const nameField = document.getElementById('ersatzteilAddName');
            const teilenrField = document.getElementById('ersatzteilAddTeilenr');
            const preisOriginalField = document.getElementById('ersatzteilAddPreisOriginal');
            const preisAftermarketField = document.getElementById('ersatzteilAddPreisAftermarket');
            const mengeField = document.getElementById('ersatzteilAddMenge');
            const lieferantField = document.getElementById('ersatzteilAddLieferant');
            const linkField = document.getElementById('ersatzteilAddLink');
            if (nameField) nameField.value = '';
            if (teilenrField) teilenrField.value = '';
            if (preisOriginalField) preisOriginalField.value = '';
            if (preisAftermarketField) preisAftermarketField.value = '';
            if (mengeField) mengeField.value = '1';
            if (lieferantField) lieferantField.value = '';
            if (linkField) linkField.value = '';
            // 🆕 Dec 1, 2025: Service-Dropdown zurücksetzen (Multi-Service)
            if (serviceSelect) serviceSelect.selectedIndex = 0;

            // Liste neu rendern
            renderErsatzteileTable();
            showToast(`"${name}" hinzugefügt`, 'success');
        }

        // Ersatzteil aus Liste entfernen
        function removeErsatzteilFromList(index) {
            kalkWizardData.ersatzteile.splice(index, 1);
            renderErsatzteileTable();
        }

        // Ersatzteile-Tabelle rendern
        // 🆕 Nov 30, 2025: Zwei Preis-Spalten (Original + Aftermarket)
        function renderErsatzteileTable() {
            const tbody = document.getElementById('ersatzteileTableBody');
            const gesamtOriginal = document.getElementById('ersatzteileGesamtOriginal');
            const gesamtAftermarket = document.getElementById('ersatzteileGesamtAftermarket');
            if (!tbody) return;

            if (kalkWizardData.ersatzteile.length === 0) {
                tbody.innerHTML = `
                    <tr class="no-items-row">
                        <td colspan="7">Noch keine Ersatzteile hinzugefügt</td>
                    </tr>
                `;
                if (gesamtOriginal) gesamtOriginal.textContent = '0,00 €';
                if (gesamtAftermarket) gesamtAftermarket.textContent = '0,00 €';
                return;
            }

            let totalOriginal = 0;
            let totalAftermarket = 0;
            tbody.innerHTML = kalkWizardData.ersatzteile.map((e, index) => {
                // 🆕 Zwei Preise berechnen
                const pOriginal = e.preisOriginal || e.preis || 0;
                const pAftermarket = e.preisAftermarket || pOriginal;
                const menge = e.menge || 1;
                const gesamtOrig = pOriginal * menge;
                const gesamtAfter = pAftermarket * menge;
                totalOriginal += gesamtOrig;
                totalAftermarket += gesamtAfter;

                // Lieferant mit optionalem Link
                let lieferantCell = e.lieferant || '-';
                if (e.bestellLink) {
                    lieferantCell = `<a href="${e.bestellLink}" target="_blank" class="ersatzteil-link" title="${e.bestellLink}">
                        ${e.lieferant || 'Link'} <i data-feather="external-link" style="width: 12px; height: 12px;"></i>
                    </a>`;
                }
                return `
                    <tr>
                        <td><strong>${e.name}</strong></td>
                        <td>${e.teilenummer || '-'}</td>
                        <td>${lieferantCell}</td>
                        <td>${menge}</td>
                        <td style="background: #f5f9ff;"><strong>${gesamtOrig.toFixed(2)} €</strong></td>
                        <td style="background: #fffaf0;"><strong>${gesamtAfter.toFixed(2)} €</strong></td>
                        <td>
                            <button class="btn-icon" onclick="removeErsatzteilFromList(${index})" title="Entfernen">
                                <i data-feather="trash-2"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            if (gesamtOriginal) gesamtOriginal.textContent = `${totalOriginal.toFixed(2)} €`;
            if (gesamtAftermarket) gesamtAftermarket.textContent = `${totalAftermarket.toFixed(2)} €`;
            feather.replace();
        }

        // Step 5: Ersatzteile-Übersicht aktualisieren
        function updateStep5Ersatzteile() {
            // NEU: Teile die ersetzt werden müssen (aus Schritt 4)
            const teileZuErsetzen = kalkWizardData.teile.filter(t => {
                const reparaturen = t.reparaturen || [];
                return t.needsErsatzteil ||
                    reparaturen.includes('ersetzen') ||
                    reparaturen.includes('austauschen') ||
                    reparaturen.includes('wechseln');
            });

            console.log('📋 Step 5 - Teile zu ersetzen:', teileZuErsetzen);

            // KI-Kontext aktualisieren - KORREKTE Feldnamen aus kalkWizardData.fahrzeug
            const kontextFahrzeug = document.getElementById('kiKontextFahrzeug');
            const kontextTeile = document.getElementById('kiKontextTeile');

            if (kontextFahrzeug) {
                const marke = kalkWizardData.fahrzeug?.marke || '';
                const modell = kalkWizardData.fahrzeug?.modell || '';
                const baujahr = kalkWizardData.fahrzeug?.baujahr || '';
                const kennzeichen = kalkWizardData.fahrzeug?.kennzeichen || '';
                let fahrzeugText = `${marke} ${modell}`.trim();
                if (baujahr) fahrzeugText += ` (${baujahr})`;
                if (kennzeichen) fahrzeugText += ` - ${kennzeichen}`;
                kontextFahrzeug.textContent = fahrzeugText || '-';
            }

            if (kontextTeile) {
                if (teileZuErsetzen.length > 0) {
                    kontextTeile.textContent = teileZuErsetzen.map(t => t.teil || t.name).join(', ');
                } else {
                    kontextTeile.textContent = 'Keine Teile zum Ersetzen ausgewählt';
                }
            }

            // Ersatzteile aus Reparaturen anzeigen
            const fromRepairsList = document.getElementById('ersatzteileFromRepairsList');
            if (fromRepairsList) {
                // Zeige Teile die ein Ersatzteil brauchen
                if (teileZuErsetzen.length === 0) {
                    fromRepairsList.innerHTML = '<p class="no-items-hint">Keine Ersatzteile aus Reparaturen benötigt</p>';
                } else {
                    fromRepairsList.innerHTML = teileZuErsetzen.map((t, idx) => {
                        const hasErsatzteil = t.ersatzteil && t.ersatzteil.name;
                        return `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); background: ${hasErsatzteil ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)'}; border-radius: var(--radius-button); margin-bottom: var(--space-2); border-left: 4px solid ${hasErsatzteil ? '#10b981' : '#f59e0b'};">
                            <div>
                                <strong style="display: flex; align-items: center; gap: 8px;">
                                    <span>${hasErsatzteil ? '✅' : '🔍'}</span>
                                    ${t.teil}
                                </strong>
                                <span style="font-size: var(--font-size-xs); color: var(--color-text-secondary); display: block; margin-top: 4px;">
                                    ${t.reparaturen.join(', ')}
                                </span>
                                ${hasErsatzteil ? `
                                    <span style="font-size: var(--font-size-xs); color: #10b981; display: block; margin-top: 4px;">
                                        Ersatzteil: ${t.ersatzteil.name} - ${(t.ersatzteil.preis || 0).toFixed(2)} € (${t.ersatzteil.lieferant || 'Unbekannt'})
                                    </span>
                                ` : `
                                    <span style="font-size: var(--font-size-xs); color: #f59e0b; display: block; margin-top: 4px;">
                                        ⚠️ Ersatzteil noch nicht zugewiesen - KI-Suche starten oder manuell hinzufügen
                                    </span>
                                `}
                            </div>
                            ${hasErsatzteil ? `
                                <span style="font-weight: var(--font-weight-semibold); color: #10b981;">${(t.ersatzteil.preis || 0).toFixed(2)} €</span>
                            ` : `
                                <span style="background: #f59e0b; color: white; padding: 4px 12px; border-radius: 12px; font-size: var(--font-size-xs); font-weight: 600;">OFFEN</span>
                            `}
                        </div>
                    `;
                    }).join('');
                }
            }

            // Ersatzteile-Tabelle rendern
            renderErsatzteileTable();

            // 🆕 Nov 30, 2025: Teile-Checkliste rendern
            renderTeileChecklist();

            // 🆕 Dec 1, 2025: Service-Dropdown für Multi-Service befüllen
            const serviceContainer = document.getElementById('ersatzteilServiceContainer');
            const serviceSelect = document.getElementById('ersatzteilAddService');
            if (serviceContainer && serviceSelect && kalkWizardData.isMultiService && kalkWizardData.additionalServicesFromEntwurf?.length > 0) {
                // Zeige Service-Dropdown
                serviceContainer.style.display = 'block';

                // Services ermitteln (Primary + Additional)
                const allServices = [];
                if (kalkWizardData.serviceArt) {
                    allServices.push(kalkWizardData.serviceArt);
                }
                kalkWizardData.additionalServicesFromEntwurf.forEach(svc => {
                    const svcTyp = typeof svc === 'string' ? svc : svc.serviceTyp;
                    if (svcTyp && !allServices.includes(svcTyp)) {
                        allServices.push(svcTyp);
                    }
                });

                // Dropdown befüllen
                serviceSelect.innerHTML = '<option value="">-- Service wählen --</option>';
                allServices.forEach(svc => {
                    const label = SERVICE_LABELS[svc] || svc;
                    serviceSelect.innerHTML += `<option value="${svc}">${label}</option>`;
                });

                console.log('📦 [MULTI-SERVICE] Ersatzteil-Service-Dropdown befüllt:', allServices);
            } else if (serviceContainer) {
                // Single-Service: Dropdown verstecken
                serviceContainer.style.display = 'none';
            }
        }

        /**
         * 🆕 Nov 30, 2025: Rendert die Teile-Checkliste für Bestellungen
         * Zeigt alle Teile aus allen Services mit Checkboxen
         */
        function renderTeileChecklist() {
            const section = document.getElementById('teileChecklistSection');
            const itemsContainer = document.getElementById('teileChecklistItems');
            const badge = document.getElementById('teileChecklistBadge');
            const actions = document.getElementById('teileChecklistActions');

            if (!section || !itemsContainer) return;

            const teile = kalkWizardData.teile || [];

            // Nur anzeigen wenn Teile vorhanden
            if (teile.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';

            // Initialisiere checkedTeile wenn nicht vorhanden
            if (!kalkWizardData.checkedTeile) {
                kalkWizardData.checkedTeile = {};
            }

            // Zähle bereits abgehakte Teile
            const checkedCount = teile.filter(t => kalkWizardData.checkedTeile[t.teil + '_' + t.service]).length;

            // Badge aktualisieren
            if (badge) {
                badge.textContent = `${checkedCount}/${teile.length}`;
                badge.style.background = checkedCount === teile.length ? 'var(--color-success)' : '#ff9800';
            }

            // Actions anzeigen wenn mehr als 2 Teile
            if (actions) {
                actions.style.display = teile.length > 2 ? 'flex' : 'none';
            }

            // Checklisten-Items generieren
            itemsContainer.innerHTML = teile.map((teil, index) => {
                const checkId = teil.teil + '_' + teil.service;
                const isChecked = kalkWizardData.checkedTeile[checkId] || false;
                const partIcon = getPartIcon(teil.teil);
                const serviceLabel = teil.serviceLabel || SERVICE_LABELS[teil.service] || teil.service;
                const arbeiten = teil.arbeiten || [];

                return `
                    <div class="teile-checklist-item ${isChecked ? 'checked' : ''}" data-check-id="${checkId}">
                        <input type="checkbox"
                               class="teile-checklist-item__checkbox"
                               id="teileCheck_${index}"
                               ${isChecked ? 'checked' : ''}
                               onchange="toggleTeileCheck('${checkId}', this.checked)">
                        <span class="teile-checklist-item__icon">${partIcon}</span>
                        <div class="teile-checklist-item__content">
                            <span class="teile-checklist-item__name">${teil.teil}</span>
                            <span class="teile-checklist-item__service">${serviceLabel}</span>
                            ${arbeiten.length > 0 ? `<span class="teile-checklist-item__arbeiten">Arbeiten: ${arbeiten.join(', ')}</span>` : ''}
                        </div>
                    </div>
                `;
            }).join('');

            feather.replace();
        }

        /**
         * 🆕 Toggle Checkbox für ein Teil
         */
        function toggleTeileCheck(checkId, isChecked) {
            if (!kalkWizardData.checkedTeile) {
                kalkWizardData.checkedTeile = {};
            }

            kalkWizardData.checkedTeile[checkId] = isChecked;

            // UI aktualisieren
            const item = document.querySelector(`.teile-checklist-item[data-check-id="${checkId}"]`);
            if (item) {
                if (isChecked) {
                    item.classList.add('checked');
                } else {
                    item.classList.remove('checked');
                }
            }

            // Badge aktualisieren
            updateTeileChecklistBadge();

            // Toast Feedback
            if (isChecked) {
                showToast('Teil als bestellt markiert ✓', 'success');
            }
        }

        /**
         * 🆕 Aktualisiert das Badge der Teile-Checkliste
         */
        function updateTeileChecklistBadge() {
            const badge = document.getElementById('teileChecklistBadge');
            const teile = kalkWizardData.teile || [];

            if (!badge || teile.length === 0) return;

            const checkedCount = teile.filter(t =>
                kalkWizardData.checkedTeile?.[t.teil + '_' + t.service]
            ).length;

            badge.textContent = `${checkedCount}/${teile.length}`;
            badge.style.background = checkedCount === teile.length ? 'var(--color-success)' : '#ff9800';

            // Alle abgehakt → Erfolgsmeldung
            if (checkedCount === teile.length && teile.length > 0) {
                showToast('🎉 Alle Teile als bestellt markiert!', 'success');
            }
        }

        /**
         * 🆕 Alle Teile abhaken
         */
        function checkAllTeile() {
            const teile = kalkWizardData.teile || [];
            if (!kalkWizardData.checkedTeile) {
                kalkWizardData.checkedTeile = {};
            }

            teile.forEach(teil => {
                const checkId = teil.teil + '_' + teil.service;
                kalkWizardData.checkedTeile[checkId] = true;
            });

            // UI aktualisieren
            renderTeileChecklist();
            showToast('Alle Teile als bestellt markiert', 'success');
        }

        /**
         * 🆕 Alle Teile zurücksetzen
         */
        function uncheckAllTeile() {
            kalkWizardData.checkedTeile = {};

            // UI aktualisieren
            renderTeileChecklist();
            showToast('Alle Markierungen zurückgesetzt', 'info');
        }

        // Step 6: Zusammenfassung aktualisieren (ehemals Step 5)
        function updateStep6Summary() {
            // Fahrzeug-Zusammenfassung
            const vehicleSummary = document.getElementById('step6VehicleSummary');
            if (vehicleSummary) {
                let html = `<strong>${kalkWizardData.fahrzeug.marke} ${kalkWizardData.fahrzeug.modell}</strong>`;
                if (kalkWizardData.fahrzeug.baujahr) html += `<br>Baujahr: ${kalkWizardData.fahrzeug.baujahr}`;
                if (kalkWizardData.fahrzeug.kennzeichen) html += `<br>Kennzeichen: ${kalkWizardData.fahrzeug.kennzeichen}`;
                if (kalkWizardData.fahrzeug.farbcode) html += `<br>Farbcode: ${kalkWizardData.fahrzeug.farbcode}`;
                if (kalkWizardData.fahrzeug.kunde) html += `<br>Kunde: ${kalkWizardData.fahrzeug.kunde}`;
                if (kalkWizardData.serviceArt) {
                    html += `<br><span style="color: var(--color-primary);">Service: ${SERVICE_LABELS[kalkWizardData.serviceArt] || kalkWizardData.serviceArt}</span>`;
                }
                vehicleSummary.innerHTML = html;
            }

            // Teile-Zusammenfassung
            const partsSummary = document.getElementById('step6PartsSummary');
            if (partsSummary) {
                let allParts = [...(kalkWizardData.teile || [])];

                // 🆕 Multi-Service Support: Teile haben jetzt "arbeiten" statt "reparaturen"
                // Normalisiere alle Teile für die Zusammenfassung
                allParts = allParts.map(item => ({
                    ...item,
                    // Fallback: arbeiten → reparaturen für Kompatibilität
                    reparaturen: item.reparaturen || item.arbeiten || []
                }));

                if (allParts.length === 0) {
                    partsSummary.innerHTML = '<p style="color: var(--color-text-secondary);">Keine Teile ausgewählt</p>';
                } else {
                    partsSummary.innerHTML = allParts.map(item => {
                        const repairs = item.reparaturen || [];
                        const serviceLabel = item.serviceLabel || SERVICE_LABELS[item.service] || item.service || '';

                        return `
                            <div style="padding: var(--space-3); background: var(--color-background); border-radius: var(--radius-button); margin-bottom: var(--space-2);">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <strong>${item.teil}</strong>
                                    ${serviceLabel ? `<span style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">${serviceLabel}</span>` : ''}
                                </div>
                                ${repairs.length > 0 ? `
                                    <div style="display: flex; flex-wrap: wrap; gap: var(--space-1); margin-top: var(--space-2);">
                                        ${repairs.map(r => `<span style="background: var(--color-primary); color: white; padding: 2px 8px; border-radius: 12px; font-size: var(--font-size-xs);">${r}</span>`).join('')}
                                    </div>
                                ` : '<div style="font-size: var(--font-size-xs); color: var(--color-text-secondary); margin-top: var(--space-1);">Keine Arbeiten zugewiesen</div>'}
                            </div>
                        `;
                    }).join('');

                    // Positionen zur aktuellenKalkulation hinzufügen
                    generateKalkulationPositions(allParts);
                }
            }

            // Ersatzteile-Zusammenfassung
            const ersatzteileSummary = document.getElementById('step6ErsatzteileSummary');
            if (ersatzteileSummary) {
                if (kalkWizardData.ersatzteile.length === 0) {
                    ersatzteileSummary.innerHTML = '<p style="color: var(--color-text-secondary);">Keine Ersatzteile</p>';
                } else {
                    const total = kalkWizardData.ersatzteile.reduce((sum, e) => sum + ((e.preis || 0) * (e.menge || 1)), 0);
                    ersatzteileSummary.innerHTML = `
                        <div style="font-size: var(--font-size-sm);">
                            <strong>${kalkWizardData.ersatzteile.length} Ersatzteil(e)</strong>
                            <br>Gesamt: <strong style="color: var(--color-primary);">${total.toFixed(2)} €</strong>
                        </div>
                        <div style="margin-top: var(--space-2);">
                            ${kalkWizardData.ersatzteile.map(e => `
                                <div style="font-size: var(--font-size-xs); padding: var(--space-1) 0; border-bottom: 1px solid var(--color-border);">
                                    ${window.escapeHtml(e.name)} ${e.menge > 1 ? `(${e.menge}x)` : ''} - ${((e.preis || 0) * (e.menge || 1)).toFixed(2)} €
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
            }

            // 🆕 Service-Details Zusammenfassung (für Folierung, Werbebeklebung, etc.)
            renderStep6ServiceDetails();

            // 🆕 Design-Galerie Zusammenfassung
            renderStep6DesignGallery();
        }

        // 🆕 Service-Details in Step 6 anzeigen
        function renderStep6ServiceDetails() {
            const section = document.getElementById('step6ServiceDetailsSection');
            const summary = document.getElementById('step6ServiceDetailsSummary');

            if (!section || !summary) return;

            const serviceDetails = kalkWizardData.serviceDetails || {};
            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];

            // Keine Service-Details vorhanden → ausblenden
            if (Object.keys(serviceDetails).length === 0 || !config || !config.zusatzfelder) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';

            // Details formatieren
            let html = '<div class="service-details-list">';
            for (const [fieldId, value] of Object.entries(serviceDetails)) {
                if (value && typeof value !== 'object') { // Skip file arrays
                    const fieldConfig = config.zusatzfelder[fieldId];
                    const label = fieldConfig?.label || fieldId;

                    // Bei Select-Feldern: Label statt Value anzeigen
                    let displayValue = value;
                    if (fieldConfig?.typ === 'select' && fieldConfig?.options) {
                        const option = fieldConfig.options.find(o => o.value === value);
                        displayValue = option?.label || value;
                    }

                    html += `
                        <div class="service-details-row">
                            <span class="service-details-label">${label}:</span>
                            <span class="service-details-value">${displayValue}</span>
                        </div>
                    `;
                }
            }
            html += '</div>';

            summary.innerHTML = html;
        }

        // 🆕 Design-Galerie in Step 6 anzeigen
        function renderStep6DesignGallery() {
            const section = document.getElementById('step6DesignsSection');
            const gallery = document.getElementById('step6DesignGallery');

            if (!section || !gallery) return;

            // Alle Designs sammeln
            let allDesigns = [];
            for (const [fieldId, files] of Object.entries(uploadedDesignFiles)) {
                files.forEach(f => allDesigns.push({ ...f, fieldId }));
            }

            // Keine Designs vorhanden → ausblenden
            if (allDesigns.length === 0) {
                section.style.display = 'none';
                return;
            }

            section.style.display = 'block';

            gallery.innerHTML = allDesigns.map(file => {
                const isImage = file.type?.startsWith('image/');
                return `
                    <div class="step6-design-item">
                        ${isImage
                            ? `<img src="${file.base64}" alt="${file.name}" onclick="openDesignLightbox('${file.base64}')">`
                            : `<div class="step6-design-item__file">${getFileIcon(file.type)}</div>`
                        }
                        <div class="step6-design-item__info">
                            <div class="step6-design-item__name" title="${file.name}">${file.name}</div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        // 🆕 Design-Lightbox öffnen
        function openDesignLightbox(base64) {
            // Einfaches Lightbox-Modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                cursor: pointer;
            `;
            modal.innerHTML = `<img src="${base64}" style="max-width: 90%; max-height: 90%; object-fit: contain; border-radius: 8px;">`;
            modal.addEventListener('click', () => modal.remove());
            document.body.appendChild(modal);
        }

        // Alte Funktion für Kompatibilität (wird jetzt von Step 6 aufgerufen)
        function updateStep5Summary() {
            updateStep6Summary();
        }

        function generateKalkulationPositions(allParts) {
            // Positionen aus den gewählten Teilen + Reparaturen generieren
            aktuelleKalkulation.positionen = [];
            aktuelleKalkulation.materialien = []; // Material zurücksetzen
            aktuelleKalkulation.kundenName = kalkWizardData.fahrzeug.kunde;
            aktuelleKalkulation.kennzeichen = kalkWizardData.fahrzeug.kennzeichen;

            allParts.forEach(item => {
                // 🆕 Fallback: arbeiten → reparaturen (Multi-Service Support)
                const repairs = item.reparaturen || item.arbeiten || [];
                repairs.forEach(repair => {
                    const positionName = `${item.teil} ${repair}`;

                    // Stunden und Stundensatz holen
                    const arbeitsDaten = getArbeitsDaten(item.teil, repair);

                    aktuelleKalkulation.positionen.push({
                        id: Date.now() + Math.random(),
                        name: positionName,
                        teil: item.teil,
                        arbeit: repair,
                        stunden: arbeitsDaten.stunden,
                        stundensatz: arbeitsDaten.stundensatz,
                        preis: arbeitsDaten.stunden * arbeitsDaten.stundensatz,
                        menge: 1
                    });

                    // Automatisch Material hinzufügen
                    const materialListe = getMaterialFuerArbeit(item.teil, repair);
                    materialListe.forEach(mat => {
                        // Prüfen ob Material schon existiert
                        const existing = aktuelleKalkulation.materialien.find(m => m.name === mat.name);
                        if (existing) {
                            existing.menge += mat.menge;
                        } else {
                            aktuelleKalkulation.materialien.push({
                                id: Date.now() + Math.random(),
                                ...mat
                            });
                        }
                    });
                });
            });

            // Positionen und Material rendern
            renderPositionenNew();
            renderMaterialienNew();
            berechneGesamtsumme();
        }

        // Stunden und Stundensatz pro Arbeit/Teil
        function getArbeitsDaten(teil, arbeit) {
            // Stundensätze aus Einstellungen
            const stundensatzLack = kalkulationSaetze?.stundensatzLack || 85;
            const stundensatzKarosserie = kalkulationSaetze?.stundensatzKarosserie || 95;
            const stundensatzMechanik = kalkulationSaetze?.stundensatzMechanik || 85;

            // Standard-Arbeitszeiten (in Stunden) nach Arbeit und Teilgröße
            const arbeitszeiten = {
                'lackieren': {
                    'Stoßfänger': 3.0, 'Motorhaube': 3.5, 'Kotflügel': 2.5, 'Tür': 3.0,
                    'Dach': 4.0, 'Heckklappe': 3.0, 'Seitenteil': 3.5, 'Schweller': 2.0,
                    'Seitenspiegel': 0.5, 'default': 2.5
                },
                'demontieren': {
                    'Stoßfänger': 0.5, 'Motorhaube': 0.3, 'Kotflügel': 0.8, 'Tür': 0.5,
                    'Heckklappe': 0.4, 'Seitenspiegel': 0.2, 'default': 0.5
                },
                'montieren': {
                    'Stoßfänger': 0.5, 'Motorhaube': 0.3, 'Kotflügel': 0.8, 'Tür': 0.5,
                    'Heckklappe': 0.4, 'Seitenspiegel': 0.2, 'default': 0.5
                },
                'grundieren': {
                    'default': 1.0
                },
                'spachteln': {
                    'klein': 0.5, 'mittel': 1.0, 'gross': 2.0, 'default': 1.0
                },
                'schleifen': {
                    'default': 0.75
                },
                'austauschen': {
                    'Stoßfänger': 1.5, 'Motorhaube': 1.0, 'Kotflügel': 2.0, 'Tür': 2.5,
                    'Heckklappe': 1.5, 'Seitenspiegel': 0.5, 'default': 1.5
                },
                'spot-repair': {
                    'default': 1.5
                },
                'polieren': {
                    'default': 1.0
                },
                'ausbeulen': {
                    'klein': 1.0, 'mittel': 2.0, 'gross': 3.5, 'default': 2.0
                },
                'schweissen': {
                    'default': 1.5
                },
                'kleben': {
                    'default': 0.75
                }
            };

            // Stundensatz nach Arbeit
            const stundensatzMap = {
                'lackieren': stundensatzLack,
                'grundieren': stundensatzLack,
                'polieren': stundensatzLack,
                'spot-repair': stundensatzLack,
                'demontieren': stundensatzMechanik,
                'montieren': stundensatzMechanik,
                'austauschen': stundensatzKarosserie,
                'spachteln': stundensatzKarosserie,
                'schleifen': stundensatzKarosserie,
                'ausbeulen': stundensatzKarosserie,
                'schweissen': stundensatzKarosserie,
                'kleben': stundensatzKarosserie
            };

            // Stunden berechnen
            let stunden = 1.0;
            const arbeitZeiten = arbeitszeiten[arbeit] || {};

            // Suche nach passendem Teil
            for (const [key, value] of Object.entries(arbeitZeiten)) {
                if (key !== 'default' && teil.toLowerCase().includes(key.toLowerCase())) {
                    stunden = value;
                    break;
                }
            }
            if (stunden === 1.0 && arbeitZeiten.default) {
                stunden = arbeitZeiten.default;
            }

            return {
                stunden: stunden,
                stundensatz: stundensatzMap[arbeit] || 85
            };
        }

        // Material automatisch basierend auf Arbeit
        function getMaterialFuerArbeit(teil, arbeit) {
            const materialVorschlaege = {
                'lackieren': [
                    { name: 'Basislack (gemischt)', menge: 0.3, einheit: 'Liter', einzelpreis: 85, preis: 25.50 },
                    { name: 'Klarlack 2K', menge: 0.2, einheit: 'Liter', einzelpreis: 65, preis: 13.00 },
                    { name: 'Härter', menge: 0.1, einheit: 'Liter', einzelpreis: 45, preis: 4.50 },
                    { name: 'Verdünnung', menge: 0.1, einheit: 'Liter', einzelpreis: 25, preis: 2.50 }
                ],
                'grundieren': [
                    { name: 'Füller/Grundierung 2K', menge: 0.2, einheit: 'Liter', einzelpreis: 55, preis: 11.00 },
                    { name: 'Härter Füller', menge: 0.1, einheit: 'Liter', einzelpreis: 40, preis: 4.00 }
                ],
                'spachteln': [
                    { name: 'Feinspachtel', menge: 0.15, einheit: 'kg', einzelpreis: 28, preis: 4.20 },
                    { name: 'Härterpaste', menge: 0.02, einheit: 'kg', einzelpreis: 35, preis: 0.70 }
                ],
                'schleifen': [
                    { name: 'Schleifpapier Set (P80-P800)', menge: 1, einheit: 'Set', einzelpreis: 8.50, preis: 8.50 },
                    { name: 'Schleifvlies', menge: 2, einheit: 'Stück', einzelpreis: 2.50, preis: 5.00 }
                ],
                'polieren': [
                    { name: 'Polierpaste Schleif', menge: 0.05, einheit: 'Liter', einzelpreis: 45, preis: 2.25 },
                    { name: 'Polierpaste Hochglanz', menge: 0.05, einheit: 'Liter', einzelpreis: 55, preis: 2.75 },
                    { name: 'Polierschwamm', menge: 1, einheit: 'Stück', einzelpreis: 12, preis: 12.00 }
                ],
                'spot-repair': [
                    { name: 'Spot-Repair Lack Set', menge: 1, einheit: 'Set', einzelpreis: 35, preis: 35.00 },
                    { name: 'Spot-Blender', menge: 0.1, einheit: 'Liter', einzelpreis: 48, preis: 4.80 }
                ],
                'kleben': [
                    { name: 'Kunststoffkleber 2K', menge: 1, einheit: 'Set', einzelpreis: 28, preis: 28.00 },
                    { name: 'Kunststoff-Primer', menge: 0.05, einheit: 'Liter', einzelpreis: 38, preis: 1.90 }
                ],
                'schweissen': [
                    { name: 'Schweißdraht', menge: 0.5, einheit: 'kg', einzelpreis: 18, preis: 9.00 },
                    { name: 'Schweißgas CO2', menge: 1, einheit: 'Pauschale', einzelpreis: 15, preis: 15.00 }
                ],
                'demontieren': [
                    { name: 'Clips/Befestigungen (Reserve)', menge: 1, einheit: 'Set', einzelpreis: 8, preis: 8.00 }
                ],
                'montieren': [
                    { name: 'Clips/Befestigungen neu', menge: 1, einheit: 'Set', einzelpreis: 12, preis: 12.00 }
                ]
            };

            return materialVorschlaege[arbeit] || [];
        }

        function renderPositionenNew() {
            const container = document.getElementById('positionenListe');
            if (!container) return;

            if (aktuelleKalkulation.positionen.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="clipboard"></i>
                        <h3>Keine Positionen</h3>
                        <p>Die Positionen werden automatisch aus Ihrer Auswahl generiert</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Position</th>
                                <th style="text-align: center;">Stunden</th>
                                <th style="text-align: center;">€/Std.</th>
                                <th style="text-align: right;">Preis</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${aktuelleKalkulation.positionen.map((pos, index) => `
                                <tr>
                                    <td>${pos.name}</td>
                                    <td style="text-align: center;">
                                        <input type="number"
                                               value="${pos.stunden.toFixed(2)}"
                                               step="0.25"
                                               min="0"
                                               onchange="updatePositionStunden(${index}, this.value)"
                                               style="width: 70px; text-align: center;">
                                    </td>
                                    <td style="text-align: center;">
                                        <input type="number"
                                               value="${pos.stundensatz.toFixed(2)}"
                                               step="5"
                                               min="0"
                                               onchange="updatePositionStundensatz(${index}, this.value)"
                                               style="width: 70px; text-align: center;">
                                    </td>
                                    <td style="text-align: right; font-weight: 600;">
                                        ${pos.preis.toFixed(2).replace('.', ',')} €
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-error" onclick="removePositionNew(${index})">
                                            <i data-feather="trash-2"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            feather.replace();
        }

        function renderMaterialienNew() {
            const container = document.getElementById('materialListe');
            if (!container) return;

            if (aktuelleKalkulation.materialien.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="package"></i>
                        <h3>Kein Material</h3>
                        <p>Material wird automatisch basierend auf den Arbeiten hinzugefügt</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Material</th>
                                <th style="text-align: center;">Menge</th>
                                <th style="text-align: center;">Einheit</th>
                                <th style="text-align: right;">Preis</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${aktuelleKalkulation.materialien.map((mat, index) => `
                                <tr>
                                    <td>${mat.name}</td>
                                    <td style="text-align: center;">
                                        <input type="number"
                                               value="${mat.menge}"
                                               step="0.1"
                                               min="0"
                                               onchange="updateMaterialMenge(${index}, this.value)"
                                               style="width: 60px; text-align: center;">
                                    </td>
                                    <td style="text-align: center;">${mat.einheit}</td>
                                    <td style="text-align: right;">
                                        <input type="number"
                                               value="${mat.preis.toFixed(2)}"
                                               step="0.50"
                                               min="0"
                                               onchange="updateMaterialPreis(${index}, this.value)"
                                               style="width: 80px; text-align: right;">
                                        €
                                    </td>
                                    <td>
                                        <button class="btn btn-sm btn-error" onclick="removeMaterialNew(${index})">
                                            <i data-feather="trash-2"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }

            feather.replace();
        }

        function updatePositionStunden(index, value) {
            const pos = aktuelleKalkulation.positionen[index];
            pos.stunden = parseFloat(value) || 0;
            pos.preis = pos.stunden * pos.stundensatz;
            renderPositionenNew();
            berechneGesamtsumme();
        }

        function updatePositionStundensatz(index, value) {
            const pos = aktuelleKalkulation.positionen[index];
            pos.stundensatz = parseFloat(value) || 0;
            pos.preis = pos.stunden * pos.stundensatz;
            renderPositionenNew();
            berechneGesamtsumme();
        }

        function updatePositionPreis(index, value) {
            aktuelleKalkulation.positionen[index].preis = parseFloat(value) || 0;
            berechneGesamtsumme();
        }

        function removePositionNew(index) {
            aktuelleKalkulation.positionen.splice(index, 1);
            renderPositionenNew();
            berechneGesamtsumme();
        }

        function updateMaterialMenge(index, value) {
            const mat = aktuelleKalkulation.materialien[index];
            mat.menge = parseFloat(value) || 0;
            mat.preis = mat.menge * (mat.einzelpreis || mat.preis / (mat.menge || 1));
            renderMaterialienNew();
            berechneGesamtsumme();
        }

        function updateMaterialPreis(index, value) {
            aktuelleKalkulation.materialien[index].preis = parseFloat(value) || 0;
            renderMaterialienNew();
            berechneGesamtsumme();
        }

        function removeMaterialNew(index) {
            aktuelleKalkulation.materialien.splice(index, 1);
            renderMaterialienNew();
            berechneGesamtsumme();
        }

        // ============================================
        // 💰 GESAMTSUMME BERECHNEN
        // ============================================

        function berechneGesamtsumme() {
            // Summe Arbeit (Positionen)
            const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => {
                const preis = parseFloat(p.preis) || 0;
                const menge = parseFloat(p.menge) || 1;
                return sum + (preis * menge);
            }, 0);

            // Summe Material
            // 🔧 FIX Dec 2, 2025: m.preis IST bereits der Gesamtpreis (einzelpreis × menge), NICHT nochmal multiplizieren!
            const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => {
                return sum + (parseFloat(m.preis) || parseFloat(m.verkaufspreis) || 0);
            }, 0);

            // Summe Ersatzteile (NEU!)
            const summeErsatzteile = (kalkWizardData.ersatzteile || []).reduce((sum, e) => {
                const preis = parseFloat(e.preis) || 0;
                const menge = parseFloat(e.menge) || 1;
                return sum + (preis * menge);
            }, 0);

            // 🚗 Ersatzfahrzeug-Kosten (FIX: Nov 30, 2025)
            // Aus kalkWizardData oder Entwurf-Daten
            let summeErsatzfahrzeug = 0;
            const ersatzfahrzeugData = kalkWizardData.ersatzfahrzeug || kalkWizardData.fahrzeug?.kalkulationData?.ersatzfahrzeug;
            if (ersatzfahrzeugData && ersatzfahrzeugData.gesamt > 0) {
                summeErsatzfahrzeug = parseFloat(ersatzfahrzeugData.gesamt) || 0;
            }

            // Netto, MwSt, Brutto (jetzt inkl. Ersatzteile + Ersatzfahrzeug!)
            const summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug;
            const mwstSatz = kalkulationSaetze?.mwstSatz || 19;
            const mwst = summeNetto * (mwstSatz / 100);
            const summeBrutto = summeNetto + mwst;

            // UI aktualisieren
            const elSummeArbeit = document.getElementById('summeArbeit');
            const elSummeMaterial = document.getElementById('summeMaterial');
            const elSummeErsatzteile = document.getElementById('summeErsatzteile');
            const elSummeErsatzfahrzeug = document.getElementById('summeErsatzfahrzeug');
            const elErsatzfahrzeugRow = document.getElementById('ersatzfahrzeugSummaryRow');
            const elSummeNetto = document.getElementById('summeNetto');
            const elMwstSatz = document.getElementById('mwstSatzDisplay');
            const elSummeMwst = document.getElementById('summeMwst');
            const elSummeBrutto = document.getElementById('summeBrutto');

            if (elSummeArbeit) elSummeArbeit.textContent = summeArbeit.toFixed(2).replace('.', ',') + ' €';
            if (elSummeMaterial) elSummeMaterial.textContent = summeMaterial.toFixed(2).replace('.', ',') + ' €';
            if (elSummeErsatzteile) elSummeErsatzteile.textContent = summeErsatzteile.toFixed(2).replace('.', ',') + ' €';

            // 🚗 Ersatzfahrzeug-Zeile ein-/ausblenden
            if (elErsatzfahrzeugRow && elSummeErsatzfahrzeug) {
                if (summeErsatzfahrzeug > 0) {
                    elErsatzfahrzeugRow.style.display = 'flex';
                    elSummeErsatzfahrzeug.textContent = summeErsatzfahrzeug.toFixed(2).replace('.', ',') + ' €';
                } else {
                    elErsatzfahrzeugRow.style.display = 'none';
                }
            }

            if (elSummeNetto) elSummeNetto.textContent = summeNetto.toFixed(2).replace('.', ',') + ' €';
            if (elMwstSatz) elMwstSatz.textContent = mwstSatz;
            if (elSummeMwst) elSummeMwst.textContent = mwst.toFixed(2).replace('.', ',') + ' €';
            if (elSummeBrutto) elSummeBrutto.textContent = summeBrutto.toFixed(2).replace('.', ',') + ' €';

            console.log('💰 Summen berechnet:', { summeArbeit, summeMaterial, summeErsatzteile, summeErsatzfahrzeug, summeNetto, mwst, summeBrutto });
        }

        // ============================================
        // 🚗 FAHRZEUG-DIAGRAMM FUNKTIONEN
        // ============================================

        // ============================================
        // 🚗 FAHRZEUGTYPEN KONFIGURATION
        // ============================================

        const VEHICLE_MODELS = {
            sedan: {
                id: '58c33766470d46e7b2aed542650494e5',
                name: 'Generic Sedan Car',
                author: 'MMC Works',
                url: 'https://sketchfab.com/3d-models/generic-sedan-car-58c33766470d46e7b2aed542650494e5'
            },
            suv: {
                id: '68341ef7bf3e4f83aa2777bfa2543719',
                name: 'Compact SUV Concept',
                author: 'MaG80',
                url: 'https://sketchfab.com/3d-models/compact-suv-concept-car-68341ef7bf3e4f83aa2777bfa2543719'
            },
            transporter: {
                id: '8c4e2162cea4498395cc5bc8064a6c20',
                name: 'Transporter Van',
                author: 'VIS-All-3D',
                url: 'https://sketchfab.com/3d-models/transporter-van-free-download-8c4e2162cea4498395cc5bc8064a6c20'
            },
            kombi: {
                id: 'aa0becb6e854422596cac6b21bf79787',
                name: '80s Station Wagon',
                author: 'Daniel Zhabotinsky',
                url: 'https://sketchfab.com/3d-models/80s-generic-usa-station-wagon-low-poly-model-aa0becb6e854422596cac6b21bf79787'
            }
        };

        let currentVehicleType = 'sedan';
        let sketchfabClient = null;
        let sketchfabApi = null;
        let nodeMap = {};

        // Mapping von 3D-Node-Namen zu deutschen Teile-Namen
        const NODE_TO_PART_MAPPING = {
            // Allgemeine Begriffe die in verschiedenen Modellen vorkommen können
            'hood': 'Motorhaube',
            'bonnet': 'Motorhaube',
            'motorhaube': 'Motorhaube',
            'bumper_front': 'Stoßfänger vorne',
            'front_bumper': 'Stoßfänger vorne',
            'bumper_rear': 'Stoßfänger hinten',
            'rear_bumper': 'Stoßfänger hinten',
            'door_fl': 'Tür vorne links',
            'door_fr': 'Tür vorne rechts',
            'door_rl': 'Tür hinten links',
            'door_rr': 'Tür hinten rechts',
            'door_front_left': 'Tür vorne links',
            'door_front_right': 'Tür vorne rechts',
            'door_rear_left': 'Tür hinten links',
            'door_rear_right': 'Tür hinten rechts',
            'fender_fl': 'Kotflügel vorne links',
            'fender_fr': 'Kotflügel vorne rechts',
            'fender': 'Kotflügel',
            'trunk': 'Heckklappe',
            'tailgate': 'Heckklappe',
            'roof': 'Dach',
            'body': 'Karosserie',
            'side_left': 'Seitenteil links',
            'side_right': 'Seitenteil rechts',
            'mirror': 'Spiegel',
            'window': 'Scheibe',
            'wheel': 'Rad',
            'tire': 'Reifen'
        };

        function initVehicleDiagram() {
            // Click handlers für alle Fahrzeugteile (2D)
            document.querySelectorAll('.vehicle-part').forEach(part => {
                part.addEventListener('click', (e) => {
                    const partName = e.target.dataset.part;
                    if (partName) {
                        // Neuer Wizard: selectVehiclePartNew statt selectVehiclePart
                        selectVehiclePartNew(partName, e.target);
                    }
                });
            });

            // Schnellsuche initialisieren
            initQuickSearch();

            // Feather Icons für Toggle-Buttons
            feather.replace();

            console.log('✅ Fahrzeug-Diagramm initialisiert');
        }

        // ============================================
        // 🔄 2D/3D VIEW TOGGLE
        // ============================================

        function switchVehicleView(view) {
            const viewList = document.getElementById('vehicleListView');
            const view2D = document.getElementById('vehicle2DView');
            const view3D = document.getElementById('vehicle3DView');
            const viewFoto = document.getElementById('vehicleFotoView');
            const buttons = document.querySelectorAll('.view-toggle-btn');

            // Toggle Buttons aktualisieren
            buttons.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.view === view);
            });

            // Alle Views verstecken
            if (viewList) viewList.style.display = 'none';
            if (view2D) view2D.style.display = 'none';
            if (view3D) view3D.style.display = 'none';
            if (viewFoto) viewFoto.style.display = 'none';

            if (view === 'list') {
                viewList.style.display = 'block';
                // 🆕 Multi-Service Tabs und service-spezifische Teile laden
                renderStep3ServiceTabs();
            } else if (view === '3d') {
                view3D.style.display = 'block';
                // Sketchfab Viewer API initialisieren
                if (!sketchfabClient) {
                    initSketchfabViewerAPI();
                }
            } else if (view === 'foto') {
                viewFoto.style.display = 'block';
                initFotoDropzone();
                // 🆕 Entwurf-Fotos für KI-Analyse anzeigen
                renderEntwurfFotosForKI();
            } else {
                // 2D View
                view2D.style.display = 'flex';
            }

            feather.replace();
        }

        // Rendert die service-spezifischen Teile in Step 3
        // 🆕 Nov 30, 2025: Multi-Select Support
        function renderServiceParts() {
            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];
            const grid = document.getElementById('servicePartsGrid');
            const serviceName = document.getElementById('listServiceName');

            if (!config || !grid) return;

            // Service-Name anzeigen
            if (serviceName) {
                serviceName.textContent = SERVICE_LABELS[serviceArt] || serviceArt;
            }

            // Bereits ausgewählte Teile für diesen Service
            const selectedParts = kalkWizardData.teilePerService?.[serviceArt] || [];

            // Teile-Buttons generieren mit Multi-Select
            grid.innerHTML = config.teile.map(teil => {
                const isSelected = selectedParts.includes(teil);
                return `
                    <button class="service-part-btn ${isSelected ? 'selected' : ''}"
                            onclick="selectServicePart('${teil}', this)">
                        <span class="service-part-btn__icon">${getPartIcon(teil)}</span>
                        <span class="service-part-btn__label">${teil}</span>
                        ${isSelected ? '<span class="service-part-btn__check">✓</span>' : ''}
                    </button>
                `;
            }).join('');

            // Ausgewählte Teile Anzeige aktualisieren
            updateSelectedPartsDisplay();
        }

        // ============================================
        // 🆕 MULTI-SERVICE TABS FÜR STEP 3 (Nov 30, 2025)
        // ============================================

        /**
         * Rendert die Service-Tabs in Step 3 für Multi-Service Aufträge
         * Jeder Service hat seinen eigenen Tab mit service-spezifischen Teilen
         */
        function renderStep3ServiceTabs() {
            const tabsContainer = document.getElementById('step3ServiceTabs');
            const tabsInner = document.getElementById('step3ServiceTabsInner');
            const activeServiceName = document.getElementById('step3ActiveServiceName');

            if (!tabsContainer || !tabsInner) return;

            const services = kalkWizardData.services || [kalkWizardData.serviceArt];
            const isMultiService = kalkWizardData.isMultiService && services.length > 1;

            // Tabs nur bei Multi-Service anzeigen
            if (!isMultiService) {
                tabsContainer.style.display = 'none';
                // Trotzdem Service-Parts rendern für Single-Service
                renderServiceParts();
                return;
            }

            tabsContainer.style.display = 'block';

            // Aktiven Service-Index aus kalkWizardData oder default 0
            if (kalkWizardData.step3ActiveServiceIndex === undefined) {
                kalkWizardData.step3ActiveServiceIndex = 0;
            }

            // Teile pro Service tracken (falls nicht vorhanden)
            if (!kalkWizardData.teilePerService) {
                kalkWizardData.teilePerService = {};
            }

            // Tabs HTML generieren
            tabsInner.innerHTML = services.map((service, index) => {
                const serviceLabel = SERVICE_LABELS[service] || service;
                const isActive = index === kalkWizardData.step3ActiveServiceIndex;
                const teileCount = (kalkWizardData.teilePerService[service] || []).length;

                return `
                    <button class="service-tab ${isActive ? 'active' : ''}"
                            onclick="switchStep3ServiceTab(${index})"
                            data-service="${service}">
                        <span class="service-tab__icon">${getServiceIcon(service)}</span>
                        <span>${serviceLabel}</span>
                        ${teileCount > 0 ? `<span class="service-tab__badge">${teileCount}</span>` : ''}
                    </button>
                `;
            }).join('');

            // Aktiven Service-Namen anzeigen
            const activeService = services[kalkWizardData.step3ActiveServiceIndex];
            if (activeServiceName) {
                activeServiceName.textContent = SERVICE_LABELS[activeService] || activeService;
            }

            // Service-Art für aktiven Tab setzen und Teile rendern
            kalkWizardData.serviceArt = activeService;
            renderServiceParts();

            feather.replace();
        }

        /**
         * Wechselt den aktiven Service-Tab in Step 3
         */
        function switchStep3ServiceTab(index) {
            const services = kalkWizardData.services || [kalkWizardData.serviceArt];

            if (index < 0 || index >= services.length) return;

            // Vorherigen Service-Teile speichern
            const previousService = services[kalkWizardData.step3ActiveServiceIndex];
            if (kalkWizardData.currentPart) {
                // Aktuelles Teil zum vorherigen Service speichern (falls vorhanden)
                if (!kalkWizardData.teilePerService[previousService]) {
                    kalkWizardData.teilePerService[previousService] = [];
                }
                // Nur hinzufügen wenn noch nicht vorhanden
                if (!kalkWizardData.teilePerService[previousService].includes(kalkWizardData.currentPart)) {
                    // Hinweis: Teile werden beim Hinzufügen in Step 4 gespeichert, nicht hier
                }
            }

            // Index aktualisieren
            kalkWizardData.step3ActiveServiceIndex = index;

            // Tabs neu rendern
            renderStep3ServiceTabs();

            // Current Part zurücksetzen
            kalkWizardData.currentPart = null;
            const display = document.getElementById('selectedPartDisplay');
            if (display) display.style.display = 'none';

            // Toast-Feedback
            const newService = services[index];
            showToast(`Service gewechselt: ${SERVICE_LABELS[newService] || newService}`, 'info');
        }

        /**
         * Gibt ein Icon für einen Service zurück
         */
        function getServiceIcon(service) {
            const iconMap = {
                'lackier': '🎨',
                'lackierung': '🎨',
                'versicherung': '📋',
                'dellen': '🔨',
                'glas': '🪟',
                'reifen': '🛞',
                'mechanik': '🔧',
                'pflege': '✨',
                'tuev': '📝',
                'klima': '❄️',
                'folierung': '🎭',
                'steinschutz': '🛡️',
                'werbebeklebung': '📢'
            };
            return iconMap[service] || '📦';
        }

        // Icon für ein Teil basierend auf Namen
        function getPartIcon(teil) {
            const iconMap = {
                // Karosserie
                'Stoßfänger': '🛡️', 'Motorhaube': '🚗', 'Kotflügel': '🚙', 'Tür': '🚪',
                'Seitenwand': '📐', 'Dach': '⬛', 'Heckklappe': '🚗', 'Schweller': '➖',
                'Säule': '🏛️', 'Spiegel': '🪞', 'Rahmen': '🔲', 'Karosserie': '🚗',
                // Glas
                'Frontscheibe': '🪟', 'Heckscheibe': '🪟', 'Seitenscheibe': '🪟',
                'Scheibe': '🪟', 'Panoramadach': '☀️', 'Dreiecksfenster': '🔺',
                // Reifen
                'Reifen': '🛞', 'Felge': '⚙️', 'Ersatzrad': '🛞',
                // Mechanik
                'Motor': '⚡', 'Getriebe': '⚙️', 'Bremsen': '🛑', 'Kupplung': '🔄',
                'Auspuff': '💨', 'Lenkung': '🎮', 'Fahrwerk': '🔧', 'Achse': '🔗',
                'Anlasser': '🔋', 'Lichtmaschine': '💡', 'Batterie': '🔋',
                'Pumpe': '💧', 'Zahnriemen': '➰', 'Keilriemen': '➰',
                // Klima
                'Klimakompressor': '❄️', 'Kondensator': '🌡️', 'Verdampfer': '💨',
                'Trockner': '🌬️', 'Leitungen': '🔗', 'Innenraumfilter': '🌬️',
                // Pflege
                'Außen': '✨', 'Innenraum': '🛋️', 'Motorraum': '🔧',
                'Lack': '🎨', 'Leder': '🪑', 'Kunststoffe': '🧱',
                // TÜV
                'Beleuchtung': '💡', 'Abgasanlage': '💨', 'Elektronik': '⚡',
                // Folierung
                'Fahrzeug komplett': '🚗', 'Seitenflächen': '📐', 'Heck': '🔙',
                'Einstiege': '🚪', 'Dachkanten': '📏', 'Türkanten': '📏',
                // Default
                'default': '📦'
            };

            // Suche nach passendem Icon basierend auf Teilname
            for (const [key, icon] of Object.entries(iconMap)) {
                if (teil.toLowerCase().includes(key.toLowerCase())) {
                    return icon;
                }
            }
            return iconMap.default;
        }

        // Service-Teil auswählen (aus Liste)
        // 🆕 Nov 30, 2025: Multi-Select Support - Mehrere Teile pro Service
        function selectServicePart(partName, element) {
            const currentService = kalkWizardData.serviceArt;

            // teilePerService initialisieren
            if (!kalkWizardData.teilePerService) {
                kalkWizardData.teilePerService = {};
            }
            if (!kalkWizardData.teilePerService[currentService]) {
                kalkWizardData.teilePerService[currentService] = [];
            }

            const serviceParts = kalkWizardData.teilePerService[currentService];

            // Toggle: Teil hinzufügen oder entfernen
            const existingIndex = serviceParts.indexOf(partName);
            if (existingIndex > -1) {
                // Teil entfernen
                serviceParts.splice(existingIndex, 1);
                if (element) element.classList.remove('selected');
                showToast(`Teil "${partName}" entfernt`, 'info');
            } else {
                // Teil hinzufügen
                serviceParts.push(partName);
                if (element) element.classList.add('selected');
                showToast(`Teil "${partName}" hinzugefügt`, 'success');
            }

            // Auch currentPart setzen (für Kompatibilität mit Step 4)
            kalkWizardData.currentPart = serviceParts.length > 0 ? serviceParts[serviceParts.length - 1] : null;

            // Ausgewählte Teile Anzeige aktualisieren
            updateSelectedPartsDisplay();

            // Tabs Badge aktualisieren
            updateStep3TabsBadge();

            // Weiter-Button aktivieren wenn mindestens ein Teil in irgendeinem Service
            updateStep3NextButton();

            feather.replace();
        }

        /**
         * 🆕 Aktualisiert die Anzeige der ausgewählten Teile
         */
        function updateSelectedPartsDisplay() {
            const display = document.getElementById('selectedPartDisplay');
            const nameSpan = document.getElementById('selectedPartName');

            if (!display || !nameSpan) return;

            const currentService = kalkWizardData.serviceArt;
            const serviceParts = kalkWizardData.teilePerService?.[currentService] || [];

            if (serviceParts.length > 0) {
                display.style.display = 'flex';
                if (serviceParts.length === 1) {
                    nameSpan.textContent = serviceParts[0];
                } else {
                    nameSpan.textContent = `${serviceParts.length} Teile ausgewählt`;
                }
            } else {
                display.style.display = 'none';
            }
        }

        /**
         * 🆕 Aktualisiert die Badge-Zahlen in den Service-Tabs
         */
        function updateStep3TabsBadge() {
            const tabs = document.querySelectorAll('#step3ServiceTabsInner .service-tab');
            tabs.forEach(tab => {
                const service = tab.dataset.service;
                const count = (kalkWizardData.teilePerService?.[service] || []).length;
                let badge = tab.querySelector('.service-tab__badge');

                if (count > 0) {
                    if (!badge) {
                        badge = document.createElement('span');
                        badge.className = 'service-tab__badge';
                        tab.appendChild(badge);
                    }
                    badge.textContent = count;
                } else if (badge) {
                    badge.remove();
                }
            });
        }

        /**
         * 🆕 Aktualisiert den Weiter-Button in Step 3
         * Aktiviert wenn mindestens ein Teil in irgendeinem Service ausgewählt ist
         */
        function updateStep3NextButton() {
            const nextBtn = document.getElementById('btnStep3Next');
            if (!nextBtn) return;

            // Zähle alle Teile über alle Services
            let totalParts = 0;
            if (kalkWizardData.teilePerService) {
                for (const service of Object.keys(kalkWizardData.teilePerService)) {
                    totalParts += kalkWizardData.teilePerService[service].length;
                }
            }

            nextBtn.disabled = totalParts === 0;
        }

        /**
         * 🆕 Führt alle Teile aus teilePerService in kalkWizardData.teile zusammen
         * Wird aufgerufen beim Wechsel von Step 3 zu Step 4
         */
        function mergeTeilePerServiceIntoTeile() {
            if (!kalkWizardData.teilePerService) return;

            // Bestehende teile Array leeren (um Duplikate zu vermeiden)
            kalkWizardData.teile = [];

            // Alle Teile aus teilePerService hinzufügen
            for (const [service, parts] of Object.entries(kalkWizardData.teilePerService)) {
                for (const partName of parts) {
                    // Prüfen ob Teil bereits existiert (sollte nicht, aber sicherheitshalber)
                    const exists = kalkWizardData.teile.some(t =>
                        t.teil === partName && t.service === service
                    );

                    if (!exists) {
                        kalkWizardData.teile.push({
                            teil: partName,
                            service: service,
                            serviceLabel: SERVICE_LABELS[service] || service,
                            arbeiten: [], // Wird in Step 4 befüllt
                            addedAt: new Date().toISOString()
                        });
                    }
                }
            }

            console.log('📦 Teile zusammengeführt:', kalkWizardData.teile);

            // Ersten Teil als currentPart setzen für Step 4
            if (kalkWizardData.teile.length > 0) {
                kalkWizardData.currentPart = kalkWizardData.teile[0].teil;
                kalkWizardData.serviceArt = kalkWizardData.teile[0].service;
                kalkWizardData.step4ActivePartIndex = 0;
            }
        }

        /**
         * 🆕 Nov 30, 2025: Rendert die Teile-Tabs in Step 4 für Multi-Service
         * Zeigt alle ausgewählten Teile aus allen Services
         */
        function renderStep4PartsTabs() {
            const overview = document.getElementById('step4PartsOverview');
            const tabsContainer = document.getElementById('step4PartsTabs');
            const countSpan = document.getElementById('step4PartsCount');
            const partDisplay = document.getElementById('step4PartDisplay');
            const serviceDisplay = document.getElementById('step4PartService');

            if (!overview || !tabsContainer) return;

            const teile = kalkWizardData.teile || [];

            // Nur bei mehr als 1 Teil die Übersicht anzeigen
            if (teile.length <= 1) {
                overview.style.display = 'none';
                // Standard-Anzeige für einzelnes Teil
                if (teile.length === 1) {
                    if (partDisplay) partDisplay.textContent = teile[0].teil;
                    if (serviceDisplay) serviceDisplay.textContent = `(${teile[0].serviceLabel || SERVICE_LABELS[teile[0].service] || teile[0].service})`;
                }
                return;
            }

            overview.style.display = 'block';
            if (countSpan) countSpan.textContent = teile.length;

            // Aktiven Index setzen
            if (kalkWizardData.step4ActivePartIndex === undefined) {
                kalkWizardData.step4ActivePartIndex = 0;
            }

            // Tabs generieren
            tabsContainer.innerHTML = teile.map((teil, index) => {
                const isActive = index === kalkWizardData.step4ActivePartIndex;
                const hasArbeiten = teil.arbeiten && teil.arbeiten.length > 0;
                const serviceLabel = teil.serviceLabel || SERVICE_LABELS[teil.service] || teil.service;
                const partIcon = getPartIcon(teil.teil);

                return `
                    <button class="step4-part-tab ${isActive ? 'active' : ''} ${hasArbeiten ? 'completed' : ''}"
                            onclick="switchStep4Part(${index})"
                            data-index="${index}">
                        <span class="step4-part-tab__icon">${partIcon}</span>
                        <span>${teil.teil}</span>
                        <span class="step4-part-tab__service">${serviceLabel}</span>
                        <span class="step4-part-check">✓</span>
                    </button>
                `;
            }).join('');

            // Aktuelles Teil anzeigen
            const currentTeil = teile[kalkWizardData.step4ActivePartIndex];
            if (currentTeil) {
                if (partDisplay) partDisplay.textContent = currentTeil.teil;
                if (serviceDisplay) {
                    const label = currentTeil.serviceLabel || SERVICE_LABELS[currentTeil.service] || currentTeil.service;
                    serviceDisplay.textContent = `(${label})`;
                }
                // serviceArt aktualisieren für die Arbeiten-Auswahl
                kalkWizardData.serviceArt = currentTeil.service;
                kalkWizardData.currentPart = currentTeil.teil;
            }

            feather.replace();
        }

        /**
         * 🆕 Nov 30, 2025: Wechselt das aktive Teil in Step 4
         */
        function switchStep4Part(index) {
            const teile = kalkWizardData.teile || [];
            if (index < 0 || index >= teile.length) return;

            // Vorherige Arbeiten speichern
            saveCurrentPartArbeiten();

            // Index aktualisieren
            kalkWizardData.step4ActivePartIndex = index;

            // UI aktualisieren
            renderStep4PartsTabs();
            renderServiceRepairOptions();

            // Gespeicherte Arbeiten wiederherstellen
            restorePartArbeiten(index);

            // Toast-Feedback
            showToast(`Teil gewechselt: ${teile[index].teil}`, 'info');
        }

        /**
         * 🆕 Speichert die aktuell ausgewählten Arbeiten für das aktive Teil
         */
        function saveCurrentPartArbeiten() {
            const teile = kalkWizardData.teile || [];
            const index = kalkWizardData.step4ActivePartIndex;

            if (index === undefined || index < 0 || index >= teile.length) return;

            const checkedRepairs = document.querySelectorAll('input[name="repair"]:checked');
            const arbeiten = Array.from(checkedRepairs).map(cb => cb.value);

            teile[index].arbeiten = arbeiten;
            console.log(`💾 Arbeiten gespeichert für Teil ${index}:`, arbeiten);
        }

        /**
         * 🆕 Stellt die gespeicherten Arbeiten für ein Teil wieder her
         */
        function restorePartArbeiten(index) {
            const teile = kalkWizardData.teile || [];
            if (index < 0 || index >= teile.length) return;

            const teil = teile[index];
            const arbeiten = teil.arbeiten || [];

            // Alle Checkboxen zurücksetzen
            document.querySelectorAll('input[name="repair"]').forEach(cb => {
                cb.checked = arbeiten.includes(cb.value);
            });

            // Button-Status aktualisieren
            updateRepairSelection();

            console.log(`📥 Arbeiten wiederhergestellt für Teil ${index}:`, arbeiten);
        }

        // Rendert die service-spezifischen Arbeiten in Step 4
        function renderServiceRepairOptions() {
            const serviceArt = kalkWizardData.serviceArt;
            const config = SERVICE_CONFIG[serviceArt];
            const grid = document.getElementById('repairOptionsGrid');

            if (!config || !grid) return;

            // Icons für Arbeiten
            const arbeitIcons = {
                'lackieren': '🎨', 'grundieren': '🖌️', 'spachteln': '🪣', 'schleifen': '📐',
                'polieren': '💎', 'demontieren': '🔧', 'montieren': '🔩', 'austauschen': '🔄',
                'ersetzen': '♻️', // NEU: Teil komplett ersetzen
                'richten': '🔨', 'schweissen': '⚡', 'kleben': '🧴', 'ausbeulen': '🔨',
                'drücken': '👆', 'reparieren': '🔧', 'steinschlag-reparatur': '🪟',
                'kalibrieren': '📡', 'wechseln': '🔄', 'auswuchten': '⚖️',
                'einstellen': '🎚️', 'prüfen': '✅', 'befüllen': '💧', 'desinfizieren': '🧼',
                'reinigen': '🧹', 'waschen': '💦', 'versiegeln': '🛡️', 'aufbereiten': '✨',
                'pflegen': '💖', 'folieren': '📋', 'entfolieren': '❌', 'vorbereiten': '📝',
                'schneiden': '✂️', 'bekleben': '📋', 'entfernen': '🗑️', 'gestalten': '🎨',
                'drucken': '🖨️'
            };

            // Arbeiten-Checkboxen generieren
            grid.innerHTML = config.arbeiten.map(arbeit => `
                <label class="repair-option">
                    <input type="checkbox" name="repair" value="${arbeit}" onchange="updateRepairSelection()">
                    <div class="repair-option__content">
                        <span class="repair-option__icon">${arbeitIcons[arbeit] || '🔧'}</span>
                        <span class="repair-option__label">${arbeit.charAt(0).toUpperCase() + arbeit.slice(1).replace('-', ' ')}</span>
                    </div>
                </label>
            `).join('');

            // Button deaktivieren bis Auswahl getroffen
            const nextBtn = document.getElementById('btnStep4Next');
            if (nextBtn) nextBtn.disabled = true;
        }

        // ============================================
        // 🎮 SKETCHFAB VIEWER API
        // ============================================

        function initSketchfabViewerAPI() {
            const container = document.getElementById('sketchfabApiContainer');
            const modelData = VEHICLE_MODELS[currentVehicleType];

            // Iframe für Viewer API erstellen
            const iframe = document.createElement('iframe');
            iframe.id = 'api-frame';
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.border = 'none';
            iframe.allow = 'autoplay; fullscreen; xr-spatial-tracking';

            // Loading-Spinner entfernen und Iframe einfügen
            const loading = document.getElementById('sketchfabLoading');
            if (loading) loading.style.display = 'block';

            container.appendChild(iframe);

            // Sketchfab Client initialisieren
            sketchfabClient = new Sketchfab(iframe);

            sketchfabClient.init(modelData.id, {
                success: function(api) {
                    sketchfabApi = api;
                    api.start();
                    api.addEventListener('viewerready', function() {
                        console.log('✅ Sketchfab Viewer API bereit');

                        // Loading verstecken
                        if (loading) loading.style.display = 'none';

                        // Klick-Hinweis anzeigen
                        document.getElementById('clickHint').style.display = 'block';

                        // Node Map laden für Teile-Namen
                        api.getNodeMap(function(err, nodes) {
                            if (!err) {
                                nodeMap = nodes;
                                console.log('📋 Node Map geladen:', Object.keys(nodes).length, 'Nodes');
                            }
                        });

                        // Click Event Handler
                        api.addEventListener('click', function(info) {
                            if (info.instanceID) {
                                handleModelClick(info);
                            }
                        }, { pick: 'slow' });

                        feather.replace();
                    });
                },
                error: function() {
                    console.error('❌ Sketchfab Viewer API Fehler');
                    if (loading) {
                        loading.innerHTML = '<p style="color: var(--color-error);">❌ 3D-Modell konnte nicht geladen werden</p>';
                    }
                },
                autostart: 1,
                preload: 1,
                ui_controls: 1,
                ui_infos: 0,
                ui_stop: 0,
                ui_watermark: 0
            });

            // Credit aktualisieren
            updateModelCredit(modelData);
        }

        function handleModelClick(info) {
            // Node-Name aus der Node Map holen
            let nodeName = 'Unbekannt';
            let partName = null;

            // Suche nach dem geklickten Node
            for (const [id, node] of Object.entries(nodeMap)) {
                if (node.instanceID === info.instanceID) {
                    nodeName = node.name || 'Node ' + id;
                    break;
                }
            }

            console.log('🎯 Geklickt auf:', nodeName, '(ID:', info.instanceID, ')');

            // Versuche Node-Namen auf deutsches Teil zu mappen
            const lowerName = nodeName.toLowerCase();
            for (const [key, value] of Object.entries(NODE_TO_PART_MAPPING)) {
                if (lowerName.includes(key)) {
                    partName = value;
                    break;
                }
            }

            // Wenn kein Mapping gefunden, versuche intelligente Erkennung
            if (!partName) {
                partName = guessPartFromNodeName(nodeName);
            }

            // UI aktualisieren
            const clickedInfo = document.getElementById('clickedPartInfo');
            const clickedName = document.getElementById('clickedPartName');

            if (partName) {
                clickedInfo.style.display = 'block';
                clickedName.textContent = partName;
                feather.replace();

                // Nach kurzer Verzögerung Wizard öffnen
                setTimeout(() => {
                    selectedPart = partName;
                    openDamageWizard(partName);
                }, 500);
            } else {
                // Zeige zumindest den Node-Namen
                clickedInfo.style.display = 'block';
                clickedInfo.style.background = 'var(--color-warning-bg)';
                clickedInfo.style.borderColor = 'var(--color-warning)';
                clickedName.textContent = nodeName + ' (nicht zugeordnet)';
                feather.replace();
            }
        }

        function guessPartFromNodeName(name) {
            const lower = name.toLowerCase();

            // Intelligente Erkennung basierend auf Schlüsselwörtern
            if (lower.includes('tür') || lower.includes('door')) {
                if (lower.includes('vorne') || lower.includes('front') || lower.includes('fl') || lower.includes('fr')) {
                    if (lower.includes('links') || lower.includes('left') || lower.includes('fl') || lower.includes('_l')) {
                        return 'Tür vorne links';
                    } else if (lower.includes('rechts') || lower.includes('right') || lower.includes('fr') || lower.includes('_r')) {
                        return 'Tür vorne rechts';
                    }
                    return 'Tür vorne';
                } else if (lower.includes('hinten') || lower.includes('rear') || lower.includes('rl') || lower.includes('rr')) {
                    if (lower.includes('links') || lower.includes('left') || lower.includes('rl') || lower.includes('_l')) {
                        return 'Tür hinten links';
                    } else if (lower.includes('rechts') || lower.includes('right') || lower.includes('rr') || lower.includes('_r')) {
                        return 'Tür hinten rechts';
                    }
                    return 'Tür hinten';
                }
                return 'Tür';
            }

            if (lower.includes('stoß') || lower.includes('bumper')) {
                if (lower.includes('vorne') || lower.includes('front')) return 'Stoßfänger vorne';
                if (lower.includes('hinten') || lower.includes('rear')) return 'Stoßfänger hinten';
                return 'Stoßfänger';
            }

            if (lower.includes('motorhaube') || lower.includes('hood') || lower.includes('bonnet')) return 'Motorhaube';
            if (lower.includes('kotflügel') || lower.includes('fender') || lower.includes('wing')) return 'Kotflügel';
            if (lower.includes('dach') || lower.includes('roof')) return 'Dach';
            if (lower.includes('heck') || lower.includes('trunk') || lower.includes('tailgate') || lower.includes('boot')) return 'Heckklappe';
            if (lower.includes('spiegel') || lower.includes('mirror')) return 'Spiegel';
            if (lower.includes('schweller') || lower.includes('sill') || lower.includes('rocker')) return 'Schweller';
            if (lower.includes('seite') || lower.includes('side')) {
                if (lower.includes('links') || lower.includes('left')) return 'Seitenteil links';
                if (lower.includes('rechts') || lower.includes('right')) return 'Seitenteil rechts';
                return 'Seitenteil';
            }

            return null;
        }

        // ============================================
        // 🚙 FAHRZEUGTYP WECHSELN
        // ============================================

        function changeVehicleType(type) {
            if (type === currentVehicleType) return;

            currentVehicleType = type;

            // Buttons aktualisieren
            document.querySelectorAll('.vehicle-type-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.type === type);
            });

            // Viewer neu laden
            const container = document.getElementById('sketchfabApiContainer');
            const existingFrame = document.getElementById('api-frame');
            if (existingFrame) {
                existingFrame.remove();
            }

            // Loading wieder anzeigen
            const loading = document.getElementById('sketchfabLoading');
            if (loading) {
                loading.style.display = 'block';
                loading.innerHTML = `
                    <div class="spinner" style="width: 40px; height: 40px; border: 3px solid var(--color-border); border-top-color: var(--color-primary); border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 10px;"></div>
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">3D-Modell wird geladen...</p>
                `;
            }

            // Klick-Info zurücksetzen
            document.getElementById('clickedPartInfo').style.display = 'none';
            document.getElementById('clickHint').style.display = 'none';

            // Sketchfab Client zurücksetzen
            sketchfabClient = null;
            sketchfabApi = null;
            nodeMap = {};

            // Neuen Viewer initialisieren
            initSketchfabViewerAPI();

            console.log('🔄 Fahrzeugtyp gewechselt zu:', type);
        }

        function updateModelCredit(modelData) {
            const link = document.getElementById('modelLink');
            const author = document.getElementById('modelAuthor');

            if (link) {
                link.href = modelData.url;
                link.textContent = modelData.name;
            }
            if (author) {
                author.textContent = modelData.author;
            }
        }

        // ============================================
        // 🤖 KI-MODELL DROPDOWN
        // ============================================

        function toggleAIDropdown() {
            const dropdown = document.getElementById('aiDropdown');
            if (dropdown) {
                const isVisible = dropdown.style.display === 'block';
                dropdown.style.display = isVisible ? 'none' : 'block';
            }
        }

        // Dropdown schließen wenn außerhalb geklickt wird
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('aiDropdown');
            const aiBtn = event.target.closest('.ai-btn');

            if (dropdown && !aiBtn && !event.target.closest('.ai-dropdown-content')) {
                dropdown.style.display = 'none';
            }
        });

        // ============================================
        // 🔍 OE-NUMMERN ERSATZTEILE-SUCHE
        // ============================================

        let oeSearchTimeout = null;

        function initOeSearch() {
            // Prüfe ob ERSATZTEILE_DB verfügbar ist
            const oeSearchStats = document.getElementById('oeSearchStats');
            if (typeof ERSATZTEILE_DB === 'undefined') {
                console.error('❌ ERSATZTEILE_DB nicht geladen');
                if (oeSearchStats) oeSearchStats.textContent = 'Datenbank nicht verfügbar';
                return;
            }

            // Statistiken anzeigen
            const stats = ERSATZTEILE_DB.getStatistiken();
            if (oeSearchStats) {
                oeSearchStats.textContent =
                    `${stats.marken} Marken | ${stats.modelle} Modelle | ${stats.oeNummern} OE-Nummern`;
            }

            // Marken-Dropdown befüllen
            const markeSelect = document.getElementById('oeMarkeSelect');
            if (markeSelect) {
                markeSelect.innerHTML = '<option value="">Alle Marken</option>';

                Object.keys(ERSATZTEILE_DB.marken).sort().forEach(markenKey => {
                    const marke = ERSATZTEILE_DB.marken[markenKey];
                    const option = document.createElement('option');
                    option.value = markenKey;
                    option.textContent = marke.name;
                    markeSelect.appendChild(option);
                });
            }

            console.log('✅ OE-Suche initialisiert:', stats);
        }

        function updateOeModelle() {
            const markeSelect = document.getElementById('oeMarkeSelect');
            const modellSelect = document.getElementById('oeModellSelect');
            if (!markeSelect || !modellSelect) return;

            const markeKey = markeSelect.value;
            modellSelect.innerHTML = '<option value="">Alle Modelle</option>';

            if (markeKey && ERSATZTEILE_DB?.marken?.[markeKey]) {
                const marke = ERSATZTEILE_DB.marken[markeKey];
                Object.keys(marke.modelle).sort().forEach(modellKey => {
                    const modell = marke.modelle[modellKey];
                    const option = document.createElement('option');
                    option.value = modellKey;
                    option.textContent = `${modell.name} (${modell.baujahre})`;
                    modellSelect.appendChild(option);
                });
            }

            performOeSearch();
        }

        function performOeSearch() {
            // Debounce für Performance
            clearTimeout(oeSearchTimeout);
            oeSearchTimeout = setTimeout(() => {
                executeOeSearch();
            }, 200);
        }

        function executeOeSearch() {
            const searchInputEl = document.getElementById('oeSearchInput');
            const markeSelectEl = document.getElementById('oeMarkeSelect');
            const modellSelectEl = document.getElementById('oeModellSelect');
            const resultsContainer = document.getElementById('oeResults');

            // Falls DOM-Elemente nicht existieren, abbrechen
            if (!resultsContainer) return;

            const searchInput = searchInputEl?.value?.trim() || '';
            const markeKey = markeSelectEl?.value || '';
            const modellKey = modellSelectEl?.value || '';

            // Keine Suche wenn kein Input
            if (!searchInput && !markeKey) {
                resultsContainer.innerHTML = `
                    <div class="oe-no-results">
                        <span style="font-size: 2rem;">🔍</span>
                        <p>Geben Sie eine OE-Nummer oder einen Teilenamen ein</p>
                    </div>
                `;
                return;
            }

            let ergebnisse = [];

            // Suche nach OE-Nummer
            if (searchInput.length >= 2) {
                // Versuche OE-Nummer-Suche
                const oeResults = ERSATZTEILE_DB.sucheNachOeNummer(searchInput);
                // Auch Namenssuche
                const nameResults = ERSATZTEILE_DB.sucheNachName(searchInput);

                // Kombinieren und Duplikate entfernen
                const combined = [...oeResults];
                nameResults.forEach(nr => {
                    const exists = combined.some(or =>
                        or.marke === nr.marke && or.modell === nr.modell && or.teil === nr.teil
                    );
                    if (!exists) combined.push(nr);
                });
                ergebnisse = combined;
            }

            // Fahrzeug-spezifische Suche
            if (markeKey) {
                const fahrzeugTeile = ERSATZTEILE_DB.getTeileNachFahrzeug(
                    ERSATZTEILE_DB.marken[markeKey].name,
                    modellKey ? ERSATZTEILE_DB.marken[markeKey].modelle[modellKey]?.name : null
                );

                if (searchInput.length >= 2) {
                    // Filter bereits gefundene Ergebnisse nach Fahrzeug
                    ergebnisse = ergebnisse.filter(e =>
                        e.marke === ERSATZTEILE_DB.marken[markeKey].name &&
                        (!modellKey || e.modell === ERSATZTEILE_DB.marken[markeKey].modelle[modellKey]?.name)
                    );
                } else {
                    // Zeige alle Teile des Fahrzeugs
                    ergebnisse = fahrzeugTeile;
                }
            }

            // Ergebnisse anzeigen
            if (ergebnisse.length === 0) {
                resultsContainer.innerHTML = `
                    <div class="oe-no-results">
                        <span style="font-size: 2rem;">😔</span>
                        <p>Keine Ergebnisse gefunden</p>
                        <small>Versuchen Sie einen anderen Suchbegriff</small>
                    </div>
                `;
                return;
            }

            // Maximal 50 Ergebnisse anzeigen
            const displayResults = ergebnisse.slice(0, 50);

            resultsContainer.innerHTML = displayResults.map(result => `
                <div class="oe-result-item" onclick="selectOeResult(this, '${escapeHtml(result.teil)}', '${result.oe_nummer}', '${escapeHtml(result.marke)} ${escapeHtml(result.modell)}')">
                    <div class="oe-result-info">
                        <div class="oe-result-part">${result.teil}</div>
                        <div class="oe-result-vehicle">${result.marke} ${result.modell} (${result.baujahre || 'diverse'})</div>
                    </div>
                    <div class="oe-result-oe">${result.oe_nummer}</div>
                </div>
            `).join('');

            if (ergebnisse.length > 50) {
                resultsContainer.innerHTML += `
                    <div style="text-align: center; padding: var(--space-3); color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        ... und ${ergebnisse.length - 50} weitere Ergebnisse
                    </div>
                `;
            }
        }

        function escapeHtml(text) {
            if (!text) return '';
            return text.replace(/[&<>"']/g, function(m) {
                return {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#39;'
                }[m];
            });
        }

        function selectOeResult(element, teileName, oeNummer, fahrzeug) {
            // Markiere als ausgewählt
            document.querySelectorAll('.oe-result-item').forEach(item => {
                item.style.borderColor = 'var(--color-border)';
                item.style.background = 'var(--color-background)';
            });
            element.style.borderColor = 'var(--color-success)';
            element.style.background = 'rgba(52, 199, 89, 0.1)';

            // Erstelle Material-Position mit OE-Nummer
            const materialName = `${teileName} (OE: ${oeNummer}) - ${fahrzeug}`;

            // Füge als Material hinzu
            addMaterialWithOe(materialName, oeNummer);

            // Feedback
            showToast(`✅ ${teileName} hinzugefügt`, 'success');
        }

        function addMaterialWithOe(name, oeNummer) {
            const newMaterial = {
                name: name,
                kategorie: 'Ersatzteile',
                menge: 1,
                einheit: 'Stück',
                einkaufspreis: 0, // Preis manuell eintragen
                verkaufspreis: 0, // Preis manuell eintragen
                oeNummer: oeNummer
            };

            materialien.push(newMaterial);
            renderMaterialien();
            berechneGesamtsumme();
        }

        // ============================================
        // 🎯 3D PART SELECTION (Button-Fallback)
        // ============================================

        function select3DPart(partName) {
            // Vorherige Auswahl entfernen
            document.querySelectorAll('.part-btn-3d').forEach(btn => {
                btn.classList.remove('selected');
            });

            // Aktiven Button markieren
            if (event && event.target) {
                event.target.classList.add('selected');
            }

            // Wizard öffnen (gleiche Funktion wie 2D)
            selectedPart = partName;
            openDamageWizard(partName);
        }

        function selectVehiclePart(partName, element) {
            // Vorherige Auswahl entfernen
            document.querySelectorAll('.vehicle-part.selected').forEach(p => {
                p.classList.remove('selected');
            });

            // Neue Auswahl markieren
            element.classList.add('selected');
            selectedPart = partName;

            // Wizard öffnen
            openDamageWizard(partName);
        }

        function openDamageWizard(partName) {
            selectedDamageType = null;
            selectedDamageSize = null;

            // Titel setzen
            document.getElementById('wizardPartName').textContent = partName;

            // Schritte zurücksetzen
            document.getElementById('wizardStep1').style.display = 'block';
            document.getElementById('wizardStep2').style.display = 'none';
            document.getElementById('suggestedPositions').style.display = 'none';

            // Options zurücksetzen
            document.querySelectorAll('.damage-option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Wizard anzeigen
            document.getElementById('damageWizard').classList.add('active');
            feather.replace();
        }

        function closeDamageWizard() {
            document.getElementById('damageWizard').classList.remove('active');

            // Auswahl im Diagramm entfernen
            document.querySelectorAll('.vehicle-part.selected').forEach(p => {
                p.classList.remove('selected');
            });

            selectedPart = null;
            selectedDamageType = null;
            selectedDamageSize = null;
        }

        function selectDamageType(element) {
            // Vorherige Auswahl entfernen
            document.querySelectorAll('#damageTypeOptions .damage-option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Neue Auswahl
            element.classList.add('selected');
            selectedDamageType = element.dataset.type;

            // Zu Schritt 2 wechseln
            document.getElementById('wizardStep1').style.display = 'none';
            document.getElementById('wizardStep2').style.display = 'block';
        }

        function selectDamageSize(element) {
            // Vorherige Auswahl entfernen
            document.querySelectorAll('#damageSizeOptions .damage-option').forEach(opt => {
                opt.classList.remove('selected');
            });

            // Neue Auswahl
            element.classList.add('selected');
            selectedDamageSize = element.dataset.size;

            // Vorschläge generieren und anzeigen
            generateSuggestions();
        }

        function generateSuggestions() {
            suggestedItems = [];

            const mapping = partWorkMapping[selectedPart];
            if (!mapping) {
                console.warn('Kein Mapping für:', selectedPart);
                return;
            }

            const keywords = mapping[selectedDamageType] || [];

            // Passende Positionen aus dem Katalog finden
            keywords.forEach(keyword => {
                // Größe berücksichtigen bei Spot-Repair, Delle, Spachteln
                let searchKeyword = keyword;
                if (keyword === 'Spot-Repair') {
                    searchKeyword = sizeMapping[selectedDamageSize]?.spotRepair || 'Spot-Repair M';
                } else if (keyword.includes('Delle ausbeulen')) {
                    searchKeyword = 'Delle ausbeulen ' + (sizeMapping[selectedDamageSize]?.delle || 'PDR M');
                } else if (keyword === 'Spachteln') {
                    searchKeyword = sizeMapping[selectedDamageSize]?.spachteln || 'Spachteln mittel';
                }

                // Im Katalog suchen
                const matches = katalogData.filter(item =>
                    item.name.toLowerCase().includes(searchKeyword.toLowerCase())
                );

                if (matches.length > 0) {
                    // Beste Übereinstimmung nehmen
                    const bestMatch = matches[0];
                    if (!suggestedItems.find(s => s.id === bestMatch.id)) {
                        suggestedItems.push({
                            ...bestMatch,
                            added: false
                        });
                    }
                }
            });

            // Vorschläge anzeigen
            renderSuggestions();
        }

        function renderSuggestions() {
            const container = document.getElementById('suggestedList');

            if (suggestedItems.length === 0) {
                container.innerHTML = `
                    <p style="color: var(--color-text-secondary); font-size: var(--font-size-sm);">
                        Keine passenden Positionen im Katalog gefunden.
                        <a href="?tab=katalog" style="color: var(--color-primary);">Katalog erweitern</a>
                    </p>
                `;
            } else {
                container.innerHTML = suggestedItems.map((item, index) => {
                    const preis = calculatePositionPreis(item);
                    return `
                        <div class="suggested-item ${item.added ? 'added' : ''}"
                             onclick="toggleSuggestedItem(${index})">
                            <div class="suggested-item__info">
                                <div class="suggested-item__checkbox">
                                    ${item.added ? '<i data-feather="check" style="width: 14px; height: 14px;"></i>' : ''}
                                </div>
                                <span class="suggested-item__name">${item.name}</span>
                            </div>
                            <span class="suggested-item__price">${item.arbeitswerte} AW / ${preis.toFixed(2)} €</span>
                        </div>
                    `;
                }).join('');
            }

            // Vorschläge-Section anzeigen
            document.getElementById('suggestedPositions').style.display = 'block';
            feather.replace();
        }

        function toggleSuggestedItem(index) {
            const item = suggestedItems[index];
            item.added = !item.added;

            if (item.added) {
                // Zur Kalkulation hinzufügen
                addPositionToKalkulation(item);
            } else {
                // Aus Kalkulation entfernen
                removePositionFromKalkulation(item.id);
            }

            renderSuggestions();
        }

        function addAllSuggested() {
            suggestedItems.forEach(item => {
                if (!item.added) {
                    item.added = true;
                    addPositionToKalkulation(item);
                }
            });

            renderSuggestions();
            showToast(`${suggestedItems.length} Positionen hinzugefügt`, 'success');

            // Bauteil als beschädigt markieren
            const selectedElement = document.querySelector('.vehicle-part.selected');
            if (selectedElement) {
                selectedElement.classList.remove('selected');
                selectedElement.classList.add('damaged-medium');
            }
        }

        function addPositionToKalkulation(item) {
            // Prüfen ob bereits vorhanden
            if (aktuelleKalkulation.positionen.find(p => p.katalogId === item.id)) {
                return;
            }

            aktuelleKalkulation.positionen.push({
                katalogId: item.id,
                name: item.name,
                kategorie: item.kategorie,
                arbeitswerte: item.arbeitswerte,
                anzahl: 1,
                preis: calculatePositionPreis(item)
            });

            renderPositionen();
            calculateSumme();

            // Kalkulation-Content anzeigen
            document.getElementById('kalkulationContent').style.display = 'block';
            document.getElementById('freieKalkulationStart').style.display = 'none';
        }

        function removePositionFromKalkulation(katalogId) {
            aktuelleKalkulation.positionen = aktuelleKalkulation.positionen.filter(
                p => p.katalogId !== katalogId
            );
            renderPositionen();
            calculateSumme();
        }

        function calculatePositionPreis(item) {
            // Stundensatz basierend auf Kategorie
            let stundensatz = kalkulationSaetze.stundensatzSonstige;
            if (item.kategorie === 'Lackierung') {
                stundensatz = kalkulationSaetze.stundensatzLack;
            } else if (item.kategorie === 'Karosserie') {
                stundensatz = kalkulationSaetze.stundensatzKarosserie;
            } else if (item.kategorie === 'Mechanik') {
                stundensatz = kalkulationSaetze.stundensatzMechanik;
            }

            // AW → Stunden → Euro
            const stunden = (item.arbeitswerte * kalkulationSaetze.awInMinuten) / 60;
            return stunden * stundensatz;
        }

        // ============================================
        // 🔍 SCHNELLSUCHE FUNKTIONEN
        // ============================================

        function initQuickSearch() {
            const input = document.getElementById('quickSearchInput');
            const results = document.getElementById('quickSearchResults');

            if (!input || !results) return;

            let debounceTimer;

            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const query = input.value.trim().toLowerCase();

                    if (query.length < 2) {
                        results.classList.remove('active');
                        return;
                    }

                    const matches = katalogData.filter(item =>
                        item.name.toLowerCase().includes(query) ||
                        (item.kategorie && item.kategorie.toLowerCase().includes(query))
                    ).slice(0, 10);

                    if (matches.length === 0) {
                        results.innerHTML = `
                            <div class="quick-search__result" style="color: var(--color-text-secondary);">
                                Keine Ergebnisse für "${query}"
                            </div>
                        `;
                    } else {
                        results.innerHTML = matches.map(item => {
                            const highlightedName = item.name.replace(
                                new RegExp(`(${query})`, 'gi'),
                                '<mark>$1</mark>'
                            );
                            const preis = calculatePositionPreis(item);
                            return `
                                <div class="quick-search__result" onclick="addFromQuickSearch('${item.id}')">
                                    <span class="quick-search__result-name">${highlightedName}</span>
                                    <span class="quick-search__result-meta">${item.arbeitswerte} AW · ${preis.toFixed(2)} €</span>
                                </div>
                            `;
                        }).join('');
                    }

                    results.classList.add('active');
                }, 200);
            });

            // Schließen bei Klick außerhalb
            document.addEventListener('click', (e) => {
                if (!input.contains(e.target) && !results.contains(e.target)) {
                    results.classList.remove('active');
                }
            });

            // Enter-Taste
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    const firstResult = results.querySelector('.quick-search__result');
                    if (firstResult) {
                        firstResult.click();
                    }
                }
            });
        }

        function addFromQuickSearch(itemId) {
            const item = katalogData.find(k => k.id === itemId);
            if (item) {
                addPositionToKalkulation(item);
                showToast(`"${item.name}" hinzugefügt`, 'success');

                // Suche zurücksetzen
                const searchInput = document.getElementById('quickSearchInput');
                const searchResults = document.getElementById('quickSearchResults');
                if (searchInput) searchInput.value = '';
                if (searchResults) searchResults.classList.remove('active');
            }
        }

        // ============================================
        // TAB NAVIGATION
        // ============================================

        function switchTab(tabId) {
            // Update buttons
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                }
            });

            // Update content
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`tab-${tabId}`).classList.add('active');

            // Update URL without reload
            const url = new URL(window.location);
            url.searchParams.set('tab', tabId);
            window.history.replaceState({}, '', url);

            // Load data for specific tabs
            if (tabId === 'historie') {
                loadHistorie();
            }
        }

        // ============================================
        // STUNDENSÄTZE (TAB 3)
        // ============================================

        async function loadSaetze() {
            try {
                const doc = await window.getCollection('kalkulation_saetze').doc('config').get();
                if (doc.exists) {
                    kalkulationSaetze = { ...kalkulationSaetze, ...doc.data() };

                    // Update form fields (with null checks)
                    const lackEl = document.getElementById('stundensatzLack');
                    const karosserieEl = document.getElementById('stundensatzKarosserie');
                    const mechanikEl = document.getElementById('stundensatzMechanik');
                    const sonstigeEl = document.getElementById('stundensatzSonstige');
                    const awEl = document.getElementById('awInMinuten');
                    const mwstEl = document.getElementById('mwstSatz');
                    if (lackEl) lackEl.value = kalkulationSaetze.stundensatzLack;
                    if (karosserieEl) karosserieEl.value = kalkulationSaetze.stundensatzKarosserie;
                    if (mechanikEl) mechanikEl.value = kalkulationSaetze.stundensatzMechanik;
                    if (sonstigeEl) sonstigeEl.value = kalkulationSaetze.stundensatzSonstige;
                    if (awEl) awEl.value = kalkulationSaetze.awInMinuten;
                    if (mwstEl) mwstEl.value = kalkulationSaetze.mwstSatz;

                    console.log('✅ Stundensätze geladen');
                }
            } catch (error) {
                console.warn('⚠️ Stundensätze nicht gefunden, verwende Standardwerte');
            }
        }

        async function saveSaetze(event) {
            event.preventDefault();

            const btn = document.getElementById('saveSaetzeBtn');
            btn.disabled = true;
            btn.innerHTML = '<i data-feather="loader"></i> Speichert...';
            feather.replace();

            try {
                kalkulationSaetze = {
                    stundensatzLack: parseFloat(document.getElementById('stundensatzLack')?.value) || 95,
                    stundensatzKarosserie: parseFloat(document.getElementById('stundensatzKarosserie')?.value) || 85,
                    stundensatzMechanik: parseFloat(document.getElementById('stundensatzMechanik')?.value) || 75,
                    stundensatzSonstige: parseFloat(document.getElementById('stundensatzSonstige')?.value) || 65,
                    awInMinuten: parseInt(document.getElementById('awInMinuten')?.value) || 5,
                    mwstSatz: parseFloat(document.getElementById('mwstSatz')?.value) || 19,
                    updatedAt: new Date().toISOString()
                };

                await window.getCollection('kalkulation_saetze').doc('config').set(kalkulationSaetze);

                showToast('Einstellungen gespeichert!', 'success');
                console.log('✅ Stundensätze gespeichert:', kalkulationSaetze);

            } catch (error) {
                console.error('❌ Fehler beim Speichern:', error);
                showToast('Fehler beim Speichern', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i data-feather="save"></i> Einstellungen speichern';
                feather.replace();
            }
        }

        // ============================================
        // ARBEITSWERT-KATALOG (TAB 2)
        // ============================================

        async function loadKatalog() {
            try {
                const snapshot = await window.getCollection('kalkulation_katalog')
                    .orderBy('kategorie')
                    .orderBy('name')
                    .get();

                katalogData = [];
                snapshot.forEach(doc => {
                    katalogData.push({ id: doc.id, ...doc.data() });
                });

                renderKatalog();
                console.log(`✅ ${katalogData.length} Katalog-Einträge geladen`);
            } catch (error) {
                console.warn('⚠️ Katalog nicht gefunden:', error);
            }
        }

        function renderKatalog() {
            const container = document.getElementById('katalogListe');

            if (katalogData.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="book-open"></i>
                        <h3>Katalog leer</h3>
                        <p>Erstellen Sie Ihren ersten Arbeitswert-Eintrag</p>
                        <button class="btn btn-primary" onclick="seedKatalog()">
                            <i data-feather="download"></i>
                            Standard-Katalog laden
                        </button>
                    </div>
                `;
                feather.replace();
                return;
            }

            // Group by category
            const grouped = {};
            katalogData.forEach(item => {
                const kat = item.kategorie || 'Sonstiges';
                if (!grouped[kat]) grouped[kat] = [];
                grouped[kat].push(item);
            });

            let html = '';
            Object.keys(grouped).sort().forEach(kategorie => {
                const items = grouped[kategorie];
                html += `
                    <div class="category-group">
                        <div class="category-header">
                            <h3>${kategorie}</h3>
                            <span class="count">${items.length}</span>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Bezeichnung</th>
                                    <th>AW</th>
                                    <th>Zeit</th>
                                    <th>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => `
                                    <tr>
                                        <td>${item.name}</td>
                                        <td>${item.arbeitswerte} AW</td>
                                        <td>~${Math.round(item.arbeitswerte * kalkulationSaetze.awInMinuten)} Min</td>
                                        <td class="actions">
                                            <button class="btn btn-icon btn-secondary" onclick="editKatalogPosition('${item.id}')" title="Bearbeiten">
                                                <i data-feather="edit-2"></i>
                                            </button>
                                            <button class="btn btn-icon btn-secondary" onclick="deleteKatalogPosition('${item.id}')" title="Löschen" style="color: var(--color-error);">
                                                <i data-feather="trash-2"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            container.innerHTML = html;
            feather.replace();
        }

        function filterKatalog() {
            const search = document.getElementById('katalogSearch').value.toLowerCase();
            const filter = document.getElementById('katalogFilter').value;

            // TODO: Implement filtering
            console.log('Filter:', search, filter);
        }

        function openKatalogModal(positionId = null) {
            document.getElementById('katalogModalTitle').textContent = positionId ? 'Position bearbeiten' : 'Neue Position';
            document.getElementById('katalogPositionId').value = positionId || '';
            document.getElementById('katalogForm').reset();

            if (positionId) {
                const position = katalogData.find(p => p.id === positionId);
                if (position) {
                    document.getElementById('positionName').value = position.name || '';
                    document.getElementById('positionKategorie').value = position.kategorie || '';
                    document.getElementById('positionAW').value = position.arbeitswerte || '';
                    document.getElementById('positionBeschreibung').value = position.beschreibung || '';
                }
            }

            document.getElementById('katalogModal').classList.add('active');
            feather.replace();
        }

        function editKatalogPosition(positionId) {
            openKatalogModal(positionId);
        }

        async function saveKatalogPosition(event) {
            event.preventDefault();

            const positionId = document.getElementById('katalogPositionId').value;
            const data = {
                name: document.getElementById('positionName').value.trim(),
                kategorie: document.getElementById('positionKategorie').value,
                arbeitswerte: parseFloat(document.getElementById('positionAW').value) || 0,
                beschreibung: document.getElementById('positionBeschreibung').value.trim(),
                updatedAt: new Date().toISOString()
            };

            try {
                if (positionId) {
                    await window.getCollection('kalkulation_katalog').doc(positionId).update(data);
                    showToast('Position aktualisiert', 'success');
                } else {
                    data.createdAt = new Date().toISOString();
                    await window.getCollection('kalkulation_katalog').add(data);
                    showToast('Position erstellt', 'success');
                }

                closeModal('katalogModal');
                await loadKatalog();

            } catch (error) {
                console.error('❌ Fehler:', error);
                showToast('Fehler beim Speichern', 'error');
            }
        }

        async function deleteKatalogPosition(positionId) {
            if (!confirm('Position wirklich löschen?')) return;

            try {
                await window.getCollection('kalkulation_katalog').doc(positionId).delete();
                showToast('Position gelöscht', 'success');
                await loadKatalog();
            } catch (error) {
                console.error('❌ Fehler:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }

        async function seedKatalog() {
            // ============================================
            // 🏭 UMFANGREICHER ARBEITSWERT-KATALOG
            // Basierend auf DAT/Audatex Branchenstandards 2024
            // 1 AW = 5 Minuten (Branchenstandard)
            // Quellen: DEKRA, ZKF, Carrosserie Suisse
            // ============================================
            const SEED_DATA = [
                // ================================================
                // DEMONTAGE/MONTAGE - STOSSF ÄNGER
                // ================================================
                { name: "Stoßfänger vorne dem./mont.", kategorie: "Karosserie", arbeitswerte: 8.5 },
                { name: "Stoßfänger vorne mit Sensoren dem./mont.", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Stoßfänger hinten dem./mont.", kategorie: "Karosserie", arbeitswerte: 7.0 },
                { name: "Stoßfänger hinten mit Sensoren dem./mont.", kategorie: "Karosserie", arbeitswerte: 10.0 },
                { name: "PDC-Sensoren kalibrieren", kategorie: "Karosserie", arbeitswerte: 4.0 },

                // ================================================
                // DEMONTAGE/MONTAGE - AUSSENHAUT
                // ================================================
                { name: "Kotflügel vorne dem./mont.", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Kotflügel vorne Aluminium dem./mont.", kategorie: "Karosserie", arbeitswerte: 15.0 },
                { name: "Motorhaube dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Motorhaube mit Dämmung dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Tür vorne dem./mont.", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Tür hinten dem./mont.", kategorie: "Karosserie", arbeitswerte: 7.0 },
                { name: "Türverkleidung dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Heckklappe dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Heckklappe Kombi mit Scheibenheizung dem./mont.", kategorie: "Karosserie", arbeitswerte: 10.0 },
                { name: "Kofferraumdeckel Limousine dem./mont.", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Seitenspiegel dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Seitenspiegel elektrisch dem./mont.", kategorie: "Karosserie", arbeitswerte: 3.5 },
                { name: "Seitenspiegel mit Kamera dem./mont.", kategorie: "Karosserie", arbeitswerte: 5.0 },

                // ================================================
                // DEMONTAGE/MONTAGE - VERGLASUNG
                // ================================================
                { name: "Frontscheibe dem./mont.", kategorie: "Karosserie", arbeitswerte: 18.0 },
                { name: "Frontscheibe mit Kamera (ADAS) dem./mont.", kategorie: "Karosserie", arbeitswerte: 24.0 },
                { name: "Heckscheibe dem./mont.", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Heckscheibe mit Heizung dem./mont.", kategorie: "Karosserie", arbeitswerte: 15.0 },
                { name: "Seitenscheibe vorne dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Seitenscheibe hinten dem./mont.", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Dreiecksfenster dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "ADAS-Kalibrierung nach Scheibenwechsel", kategorie: "Karosserie", arbeitswerte: 12.0 },

                // ================================================
                // DEMONTAGE/MONTAGE - ANBAUTEILE
                // ================================================
                { name: "Scheinwerfer dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Scheinwerfer LED/Xenon dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Scheinwerfer Matrix-LED dem./mont.", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Rückleuchte dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Rückleuchte LED dem./mont.", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Kühlergrill dem./mont.", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Kühlergrill mit Kamera/Radar dem./mont.", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Schweller-Verkleidung dem./mont.", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Radlaufverkleidung dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Unterbodenverkleidung dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Spoiler vorne dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Spoiler hinten dem./mont.", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Dachspoiler dem./mont.", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Dachträger dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Dachantenne dem./mont.", kategorie: "Karosserie", arbeitswerte: 1.5 },
                { name: "Tankdeckel dem./mont.", kategorie: "Karosserie", arbeitswerte: 1.0 },
                { name: "Zierleisten Fenster dem./mont.", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Zierleisten Stoßfänger dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Türgriff außen dem./mont.", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Nummernschildhalter dem./mont.", kategorie: "Karosserie", arbeitswerte: 0.5 },

                // ================================================
                // LACKIERUNG - EINZELTEILE
                // ================================================
                { name: "Stoßfänger vorne lackieren", kategorie: "Lackierung", arbeitswerte: 10.0 },
                { name: "Stoßfänger hinten lackieren", kategorie: "Lackierung", arbeitswerte: 9.0 },
                { name: "Kotflügel vorne lackieren", kategorie: "Lackierung", arbeitswerte: 10.0 },
                { name: "Motorhaube lackieren", kategorie: "Lackierung", arbeitswerte: 12.0 },
                { name: "Tür lackieren", kategorie: "Lackierung", arbeitswerte: 11.0 },
                { name: "Heckklappe lackieren", kategorie: "Lackierung", arbeitswerte: 11.0 },
                { name: "Kofferraumdeckel lackieren", kategorie: "Lackierung", arbeitswerte: 10.0 },
                { name: "Dach lackieren", kategorie: "Lackierung", arbeitswerte: 14.0 },
                { name: "Seitenteil lackieren", kategorie: "Lackierung", arbeitswerte: 12.0 },
                { name: "A-Säule lackieren", kategorie: "Lackierung", arbeitswerte: 6.0 },
                { name: "B-Säule lackieren", kategorie: "Lackierung", arbeitswerte: 5.0 },
                { name: "C-Säule lackieren", kategorie: "Lackierung", arbeitswerte: 5.0 },
                { name: "Schweller lackieren", kategorie: "Lackierung", arbeitswerte: 8.0 },
                { name: "Spiegel lackieren (pro Stück)", kategorie: "Lackierung", arbeitswerte: 3.0 },
                { name: "Spoiler lackieren", kategorie: "Lackierung", arbeitswerte: 6.0 },
                { name: "Tankdeckel lackieren", kategorie: "Lackierung", arbeitswerte: 2.0 },
                { name: "Türgriff lackieren (pro Stück)", kategorie: "Lackierung", arbeitswerte: 1.5 },

                // ================================================
                // LACKIERUNG - SPOT-REPAIR / SMART-REPAIR
                // ================================================
                { name: "Spot-Repair XS (bis 3cm)", kategorie: "Lackierung", arbeitswerte: 4.0 },
                { name: "Spot-Repair S (bis 5cm)", kategorie: "Lackierung", arbeitswerte: 5.0 },
                { name: "Spot-Repair M (bis 10cm)", kategorie: "Lackierung", arbeitswerte: 6.0 },
                { name: "Spot-Repair L (bis 15cm)", kategorie: "Lackierung", arbeitswerte: 8.0 },
                { name: "Spot-Repair XL (bis 20cm)", kategorie: "Lackierung", arbeitswerte: 10.0 },
                { name: "Steinschlag-Reparatur (pro Stelle)", kategorie: "Lackierung", arbeitswerte: 1.0 },
                { name: "Kratzer-Politur (pro Panel)", kategorie: "Lackierung", arbeitswerte: 2.0 },
                { name: "Lackreinigung vor Lackierung", kategorie: "Lackierung", arbeitswerte: 2.0 },

                // ================================================
                // LACKIERUNG - LACKAUFBAU
                // ================================================
                { name: "Grundierung auftragen (pro Teil)", kategorie: "Lackierung", arbeitswerte: 4.0 },
                { name: "Füller auftragen (pro Teil)", kategorie: "Lackierung", arbeitswerte: 4.0 },
                { name: "Füller schleifen (pro Teil)", kategorie: "Lackierung", arbeitswerte: 3.0 },
                { name: "Basislack auftragen (pro Teil)", kategorie: "Lackierung", arbeitswerte: 5.0 },
                { name: "Klarlack auftragen (pro Teil)", kategorie: "Lackierung", arbeitswerte: 4.0 },
                { name: "2-Schicht Metallic-Lackierung (pro Teil)", kategorie: "Lackierung", arbeitswerte: 10.0 },
                { name: "3-Schicht Perleffekt-Lackierung (pro Teil)", kategorie: "Lackierung", arbeitswerte: 14.0 },
                { name: "Mattlack-Lackierung (pro Teil)", kategorie: "Lackierung", arbeitswerte: 12.0 },
                { name: "Sonderlackierung (Effektlack)", kategorie: "Lackierung", arbeitswerte: 16.0 },
                { name: "Farbton mischen nach Farbcode", kategorie: "Lackierung", arbeitswerte: 3.0 },
                { name: "Farbton einmessen (Spectrophotometer)", kategorie: "Lackierung", arbeitswerte: 2.0 },

                // ================================================
                // LACKIERUNG - KOMPLETT
                // ================================================
                { name: "Komplettlackierung Kleinwagen", kategorie: "Lackierung", arbeitswerte: 80.0 },
                { name: "Komplettlackierung Kompaktklasse", kategorie: "Lackierung", arbeitswerte: 100.0 },
                { name: "Komplettlackierung Mittelklasse", kategorie: "Lackierung", arbeitswerte: 120.0 },
                { name: "Komplettlackierung Oberklasse/SUV", kategorie: "Lackierung", arbeitswerte: 140.0 },
                { name: "Komplettlackierung Transporter", kategorie: "Lackierung", arbeitswerte: 160.0 },
                { name: "Teillackierung (3-5 Teile)", kategorie: "Lackierung", arbeitswerte: 40.0 },
                { name: "Teillackierung (6-10 Teile)", kategorie: "Lackierung", arbeitswerte: 70.0 },

                // ================================================
                // KAROSSERIEARBEITEN - AUSBEULEN
                // ================================================
                { name: "Delle ausbeulen PDR XS (bis 1cm)", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Delle ausbeulen PDR S (bis 2cm)", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Delle ausbeulen PDR M (bis 5cm)", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Delle ausbeulen PDR L (bis 10cm)", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Delle ausbeulen PDR XL (über 10cm)", kategorie: "Karosserie", arbeitswerte: 18.0 },
                { name: "Hagelschaden PDR pro Delle", kategorie: "Karosserie", arbeitswerte: 2.0 },
                { name: "Hagelschaden Pauschale Kleinwagen", kategorie: "Karosserie", arbeitswerte: 60.0 },
                { name: "Hagelschaden Pauschale Mittelklasse", kategorie: "Karosserie", arbeitswerte: 80.0 },
                { name: "Hagelschaden Pauschale SUV/Kombi", kategorie: "Karosserie", arbeitswerte: 100.0 },
                { name: "Ausbeulen konventionell (pro Teil)", kategorie: "Karosserie", arbeitswerte: 15.0 },
                { name: "Ausziehen mit Spotter", kategorie: "Karosserie", arbeitswerte: 10.0 },

                // ================================================
                // KAROSSERIEARBEITEN - SPACHTELN
                // ================================================
                { name: "Spachteln klein (bis 5cm)", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Spachteln mittel (bis 15cm)", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Spachteln groß (bis 30cm)", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Spachteln sehr groß (über 30cm)", kategorie: "Karosserie", arbeitswerte: 18.0 },
                { name: "Glasfaserspachtel auftragen", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Kunststoffspachteln", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Feinspachteln", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Schleifen vor Lackierung", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Nassschleifen (pro Teil)", kategorie: "Karosserie", arbeitswerte: 3.0 },

                // ================================================
                // KAROSSERIEARBEITEN - SCHWEISSEN/KLEBEN
                // ================================================
                { name: "Schweißnaht kurz (bis 10cm)", kategorie: "Karosserie", arbeitswerte: 4.0 },
                { name: "Schweißnaht mittel (bis 30cm)", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Schweißnaht lang (über 30cm)", kategorie: "Karosserie", arbeitswerte: 12.0 },
                { name: "Punktschweißen (pro Punkt)", kategorie: "Karosserie", arbeitswerte: 0.5 },
                { name: "Kunststoffschweißen", kategorie: "Karosserie", arbeitswerte: 8.0 },
                { name: "Klebereparatur Kunststoff", kategorie: "Karosserie", arbeitswerte: 6.0 },
                { name: "Strukturkleben", kategorie: "Karosserie", arbeitswerte: 5.0 },
                { name: "Hohlraumversiegelung (pro Hohlraum)", kategorie: "Karosserie", arbeitswerte: 3.0 },
                { name: "Unterbodenschutz auftragen", kategorie: "Karosserie", arbeitswerte: 10.0 },
                { name: "Nahtabdichtung", kategorie: "Karosserie", arbeitswerte: 4.0 },

                // ================================================
                // KAROSSERIEARBEITEN - TEILEERSATZ
                // ================================================
                { name: "Kotflügel einschweißen", kategorie: "Karosserie", arbeitswerte: 40.0 },
                { name: "Seitenteil ersetzen (geschweißt)", kategorie: "Karosserie", arbeitswerte: 60.0 },
                { name: "Schweller ersetzen (komplett)", kategorie: "Karosserie", arbeitswerte: 50.0 },
                { name: "Schweller Teilersatz", kategorie: "Karosserie", arbeitswerte: 30.0 },
                { name: "A-Säule ersetzen", kategorie: "Karosserie", arbeitswerte: 45.0 },
                { name: "B-Säule ersetzen", kategorie: "Karosserie", arbeitswerte: 50.0 },
                { name: "Radhaus ersetzen", kategorie: "Karosserie", arbeitswerte: 35.0 },
                { name: "Längsträgerteil ersetzen", kategorie: "Karosserie", arbeitswerte: 55.0 },
                { name: "Rückwand ersetzen", kategorie: "Karosserie", arbeitswerte: 45.0 },
                { name: "Bodenblech Teilersatz", kategorie: "Karosserie", arbeitswerte: 40.0 },

                // ================================================
                // MECHANIK - FAHRWERK
                // ================================================
                { name: "Stoßdämpfer vorne wechseln (pro Seite)", kategorie: "Mechanik", arbeitswerte: 8.0 },
                { name: "Stoßdämpfer hinten wechseln (pro Seite)", kategorie: "Mechanik", arbeitswerte: 6.0 },
                { name: "Federbein komplett wechseln", kategorie: "Mechanik", arbeitswerte: 10.0 },
                { name: "Traggelenk wechseln", kategorie: "Mechanik", arbeitswerte: 6.0 },
                { name: "Querlenker wechseln", kategorie: "Mechanik", arbeitswerte: 8.0 },
                { name: "Spurstangenkopf wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Stabilisator wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Koppelstange wechseln", kategorie: "Mechanik", arbeitswerte: 2.0 },
                { name: "Achsvermessung", kategorie: "Mechanik", arbeitswerte: 6.0 },
                { name: "Spureinstellung", kategorie: "Mechanik", arbeitswerte: 4.0 },

                // ================================================
                // MECHANIK - BREMSEN
                // ================================================
                { name: "Bremsbeläge vorne wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Bremsbeläge hinten wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Bremsscheiben vorne wechseln", kategorie: "Mechanik", arbeitswerte: 6.0 },
                { name: "Bremsscheiben hinten wechseln", kategorie: "Mechanik", arbeitswerte: 5.0 },
                { name: "Bremssattel wechseln", kategorie: "Mechanik", arbeitswerte: 5.0 },
                { name: "Bremsleitung erneuern", kategorie: "Mechanik", arbeitswerte: 6.0 },
                { name: "Bremsflüssigkeit wechseln", kategorie: "Mechanik", arbeitswerte: 3.0 },
                { name: "Handbremse einstellen", kategorie: "Mechanik", arbeitswerte: 2.0 },

                // ================================================
                // MECHANIK - BELEUCHTUNG
                // ================================================
                { name: "Scheinwerfer einstellen", kategorie: "Mechanik", arbeitswerte: 2.0 },
                { name: "Scheinwerfer-Leuchtmittel wechseln", kategorie: "Mechanik", arbeitswerte: 1.0 },
                { name: "Xenon-Brenner wechseln", kategorie: "Mechanik", arbeitswerte: 2.0 },
                { name: "LED-Scheinwerfer-Modul wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Rückleuchte Leuchtmittel wechseln", kategorie: "Mechanik", arbeitswerte: 0.5 },
                { name: "Kennzeichenbeleuchtung wechseln", kategorie: "Mechanik", arbeitswerte: 0.5 },

                // ================================================
                // MECHANIK - KÜHLUNG/KLIMA
                // ================================================
                { name: "Kühler wechseln", kategorie: "Mechanik", arbeitswerte: 10.0 },
                { name: "Kühlerschlauch wechseln", kategorie: "Mechanik", arbeitswerte: 3.0 },
                { name: "Thermostat wechseln", kategorie: "Mechanik", arbeitswerte: 4.0 },
                { name: "Klimakondensator wechseln", kategorie: "Mechanik", arbeitswerte: 12.0 },
                { name: "Klimaservice (Befüllung)", kategorie: "Mechanik", arbeitswerte: 3.0 },
                { name: "Klimaleitung wechseln", kategorie: "Mechanik", arbeitswerte: 6.0 },

                // ================================================
                // SONSTIGES - REINIGUNG
                // ================================================
                { name: "Fahrzeug waschen", kategorie: "Sonstiges", arbeitswerte: 2.0 },
                { name: "Fahrzeug waschen & trocknen", kategorie: "Sonstiges", arbeitswerte: 3.0 },
                { name: "Fahrzeug waschen & aufbereiten", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Innenreinigung Standard", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Innenreinigung intensiv", kategorie: "Sonstiges", arbeitswerte: 8.0 },
                { name: "Lederreinigung & Pflege", kategorie: "Sonstiges", arbeitswerte: 6.0 },
                { name: "Motorwäsche", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Felgenreinigung (4 Stück)", kategorie: "Sonstiges", arbeitswerte: 2.0 },

                // ================================================
                // SONSTIGES - POLIEREN
                // ================================================
                { name: "Polieren 1-Stufen (Fahrzeug komplett)", kategorie: "Sonstiges", arbeitswerte: 16.0 },
                { name: "Polieren 2-Stufen (Fahrzeug komplett)", kategorie: "Sonstiges", arbeitswerte: 24.0 },
                { name: "Polieren 3-Stufen (Fahrzeug komplett)", kategorie: "Sonstiges", arbeitswerte: 32.0 },
                { name: "Polieren Einzelteil", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Scheinwerfer polieren (Paar)", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Versiegelung auftragen", kategorie: "Sonstiges", arbeitswerte: 6.0 },
                { name: "Keramikversiegelung", kategorie: "Sonstiges", arbeitswerte: 16.0 },

                // ================================================
                // SONSTIGES - DIVERSES
                // ================================================
                { name: "Fahrzeug auf Hebebühne", kategorie: "Sonstiges", arbeitswerte: 1.0 },
                { name: "Fahrzeug abkleben für Lackierung", kategorie: "Sonstiges", arbeitswerte: 8.0 },
                { name: "Fahrzeug komplett abkleben", kategorie: "Sonstiges", arbeitswerte: 12.0 },
                { name: "Folie entfernen (pro Teil)", kategorie: "Sonstiges", arbeitswerte: 4.0 },
                { name: "Aufkleber/Beschriftung entfernen", kategorie: "Sonstiges", arbeitswerte: 3.0 },
                { name: "Steinschlagschutzfolie montieren", kategorie: "Sonstiges", arbeitswerte: 8.0 },
                { name: "Probefahrt & Endkontrolle", kategorie: "Sonstiges", arbeitswerte: 2.0 },
                { name: "Dokumentation & Fotodokumentation", kategorie: "Sonstiges", arbeitswerte: 2.0 },
                { name: "Vor- und Nachbereitung Werkzeuge", kategorie: "Sonstiges", arbeitswerte: 6.0 },
            ];

            try {
                const batch = window.db.batch();
                const collectionRef = window.getCollection('kalkulation_katalog');

                SEED_DATA.forEach(item => {
                    const docRef = collectionRef.doc();
                    batch.set(docRef, {
                        ...item,
                        createdAt: new Date().toISOString()
                    });
                });

                await batch.commit();
                showToast(`${SEED_DATA.length} Positionen geladen`, 'success');
                await loadKatalog();

            } catch (error) {
                console.error('❌ Fehler beim Laden des Standard-Katalogs:', error);
                showToast('Fehler beim Laden', 'error');
            }
        }

        // ============================================
        // MATERIAL-KATALOG (TAB 4)
        // ============================================

        async function loadMaterial() {
            try {
                const snapshot = await window.getCollection('kalkulation_material')
                    .orderBy('kategorie')
                    .orderBy('name')
                    .get();

                materialData = [];
                snapshot.forEach(doc => {
                    materialData.push({ id: doc.id, ...doc.data() });
                });

                renderMaterialKatalog();
                console.log(`✅ ${materialData.length} Material-Einträge geladen`);
            } catch (error) {
                console.warn('⚠️ Material nicht gefunden:', error);
            }
        }

        function renderMaterialKatalog() {
            const container = document.getElementById('materialKatalogListe');

            if (materialData.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="package"></i>
                        <h3>Material-Katalog leer</h3>
                        <p>Erstellen Sie Ihren ersten Material-Eintrag</p>
                        <button class="btn btn-primary" onclick="seedMaterial()">
                            <i data-feather="download"></i>
                            Standard-Material laden
                        </button>
                    </div>
                `;
                feather.replace();
                return;
            }

            // Group by category
            const grouped = {};
            materialData.forEach(item => {
                const kat = item.kategorie || 'Sonstiges';
                if (!grouped[kat]) grouped[kat] = [];
                grouped[kat].push(item);
            });

            let html = '';
            Object.keys(grouped).sort().forEach(kategorie => {
                const items = grouped[kategorie];
                html += `
                    <div class="category-group">
                        <div class="category-header">
                            <h3>${kategorie}</h3>
                            <span class="count">${items.length}</span>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Bezeichnung</th>
                                    <th>EK</th>
                                    <th>VK</th>
                                    <th>Marge</th>
                                    <th>Einheit</th>
                                    <th>Aktionen</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${items.map(item => {
                                    const marge = item.einkaufspreis > 0
                                        ? Math.round(((item.verkaufspreis - item.einkaufspreis) / item.einkaufspreis) * 100)
                                        : '-';
                                    return `
                                        <tr>
                                            <td>${item.name}</td>
                                            <td>${item.einkaufspreis ? item.einkaufspreis.toFixed(2) + ' €' : '-'}</td>
                                            <td>${item.verkaufspreis.toFixed(2)} €</td>
                                            <td>${marge}%</td>
                                            <td>${item.einheit || 'Stück'}</td>
                                            <td class="actions">
                                                <button class="btn btn-icon btn-secondary" onclick="editMaterialPosition('${item.id}')" title="Bearbeiten">
                                                    <i data-feather="edit-2"></i>
                                                </button>
                                                <button class="btn btn-icon btn-secondary" onclick="deleteMaterialPosition('${item.id}')" title="Löschen" style="color: var(--color-error);">
                                                    <i data-feather="trash-2"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            });

            container.innerHTML = html;
            feather.replace();
        }

        function openMaterialKatalogModal(positionId = null) {
            document.getElementById('materialModalTitle').textContent = positionId ? 'Material bearbeiten' : 'Neues Material';
            document.getElementById('materialPositionId').value = positionId || '';
            document.getElementById('materialForm').reset();

            if (positionId) {
                const item = materialData.find(p => p.id === positionId);
                if (item) {
                    document.getElementById('materialName').value = item.name || '';
                    document.getElementById('materialKategorie').value = item.kategorie || '';
                    document.getElementById('materialEK').value = item.einkaufspreis || '';
                    document.getElementById('materialVK').value = item.verkaufspreis || '';
                    document.getElementById('materialEinheit').value = item.einheit || 'Stück';
                }
            }

            document.getElementById('materialKatalogModal').classList.add('active');
            feather.replace();
        }

        function editMaterialPosition(positionId) {
            openMaterialKatalogModal(positionId);
        }

        async function saveMaterialPosition(event) {
            event.preventDefault();

            const positionId = document.getElementById('materialPositionId').value;
            const data = {
                name: document.getElementById('materialName').value.trim(),
                kategorie: document.getElementById('materialKategorie').value,
                einkaufspreis: parseFloat(document.getElementById('materialEK').value) || 0,
                verkaufspreis: parseFloat(document.getElementById('materialVK').value) || 0,
                einheit: document.getElementById('materialEinheit').value,
                updatedAt: new Date().toISOString()
            };

            try {
                if (positionId) {
                    await window.getCollection('kalkulation_material').doc(positionId).update(data);
                    showToast('Material aktualisiert', 'success');
                } else {
                    data.createdAt = new Date().toISOString();
                    await window.getCollection('kalkulation_material').add(data);
                    showToast('Material erstellt', 'success');
                }

                closeModal('materialKatalogModal');
                await loadMaterial();

            } catch (error) {
                console.error('❌ Fehler:', error);
                showToast('Fehler beim Speichern', 'error');
            }
        }

        async function deleteMaterialPosition(positionId) {
            if (!confirm('Material wirklich löschen?')) return;

            try {
                await window.getCollection('kalkulation_material').doc(positionId).delete();
                showToast('Material gelöscht', 'success');
                await loadMaterial();
            } catch (error) {
                console.error('❌ Fehler:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }

        async function seedMaterial() {
            // ============================================
            // 🎨 UMFANGREICHER MATERIAL-KATALOG
            // Basierend auf Marktpreisen 2024 (Standox, Spies Hecker, Glasurit, Mipa)
            // EK = Einkaufspreis (Händlerpreis), VK = Verkaufspreis (Endkundenpreis)
            // Quellen: lackcolor.de, autolack-burmeister.shop, carross.eu
            // ============================================
            const SEED_DATA = [
                // ================================================
                // LACKMATERIAL - GRUNDIERUNG / PRIMER
                // ================================================
                { name: "Haftgrund 1K (1L)", kategorie: "Lackmaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Liter" },
                { name: "Füllgrund 2K (1L)", kategorie: "Lackmaterial", einkaufspreis: 28.00, verkaufspreis: 52.00, einheit: "Liter" },
                { name: "Wash-Primer (1L)", kategorie: "Lackmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Liter" },
                { name: "Kunststoff-Primer (1L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "Liter" },
                { name: "Aluminium-Primer (1L)", kategorie: "Lackmaterial", einkaufspreis: 35.00, verkaufspreis: 65.00, einheit: "Liter" },
                { name: "Zinkstaubgrund (1L)", kategorie: "Lackmaterial", einkaufspreis: 28.00, verkaufspreis: 52.00, einheit: "Liter" },
                { name: "Epoxy-Grundierung 2K (1L)", kategorie: "Lackmaterial", einkaufspreis: 38.00, verkaufspreis: 72.00, einheit: "Liter" },
                { name: "Grundierung grau RAL 7035 (1L)", kategorie: "Lackmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Liter" },

                // ================================================
                // LACKMATERIAL - FÜLLER
                // ================================================
                { name: "2K-HS-Füller grau (1L)", kategorie: "Lackmaterial", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Liter" },
                { name: "2K-HS-Füller weiß (1L)", kategorie: "Lackmaterial", einkaufspreis: 26.00, verkaufspreis: 50.00, einheit: "Liter" },
                { name: "2K-HS-Füller schwarz (1L)", kategorie: "Lackmaterial", einkaufspreis: 26.00, verkaufspreis: 50.00, einheit: "Liter" },
                { name: "Nass-in-Nass Füller (1L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "Liter" },
                { name: "Expressfüller (1L)", kategorie: "Lackmaterial", einkaufspreis: 35.00, verkaufspreis: 65.00, einheit: "Liter" },
                { name: "UV-Füller (200ml)", kategorie: "Lackmaterial", einkaufspreis: 42.00, verkaufspreis: 78.00, einheit: "Stück" },
                { name: "Spritzfüller grau Spraydose (400ml)", kategorie: "Lackmaterial", einkaufspreis: 8.50, verkaufspreis: 16.00, einheit: "Stück" },

                // ================================================
                // LACKMATERIAL - BASISLACK
                // ================================================
                { name: "Basislack Uni nach Farbcode (1L)", kategorie: "Lackmaterial", einkaufspreis: 45.00, verkaufspreis: 89.00, einheit: "Liter" },
                { name: "Basislack Metallic nach Farbcode (1L)", kategorie: "Lackmaterial", einkaufspreis: 55.00, verkaufspreis: 105.00, einheit: "Liter" },
                { name: "Basislack Perleffekt nach Farbcode (1L)", kategorie: "Lackmaterial", einkaufspreis: 65.00, verkaufspreis: 125.00, einheit: "Liter" },
                { name: "Basislack Sonderfarbe (1L)", kategorie: "Lackmaterial", einkaufspreis: 85.00, verkaufspreis: 165.00, einheit: "Liter" },
                { name: "Basislack Schwarz uni (1L)", kategorie: "Lackmaterial", einkaufspreis: 38.00, verkaufspreis: 72.00, einheit: "Liter" },
                { name: "Basislack Weiß uni (1L)", kategorie: "Lackmaterial", einkaufspreis: 38.00, verkaufspreis: 72.00, einheit: "Liter" },
                { name: "Basislack Silber metallic (1L)", kategorie: "Lackmaterial", einkaufspreis: 48.00, verkaufspreis: 92.00, einheit: "Liter" },
                { name: "Mittellack Perllack 3-Schicht (1L)", kategorie: "Lackmaterial", einkaufspreis: 75.00, verkaufspreis: 145.00, einheit: "Liter" },
                { name: "Basislack-Verdünnung (1L)", kategorie: "Lackmaterial", einkaufspreis: 12.00, verkaufspreis: 24.00, einheit: "Liter" },

                // ================================================
                // LACKMATERIAL - KLARLACK (Standox/Spies Hecker Niveau)
                // ================================================
                { name: "2K-HS-Klarlack Standard (1L)", kategorie: "Lackmaterial", einkaufspreis: 35.00, verkaufspreis: 68.00, einheit: "Liter" },
                { name: "2K-HS-Klarlack Premium (1L)", kategorie: "Lackmaterial", einkaufspreis: 48.00, verkaufspreis: 92.00, einheit: "Liter" },
                { name: "2K-MS-Klarlack (1L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 62.00, einheit: "Liter" },
                { name: "Klarlack matt 2K (1L)", kategorie: "Lackmaterial", einkaufspreis: 52.00, verkaufspreis: 98.00, einheit: "Liter" },
                { name: "Klarlack seidenmatt 2K (1L)", kategorie: "Lackmaterial", einkaufspreis: 48.00, verkaufspreis: 92.00, einheit: "Liter" },
                { name: "Schnellklarlack Express (1L)", kategorie: "Lackmaterial", einkaufspreis: 42.00, verkaufspreis: 82.00, einheit: "Liter" },
                { name: "Scratch-Resistant Klarlack (1L)", kategorie: "Lackmaterial", einkaufspreis: 58.00, verkaufspreis: 112.00, einheit: "Liter" },
                { name: "UV-Klarlack (200ml)", kategorie: "Lackmaterial", einkaufspreis: 48.00, verkaufspreis: 92.00, einheit: "Stück" },
                { name: "Klarlack Spraydose (400ml)", kategorie: "Lackmaterial", einkaufspreis: 9.50, verkaufspreis: 18.00, einheit: "Stück" },

                // ================================================
                // LACKMATERIAL - HÄRTER
                // ================================================
                { name: "Härter Standard (0.5L)", kategorie: "Lackmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Liter" },
                { name: "Härter Standard (1L)", kategorie: "Lackmaterial", einkaufspreis: 28.00, verkaufspreis: 52.00, einheit: "Liter" },
                { name: "Härter schnell (0.5L)", kategorie: "Lackmaterial", einkaufspreis: 18.00, verkaufspreis: 34.00, einheit: "Liter" },
                { name: "Härter schnell (1L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 62.00, einheit: "Liter" },
                { name: "Härter langsam (0.5L)", kategorie: "Lackmaterial", einkaufspreis: 18.00, verkaufspreis: 34.00, einheit: "Liter" },
                { name: "Härter langsam (1L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 62.00, einheit: "Liter" },
                { name: "Füller-Härter (0.5L)", kategorie: "Lackmaterial", einkaufspreis: 14.00, verkaufspreis: 26.00, einheit: "Liter" },
                { name: "Epoxy-Härter (0.5L)", kategorie: "Lackmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Liter" },

                // ================================================
                // LACKMATERIAL - VERDÜNNUNG
                // ================================================
                { name: "Acrylverdünnung normal (1L)", kategorie: "Lackmaterial", einkaufspreis: 10.00, verkaufspreis: 19.00, einheit: "Liter" },
                { name: "Acrylverdünnung normal (5L)", kategorie: "Lackmaterial", einkaufspreis: 42.00, verkaufspreis: 78.00, einheit: "Stück" },
                { name: "Acrylverdünnung schnell (1L)", kategorie: "Lackmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Liter" },
                { name: "Acrylverdünnung langsam (1L)", kategorie: "Lackmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Liter" },
                { name: "Nitroverdünnung (1L)", kategorie: "Lackmaterial", einkaufspreis: 6.00, verkaufspreis: 12.00, einheit: "Liter" },
                { name: "Nitroverdünnung (5L)", kategorie: "Lackmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Stück" },
                { name: "Universalverdünnung (1L)", kategorie: "Lackmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Liter" },

                // ================================================
                // LACKMATERIAL - ADDITIVE
                // ================================================
                { name: "Antikraterzusatz (250ml)", kategorie: "Lackmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Stück" },
                { name: "Silikonentferner (1L)", kategorie: "Lackmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Liter" },
                { name: "Silikonentferner (5L)", kategorie: "Lackmaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "Stück" },
                { name: "Antistatikmittel (500ml)", kategorie: "Lackmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Stück" },
                { name: "Verlaufsmittel (250ml)", kategorie: "Lackmaterial", einkaufspreis: 18.00, verkaufspreis: 34.00, einheit: "Stück" },
                { name: "Trocknungsbeschleuniger (250ml)", kategorie: "Lackmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Stück" },
                { name: "Elastifizierungsmittel (500ml)", kategorie: "Lackmaterial", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Stück" },

                // ================================================
                // SPACHTELMASSE
                // ================================================
                { name: "Universalspachtel (1kg)", kategorie: "Spachtelmasse", einkaufspreis: 8.00, verkaufspreis: 16.00, einheit: "kg" },
                { name: "Universalspachtel (2kg)", kategorie: "Spachtelmasse", einkaufspreis: 14.00, verkaufspreis: 28.00, einheit: "kg" },
                { name: "Feinspachtel (500g)", kategorie: "Spachtelmasse", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Feinspachtel (1kg)", kategorie: "Spachtelmasse", einkaufspreis: 12.00, verkaufspreis: 24.00, einheit: "kg" },
                { name: "Glasfaserspachtel (500g)", kategorie: "Spachtelmasse", einkaufspreis: 12.00, verkaufspreis: 24.00, einheit: "Stück" },
                { name: "Glasfaserspachtel (1kg)", kategorie: "Spachtelmasse", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "kg" },
                { name: "Aluminiumspachtel (500g)", kategorie: "Spachtelmasse", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Stück" },
                { name: "Kunststoffspachtel (500g)", kategorie: "Spachtelmasse", einkaufspreis: 14.00, verkaufspreis: 26.00, einheit: "Stück" },
                { name: "Spritzspachtel (1L)", kategorie: "Spachtelmasse", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Liter" },
                { name: "Nitro-Spritzspachtel (1L)", kategorie: "Spachtelmasse", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Liter" },
                { name: "Spachtelhärter (25g Tube)", kategorie: "Spachtelmasse", einkaufspreis: 2.50, verkaufspreis: 5.00, einheit: "Stück" },
                { name: "Spachtelhärter (100g)", kategorie: "Spachtelmasse", einkaufspreis: 6.00, verkaufspreis: 12.00, einheit: "Stück" },

                // ================================================
                // SCHLEIFMATERIAL
                // ================================================
                { name: "Schleifpapier P80 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Schleifpapier P120 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Schleifpapier P180 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Schleifpapier P240 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Schleifpapier P320 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 14.00, verkaufspreis: 26.00, einheit: "Set" },
                { name: "Schleifpapier P400 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 14.00, verkaufspreis: 26.00, einheit: "Set" },
                { name: "Schleifpapier P600 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Set" },
                { name: "Schleifpapier P800 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Set" },
                { name: "Nassschleifpapier P1000 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 16.00, verkaufspreis: 30.00, einheit: "Set" },
                { name: "Nassschleifpapier P1200 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 16.00, verkaufspreis: 30.00, einheit: "Set" },
                { name: "Nassschleifpapier P1500 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 18.00, verkaufspreis: 34.00, einheit: "Set" },
                { name: "Nassschleifpapier P2000 (50 Blatt)", kategorie: "Schleifmaterial", einkaufspreis: 18.00, verkaufspreis: 34.00, einheit: "Set" },
                { name: "Schleifscheiben P80 (50 Stk)", kategorie: "Schleifmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Set" },
                { name: "Schleifscheiben P180 (50 Stk)", kategorie: "Schleifmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Set" },
                { name: "Schleifscheiben P320 (50 Stk)", kategorie: "Schleifmaterial", einkaufspreis: 24.00, verkaufspreis: 45.00, einheit: "Set" },
                { name: "Schleifscheiben P500 (50 Stk)", kategorie: "Schleifmaterial", einkaufspreis: 26.00, verkaufspreis: 48.00, einheit: "Set" },
                { name: "Schleifvlies grau (fein)", kategorie: "Schleifmaterial", einkaufspreis: 2.50, verkaufspreis: 5.00, einheit: "Stück" },
                { name: "Schleifvlies rot (mittel)", kategorie: "Schleifmaterial", einkaufspreis: 2.50, verkaufspreis: 5.00, einheit: "Stück" },
                { name: "Schleifvlies grün (grob)", kategorie: "Schleifmaterial", einkaufspreis: 2.50, verkaufspreis: 5.00, einheit: "Stück" },
                { name: "Schleifschwamm fein", kategorie: "Schleifmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Schleifschwamm mittel", kategorie: "Schleifmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Schleifblock Hand", kategorie: "Schleifmaterial", einkaufspreis: 5.00, verkaufspreis: 10.00, einheit: "Stück" },

                // ================================================
                // ABDECKMATERIAL
                // ================================================
                { name: "Abdeckpapier 60cm x 300m", kategorie: "Abdeckmaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Rolle" },
                { name: "Abdeckpapier 90cm x 300m", kategorie: "Abdeckmaterial", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Rolle" },
                { name: "Abdeckpapier 120cm x 300m", kategorie: "Abdeckmaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "Rolle" },
                { name: "Abdeckfolie 4m x 150m", kategorie: "Abdeckmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Rolle" },
                { name: "Abdeckfolie 5m x 150m", kategorie: "Abdeckmaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Rolle" },
                { name: "Abklebeband 18mm x 50m", kategorie: "Abdeckmaterial", einkaufspreis: 2.80, verkaufspreis: 5.50, einheit: "Stück" },
                { name: "Abklebeband 24mm x 50m", kategorie: "Abdeckmaterial", einkaufspreis: 3.20, verkaufspreis: 6.00, einheit: "Stück" },
                { name: "Abklebeband 36mm x 50m", kategorie: "Abdeckmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Abklebeband 48mm x 50m", kategorie: "Abdeckmaterial", einkaufspreis: 5.00, verkaufspreis: 10.00, einheit: "Stück" },
                { name: "Feinlinienband 3mm x 55m", kategorie: "Abdeckmaterial", einkaufspreis: 4.50, verkaufspreis: 9.00, einheit: "Stück" },
                { name: "Feinlinienband 6mm x 55m", kategorie: "Abdeckmaterial", einkaufspreis: 5.00, verkaufspreis: 10.00, einheit: "Stück" },
                { name: "Kantenschutzband", kategorie: "Abdeckmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Schaumstoffband 13mm", kategorie: "Abdeckmaterial", einkaufspreis: 6.00, verkaufspreis: 12.00, einheit: "Stück" },
                { name: "Radabdeckung (4 Stk Set)", kategorie: "Abdeckmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Spiegelabdeckung (2 Stk)", kategorie: "Abdeckmaterial", einkaufspreis: 3.00, verkaufspreis: 6.00, einheit: "Set" },
                { name: "Türgriffabdeckung (4 Stk)", kategorie: "Abdeckmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Set" },

                // ================================================
                // POLIERMATERIAL
                // ================================================
                { name: "Polierpaste grob (1kg)", kategorie: "Poliermaterial", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "kg" },
                { name: "Polierpaste mittel (1kg)", kategorie: "Poliermaterial", einkaufspreis: 28.00, verkaufspreis: 52.00, einheit: "kg" },
                { name: "Polierpaste fein (1kg)", kategorie: "Poliermaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "kg" },
                { name: "Hochglanz-Finish (500ml)", kategorie: "Poliermaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Stück" },
                { name: "Schleifpaste (500g)", kategorie: "Poliermaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Stück" },
                { name: "Antihologramm-Politur (500ml)", kategorie: "Poliermaterial", einkaufspreis: 28.00, verkaufspreis: 52.00, einheit: "Stück" },
                { name: "Polierschwamm grob (2 Stk)", kategorie: "Poliermaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Polierschwamm mittel (2 Stk)", kategorie: "Poliermaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Polierschwamm fein (2 Stk)", kategorie: "Poliermaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Lammfell-Polierpad", kategorie: "Poliermaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Stück" },
                { name: "Mikrofasertuch (10 Stk)", kategorie: "Poliermaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Poliertuch fusselarm (50 Stk)", kategorie: "Poliermaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Set" },

                // ================================================
                // KLEBE- UND DICHTMATERIAL
                // ================================================
                { name: "Karosseriekleber (310ml)", kategorie: "Klebematerial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Stück" },
                { name: "Strukturkleber 2K (50ml)", kategorie: "Klebematerial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Stück" },
                { name: "Scheibenklebstoff (310ml)", kategorie: "Klebematerial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Stück" },
                { name: "Scheibenklebstoff-Set komplett", kategorie: "Klebematerial", einkaufspreis: 45.00, verkaufspreis: 85.00, einheit: "Set" },
                { name: "Kunststoffkleber (20g)", kategorie: "Klebematerial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Dichtmasse grau (310ml)", kategorie: "Klebematerial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Dichtmasse schwarz (310ml)", kategorie: "Klebematerial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Nahtabdichtung überlackierbar (310ml)", kategorie: "Klebematerial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Stück" },
                { name: "Hohlraumversiegelung (500ml)", kategorie: "Klebematerial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Stück" },
                { name: "Hohlraumwachs Spraydose (500ml)", kategorie: "Klebematerial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Stück" },
                { name: "Unterbodenschutz (1L)", kategorie: "Klebematerial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Liter" },
                { name: "Steinschlagschutz (1L)", kategorie: "Klebematerial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Liter" },
                { name: "Dämmmatte selbstklebend (1m²)", kategorie: "Klebematerial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "m²" },

                // ================================================
                // REINIGUNGSMATERIAL
                // ================================================
                { name: "Entfetter/Silikonentferner (1L)", kategorie: "Reinigungsmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Liter" },
                { name: "Entfetter/Silikonentferner (5L)", kategorie: "Reinigungsmaterial", einkaufspreis: 32.00, verkaufspreis: 58.00, einheit: "Stück" },
                { name: "Kunststoffreiniger (1L)", kategorie: "Reinigungsmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Liter" },
                { name: "Bremsenreiniger (500ml)", kategorie: "Reinigungsmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Bremsenreiniger (5L)", kategorie: "Reinigungsmaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Stück" },
                { name: "Staubbindetuch (10 Stk)", kategorie: "Reinigungsmaterial", einkaufspreis: 5.00, verkaufspreis: 10.00, einheit: "Set" },
                { name: "Reinigungstücher Rolle (500 Stk)", kategorie: "Reinigungsmaterial", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Rolle" },
                { name: "Handwaschpaste (500ml)", kategorie: "Reinigungsmaterial", einkaufspreis: 6.00, verkaufspreis: 12.00, einheit: "Stück" },
                { name: "Lackknete (100g)", kategorie: "Reinigungsmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },
                { name: "Teerentferner (500ml)", kategorie: "Reinigungsmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Stück" },

                // ================================================
                // VERBRAUCHSMATERIAL LACKIERKABINE
                // ================================================
                { name: "Filter Bodengitter (Set)", kategorie: "Verbrauchsmaterial", einkaufspreis: 45.00, verkaufspreis: 85.00, einheit: "Set" },
                { name: "Filter Decke (Set)", kategorie: "Verbrauchsmaterial", einkaufspreis: 65.00, verkaufspreis: 125.00, einheit: "Set" },
                { name: "Einmaloverall Größe L", kategorie: "Verbrauchsmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Einmaloverall Größe XL", kategorie: "Verbrauchsmaterial", einkaufspreis: 4.00, verkaufspreis: 8.00, einheit: "Stück" },
                { name: "Einmalhandschuhe Nitril (100 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Box" },
                { name: "Atemschutzmaske A2/P3", kategorie: "Verbrauchsmaterial", einkaufspreis: 35.00, verkaufspreis: 65.00, einheit: "Stück" },
                { name: "Atemschutzfilter A2/P3 (2 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 22.00, verkaufspreis: 42.00, einheit: "Set" },
                { name: "Staubmaske FFP2 (20 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Box" },
                { name: "Rührstab Holz (100 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Mischbecher (50 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Siebe für Lack (100 Stk)", kategorie: "Verbrauchsmaterial", einkaufspreis: 18.00, verkaufspreis: 35.00, einheit: "Set" },
                { name: "Pistolenreiniger (1L)", kategorie: "Verbrauchsmaterial", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Liter" },

                // ================================================
                // ERSATZTEILE (HÄUFIG BENÖTIGT)
                // ================================================
                { name: "Stoßfängerhalter vorne (Set)", kategorie: "Ersatzteile", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Set" },
                { name: "Stoßfängerhalter hinten (Set)", kategorie: "Ersatzteile", einkaufspreis: 25.00, verkaufspreis: 48.00, einheit: "Set" },
                { name: "Befestigungsclips Universal (50 Stk)", kategorie: "Ersatzteile", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Set" },
                { name: "Türdichtung Meter", kategorie: "Ersatzteile", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Meter" },
                { name: "Fensterdichtung Meter", kategorie: "Ersatzteile", einkaufspreis: 12.00, verkaufspreis: 22.00, einheit: "Meter" },
                { name: "Radlaufverbreiterung Clip (10 Stk)", kategorie: "Ersatzteile", einkaufspreis: 8.00, verkaufspreis: 15.00, einheit: "Set" },
                { name: "Zierleistenclips (20 Stk)", kategorie: "Ersatzteile", einkaufspreis: 15.00, verkaufspreis: 28.00, einheit: "Set" },
                { name: "Emblem Befestigung (Set)", kategorie: "Ersatzteile", einkaufspreis: 5.00, verkaufspreis: 10.00, einheit: "Set" },
            ];

            try {
                const batch = window.db.batch();
                const collectionRef = window.getCollection('kalkulation_material');

                SEED_DATA.forEach(item => {
                    const docRef = collectionRef.doc();
                    batch.set(docRef, {
                        ...item,
                        createdAt: new Date().toISOString()
                    });
                });

                await batch.commit();
                showToast(`${SEED_DATA.length} Materialien geladen`, 'success');
                await loadMaterial();

            } catch (error) {
                console.error('❌ Fehler beim Laden des Standard-Materials:', error);
                showToast('Fehler beim Laden', 'error');
            }
        }

        function filterMaterial() {
            // TODO: Implement filtering
        }

        // ============================================
        // FAHRZEUGE LADEN (TAB 1)
        // ============================================

        async function loadFahrzeuge() {
            try {
                if (!window.getCollection) {
                    console.log('⏳ loadFahrzeuge: getCollection nicht verfügbar');
                    return;
                }

                const select = document.getElementById('fahrzeugSelect');
                if (!select) {
                    console.log('⏳ loadFahrzeuge: fahrzeugSelect Element nicht gefunden');
                    return;
                }

                const snapshot = await window.getCollection('fahrzeuge')
                    .where('status', 'in', ['offen', 'in_arbeit', 'warte_teile', 'terminiert'])
                    .orderBy('annahmedatum', 'desc')
                    .limit(50)
                    .get();

                select.innerHTML = '<option value="">-- Fahrzeug wählen --</option>';

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `${data.kennzeichen || 'Ohne Kennzeichen'} - ${data.fahrzeugmodell || 'Unbekannt'} - ${data.kundenname || 'Ohne Kunde'}`;
                    select.appendChild(option);
                });

                // Add change handler
                select.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const fahrzeug = snapshot.docs.find(d => d.id === e.target.value);
                        if (fahrzeug) {
                            aktuelleKalkulation.fahrzeugId = fahrzeug.id;
                            aktuelleKalkulation.kennzeichen = fahrzeug.data().kennzeichen || '';
                            aktuelleKalkulation.kundenName = fahrzeug.data().kundenname || '';
                            document.getElementById('kalkulationContent').style.display = 'block';
                            document.getElementById('freieKalkulationStart').style.display = 'none';
                        }
                    } else {
                        document.getElementById('kalkulationContent').style.display = 'none';
                        document.getElementById('freieKalkulationStart').style.display = 'block';
                    }
                });

                console.log(`✅ ${snapshot.size} Fahrzeuge geladen`);

            } catch (error) {
                console.warn('⚠️ Fahrzeuge konnten nicht geladen werden:', error);
            }
        }

        function startFreieKalkulation() {
            aktuelleKalkulation.fahrzeugId = null;
            aktuelleKalkulation.kennzeichen = 'Freie Kalkulation';
            aktuelleKalkulation.kundenName = '';
            document.getElementById('kalkulationContent').style.display = 'block';
            document.getElementById('freieKalkulationStart').style.display = 'none';
            document.getElementById('fahrzeugSelect').value = '';
        }

        // ============================================
        // KALKULATION ERSTELLEN (TAB 1)
        // ============================================

        function openPositionModal() {
            renderPositionAuswahl();
            document.getElementById('positionAuswahlModal').classList.add('active');
            document.getElementById('positionAuswahlSearch').value = '';
            feather.replace();
        }

        function renderPositionAuswahl(searchFilter = '') {
            const container = document.getElementById('positionAuswahlListe');

            let filteredData = katalogData;
            if (searchFilter) {
                filteredData = katalogData.filter(item =>
                    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    item.kategorie.toLowerCase().includes(searchFilter.toLowerCase())
                );
            }

            if (filteredData.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: var(--space-6);">
                        <p>Keine Positionen gefunden</p>
                    </div>
                `;
                return;
            }

            // Group by category
            const grouped = {};
            filteredData.forEach(item => {
                const kat = item.kategorie || 'Sonstiges';
                if (!grouped[kat]) grouped[kat] = [];
                grouped[kat].push(item);
            });

            let html = '';
            Object.keys(grouped).sort().forEach(kategorie => {
                html += `<div class="category-header" style="margin-top: var(--space-4);"><h3>${kategorie}</h3></div>`;
                grouped[kategorie].forEach(item => {
                    const stundensatz = getStundensatzForKategorie(item.kategorie);
                    const preis = (item.arbeitswerte * kalkulationSaetze.awInMinuten / 60) * stundensatz;
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); cursor: pointer;"
                             onclick="addPositionToKalkulation('${item.id}')"
                             onmouseover="this.style.background='rgba(var(--color-primary-rgb), 0.1)'"
                             onmouseout="this.style.background='transparent'">
                            <div>
                                <strong>${item.name}</strong>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                                    ${item.arbeitswerte} AW · ~${Math.round(item.arbeitswerte * kalkulationSaetze.awInMinuten)} Min
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <strong style="color: var(--color-primary);">${preis.toFixed(2)} €</strong>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                                    ${stundensatz.toFixed(2)} €/Std
                                </div>
                            </div>
                        </div>
                    `;
                });
            });

            container.innerHTML = html;
        }

        function filterPositionAuswahl() {
            const search = document.getElementById('positionAuswahlSearch').value;
            renderPositionAuswahl(search);
        }

        function getStundensatzForKategorie(kategorie) {
            switch (kategorie) {
                case 'Lackierung': return kalkulationSaetze.stundensatzLack;
                case 'Karosserie': return kalkulationSaetze.stundensatzKarosserie;
                case 'Mechanik':
                case 'Elektrik': return kalkulationSaetze.stundensatzMechanik;
                default: return kalkulationSaetze.stundensatzSonstige;
            }
        }

        function addPositionToKalkulation(positionId) {
            const position = katalogData.find(p => p.id === positionId);
            if (!position) return;

            const stundensatz = getStundensatzForKategorie(position.kategorie);
            const preis = (position.arbeitswerte * kalkulationSaetze.awInMinuten / 60) * stundensatz;

            aktuelleKalkulation.positionen.push({
                id: Date.now().toString(),
                katalogId: position.id,
                name: position.name,
                kategorie: position.kategorie,
                arbeitswerte: position.arbeitswerte,
                stundensatz: stundensatz,
                preis: preis
            });

            closeModal('positionAuswahlModal');
            renderKalkulationPositionen();
            updateKalkulationSummary();
            showToast(`"${position.name}" hinzugefügt`, 'success');
        }

        function removePositionFromKalkulation(positionId) {
            aktuelleKalkulation.positionen = aktuelleKalkulation.positionen.filter(p => p.id !== positionId);
            renderKalkulationPositionen();
            updateKalkulationSummary();
        }

        function renderKalkulationPositionen() {
            const container = document.getElementById('positionenListe');

            if (aktuelleKalkulation.positionen.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="clipboard"></i>
                        <h3>Keine Positionen</h3>
                        <p>Fügen Sie Arbeitspositionen aus dem Katalog hinzu</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Position</th>
                            <th>Kategorie</th>
                            <th>AW</th>
                            <th>Stundensatz</th>
                            <th>Preis</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            aktuelleKalkulation.positionen.forEach((pos, index) => {
                html += `
                    <tr>
                        <td><strong>${index + 1}.</strong> ${pos.name}</td>
                        <td>${pos.kategorie}</td>
                        <td>${pos.arbeitswerte} AW</td>
                        <td>${pos.stundensatz.toFixed(2)} €/Std</td>
                        <td><strong>${pos.preis.toFixed(2)} €</strong></td>
                        <td>
                            <button class="btn btn-icon btn-secondary" onclick="removePositionFromKalkulation('${pos.id}')" title="Entfernen" style="color: var(--color-error);">
                                <i data-feather="x"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
            feather.replace();
        }

        // ============================================
        // MATERIAL ZUR KALKULATION HINZUFÜGEN
        // ============================================

        function openMaterialModal() {
            renderMaterialAuswahl();
            document.getElementById('materialAuswahlModal').classList.add('active');
            document.getElementById('materialAuswahlSearch').value = '';
            feather.replace();
        }

        function renderMaterialAuswahl(searchFilter = '') {
            const container = document.getElementById('materialAuswahlListe');

            let filteredData = materialData;
            if (searchFilter) {
                filteredData = materialData.filter(item =>
                    item.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    item.kategorie.toLowerCase().includes(searchFilter.toLowerCase())
                );
            }

            if (filteredData.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="padding: var(--space-6);">
                        <p>Kein Material gefunden</p>
                    </div>
                `;
                return;
            }

            // Group by category
            const grouped = {};
            filteredData.forEach(item => {
                const kat = item.kategorie || 'Sonstiges';
                if (!grouped[kat]) grouped[kat] = [];
                grouped[kat].push(item);
            });

            let html = '';
            Object.keys(grouped).sort().forEach(kategorie => {
                html += `<div class="category-header" style="margin-top: var(--space-4);"><h3>${kategorie}</h3></div>`;
                grouped[kategorie].forEach(item => {
                    html += `
                        <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-3); border-bottom: 1px solid var(--color-border); cursor: pointer;"
                             onclick="addMaterialToKalkulation('${item.id}')"
                             onmouseover="this.style.background='rgba(var(--color-primary-rgb), 0.1)'"
                             onmouseout="this.style.background='transparent'">
                            <div>
                                <strong>${item.name}</strong>
                                <div style="font-size: var(--font-size-xs); color: var(--color-text-secondary);">
                                    ${item.einheit || 'Stück'}
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <strong style="color: var(--color-primary);">${item.verkaufspreis.toFixed(2)} €</strong>
                            </div>
                        </div>
                    `;
                });
            });

            container.innerHTML = html;
        }

        function filterMaterialAuswahl() {
            const search = document.getElementById('materialAuswahlSearch').value;
            renderMaterialAuswahl(search);
        }

        function addMaterialToKalkulation(materialId) {
            const material = materialData.find(m => m.id === materialId);
            if (!material) return;

            // Check if already exists
            const existing = aktuelleKalkulation.materialien.find(m => m.katalogId === materialId);
            if (existing) {
                existing.menge += 1;
                existing.preis = existing.menge * existing.einzelpreis;
            } else {
                aktuelleKalkulation.materialien.push({
                    id: Date.now().toString(),
                    katalogId: material.id,
                    name: material.name,
                    kategorie: material.kategorie,
                    einheit: material.einheit || 'Stück',
                    einzelpreis: material.verkaufspreis,
                    menge: 1,
                    preis: material.verkaufspreis
                });
            }

            closeModal('materialAuswahlModal');
            renderKalkulationMaterial();
            updateKalkulationSummary();
            showToast(`"${material.name}" hinzugefügt`, 'success');
        }

        function removeMaterialFromKalkulation(materialId) {
            aktuelleKalkulation.materialien = aktuelleKalkulation.materialien.filter(m => m.id !== materialId);
            renderKalkulationMaterial();
            updateKalkulationSummary();
        }

        function updateMaterialMenge(materialId, newMenge) {
            const material = aktuelleKalkulation.materialien.find(m => m.id === materialId);
            if (material) {
                material.menge = Math.max(1, parseInt(newMenge) || 1);
                material.preis = material.menge * material.einzelpreis;
                updateKalkulationSummary();
            }
        }

        function renderKalkulationMaterial() {
            const container = document.getElementById('materialListe');

            if (aktuelleKalkulation.materialien.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="box"></i>
                        <h3>Kein Material</h3>
                        <p>Fügen Sie Materialien aus dem Katalog hinzu</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            let html = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Einzelpreis</th>
                            <th>Menge</th>
                            <th>Preis</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            aktuelleKalkulation.materialien.forEach((mat, index) => {
                html += `
                    <tr>
                        <td><strong>${index + 1}.</strong> ${mat.name}</td>
                        <td>${mat.einzelpreis.toFixed(2)} €/${mat.einheit}</td>
                        <td>
                            <input type="number" min="1" value="${mat.menge}"
                                   style="width: 60px; padding: var(--space-2); border: 1px solid var(--color-border); border-radius: var(--radius-input);"
                                   onchange="updateMaterialMenge('${mat.id}', this.value)">
                        </td>
                        <td><strong>${mat.preis.toFixed(2)} €</strong></td>
                        <td>
                            <button class="btn btn-icon btn-secondary" onclick="removeMaterialFromKalkulation('${mat.id}')" title="Entfernen" style="color: var(--color-error);">
                                <i data-feather="x"></i>
                            </button>
                        </td>
                    </tr>
                `;
            });

            html += '</tbody></table>';
            container.innerHTML = html;
            feather.replace();
        }

        // ============================================
        // KALKULATION BERECHNEN & ANZEIGEN
        // ============================================

        function updateKalkulationSummary() {
            // 🆕 FIX (2025-12-01): Delegiere an vollständige Funktion berechneGesamtsumme()
            // PROBLEM: Diese Funktion zeigte nur Arbeit + Material, NICHT Ersatzteile + Ersatzfahrzeug
            // LÖSUNG: berechneGesamtsumme() berechnet ALLE Summen korrekt
            if (typeof berechneGesamtsumme === 'function') {
                berechneGesamtsumme();
                return;
            }

            // Fallback: Legacy-Berechnung (nur wenn berechneGesamtsumme nicht verfügbar)
            const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => sum + p.preis, 0);
            const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => sum + m.preis, 0);

            // 🆕 FIX: Ersatzteile + Ersatzfahrzeug jetzt auch in Fallback
            const summeErsatzteile = (kalkWizardData?.ersatzteile || []).reduce((sum, e) => {
                return sum + (parseFloat(e.preis) || 0) * (parseFloat(e.menge) || 1);
            }, 0);
            const summeErsatzfahrzeug = parseFloat(kalkWizardData?.ersatzfahrzeug?.gesamt) || 0;

            const summeNetto = summeArbeit + summeMaterial + summeErsatzteile + summeErsatzfahrzeug;
            const mwst = summeNetto * (kalkulationSaetze.mwstSatz / 100);
            const summeBrutto = summeNetto + mwst;

            const elSummeArbeit = document.getElementById('summeArbeit');
            const elSummeMaterial = document.getElementById('summeMaterial');
            const elSummeErsatzteile = document.getElementById('summeErsatzteile');
            const elSummeErsatzfahrzeug = document.getElementById('summeErsatzfahrzeug');
            const elSummeNetto = document.getElementById('summeNetto');
            const elSummeMwst = document.getElementById('summeMwst');
            const elSummeBrutto = document.getElementById('summeBrutto');

            if (elSummeArbeit) elSummeArbeit.textContent = summeArbeit.toFixed(2) + ' €';
            if (elSummeMaterial) elSummeMaterial.textContent = summeMaterial.toFixed(2) + ' €';
            if (elSummeErsatzteile) elSummeErsatzteile.textContent = summeErsatzteile.toFixed(2) + ' €';
            if (elSummeErsatzfahrzeug) elSummeErsatzfahrzeug.textContent = summeErsatzfahrzeug.toFixed(2) + ' €';
            if (elSummeNetto) elSummeNetto.textContent = summeNetto.toFixed(2) + ' €';
            document.getElementById('mwstSatzDisplay').textContent = kalkulationSaetze.mwstSatz;
            if (elSummeMwst) elSummeMwst.textContent = mwst.toFixed(2) + ' €';
            if (elSummeBrutto) elSummeBrutto.textContent = summeBrutto.toFixed(2) + ' €';
        }

        // ============================================
        // KALKULATION SPEICHERN
        // ============================================

        async function saveKalkulationEntwurf() {
            if (aktuelleKalkulation.positionen.length === 0 && aktuelleKalkulation.materialien.length === 0) {
                showToast('Keine Positionen oder Material vorhanden', 'error');
                return;
            }

            try {
                const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => sum + p.preis, 0);
                const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => sum + m.preis, 0);
                const summeNetto = summeArbeit + summeMaterial;
                const mwst = summeNetto * (kalkulationSaetze.mwstSatz / 100);
                const summeBrutto = summeNetto + mwst;

                const kalkulationData = {
                    fahrzeugId: aktuelleKalkulation.fahrzeugId,
                    kennzeichen: aktuelleKalkulation.kennzeichen,
                    kundenName: aktuelleKalkulation.kundenName,
                    positionen: aktuelleKalkulation.positionen,
                    materialien: aktuelleKalkulation.materialien,
                    summeArbeit,
                    summeMaterial,
                    summeNetto,
                    mwstSatz: kalkulationSaetze.mwstSatz,
                    mwst,
                    summeBrutto,
                    status: 'entwurf',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    // 🆕 Verknüpfung zu Entwurf oder Partner-Anfrage
                    entwurfId: kalkWizardData.entwurfId || null,
                    partnerAnfrageId: kalkWizardData.partnerAnfrageId || null
                };

                const docRef = await window.getCollection('kalkulationen').add(kalkulationData);
                console.log('✅ Kalkulation gespeichert:', docRef.id);

                // 🆕 KVA-Daten zurück in Partner-Anfrage speichern
                if (kalkWizardData.partnerAnfrageId) {
                    await saveKvaToPartnerAnfrage(kalkWizardData.partnerAnfrageId, kalkulationData, docRef.id);
                }

                // 🆕 Kalkulation mit Entwurf verknüpfen
                if (kalkWizardData.entwurfId) {
                    await linkKalkulationToEntwurf(kalkWizardData.entwurfId, kalkulationData, docRef.id);
                }

                showToast('Kalkulation gespeichert!', 'success');

                // Reset for new calculation
                resetKalkulation();

            } catch (error) {
                console.error('❌ Fehler beim Speichern:', error);
                showToast('Fehler beim Speichern', 'error');
            }
        }

        // 🔧 FIX (2025-11-29): Kalkulation in Entwurf speichern
        // WICHTIG: Speichert NUR in partnerAnfragen - KEIN Fahrzeug wird angelegt!
        // Fahrzeug wird erst angelegt wenn Kunde das Angebot annimmt (in meine-anfragen.html)
        async function saveKVA() {
            // Prüfen ob Entwurf oder Partner-Anfrage ausgewählt
            const targetId = kalkWizardData.entwurfId || kalkWizardData.partnerAnfrageId;
            if (!targetId) {
                showToast('⚠️ Kein Entwurf ausgewählt!\n\nBitte wählen Sie zuerst einen Entwurf aus der Liste.', 'warning');
                return;
            }

            // Prüfen ob Daten vorhanden
            if (!kalkWizardData.fahrzeug?.marke || !kalkWizardData.fahrzeug?.modell) {
                showToast('Bitte erst Fahrzeugdaten eingeben', 'warning');
                return;
            }

            if (kalkWizardData.teile.length === 0) {
                showToast('Bitte mindestens ein Teil auswählen', 'warning');
                return;
            }

            try {
                // 🆕 Design-Dateien zu Firebase Storage hochladen (falls vorhanden)
                let designUrls = {};
                if (Object.keys(uploadedDesignFiles).length > 0) {
                    showToast('📤 Lade Design-Dateien hoch...', 'info');
                    designUrls = await uploadDesignFilesToStorage(targetId);
                }
                // Summen berechnen
                const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => {
                    return sum + ((parseFloat(p.preis) || 0) * (parseFloat(p.menge) || 1));
                }, 0);

                // 🔧 FIX Dec 2, 2025: m.preis IST bereits der Gesamtpreis (einzelpreis × menge), NICHT nochmal multiplizieren!
                const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => {
                    return sum + (parseFloat(m.preis) || parseFloat(m.verkaufspreis) || 0);
                }, 0);

                // 🆕 Nov 30, 2025: Getrennte Ersatzteile-Summen (Original + Aftermarket)
                const summeErsatzteileOriginal = (kalkWizardData.ersatzteile || []).reduce((sum, e) => {
                    const preis = parseFloat(e.preisOriginal) || parseFloat(e.preis) || 0;
                    return sum + (preis * (parseFloat(e.menge) || 1));
                }, 0);

                const summeErsatzteileAftermarket = (kalkWizardData.ersatzteile || []).reduce((sum, e) => {
                    const preis = parseFloat(e.preisAftermarket) || parseFloat(e.preisOriginal) || parseFloat(e.preis) || 0;
                    return sum + (preis * (parseFloat(e.menge) || 1));
                }, 0);

                // Backwards-Kompatibilität: summeErsatzteile = Original
                const summeErsatzteile = summeErsatzteileOriginal;

                // 🆕 Zwei Netto-Summen für beide Varianten
                const summeNettoOriginal = summeArbeit + summeMaterial + summeErsatzteileOriginal;
                const summeNettoAftermarket = summeArbeit + summeMaterial + summeErsatzteileAftermarket;

                const mwstSatz = kalkulationSaetze?.mwstSatz || 19;

                // Original Variante
                const mwstOriginal = summeNettoOriginal * (mwstSatz / 100);
                const summeBruttoOriginal = summeNettoOriginal + mwstOriginal;

                // Aftermarket Variante
                const mwstAftermarket = summeNettoAftermarket * (mwstSatz / 100);
                const summeBruttoAftermarket = summeNettoAftermarket + mwstAftermarket;

                // Backwards-Kompatibilität
                const summeNetto = summeNettoOriginal;
                const mwst = mwstOriginal;
                const summeBrutto = summeBruttoOriginal;

                // Kalkulationsdaten für Entwurf
                // 🔧 FIX Nov 29, 2025: Alle Summen auf 2 Dezimalstellen runden (Floating-Point vermeiden)
                // 🆕 Nov 30, 2025: Getrennte Original/Aftermarket Summen für KVA-Varianten
                // 🚗 Ersatzfahrzeug-Daten aus kalkWizardData oder Entwurf (FIX: Nov 30, 2025)
                const ersatzfahrzeugData = kalkWizardData.ersatzfahrzeug || kalkWizardData.fahrzeug?.kalkulationData?.ersatzfahrzeug || null;
                const summeErsatzfahrzeug = ersatzfahrzeugData?.gesamt || 0;

                // Netto-Summen aktualisieren (inkl. Ersatzfahrzeug)
                const summeNettoMitErsatzfahrzeug = summeNettoOriginal + summeErsatzfahrzeug;
                const mwstMitErsatzfahrzeug = summeNettoMitErsatzfahrzeug * (mwstSatz / 100);
                const summeBruttoMitErsatzfahrzeug = summeNettoMitErsatzfahrzeug + mwstMitErsatzfahrzeug;

                const kalkulationData = {
                    positionen: aktuelleKalkulation.positionen,
                    materialien: aktuelleKalkulation.materialien,
                    ersatzteile: kalkWizardData.ersatzteile || [],
                    // 🚗 Ersatzfahrzeug-Kosten (FIX: Nov 30, 2025)
                    ersatzfahrzeug: ersatzfahrzeugData,
                    summeErsatzfahrzeug: parseFloat(summeErsatzfahrzeug.toFixed(2)),
                    summeArbeit: parseFloat(summeArbeit.toFixed(2)),
                    summeMaterial: parseFloat(summeMaterial.toFixed(2)),
                    // Backwards-Kompatibilität
                    summeErsatzteile: parseFloat(summeErsatzteile.toFixed(2)),
                    summeNetto: parseFloat(summeNettoMitErsatzfahrzeug.toFixed(2)),
                    mwstSatz,
                    mwst: parseFloat(mwstMitErsatzfahrzeug.toFixed(2)),
                    summeBrutto: parseFloat(summeBruttoMitErsatzfahrzeug.toFixed(2)),
                    // 🆕 Neue getrennte Summen für kva-erstellen.html
                    summeErsatzteileOriginal: parseFloat(summeErsatzteileOriginal.toFixed(2)),
                    summeErsatzteileAftermarket: parseFloat(summeErsatzteileAftermarket.toFixed(2)),
                    summeNettoOriginal: parseFloat((summeNettoOriginal + summeErsatzfahrzeug).toFixed(2)),
                    summeNettoAftermarket: parseFloat((summeNettoAftermarket + summeErsatzfahrzeug).toFixed(2)),
                    summeBruttoOriginal: parseFloat(summeBruttoMitErsatzfahrzeug.toFixed(2)),
                    summeBruttoAftermarket: parseFloat((summeNettoAftermarket + summeErsatzfahrzeug + ((summeNettoAftermarket + summeErsatzfahrzeug) * mwstSatz / 100)).toFixed(2))
                };

                // Update-Daten für partnerAnfragen
                const updateData = {
                    // Kalkulation speichern (für entwuerfe-bearbeiten.html)
                    kalkulation: kalkulationData,

                    // Teile & Ersatzteile auf Root-Ebene (für einfachen Zugriff)
                    teile: kalkWizardData.teile || [],
                    ersatzteile: kalkWizardData.ersatzteile || [],

                    // 🆕 Service-Details speichern (für Folierung, Werbebeklebung, etc.)
                    serviceDetails: kalkWizardData.serviceDetails || {},

                    // 🆕 MULTI-SERVICE: Service-Details pro Service speichern (2025-11-30)
                    // WICHTIG: serviceTyp und additionalServices werden NICHT überschrieben!
                    // Diese kommen bereits vom Entwurf (annahme.html) und sind korrekt.
                    serviceDetailsPerService: kalkWizardData.serviceDetailsPerService || {},

                    // 🆕 Design-URLs speichern (hochgeladene Bilder/Dateien)
                    designUrls: designUrls,

                    // 🔧 FIX Nov 29, 2025: entwurfStatus NICHT ändern!
                    // Entwurf bleibt 'offen' bis Angebot in entwuerfe-bearbeiten.html versendet wird
                    // So bleibt er in der Dropdown-Liste sichtbar für spätere Bearbeitung
                    // entwurfStatus: 'kalkulation_erstellt', // ENTFERNT - bleibt 'offen'

                    // Status: Kalkulation erstellt (NICHT kva_gesendet - das macht entwuerfe-bearbeiten.html!)
                    kalkulationErstelltAm: firebase.firestore.FieldValue.serverTimestamp(),
                    kalkulationErstelltDurch: getCurrentUserForAudit().user,

                    // Vereinbarter Preis (brutto) für Angebot
                    // 🔧 FIX Nov 29, 2025: Floating-Point vermeiden mit toFixed(2)
                    vereinbarterPreis: parseFloat(summeBrutto.toFixed(2)),

                    // 🆕 FIX Dec 1, 2025: Varianten-Preise auf ROOT-Ebene speichern
                    // KRITISCH für meine-anfragen.html Varianten-Auswahl-Box!
                    // Ohne diese Felder wird nur "Annehmen/Ablehnen" angezeigt, KEINE Varianten-Buttons!
                    summeBruttoOriginal: parseFloat(summeBruttoMitErsatzfahrzeug.toFixed(2)),
                    summeBruttoAftermarket: parseFloat((summeNettoAftermarket + summeErsatzfahrzeug + ((summeNettoAftermarket + summeErsatzfahrzeug) * mwstSatz / 100)).toFixed(2)),
                    hasVarianten: summeErsatzteileOriginal !== summeErsatzteileAftermarket,

                    // Metadata
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 🆕 MULTI-SERVICE: Log für Debugging (2025-11-30)
                if (kalkWizardData.isMultiService) {
                    console.log('🆕 Multi-Service Kalkulation wird gespeichert:', {
                        services: kalkWizardData.services,
                        serviceDetailsPerService: kalkWizardData.serviceDetailsPerService
                    });
                }

                // In partnerAnfragen updaten (Entwurf oder Partner-Anfrage)
                console.log(`📝 Speichere Kalkulation in partnerAnfragen/${targetId}...`);
                await window.getCollection('partnerAnfragen').doc(targetId).update(updateData);
                console.log('✅ Kalkulation in Entwurf gespeichert');

                // 🆕 FIX (Nov 30, 2025): Unterschiedliche Weiterleitung je nach Quelle
                // - Entwurf (isEntwurf=true) → entwuerfe-bearbeiten.html
                // - Partner-Anfrage (isEntwurf=false) → partner-app/kva-erstellen.html
                const isPartnerAnfrage = kalkWizardData.partnerAnfrageId && !kalkWizardData.entwurfId;

                if (isPartnerAnfrage) {
                    showToast('✅ Kalkulation erfolgreich gespeichert!\n\nWeiter zur KVA-Erstellung für den Partner.', 'success', 5000);

                    // Nach 2 Sekunden zu kva-erstellen.html weiterleiten (Partner-App)
                    setTimeout(() => {
                        const werkstattId = window.werkstattId || 'mosbach';
                        const kvaUrl = `partner-app/kva-erstellen.html?id=${targetId}&werkstatt=${werkstattId}`;
                        console.log('🔗 Weiterleitung zu Partner-KVA:', kvaUrl);
                        if (typeof safeNavigate === 'function') {
                            safeNavigate(kvaUrl);
                        } else {
                            window.location.href = kvaUrl;
                        }
                    }, 2000);
                } else {
                    showToast('✅ Kalkulation erfolgreich gespeichert!\n\nWeiter zu "Entwürfe bearbeiten" um das Angebot zu versenden.', 'success', 5000);

                    // Nach 2 Sekunden zu entwuerfe-bearbeiten.html weiterleiten (Werkstatt-Entwurf)
                    setTimeout(() => {
                        if (typeof safeNavigate === 'function') {
                            safeNavigate(`entwuerfe-bearbeiten.html?id=${targetId}`);
                        } else {
                            window.location.href = `entwuerfe-bearbeiten.html?id=${targetId}`;
                        }
                    }, 2000);
                }

            } catch (error) {
                console.error('❌ Fehler beim Speichern der Kalkulation:', error);
                showToast('Fehler beim Speichern: ' + error.message, 'error');
            }
        }

        // 🆕 KVA-Daten zurück in Partner-Anfrage speichern
        async function saveKvaToPartnerAnfrage(anfrageId, kalkulationData, kalkulationId) {
            try {
                const kvaData = {
                    varianten: {
                        original: {
                            gesamt: kalkulationData.summeBrutto,
                            lackkosten: kalkulationData.summeArbeit,
                            teilekosten: kalkulationData.summeMaterial,
                            arbeitszeit: 0,
                            sonstiges: 0
                        }
                    },
                    gewaehlteVariante: null, // Partner muss noch wählen
                    erstelltAm: new Date().toISOString(),
                    erstelltVon: 'kalkulation',
                    kalkulationId: kalkulationId,
                    kalkulationData: {
                        positionen: kalkulationData.positionen,
                        materialien: kalkulationData.materialien,
                        summeNetto: kalkulationData.summeNetto,
                        mwst: kalkulationData.mwst,
                        summeBrutto: kalkulationData.summeBrutto
                    }
                };

                await window.getCollection('partnerAnfragen').doc(anfrageId).update({
                    kva: kvaData,
                    status: 'kva_gesendet',
                    statusText: 'Angebot erstellt',
                    kvaErstelltAm: new Date().toISOString()
                });

                console.log('✅ KVA zurück in Partner-Anfrage gespeichert:', anfrageId);
            } catch (error) {
                console.error('❌ Fehler beim Speichern des KVA in Partner-Anfrage:', error);
            }
        }

        // 🆕 Kalkulation mit Entwurf verknüpfen
        // 🔧 FIX Dec 1, 2025: Alle wichtigen Kalkulationsdaten übertragen (nicht nur Summen!)
        // WICHTIG: Original-Felder (ersatzfahrzeugGewuenscht, abholadresse, etc.) NICHT überschreiben!
        async function linkKalkulationToEntwurf(entwurfId, kalkulationData, kalkulationId) {
            try {
                // 🔧 FIX Dec 1, 2025: Ersatzfahrzeug-Kosten aus kalkWizardData holen
                const ersatzfahrzeugKosten = kalkWizardData.ersatzfahrzeug ||
                                             kalkWizardData.fahrzeug?.kalkulationData?.ersatzfahrzeug ||
                                             null;

                // Nur Kalkulations-spezifische Felder updaten
                // NICHT: ersatzfahrzeugGewuenscht, serviceDetails, abholadresse (kommen aus annahme.html)
                const updateData = {
                    kalkulationId: kalkulationId,
                    // 🔧 FIX Dec 1, 2025: Vollständige Kalkulationsdaten in kalkulation-Objekt
                    kalkulation: {
                        // Summen
                        summeBrutto: kalkulationData.summeBrutto,
                        summeNetto: kalkulationData.summeNetto,
                        summeArbeit: kalkulationData.summeArbeit,
                        summeMaterial: kalkulationData.summeMaterial,
                        mwst: kalkulationData.mwst,
                        mwstSatz: kalkulationData.mwstSatz,
                        // Detaillierte Positionen
                        positionen: kalkulationData.positionen || [],
                        materialien: kalkulationData.materialien || [],
                        ersatzteile: kalkulationData.ersatzteile || kalkWizardData.ersatzteile || [],
                        // Ersatzfahrzeug-KOSTEN (nicht -Wunsch!)
                        ersatzfahrzeugKosten: ersatzfahrzeugKosten,
                        summeErsatzfahrzeug: ersatzfahrzeugKosten?.gesamt || 0,
                        // Getrennte Summen für Varianten
                        summeErsatzteileOriginal: kalkulationData.summeErsatzteileOriginal || 0,
                        summeErsatzteileAftermarket: kalkulationData.summeErsatzteileAftermarket || 0,
                        summeBruttoOriginal: kalkulationData.summeBruttoOriginal || kalkulationData.summeBrutto,
                        summeBruttoAftermarket: kalkulationData.summeBruttoAftermarket || kalkulationData.summeBrutto,
                        // Meta
                        erstelltAm: kalkulationData.createdAt || new Date().toISOString()
                    }
                    // 🔧 FIX Nov 29, 2025: entwurfStatus NICHT ändern!
                    // 🔧 FIX Dec 1, 2025: ersatzfahrzeugGewuenscht, serviceDetails NICHT überschreiben!
                    // Diese kommen aus annahme.html und sind bereits im Entwurf gespeichert.
                };

                await window.getCollection('partnerAnfragen').doc(entwurfId).update(updateData);

                console.log('✅ Kalkulation mit Entwurf verknüpft:', entwurfId);
                console.log('   📦 Übertragen: positionen:', kalkulationData.positionen?.length || 0);
                console.log('   🎨 Übertragen: materialien:', kalkulationData.materialien?.length || 0);
                console.log('   🚗 Übertragen: ersatzfahrzeugKosten:', ersatzfahrzeugKosten?.gesamt || 0, '€');
            } catch (error) {
                console.error('❌ Fehler beim Verknüpfen mit Entwurf:', error);
            }
        }

        function resetKalkulation() {
            aktuelleKalkulation = {
                positionen: [],
                materialien: [],
                fahrzeugId: null,
                kundenName: '',
                kennzeichen: ''
            };
            document.getElementById('fahrzeugSelect').value = '';
            document.getElementById('kalkulationContent').style.display = 'none';
            document.getElementById('freieKalkulationStart').style.display = 'block';
            renderKalkulationPositionen();
            renderKalkulationMaterial();
            updateKalkulationSummary();
        }

        // ============================================
        // PDF EXPORT
        // ============================================

        async function exportKalkulationPDF() {
            if (aktuelleKalkulation.positionen.length === 0 && aktuelleKalkulation.materialien.length === 0) {
                showToast('Keine Positionen oder Material vorhanden', 'error');
                return;
            }

            try {
                const { jsPDF } = window.jspdf;
                const doc = new jsPDF();

                const summeArbeit = aktuelleKalkulation.positionen.reduce((sum, p) => sum + p.preis, 0);
                const summeMaterial = aktuelleKalkulation.materialien.reduce((sum, m) => sum + m.preis, 0);
                const summeNetto = summeArbeit + summeMaterial;
                const mwst = summeNetto * (kalkulationSaetze.mwstSatz / 100);
                const summeBrutto = summeNetto + mwst;

                // Header
                doc.setFontSize(20);
                doc.setFont('helvetica', 'bold');
                doc.text('KOSTENVORANSCHLAG', 105, 20, { align: 'center' });

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 35);

                if (aktuelleKalkulation.kennzeichen) {
                    doc.text(`Kennzeichen: ${aktuelleKalkulation.kennzeichen}`, 20, 42);
                }
                if (aktuelleKalkulation.kundenName) {
                    doc.text(`Kunde: ${aktuelleKalkulation.kundenName}`, 20, 49);
                }

                let yPos = 65;

                // Arbeitspositionen
                if (aktuelleKalkulation.positionen.length > 0) {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('ARBEITSPOSITIONEN', 20, yPos);
                    yPos += 8;

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Pos.', 20, yPos);
                    doc.text('Bezeichnung', 35, yPos);
                    doc.text('AW', 120, yPos);
                    doc.text('Preis', 145, yPos);
                    yPos += 5;

                    doc.setFont('helvetica', 'normal');
                    aktuelleKalkulation.positionen.forEach((pos, index) => {
                        doc.text(`${index + 1}.`, 20, yPos);
                        doc.text(pos.name.substring(0, 45), 35, yPos);
                        doc.text(`${pos.arbeitswerte}`, 120, yPos);
                        doc.text(`${pos.preis.toFixed(2)} €`, 145, yPos);
                        yPos += 6;

                        if (yPos > 270) {
                            doc.addPage();
                            yPos = 20;
                        }
                    });

                    doc.setFont('helvetica', 'bold');
                    doc.text(`Summe Arbeit: ${summeArbeit.toFixed(2)} €`, 145, yPos, { align: 'right' });
                    yPos += 12;
                }

                // Material
                if (aktuelleKalkulation.materialien.length > 0) {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.text('MATERIAL', 20, yPos);
                    yPos += 8;

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.text('Pos.', 20, yPos);
                    doc.text('Bezeichnung', 35, yPos);
                    doc.text('Menge', 110, yPos);
                    doc.text('Preis', 145, yPos);
                    yPos += 5;

                    doc.setFont('helvetica', 'normal');
                    aktuelleKalkulation.materialien.forEach((mat, index) => {
                        doc.text(`${index + 1}.`, 20, yPos);
                        doc.text(mat.name.substring(0, 40), 35, yPos);
                        doc.text(`${mat.menge} ${mat.einheit}`, 110, yPos);
                        doc.text(`${mat.preis.toFixed(2)} €`, 145, yPos);
                        yPos += 6;

                        if (yPos > 270) {
                            doc.addPage();
                            yPos = 20;
                        }
                    });

                    doc.setFont('helvetica', 'bold');
                    doc.text(`Summe Material: ${summeMaterial.toFixed(2)} €`, 145, yPos, { align: 'right' });
                    yPos += 15;
                }

                // Zusammenfassung
                doc.setDrawColor(0);
                doc.line(20, yPos - 5, 190, yPos - 5);

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.text('Nettobetrag:', 120, yPos);
                doc.text(`${summeNetto.toFixed(2)} €`, 190, yPos, { align: 'right' });
                yPos += 6;

                doc.text(`MwSt. ${kalkulationSaetze.mwstSatz}%:`, 120, yPos);
                doc.text(`${mwst.toFixed(2)} €`, 190, yPos, { align: 'right' });
                yPos += 8;

                doc.setFontSize(12);
                doc.setFont('helvetica', 'bold');
                doc.text('GESAMTBETRAG:', 120, yPos);
                doc.text(`${summeBrutto.toFixed(2)} €`, 190, yPos, { align: 'right' });

                // Footer
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.text('Dieser Kostenvoranschlag ist unverbindlich. Preisänderungen vorbehalten.', 105, 285, { align: 'center' });

                // Download
                const filename = `KVA_${aktuelleKalkulation.kennzeichen || 'Frei'}_${new Date().toISOString().slice(0, 10)}.pdf`;
                doc.save(filename);
                showToast('PDF exportiert!', 'success');

            } catch (error) {
                console.error('❌ Fehler beim PDF-Export:', error);
                showToast('Fehler beim PDF-Export', 'error');
            }
        }

        function sendKalkulationEmail() {
            showToast('Email-Versand wird vorbereitet...', 'info');
            // For now, just export PDF - email integration would require backend
            exportKalkulationPDF();
        }

        // ============================================
        // HISTORIE LADEN
        // ============================================

        async function loadHistorie() {
            try {
                const snapshot = await window.getCollection('kalkulationen')
                    .orderBy('createdAt', 'desc')
                    .limit(50)
                    .get();

                const container = document.getElementById('historieListe');

                if (snapshot.empty) {
                    container.innerHTML = `
                        <div class="empty-state">
                            <i data-feather="file-text"></i>
                            <h3>Keine Kalkulationen</h3>
                            <p>Ihre erstellten Kalkulationen erscheinen hier</p>
                        </div>
                    `;
                    feather.replace();
                    return;
                }

                let html = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Datum</th>
                                <th>Kennzeichen</th>
                                <th>Kunde</th>
                                <th>Positionen</th>
                                <th>Betrag</th>
                                <th>Status</th>
                                <th>Aktionen</th>
                            </tr>
                        </thead>
                        <tbody>
                `;

                snapshot.forEach(doc => {
                    const data = doc.data();
                    const datum = new Date(data.createdAt).toLocaleDateString('de-DE');
                    const statusBadge = {
                        'entwurf': '<span style="background: var(--color-warning); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Entwurf</span>',
                        'gesendet': '<span style="background: var(--color-primary); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Gesendet</span>',
                        'akzeptiert': '<span style="background: var(--color-success); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Akzeptiert</span>',
                        'abgelehnt': '<span style="background: var(--color-error); color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">Abgelehnt</span>'
                    };

                    html += `
                        <tr>
                            <td>${datum}</td>
                            <td>${data.kennzeichen || '-'}</td>
                            <td>${data.kundenName || '-'}</td>
                            <td>${(data.positionen?.length || 0) + (data.materialien?.length || 0)}</td>
                            <td><strong>${data.summeBrutto?.toFixed(2) || '0.00'} €</strong></td>
                            <td>${statusBadge[data.status] || data.status}</td>
                            <td class="actions">
                                <button class="btn btn-icon btn-secondary" onclick="loadKalkulationToEdit('${doc.id}')" title="Bearbeiten">
                                    <i data-feather="edit-2"></i>
                                </button>
                                <button class="btn btn-icon btn-secondary" onclick="deleteKalkulation('${doc.id}')" title="Löschen" style="color: var(--color-error);">
                                    <i data-feather="trash-2"></i>
                                </button>
                            </td>
                        </tr>
                    `;
                });

                html += '</tbody></table>';
                container.innerHTML = html;
                feather.replace();

            } catch (error) {
                console.error('❌ Fehler beim Laden der Historie:', error);
            }
        }

        async function deleteKalkulation(kalkulationId) {
            if (!confirm('Kalkulation wirklich löschen?')) return;

            try {
                await window.getCollection('kalkulationen').doc(kalkulationId).delete();
                showToast('Kalkulation gelöscht', 'success');
                await loadHistorie();
            } catch (error) {
                console.error('❌ Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }

        async function loadKalkulationToEdit(kalkulationId) {
            try {
                const doc = await window.getCollection('kalkulationen').doc(kalkulationId).get();
                if (!doc.exists) {
                    showToast('Kalkulation nicht gefunden', 'error');
                    return;
                }

                const data = doc.data();
                aktuelleKalkulation = {
                    id: doc.id,
                    positionen: data.positionen || [],
                    materialien: data.materialien || [],
                    fahrzeugId: data.fahrzeugId,
                    kundenName: data.kundenName || '',
                    kennzeichen: data.kennzeichen || ''
                };

                // Switch to Kalkulation tab
                switchTab('kalkulation');
                document.getElementById('kalkulationContent').style.display = 'block';
                document.getElementById('freieKalkulationStart').style.display = 'none';

                renderKalkulationPositionen();
                renderKalkulationMaterial();
                updateKalkulationSummary();
                showToast('Kalkulation geladen', 'success');

            } catch (error) {
                console.error('❌ Fehler beim Laden:', error);
                showToast('Fehler beim Laden', 'error');
            }
        }

        // ============================================
        // HELPER FUNCTIONS
        // ============================================

        // 🆕 Modal öffnen/schließen Funktionen
        function openModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.add('active');
            } else {
                console.warn(`Modal ${modalId} nicht gefunden`);
                showToast('Diese Funktion ist noch in Entwicklung', 'info');
            }
        }

        function closeModal(modalId) {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.classList.remove('active');
            }
        }

        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.innerHTML = `
                <i data-feather="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
                <span>${message}</span>
            `;
            container.appendChild(toast);
            feather.replace();

            setTimeout(() => {
                toast.style.animation = 'toastSlideIn 0.3s var(--ease-out) reverse';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // Close modal on overlay click
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.classList.remove('active');
                }
            });
        });

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay.active').forEach(modal => {
                    modal.classList.remove('active');
                });
            }
        });

        // ============================================
        // 🚀 SEITEN-INITIALISIERUNG
        // ============================================
        (async function initKalkulationPage() {
            console.log('🧮 Kalkulations-Seite wird initialisiert...');

            // Warte auf Firebase
            if (window.firebaseInitialized) {
                await window.firebaseInitialized;
            }

            // 🆕 FIX: Warte auf werkstattId (Auth-Manager setzt diese nach Auth-State-Änderung)
            let werkstattAttempts = 0;
            while (!window.werkstattId && werkstattAttempts < 50) {
                await new Promise(resolve => setTimeout(resolve, 100));
                werkstattAttempts++;
            }

            if (!window.werkstattId) {
                console.warn('⚠️ initKalkulationPage: werkstattId nicht verfügbar nach 5s');
            } else {
                console.log('✅ initKalkulationPage: werkstattId =', window.werkstattId);
            }

            // Fahrzeuge aus DB laden
            await loadVehiclesFromDB();

            // Ersatzteile-Datenbank laden (für Autocomplete)
            await loadErsatzteileDB();

            // 2D SVG Vehicle-Parts klickbar machen
            initVehiclePartClickHandlers();

            // Autocomplete schließen bei Klick außerhalb
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.ersatzteil-search-wrapper')) {
                    document.querySelectorAll('.ersatzteil-autocomplete').forEach(ac => {
                        ac.style.display = 'none';
                    });
                }
            });

            // Feather Icons initialisieren
            if (typeof feather !== 'undefined') {
                feather.replace();
            }

            console.log('✅ Kalkulations-Seite initialisiert');

            // 🆕 Entwürfe laden (erstes Tab ist jetzt Entwurf-Tab)
            await loadEntwuerfe();

            // 🆕 Partner-Anfragen laden (für Badge-Anzahl)
            loadPartnerAnfragen();

            // Templates und Kunden laden
            await loadTemplates();
            await loadKunden();
            await loadLieferanten();
        })();

        // ============================================
        // TEMPLATES FUNKTIONEN
        // ============================================

        // Standard-Templates Definitionen
        const STANDARD_TEMPLATES = {
            'standard_kotfluegel': {
                name: 'Kotflügel lackieren',
                kategorie: 'lackierung',
                icon: '🚗',
                arbeiten: [
                    { name: 'Kotflügel abkleben', aw: 4 },
                    { name: 'Schleifen/Vorbereitung', aw: 6 },
                    { name: 'Grundierung', aw: 4 },
                    { name: 'Basislack', aw: 5 },
                    { name: 'Klarlack', aw: 4 },
                    { name: 'Abkleben entfernen/Finish', aw: 3 }
                ],
                geschaetzteDauer: '~3h'
            },
            'standard_stossfaenger': {
                name: 'Stoßfänger komplett',
                kategorie: 'lackierung',
                icon: '🛡️',
                arbeiten: [
                    { name: 'Stoßfänger demontieren', aw: 6 },
                    { name: 'Schleifen/Spachteln', aw: 8 },
                    { name: 'Grundierung', aw: 5 },
                    { name: 'Basislack', aw: 6 },
                    { name: 'Klarlack', aw: 5 },
                    { name: 'Stoßfänger montieren', aw: 6 }
                ],
                geschaetzteDauer: '~5h'
            },
            'smart_beule': {
                name: 'Beule Smart Repair',
                kategorie: 'smart_repair',
                icon: '🔧',
                arbeiten: [
                    { name: 'Delle lokalisieren', aw: 2 },
                    { name: 'PDR-Ausbeulen', aw: 8 },
                    { name: 'Kontrolle/Finish', aw: 2 }
                ],
                geschaetzteDauer: '~1h'
            },
            'smart_kratzer': {
                name: 'Kratzer ausbessern',
                kategorie: 'smart_repair',
                icon: '✨',
                arbeiten: [
                    { name: 'Kratzer bewerten', aw: 2 },
                    { name: 'Spot-Repair Lackierung', aw: 16 },
                    { name: 'Politur/Finish', aw: 4 }
                ],
                geschaetzteDauer: '~2h'
            },
            'unfall_seite': {
                name: 'Seitenschaden Standard',
                kategorie: 'unfall',
                icon: '💥',
                arbeiten: [
                    { name: 'Türe demontieren', aw: 6 },
                    { name: 'Schweller instandsetzen', aw: 25 },
                    { name: 'Kotflügel hinten richten', aw: 20 },
                    { name: 'Spachteln/Schleifen', aw: 15 },
                    { name: 'Lackierung (3 Teile)', aw: 30 },
                    { name: 'Türe montieren', aw: 6 }
                ],
                ersatzteile: [
                    { name: 'Zierleiste Tür', preis: 85 },
                    { name: 'Dichtung Tür', preis: 45 }
                ],
                geschaetzteDauer: '~12h'
            },
            'unfall_front': {
                name: 'Frontschaden Standard',
                kategorie: 'unfall',
                icon: '🚧',
                arbeiten: [
                    { name: 'Stoßfänger demontieren', aw: 6 },
                    { name: 'Motorhaube demontieren', aw: 4 },
                    { name: 'Kotflügel richten', aw: 15 },
                    { name: 'Motorhaube richten', aw: 12 },
                    { name: 'Spachteln/Schleifen', aw: 20 },
                    { name: 'Lackierung (3-4 Teile)', aw: 40 },
                    { name: 'Montage', aw: 12 }
                ],
                ersatzteile: [
                    { name: 'Kühlergrill', preis: 150 },
                    { name: 'Stoßfängerhalter', preis: 35 }
                ],
                geschaetzteDauer: '~15h'
            }
        };

        let eigeneTemplates = [];
        let kundenDB = [];
        let lieferantenDB = [];

        async function loadTemplates() {
            try {
                if (!window.getCollection) {
                    console.log('⏳ Templates: Warte auf getCollection...');
                    return;
                }
                const snapshot = await window.getCollection('kalkulation_templates').get();
                eigeneTemplates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderEigeneTemplates();
            } catch (error) {
                console.error('Fehler beim Laden der Templates:', error);
            }
        }

        function renderEigeneTemplates() {
            const container = document.getElementById('eigeneTemplateListe');
            if (!container) return;

            if (eigeneTemplates.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <i data-feather="bookmark"></i>
                        <h4>Keine eigenen Templates</h4>
                        <p>Erstellen Sie eigene Templates aus abgeschlossenen Kalkulationen</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            container.innerHTML = eigeneTemplates.map(t => `
                <div class="template-card" onclick="loadTemplate('custom_${t.id}')">
                    <div class="template-card__icon">${t.icon || '📋'}</div>
                    <div class="template-card__content">
                        <h4>${t.name}</h4>
                        <p>${t.beschreibung || 'Eigenes Template'}</p>
                        <div class="template-card__meta">
                            <span><i data-feather="clock"></i> ${t.geschaetzteDauer || '?'}</span>
                            <span><i data-feather="tag"></i> ${t.kategorie || 'Sonstiges'}</span>
                        </div>
                    </div>
                    <button class="btn btn-icon btn-secondary" onclick="event.stopPropagation(); deleteTemplate('${t.id}')" title="Löschen">
                        <i data-feather="trash-2"></i>
                    </button>
                </div>
            `).join('');
            feather.replace();
        }

        function filterTemplates(category) {
            // Update active button
            document.querySelectorAll('.template-category').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.category === category);
            });

            // Filter template cards
            const cards = document.querySelectorAll('#templateListe .template-card');
            cards.forEach(card => {
                if (category === 'all') {
                    card.style.display = 'flex';
                } else {
                    const templateKey = card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
                    const template = STANDARD_TEMPLATES[templateKey];
                    if (template && template.kategorie === category) {
                        card.style.display = 'flex';
                    } else {
                        card.style.display = 'none';
                    }
                }
            });
        }

        function loadTemplate(templateKey) {
            let template;

            if (templateKey.startsWith('custom_')) {
                const id = templateKey.replace('custom_', '');
                template = eigeneTemplates.find(t => t.id === id);
            } else {
                template = STANDARD_TEMPLATES[templateKey];
            }

            if (!template) {
                showToast('Template nicht gefunden', 'error');
                return;
            }

            // Reset wizard data
            kalkWizardData.selectedParts = [];
            kalkWizardData.ersatzteile = [];

            // Load template arbeiten into wizard
            if (template.arbeiten) {
                template.arbeiten.forEach(arbeit => {
                    kalkWizardData.selectedParts.push({
                        partName: template.name,
                        repairType: 'lackieren',
                        arbeiten: [arbeit.name],
                        arbeitswerte: arbeit.aw
                    });
                });
            }

            // Load template ersatzteile
            if (template.ersatzteile) {
                template.ersatzteile.forEach(e => {
                    kalkWizardData.ersatzteile.push({
                        name: e.name,
                        preis: e.preis,
                        menge: 1
                    });
                });
            }

            // Switch to kalkulation tab and go to step 1
            switchTab('kalkulation');
            showToast(`Template "${template.name}" geladen - Bitte Fahrzeug auswählen`, 'success');
        }

        async function saveAsTemplate() {
            if (kalkWizardData.selectedParts.length === 0) {
                showToast('Keine Arbeiten zum Speichern vorhanden', 'warning');
                return;
            }

            const name = prompt('Template-Name eingeben:');
            if (!name) return;

            const template = {
                name: name,
                icon: '📋',
                kategorie: 'sonstiges',
                arbeiten: kalkWizardData.selectedParts.map(p => ({
                    name: p.arbeiten?.[0] || p.partName,
                    aw: p.arbeitswerte || 5
                })),
                ersatzteile: kalkWizardData.ersatzteile.map(e => ({
                    name: e.name,
                    preis: e.preis
                })),
                geschaetzteDauer: calculateTotalTime(),
                createdAt: new Date().toISOString()
            };

            try {
                if (!window.getCollection) {
                    throw new Error('getCollection nicht verfügbar');
                }
                await window.getCollection('kalkulation_templates').add(template);
                await loadTemplates();
                showToast('Template gespeichert!', 'success');
            } catch (error) {
                console.error('Fehler beim Speichern:', error);
                showToast('Fehler beim Speichern', 'error');
            }
        }

        async function deleteTemplate(id) {
            if (!confirm('Template wirklich löschen?')) return;

            try {
                if (!window.getCollection) {
                    throw new Error('getCollection nicht verfügbar');
                }
                await window.getCollection('kalkulation_templates').doc(id).delete();
                await loadTemplates();
                showToast('Template gelöscht', 'success');
            } catch (error) {
                console.error('Fehler beim Löschen:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }

        function calculateTotalTime() {
            const totalAW = kalkWizardData.selectedParts.reduce((sum, p) => sum + (p.arbeitswerte || 0), 0);
            const minutes = totalAW * 5; // 1 AW = 5 Min
            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;
            return hours > 0 ? `~${hours}h ${mins > 0 ? mins + 'min' : ''}` : `~${mins}min`;
        }

        // ============================================
        // LIEFERANTEN FUNKTIONEN
        // ============================================

        async function loadLieferanten() {
            try {
                if (!window.getCollection) {
                    console.log('⏳ Lieferanten: Warte auf getCollection...');
                    return;
                }
                const snapshot = await window.getCollection('lieferanten').get();
                lieferantenDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderEigeneLieferanten();
            } catch (error) {
                console.error('Fehler beim Laden der Lieferanten:', error);
            }
        }

        function renderEigeneLieferanten() {
            const container = document.getElementById('eigeneLieferantenListe');
            if (!container) return;

            if (lieferantenDB.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <i data-feather="truck"></i>
                        <h4>Keine eigenen Lieferanten</h4>
                        <p>Fügen Sie Ihre bevorzugten Lieferanten hinzu</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            container.innerHTML = lieferantenDB.map(l => `
                <div class="lieferant-card">
                    <div class="lieferant-card__logo">
                        <span style="font-size: 2rem;">${l.icon || '🏢'}</span>
                    </div>
                    <div class="lieferant-card__content">
                        <h4>${l.name}</h4>
                        <p>${l.beschreibung || ''}</p>
                        <div class="lieferant-card__meta">
                            ${l.telefon ? `<span><i data-feather="phone"></i> ${l.telefon}</span>` : ''}
                            ${l.website ? `<a href="${l.website}" target="_blank" class="btn btn-sm btn-secondary"><i data-feather="external-link"></i> Öffnen</a>` : ''}
                            <button class="btn btn-sm btn-secondary" onclick="deleteLieferant('${l.id}')" style="color: var(--color-error);"><i data-feather="trash-2"></i></button>
                        </div>
                    </div>
                </div>
            `).join('');
            feather.replace();
        }

        function searchPreisvergleich(query) {
            const container = document.getElementById('preisvergleichResult');
            if (!query || query.length < 2) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="search"></i>
                        <h4>Ersatzteil suchen</h4>
                        <p>Geben Sie den Namen oder die Teilenummer ein, um Preise zu vergleichen</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            const queryLower = query.toLowerCase();
            const matches = ersatzteileDB.filter(e =>
                e.name?.toLowerCase().includes(queryLower) ||
                e.teilenummer?.toLowerCase().includes(queryLower)
            ).slice(0, 10);

            if (matches.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i data-feather="alert-circle"></i>
                        <h4>Keine Treffer</h4>
                        <p>Versuchen Sie einen anderen Suchbegriff</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            container.innerHTML = matches.map(e => {
                const preise = e.lieferanten?.map(l => ({ name: l.name, preis: l.preis })) || [];
                if (e.preis && e.lieferant) {
                    preise.push({ name: e.lieferant, preis: e.preis });
                }
                const minPreis = preise.length > 0 ? Math.min(...preise.map(p => p.preis)) : null;

                return `
                    <div class="preisvergleich-item">
                        <div class="preisvergleich-item__info">
                            <h5>${e.name}</h5>
                            <p>${e.teilenummer || 'Keine Teilenummer'} | Ø ${e.durchschnittsPreis?.toFixed(2) || '?'} €</p>
                        </div>
                        <div class="preisvergleich-item__prices">
                            ${preise.map(p => `
                                <div class="preisvergleich-price ${p.preis === minPreis ? 'preisvergleich-price--best' : ''}">
                                    <div class="preisvergleich-price__label">${p.name}</div>
                                    <div class="preisvergleich-price__value">${p.preis?.toFixed(2)} €</div>
                                </div>
                            `).join('') || '<span class="text-muted">Keine Preise verfügbar</span>'}
                        </div>
                    </div>
                `;
            }).join('');
            feather.replace();
        }

        async function deleteLieferant(id) {
            if (!confirm('Lieferant wirklich löschen?')) return;

            try {
                if (!window.getCollection) {
                    throw new Error('getCollection nicht verfügbar');
                }
                await window.getCollection('lieferanten').doc(id).delete();
                await loadLieferanten();
                showToast('Lieferant gelöscht', 'success');
            } catch (error) {
                console.error('Fehler:', error);
                showToast('Fehler beim Löschen', 'error');
            }
        }

        // ============================================
        // KUNDEN FUNKTIONEN
        // ============================================

        async function loadKunden() {
            try {
                if (!window.getCollection) {
                    console.log('⏳ Kunden: Warte auf getCollection...');
                    return;
                }
                const snapshot = await window.getCollection('kalkulation_kunden')
                    .orderBy('letzteNutzung', 'desc')
                    .limit(50)
                    .get();
                kundenDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                renderKunden();
            } catch (error) {
                console.error('Fehler beim Laden der Kunden:', error);
            }
        }

        function renderKunden(filter = '') {
            const container = document.getElementById('kundenListe');
            if (!container) return;

            let filtered = kundenDB;
            if (filter) {
                const filterLower = filter.toLowerCase();
                filtered = kundenDB.filter(k =>
                    k.name?.toLowerCase().includes(filterLower) ||
                    k.fahrzeuge?.some(f =>
                        f.kennzeichen?.toLowerCase().includes(filterLower) ||
                        f.modell?.toLowerCase().includes(filterLower)
                    )
                );
            }

            if (filtered.length === 0) {
                container.innerHTML = `
                    <div class="empty-state" style="grid-column: 1/-1;">
                        <i data-feather="users"></i>
                        <h4>Keine Kunden ${filter ? 'gefunden' : 'vorhanden'}</h4>
                        <p>${filter ? 'Versuchen Sie einen anderen Suchbegriff' : 'Kunden werden automatisch aus abgeschlossenen Kalkulationen hinzugefügt'}</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            container.innerHTML = filtered.map(k => `
                <div class="kunde-card" onclick="selectKunde('${k.id}')">
                    <div class="kunde-card__header">
                        <h4 class="kunde-card__name">${k.name || 'Unbekannter Kunde'}</h4>
                        <span class="kunde-card__badge">${k.anzahlAuftraege || 0} Aufträge</span>
                    </div>
                    <div class="kunde-card__fahrzeuge">
                        ${(k.fahrzeuge || []).slice(0, 3).map(f => `
                            <div class="kunde-fahrzeug" onclick="event.stopPropagation(); selectKundeFahrzeug('${k.id}', '${f.kennzeichen}')">
                                <div class="kunde-fahrzeug__info">
                                    <span class="kunde-fahrzeug__kennzeichen">${f.kennzeichen}</span>
                                    <span class="kunde-fahrzeug__modell">${f.marke} ${f.modell}</span>
                                </div>
                                <span class="kunde-fahrzeug__count">${f.anzahlKalkulationen || 0}x</span>
                            </div>
                        `).join('')}
                        ${(k.fahrzeuge?.length || 0) > 3 ? `<span class="text-muted">+${k.fahrzeuge.length - 3} weitere</span>` : ''}
                    </div>
                </div>
            `).join('');
            feather.replace();
        }

        function filterKunden(query) {
            renderKunden(query);
        }

        function sortKunden(sortBy) {
            if (sortBy === 'name') {
                kundenDB.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else if (sortBy === 'count') {
                kundenDB.sort((a, b) => (b.anzahlAuftraege || 0) - (a.anzahlAuftraege || 0));
            } else {
                kundenDB.sort((a, b) => new Date(b.letzteNutzung || 0) - new Date(a.letzteNutzung || 0));
            }
            renderKunden();
        }

        function selectKunde(kundeId) {
            const kunde = kundenDB.find(k => k.id === kundeId);
            if (!kunde) return;

            // Wechsle zur Kalkulation und setze Kundendaten
            switchTab('kalkulation');
            showToast(`Kunde "${kunde.name}" ausgewählt - Bitte Fahrzeug wählen`, 'info');
        }

        function selectKundeFahrzeug(kundeId, kennzeichen) {
            const kunde = kundenDB.find(k => k.id === kundeId);
            const fahrzeug = kunde?.fahrzeuge?.find(f => f.kennzeichen === kennzeichen);

            if (!fahrzeug) return;

            // Setze Fahrzeugdaten in den Wizard
            kalkWizardData.fahrzeug = {
                kennzeichen: fahrzeug.kennzeichen,
                marke: fahrzeug.marke,
                modell: fahrzeug.modell
            };

            // Wechsle zu Step 2 (Service)
            switchTab('kalkulation');
            goToStep(2);
            updateStep2Header();
            showToast(`Fahrzeug "${fahrzeug.kennzeichen}" geladen`, 'success');
        }

        async function saveKundeFromKalkulation(kalkulationData) {
            if (!kalkulationData.fahrzeug?.kennzeichen) return;

            const kundenName = kalkulationData.kunde?.name || 'Unbekannt';
            const fahrzeugData = {
                kennzeichen: kalkulationData.fahrzeug.kennzeichen,
                marke: kalkulationData.fahrzeug.marke,
                modell: kalkulationData.fahrzeug.modell,
                anzahlKalkulationen: 1
            };

            try {
                if (!window.getCollection) {
                    console.log('⏳ saveKundeFromKalkulation: getCollection nicht verfügbar');
                    return;
                }

                // Suche existierenden Kunden
                const existingQuery = await window.getCollection('kalkulation_kunden')
                    .where('name', '==', kundenName)
                    .get();

                if (!existingQuery.empty) {
                    // Update existierenden Kunden
                    const existingDoc = existingQuery.docs[0];
                    const existingData = existingDoc.data();
                    let fahrzeuge = existingData.fahrzeuge || [];

                    const existingFzg = fahrzeuge.find(f => f.kennzeichen === fahrzeugData.kennzeichen);
                    if (existingFzg) {
                        existingFzg.anzahlKalkulationen = (existingFzg.anzahlKalkulationen || 0) + 1;
                    } else {
                        fahrzeuge.push(fahrzeugData);
                    }

                    await existingDoc.ref.update({
                        fahrzeuge: fahrzeuge,
                        anzahlAuftraege: (existingData.anzahlAuftraege || 0) + 1,
                        letzteNutzung: new Date().toISOString()
                    });
                } else {
                    // Neuen Kunden anlegen
                    await window.getCollection('kalkulation_kunden').add({
                        name: kundenName,
                        fahrzeuge: [fahrzeugData],
                        anzahlAuftraege: 1,
                        letzteNutzung: new Date().toISOString(),
                        createdAt: new Date().toISOString()
                    });
                }

                console.log('✅ Kunde gespeichert:', kundenName);
            } catch (error) {
                console.error('Fehler beim Speichern des Kunden:', error);
            }
        }

        // ============================================
        // PDF-EXPORT BESTELLLISTE
        // ============================================

        async function exportBestelllistePDF() {
            if (kalkWizardData.ersatzteile.length === 0) {
                showToast('Keine Ersatzteile zum Exportieren vorhanden', 'warning');
                return;
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            // Header
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            doc.text('Bestellliste Ersatzteile', 20, 20);

            // Fahrzeug-Info
            doc.setFontSize(11);
            doc.setFont(undefined, 'normal');
            if (kalkWizardData.fahrzeug) {
                doc.text(`Fahrzeug: ${kalkWizardData.fahrzeug.marke || ''} ${kalkWizardData.fahrzeug.modell || ''}`, 20, 30);
                doc.text(`Kennzeichen: ${kalkWizardData.fahrzeug.kennzeichen || '-'}`, 20, 36);
            }

            doc.text(`Datum: ${new Date().toLocaleDateString('de-DE')}`, 20, 42);

            // Tabelle
            let y = 55;
            doc.setFillColor(240, 240, 240);
            doc.rect(20, y - 5, 170, 8, 'F');

            doc.setFontSize(10);
            doc.setFont(undefined, 'bold');
            doc.text('Nr.', 22, y);
            doc.text('Bezeichnung', 32, y);
            doc.text('Teilenummer', 100, y);
            doc.text('Menge', 140, y);
            doc.text('Preis', 160, y);

            doc.setFont(undefined, 'normal');
            y += 10;

            let gesamtPreis = 0;
            kalkWizardData.ersatzteile.forEach((e, index) => {
                const einzelPreis = (e.preis || 0) * (e.menge || 1);
                gesamtPreis += einzelPreis;

                doc.text(String(index + 1), 22, y);
                doc.text(e.name?.substring(0, 35) || '-', 32, y);
                doc.text(e.teilenummer?.substring(0, 20) || '-', 100, y);
                doc.text(String(e.menge || 1), 142, y);
                doc.text(`${einzelPreis.toFixed(2)} €`, 160, y);

                y += 7;

                if (y > 270) {
                    doc.addPage();
                    y = 20;
                }
            });

            // Summe
            y += 5;
            doc.line(20, y, 190, y);
            y += 8;
            doc.setFont(undefined, 'bold');
            doc.text('Gesamt (Netto):', 130, y);
            doc.text(`${gesamtPreis.toFixed(2)} €`, 160, y);

            // Speichern
            const fileName = `Bestellliste_${kalkWizardData.fahrzeug?.kennzeichen || 'Unbekannt'}_${new Date().toISOString().split('T')[0]}.pdf`;
            doc.save(fileName);
            showToast('Bestellliste als PDF exportiert', 'success');
        }

        // ============================================
        // KI-PREISVORSCHLAG
        // ============================================

        function getKIPreisvorschlag(ersatzteilName) {
            // Suche in der Datenbank nach ähnlichen Teilen
            const queryLower = ersatzteilName.toLowerCase();
            const matches = ersatzteileDB.filter(e =>
                e.name?.toLowerCase().includes(queryLower)
            );

            if (matches.length === 0) return null;

            // Berechne Durchschnittspreis aus allen Matches
            const preise = matches
                .filter(e => e.durchschnittsPreis || e.preis)
                .map(e => e.durchschnittsPreis || e.preis);

            if (preise.length === 0) return null;

            const avgPreis = preise.reduce((a, b) => a + b, 0) / preise.length;
            const minPreis = Math.min(...preise);
            const maxPreis = Math.max(...preise);

            return {
                vorschlag: avgPreis,
                min: minPreis,
                max: maxPreis,
                basierend: matches.length
            };
        }

        function showKIPreisvorschlag(inputId) {
            const input = document.getElementById(inputId);
            if (!input) return;

            const nameInput = document.getElementById(inputId.replace('Preis', 'Name'));
            const ersatzteilName = nameInput?.value;

            if (!ersatzteilName || ersatzteilName.length < 3) {
                showToast('Bitte zuerst einen Teilenamen eingeben', 'info');
                return;
            }

            const vorschlag = getKIPreisvorschlag(ersatzteilName);

            if (!vorschlag) {
                showToast('Keine Preisdaten für dieses Teil verfügbar', 'info');
                return;
            }

            const confirmMsg = `KI-Preisvorschlag für "${ersatzteilName}":\n\n` +
                `Empfohlen: ${vorschlag.vorschlag.toFixed(2)} €\n` +
                `(Min: ${vorschlag.min.toFixed(2)} € / Max: ${vorschlag.max.toFixed(2)} €)\n` +
                `Basierend auf ${vorschlag.basierend} ähnlichen Teilen.\n\n` +
                `Diesen Preis übernehmen?`;

            if (confirm(confirmMsg)) {
                input.value = vorschlag.vorschlag.toFixed(2);
                showToast('Preis übernommen', 'success');
            }
        }

        // ============================================
        // KI FOTO-ANALYSE FUNKTIONEN
        // ============================================

        let uploadedFotos = [];
        let kiErkannteSchaeden = [];

        function initFotoDropzone() {
            const dropzone = document.getElementById('fotoDropzone');
            if (!dropzone) return;

            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                const files = e.dataTransfer.files;
                handleFotoUpload(files);
            });
        }

        async function handleFotoUpload(files) {
            if (!files || files.length === 0) return;

            const preview = document.getElementById('fotoPreview');
            uploadedFotos = [];

            // Fotos anzeigen
            preview.innerHTML = '';
            for (const file of files) {
                if (!file.type.startsWith('image/')) continue;

                const reader = new FileReader();
                reader.onload = (e) => {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                    uploadedFotos.push(e.target.result);
                };
                reader.readAsDataURL(file);
            }

            // Kurze Verzögerung, dann KI-Analyse starten
            setTimeout(() => {
                if (uploadedFotos.length > 0) {
                    analyzeWithKI();
                }
            }, 500);
        }

        async function analyzeWithKI() {
            const loading = document.getElementById('kiAnalyseLoading');
            const result = document.getElementById('kiAnalyseResult');

            loading.style.display = 'block';
            result.style.display = 'none';

            try {
                // OpenAI API Key aus SettingsManager oder Firestore laden
                let apiKey = '';
                if (window.settingsManager?.currentSettings?.systemConfig?.openaiKey) {
                    apiKey = window.settingsManager.currentSettings.systemConfig.openaiKey;
                    console.log('✅ API-Key aus settingsManager geladen');
                } else {
                    // Fallback: Direkt aus Firestore laden via Multi-Tenant Helper
                    console.log('📥 Lade API-Key aus Firestore via getCollection()');
                    const settingsDoc = await window.getCollection('einstellungen').doc('config').get();
                    if (settingsDoc.exists) {
                        apiKey = settingsDoc.data()?.systemConfig?.openaiKey || '';
                        console.log('✅ API-Key aus Firestore geladen');
                    }
                }

                if (!apiKey) {
                    throw new Error('OpenAI API-Key nicht konfiguriert. Bitte in Admin-Einstellungen hinterlegen.');
                }

                // Bilder für GPT-4 Vision vorbereiten (max 4 Bilder)
                const imagesToAnalyze = uploadedFotos.slice(0, 4);

                const imageContents = imagesToAnalyze.map(base64 => ({
                    type: 'image_url',
                    image_url: {
                        url: base64,
                        detail: 'high'
                    }
                }));

                // GPT-4 Vision API aufrufen
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o',
                        messages: [
                            {
                                role: 'system',
                                content: `Du bist ein Experte für Fahrzeugschaden-Analyse in einer Lackierwerkstatt.
Analysiere die Bilder und identifiziere alle sichtbaren Schäden am Fahrzeug.

WICHTIG: Antworte NUR im folgenden JSON-Format (keine Markdown, keine Erklärungen):
{
  "schaeden": [
    {
      "teil": "Bezeichnung des Fahrzeugteils (z.B. Stoßfänger vorne, Kotflügel links, Motorhaube)",
      "schaden": "Art des Schadens (z.B. Kratzer, Delle, Steinschlag, Rost, Riss, Lackabplatzer)",
      "schweregrad": "leicht/mittel/schwer",
      "repairType": "lackieren/ausbeulen/spotrepair/ersetzen/polieren",
      "confidence": 0.0-1.0
    }
  ],
  "zusammenfassung": "Kurze Zusammenfassung des Gesamtschadens"
}

Fahrzeugteile die du erkennen kannst:
- Stoßfänger vorne/hinten
- Kotflügel links/rechts vorne/hinten
- Motorhaube, Dach, Kofferraum
- Türen (Fahrertür, Beifahrertür, hinten links/rechts)
- Schweller links/rechts
- A-Säule, B-Säule, C-Säule
- Außenspiegel links/rechts
- Felgen/Räder`
                            },
                            {
                                role: 'user',
                                content: [
                                    {
                                        type: 'text',
                                        text: 'Analysiere diese Fahrzeugbilder und identifiziere alle sichtbaren Schäden. Gib das Ergebnis als JSON zurück.'
                                    },
                                    ...imageContents
                                ]
                            }
                        ],
                        max_tokens: 1500,
                        temperature: 0.3
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error?.message || 'API-Fehler');
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';

                // JSON aus der Antwort extrahieren
                let analysisResult;
                try {
                    // Versuche direkt zu parsen
                    analysisResult = JSON.parse(content);
                } catch {
                    // Fallback: JSON aus Markdown-Block extrahieren
                    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) ||
                                     content.match(/\{[\s\S]*"schaeden"[\s\S]*\}/);
                    if (jsonMatch) {
                        analysisResult = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                    } else {
                        throw new Error('Konnte KI-Antwort nicht parsen');
                    }
                }

                // Ergebnisse in das erwartete Format konvertieren
                kiErkannteSchaeden = (analysisResult.schaeden || []).map(s => ({
                    teil: s.teil,
                    schaden: s.schaden,
                    schweregrad: s.schweregrad || 'mittel',
                    confidence: s.confidence || 0.8,
                    repairType: s.repairType || 'lackieren'
                }));

                if (kiErkannteSchaeden.length === 0) {
                    showToast('Keine eindeutigen Schäden erkannt. Bitte andere Bilder hochladen.', 'info');
                } else {
                    // Zusammenfassung anzeigen wenn vorhanden
                    if (analysisResult.zusammenfassung) {
                        console.log('📋 KI-Zusammenfassung:', analysisResult.zusammenfassung);
                    }
                    showToast(`${kiErkannteSchaeden.length} Schäden erkannt!`, 'success');
                }

                renderKIErgebnisse();

            } catch (error) {
                console.error('❌ KI-Analyse Fehler:', error);
                showToast(`KI-Analyse fehlgeschlagen: ${error.message}`, 'error');

                // Fallback: Zeige Hinweis zur manuellen Eingabe
                kiErkannteSchaeden = [];
                const liste = document.getElementById('kiSchaedenListe');
                if (liste) {
                    liste.innerHTML = `
                        <div class="empty-state" style="padding: var(--space-4);">
                            <i data-feather="alert-circle"></i>
                            <p>${error.message}</p>
                            <p class="text-muted">Bitte wählen Sie die beschädigten Teile manuell in der 2D-Ansicht aus.</p>
                        </div>
                    `;
                    feather.replace();
                }
            }

            loading.style.display = 'none';
            result.style.display = 'block';
            feather.replace();
        }

        function renderKIErgebnisse() {
            const liste = document.getElementById('kiSchaedenListe');
            if (!liste) return;

            if (kiErkannteSchaeden.length === 0) {
                liste.innerHTML = `
                    <div class="empty-state" style="padding: var(--space-4);">
                        <i data-feather="image"></i>
                        <p>Keine Schäden erkannt</p>
                    </div>
                `;
                feather.replace();
                return;
            }

            const schwereIcons = {
                'leicht': '🟢',
                'mittel': '🟡',
                'schwer': '🔴'
            };

            const repairLabels = {
                'lackieren': '🎨 Lackieren',
                'ausbeulen': '🔧 Ausbeulen (PDR)',
                'spotrepair': '✨ Spot-Repair',
                'ersetzen': '🔄 Ersetzen',
                'polieren': '💫 Polieren'
            };

            liste.innerHTML = kiErkannteSchaeden.map((schaden, index) => {
                const confidenceClass = schaden.confidence >= 0.85 ? 'high' :
                                       schaden.confidence >= 0.7 ? 'medium' : 'low';
                const schwereIcon = schwereIcons[schaden.schweregrad] || '🟡';
                const repairLabel = repairLabels[schaden.repairType] || schaden.repairType;

                return `
                    <div class="ki-schaden-item">
                        <div class="ki-schaden-item__info">
                            <input type="checkbox" id="kiSchaden${index}" checked>
                            <label for="kiSchaden${index}">
                                <strong>${schaden.teil}</strong> - ${schaden.schaden}
                                <br><small>${schwereIcon} ${schaden.schweregrad || 'mittel'} | ${repairLabel}</small>
                            </label>
                        </div>
                        <span class="ki-schaden-item__confidence ki-schaden-item__confidence--${confidenceClass}">
                            ${Math.round(schaden.confidence * 100)}%
                        </span>
                    </div>
                `;
            }).join('');
            feather.replace();
        }

        function applyKISchaeden() {
            // Ausgewählte Schäden in den Wizard übernehmen
            const selectedSchaeden = [];

            kiErkannteSchaeden.forEach((schaden, index) => {
                const checkbox = document.getElementById(`kiSchaden${index}`);
                if (checkbox?.checked) {
                    selectedSchaeden.push(schaden);

                    // Teil zum Wizard hinzufügen
                    selectVehiclePartNew(schaden.teil, null);
                }
            });

            if (selectedSchaeden.length > 0) {
                showToast(`${selectedSchaeden.length} Schäden übernommen - Bitte Reparaturart wählen`, 'success');
                // Zur 2D-Ansicht wechseln, um die ausgewählten Teile zu sehen
                switchVehicleView('2d');
            } else {
                showToast('Keine Schäden ausgewählt', 'warning');
            }
        }

        // Initialisiert Klick-Handler für alle vehicle-part SVG-Elemente
        function initVehiclePartClickHandlers() {
            const svgParts = document.querySelectorAll('.vehicle-part[data-part]');
            console.log(`🚗 ${svgParts.length} Fahrzeugteile gefunden für 2D-Ansicht`);

            svgParts.forEach(part => {
                part.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const partName = this.getAttribute('data-part');
                    if (partName) {
                        selectVehiclePartNew(partName, this);
                        showToast(`Teil "${partName}" ausgewählt`, 'success');
                    }
                });

                // Hover-Tooltip
                part.addEventListener('mouseenter', function() {
                    const partName = this.getAttribute('data-part');
                    this.style.cursor = 'pointer';
                    // Optional: Tooltip anzeigen
                });
            });
        }
