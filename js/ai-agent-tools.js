/**
 * ============================================
 * AI AGENT TOOLS - Function Registry
 * ============================================
 *
 * Provides tools that the AI Agent can call to interact with the app.
 * Each tool has:
 * - Implementation function
 * - OpenAI function schema for Function Calling
 * - Multi-tenant awareness (uses window.getCollection())
 *
 * Architecture: OpenAI GPT-4 Function Calling Pattern
 * Language: German (responses and documentation)
 */

// ============================================
// TOOL 1: CREATE FAHRZEUG
// ============================================

/**
 * Creates a new vehicle entry in Firestore
 * @param {Object} params - Vehicle parameters
 * @returns {Promise<Object>} Result with success status and vehicle ID
 */
async function createFahrzeug(params) {
    try {
        const {
            kennzeichen,
            marke,
            modell,
            serviceTyp,
            kundenName,
            kundenEmail,
            kundenTelefon,
            beschreibung
        } = params;

        // Validation
        if (!kennzeichen || !marke || !serviceTyp || !kundenName) {
            throw new Error('Pflichtfelder fehlen: kennzeichen, marke, serviceTyp, kundenName sind erforderlich');
        }

        // Valid service types
        const validServices = ['lackier', 'reifen', 'mechanik', 'pflege', 'tuev', 'versicherung'];
        if (!validServices.includes(serviceTyp)) {
            throw new Error(`Ungültiger serviceTyp: ${serviceTyp}. Erlaubt: ${validServices.join(', ')}`);
        }

        // Create vehicle data
        const vehicleData = {
            kennzeichen: kennzeichen.toUpperCase(),
            marke: marke,
            modell: modell || '',
            serviceTyp: serviceTyp,
            kundenName: kundenName,
            kundenEmail: kundenEmail || '',
            kundenTelefon: kundenTelefon || '',
            beschreibung: beschreibung || '',
            status: 'neu',
            prozessStatus: getInitialProzessStatus(serviceTyp),
            timestamp: Date.now(),
            createdBy: 'KI-Agent',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use multi-tenant collection
        const fahrzeugeCollection = window.getCollection('fahrzeuge');
        const docRef = await fahrzeugeCollection.add(vehicleData);

        console.log(`✅ KI-Agent: Fahrzeug erstellt - ID: ${docRef.id}, Kennzeichen: ${kennzeichen}`);

        // Dispatch event for real-time UI updates
        if (window.appEvents) {
            window.appEvents.fahrzeugCreated({
                id: docRef.id,
                ...vehicleData
            });
        }

        return {
            success: true,
            message: `Fahrzeug ${kennzeichen} wurde erfolgreich erstellt!`,
            vehicleId: docRef.id,
            data: vehicleData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei createFahrzeug:', error);
        return {
            success: false,
            message: `Fehler beim Erstellen: ${error.message}`,
            error: error.message
        };
    }
}

/**
 * Get initial process status based on service type
 */
function getInitialProzessStatus(serviceTyp) {
    const initialStatus = {
        'lackier': 'neu',
        'reifen': 'neu',
        'mechanik': 'neu',
        'pflege': 'neu',
        'tuev': 'neu',
        'versicherung': 'neu'
    };
    return initialStatus[serviceTyp] || 'neu';
}

// ============================================
// TOOL 2: UPDATE FAHRZEUG STATUS
// ============================================

/**
 * Updates vehicle status in Firestore
 * @param {Object} params - Update parameters
 * @returns {Promise<Object>} Result with success status
 */
async function updateFahrzeugStatus(params) {
    try {
        const { vehicleId, status, prozessStatus, notizen } = params;

        if (!vehicleId) {
            throw new Error('vehicleId ist erforderlich');
        }

        // DELEGATION: Wenn kanban.html updateFahrzeugStatus verfügbar ist, delegiere dorthin
        // Dies stellt sicher, dass Photo Modal und alle Arbeitsschritte-Logik funktioniert
        if (typeof window.updateFahrzeugStatusKanban === 'function') {
            console.log('🔄 KI-Agent: Delegiere an kanban.html updateFahrzeugStatus');
            const newStatus = prozessStatus || status;
            await window.updateFahrzeugStatusKanban(vehicleId, newStatus);

            return {
                success: true,
                message: `Status wurde erfolgreich aktualisiert (via Kanban)!`,
                vehicleId: vehicleId,
                status: newStatus
            };
        }

        // FALLBACK: Direkte Firestore-Update (wenn nicht auf kanban.html Seite)
        console.log('ℹ️ KI-Agent: Direkte Firestore-Update (kein Kanban-Delegation)');

        // Prepare update data
        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'KI-Agent'
        };

        if (status) {
            updateData.status = status;
        }

        if (prozessStatus) {
            updateData.prozessStatus = prozessStatus;
        }

        if (notizen) {
            updateData.notizen = notizen;
        }

        // Use multi-tenant collection
        const fahrzeugeCollection = window.getCollection('fahrzeuge');
        await fahrzeugeCollection.doc(String(vehicleId)).update(updateData);

        console.log(`✅ KI-Agent: Status aktualisiert - ID: ${vehicleId}`, updateData);

        // Dispatch event for real-time UI updates
        if (window.appEvents) {
            window.appEvents.fahrzeugUpdated(vehicleId, updateData);
        }

        return {
            success: true,
            message: `Status wurde erfolgreich aktualisiert!`,
            vehicleId: vehicleId,
            updates: updateData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei updateFahrzeugStatus:', error);
        return {
            success: false,
            message: `Fehler beim Aktualisieren: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 3: GET FAHRZEUGE (QUERY)
// ============================================

/**
 * Queries vehicles from Firestore with optional filters
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Result with vehicles array
 */
async function getFahrzeuge(params = {}) {
    try {
        const {
            kennzeichen,
            status,
            serviceTyp,
            kundenName,
            limit = 10
        } = params;

        // Use multi-tenant collection
        let query = window.getCollection('fahrzeuge');

        // Apply filters
        if (kennzeichen) {
            query = query.where('kennzeichen', '==', kennzeichen.toUpperCase());
        }

        if (status) {
            query = query.where('status', '==', status);
        }

        if (serviceTyp) {
            query = query.where('serviceTyp', '==', serviceTyp);
        }

        if (kundenName) {
            query = query.where('kundenName', '==', kundenName);
        }

        // Order by timestamp and limit
        query = query.orderBy('timestamp', 'desc').limit(limit);

        const snapshot = await query.get();
        const vehicles = [];

        snapshot.forEach(doc => {
            vehicles.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ KI-Agent: ${vehicles.length} Fahrzeuge gefunden`);

        return {
            success: true,
            message: `${vehicles.length} Fahrzeug(e) gefunden`,
            count: vehicles.length,
            vehicles: vehicles
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei getFahrzeuge:', error);
        return {
            success: false,
            message: `Fehler bei der Suche: ${error.message}`,
            error: error.message,
            vehicles: []
        };
    }
}

// ============================================
// TOOL 4: NAVIGATE TO PAGE
// ============================================

/**
 * Navigates to specific pages in the app
 * @param {Object} params - Navigation parameters
 * @returns {Promise<Object>} Result with success status
 */
async function navigateToPage(params) {
    try {
        const { page, vehicleId, mode } = params;

        const validPages = {
            'annahme': 'annahme.html',
            'liste': 'liste.html',
            'kanban': 'kanban.html',
            'kunden': 'kunden.html',
            'abnahme': 'abnahme.html',
            'kalender': 'kalender.html',
            'material': 'material.html',
            'dashboard': 'index.html'
        };

        if (!validPages[page]) {
            throw new Error(`Ungültige Seite: ${page}. Erlaubt: ${Object.keys(validPages).join(', ')}`);
        }

        let url = validPages[page];

        // Add parameters if needed
        if (vehicleId) {
            url += `?id=${vehicleId}`;
        }

        if (mode) {
            url += vehicleId ? `&mode=${mode}` : `?mode=${mode}`;
        }

        // Navigate
        window.location.href = url;

        console.log(`✅ KI-Agent: Navigation zu ${page} (${url})`);

        return {
            success: true,
            message: `Navigation zu ${page} erfolgreich`,
            url: url
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei navigateToPage:', error);
        return {
            success: false,
            message: `Navigationsfehler: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 5: SEARCH YOUTUBE
// ============================================

/**
 * Opens YouTube search for tutorial videos
 * @param {Object} params - Search parameters
 * @returns {Promise<Object>} Result with success status
 */
async function searchYouTube(params) {
    try {
        const { query } = params;

        if (!query) {
            throw new Error('Suchbegriff (query) ist erforderlich');
        }

        // Build YouTube search URL
        const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

        // Open in new tab
        window.open(searchUrl, '_blank');

        console.log(`✅ KI-Agent: YouTube-Suche geöffnet - Query: ${query}`);

        return {
            success: true,
            message: `YouTube-Suche für "${query}" wurde geöffnet`,
            url: searchUrl,
            query: query
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei searchYouTube:', error);
        return {
            success: false,
            message: `Fehler bei YouTube-Suche: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 6: CREATE KUNDE
// ============================================

/**
 * Creates a new customer entry in Firestore
 * @param {Object} params - Customer parameters
 * @returns {Promise<Object>} Result with success status and customer ID
 */
async function createKunde(params) {
    try {
        const {
            name,
            email,
            telefon,
            adresse,
            plz,
            ort,
            notizen
        } = params;

        // Validation
        if (!name || !telefon) {
            throw new Error('Pflichtfelder fehlen: name und telefon sind erforderlich');
        }

        // Create customer data
        const kundeData = {
            name: name,
            email: email || '',
            telefon: telefon,
            adresse: adresse || '',
            plz: plz || '',
            ort: ort || '',
            notizen: notizen || '',
            besuche: 1,
            letzterBesuch: Date.now(),
            timestamp: Date.now(),
            createdBy: 'KI-Agent',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use multi-tenant collection
        const kundenCollection = window.getCollection('kunden');
        const docRef = await kundenCollection.add(kundeData);

        console.log(`✅ KI-Agent: Kunde erstellt - ID: ${docRef.id}, Name: ${name}`);

        // Dispatch event for real-time UI updates
        if (window.appEvents) {
            window.appEvents.kundeCreated({
                id: docRef.id,
                ...kundeData
            });
        }

        return {
            success: true,
            message: `Kunde ${name} wurde erfolgreich erstellt!`,
            kundeId: docRef.id,
            data: kundeData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei createKunde:', error);
        return {
            success: false,
            message: `Fehler beim Erstellen des Kunden: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 7: CREATE TERMIN
// ============================================

/**
 * Creates a new calendar appointment in Firestore
 * @param {Object} params - Appointment parameters
 * @returns {Promise<Object>} Result with success status and appointment ID
 */
async function createTermin(params) {
    try {
        const {
            fahrzeugId,
            kennzeichen,
            datum,
            uhrzeit,
            typ,
            notizen
        } = params;

        // Validation
        if (!datum) {
            throw new Error('Datum ist erforderlich');
        }

        // Parse date (accepts multiple formats)
        let terminDate;
        if (typeof datum === 'string') {
            // Try to parse German date formats
            terminDate = parseGermanDate(datum);
        } else if (datum instanceof Date) {
            terminDate = datum;
        } else {
            throw new Error('Ungültiges Datumsformat');
        }

        // Parse time if provided
        let terminZeit = uhrzeit || '09:00';

        // Create appointment data
        const terminData = {
            fahrzeugId: fahrzeugId || null,
            kennzeichen: kennzeichen ? kennzeichen.toUpperCase() : '',
            datum: terminDate.toISOString().split('T')[0], // YYYY-MM-DD
            uhrzeit: terminZeit,
            typ: typ || 'abnahme',
            notizen: notizen || '',
            status: 'geplant',
            timestamp: Date.now(),
            createdBy: 'KI-Agent',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Use multi-tenant collection
        const kalenderCollection = window.getCollection('kalender');
        const docRef = await kalenderCollection.add(terminData);

        console.log(`✅ KI-Agent: Termin erstellt - ID: ${docRef.id}, Datum: ${terminData.datum} ${terminData.uhrzeit}`);

        // Dispatch event for real-time UI updates
        if (window.appEvents) {
            window.appEvents.terminCreated({
                id: docRef.id,
                ...terminData
            });
        }

        return {
            success: true,
            message: `Termin am ${terminData.datum} um ${terminData.uhrzeit} wurde erstellt!`,
            terminId: docRef.id,
            data: terminData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei createTermin:', error);
        return {
            success: false,
            message: `Fehler beim Erstellen des Termins: ${error.message}`,
            error: error.message
        };
    }
}

/**
 * Parse German date string to Date object
 * Supports formats: "morgen", "übermorgen", "Freitag", "28.10.", "28.10.2025"
 */
function parseGermanDate(dateStr) {
    const str = dateStr.toLowerCase().trim();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Relative dates
    if (str === 'heute') {
        return today;
    }
    if (str === 'morgen') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow;
    }
    if (str === 'übermorgen' || str === 'uebermorgen') {
        const dayAfter = new Date(today);
        dayAfter.setDate(dayAfter.getDate() + 2);
        return dayAfter;
    }

    // Weekdays
    const weekdays = {
        'montag': 1, 'dienstag': 2, 'mittwoch': 3, 'donnerstag': 4,
        'freitag': 5, 'samstag': 6, 'sonntag': 0
    };
    if (weekdays.hasOwnProperty(str)) {
        const targetDay = weekdays[str];
        const currentDay = today.getDay();
        let daysToAdd = targetDay - currentDay;
        if (daysToAdd <= 0) daysToAdd += 7; // Next occurrence
        const result = new Date(today);
        result.setDate(result.getDate() + daysToAdd);
        return result;
    }

    // DD.MM. format
    const ddmmMatch = str.match(/(\d{1,2})\.(\d{1,2})\.?$/);
    if (ddmmMatch) {
        const day = parseInt(ddmmMatch[1]);
        const month = parseInt(ddmmMatch[2]) - 1;
        const year = today.getFullYear();
        return new Date(year, month, day);
    }

    // DD.MM.YYYY format
    const ddmmyyyyMatch = str.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (ddmmyyyyMatch) {
        const day = parseInt(ddmmyyyyMatch[1]);
        const month = parseInt(ddmmyyyyMatch[2]) - 1;
        const year = parseInt(ddmmyyyyMatch[3]);
        return new Date(year, month, day);
    }

    // ISO format
    const isoDate = new Date(dateStr);
    if (!isNaN(isoDate.getTime())) {
        return isoDate;
    }

    throw new Error(`Konnte Datum nicht parsen: ${dateStr}`);
}

// ============================================
// TOOL 8: GET TERMINE
// ============================================

/**
 * Retrieves calendar appointments with optional filters
 * @param {Object} params - Filter parameters
 * @returns {Promise<Object>} Result with appointments list
 */
async function getTermine(params) {
    try {
        const {
            fahrzeugId,
            kennzeichen,
            datum,
            zeitraum,
            status,
            limit
        } = params;

        // Use multi-tenant collection
        const kalenderCollection = window.getCollection('kalender');
        let query = kalenderCollection;

        // Apply filters
        if (fahrzeugId) {
            query = query.where('fahrzeugId', '==', fahrzeugId);
        }

        if (kennzeichen) {
            query = query.where('kennzeichen', '==', kennzeichen.toUpperCase());
        }

        if (status) {
            query = query.where('status', '==', status);
        }

        // Date range filter
        if (zeitraum) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (zeitraum === 'heute') {
                const dateStr = today.toISOString().split('T')[0];
                query = query.where('datum', '==', dateStr);
            } else if (zeitraum === 'diese_woche') {
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

                const startStr = startOfWeek.toISOString().split('T')[0];
                const endStr = endOfWeek.toISOString().split('T')[0];

                query = query.where('datum', '>=', startStr).where('datum', '<=', endStr);
            } else if (zeitraum === 'naechste_woche') {
                const nextWeekStart = new Date(today);
                nextWeekStart.setDate(today.getDate() + (8 - today.getDay())); // Next Monday
                const nextWeekEnd = new Date(nextWeekStart);
                nextWeekEnd.setDate(nextWeekStart.getDate() + 6);

                const startStr = nextWeekStart.toISOString().split('T')[0];
                const endStr = nextWeekEnd.toISOString().split('T')[0];

                query = query.where('datum', '>=', startStr).where('datum', '<=', endStr);
            }
        } else if (datum) {
            // Specific date
            const parsedDate = parseGermanDate(datum);
            const dateStr = parsedDate.toISOString().split('T')[0];
            query = query.where('datum', '==', dateStr);
        }

        // Order by date and time
        query = query.orderBy('datum', 'asc').orderBy('uhrzeit', 'asc');

        // Limit results
        if (limit && limit > 0) {
            query = query.limit(limit);
        } else {
            query = query.limit(50); // Default limit
        }

        const snapshot = await query.get();
        const termine = [];

        snapshot.forEach(doc => {
            termine.push({
                id: doc.id,
                ...doc.data()
            });
        });

        console.log(`✅ KI-Agent: ${termine.length} Termin(e) gefunden`);

        return {
            success: true,
            message: `${termine.length} Termin(e) gefunden`,
            count: termine.length,
            termine: termine
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei getTermine:', error);
        return {
            success: false,
            message: `Fehler beim Abrufen der Termine: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 9: UPDATE TERMIN
// ============================================

/**
 * Updates an existing calendar appointment
 * @param {Object} params - Update parameters
 * @returns {Promise<Object>} Result with success status
 */
async function updateTermin(params) {
    try {
        const {
            terminId,
            datum,
            uhrzeit,
            status,
            notizen
        } = params;

        // Validation
        if (!terminId) {
            throw new Error('terminId ist erforderlich');
        }

        // Prepare update data
        const updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: 'KI-Agent'
        };

        if (datum) {
            const parsedDate = parseGermanDate(datum);
            updateData.datum = parsedDate.toISOString().split('T')[0];
        }

        if (uhrzeit) {
            updateData.uhrzeit = uhrzeit;
        }

        if (status) {
            updateData.status = status;
        }

        if (notizen !== undefined) {
            updateData.notizen = notizen;
        }

        // Use multi-tenant collection
        const kalenderCollection = window.getCollection('kalender');
        await kalenderCollection.doc(terminId).update(updateData);

        console.log(`✅ KI-Agent: Termin aktualisiert - ID: ${terminId}`);

        // Dispatch event for real-time UI updates
        if (window.appEvents) {
            window.appEvents.terminUpdated(terminId, updateData);
        }

        return {
            success: true,
            message: 'Termin wurde erfolgreich aktualisiert!',
            terminId: terminId,
            updates: updateData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei updateTermin:', error);
        return {
            success: false,
            message: `Fehler beim Aktualisieren des Termins: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// OPENAI FUNCTION SCHEMAS
// ============================================

/**
 * Tool definitions for OpenAI Function Calling
 * These schemas tell GPT-4 what parameters each tool accepts
 */
const AI_TOOLS = [
    {
        type: "function",
        function: {
            name: "createFahrzeug",
            description: "Erstellt ein neues Fahrzeug in der Datenbank. Verwende dies, wenn der Benutzer ein neues Fahrzeug aufnehmen möchte.",
            parameters: {
                type: "object",
                properties: {
                    kennzeichen: {
                        type: "string",
                        description: "Kfz-Kennzeichen (z.B. HD-AB-1234)"
                    },
                    marke: {
                        type: "string",
                        description: "Fahrzeugmarke (z.B. Mercedes, BMW, VW)"
                    },
                    modell: {
                        type: "string",
                        description: "Fahrzeugmodell (z.B. G-Klasse, 3er, Golf)"
                    },
                    serviceTyp: {
                        type: "string",
                        enum: ["lackier", "reifen", "mechanik", "pflege", "tuev", "versicherung"],
                        description: "Art des Services: lackier, reifen, mechanik, pflege, tuev, versicherung"
                    },
                    kundenName: {
                        type: "string",
                        description: "Name des Kunden"
                    },
                    kundenEmail: {
                        type: "string",
                        description: "E-Mail-Adresse des Kunden (optional)"
                    },
                    kundenTelefon: {
                        type: "string",
                        description: "Telefonnummer des Kunden (optional)"
                    },
                    beschreibung: {
                        type: "string",
                        description: "Beschreibung des Auftrags (optional)"
                    }
                },
                required: ["kennzeichen", "marke", "serviceTyp", "kundenName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateFahrzeugStatus",
            description: "Aktualisiert den Status eines Fahrzeugs. Verwende dies, um den Bearbeitungsstand zu ändern.",
            parameters: {
                type: "object",
                properties: {
                    vehicleId: {
                        type: "string",
                        description: "Firestore Document ID des Fahrzeugs"
                    },
                    status: {
                        type: "string",
                        enum: ["neu", "warte_kva", "kva_gesendet", "beauftragt", "terminiert", "in_arbeit", "qualitaetskontrolle", "fertig", "abgeholt"],
                        description: "Hauptstatus des Fahrzeugs"
                    },
                    prozessStatus: {
                        type: "string",
                        description: "Service-spezifischer Prozess-Status (abhängig vom serviceTyp)"
                    },
                    notizen: {
                        type: "string",
                        description: "Zusätzliche Notizen zur Statusänderung (optional)"
                    }
                },
                required: ["vehicleId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getFahrzeuge",
            description: "Sucht Fahrzeuge in der Datenbank. Kann mit Filtern eingeschränkt werden.",
            parameters: {
                type: "object",
                properties: {
                    kennzeichen: {
                        type: "string",
                        description: "Filter nach Kennzeichen (optional)"
                    },
                    status: {
                        type: "string",
                        description: "Filter nach Status (optional)"
                    },
                    serviceTyp: {
                        type: "string",
                        enum: ["lackier", "reifen", "mechanik", "pflege", "tuev", "versicherung"],
                        description: "Filter nach Service-Typ (optional)"
                    },
                    kundenName: {
                        type: "string",
                        description: "Filter nach Kundenname (optional)"
                    },
                    limit: {
                        type: "number",
                        description: "Maximale Anzahl Ergebnisse (Standard: 10)"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "navigateToPage",
            description: "Navigiert zu einer bestimmten Seite in der App. Verwende dies, um den Benutzer zu führen.",
            parameters: {
                type: "object",
                properties: {
                    page: {
                        type: "string",
                        enum: ["annahme", "liste", "kanban", "kunden", "abnahme", "kalender", "material", "dashboard"],
                        description: "Zielseite: annahme, liste, kanban, kunden, abnahme, kalender, material, dashboard"
                    },
                    vehicleId: {
                        type: "string",
                        description: "Fahrzeug-ID für Detail-Ansicht (optional)"
                    },
                    mode: {
                        type: "string",
                        description: "Ansichtsmodus (z.B. 'quickview', 'edit') (optional)"
                    }
                },
                required: ["page"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "searchYouTube",
            description: "Öffnet YouTube-Suche für Tutorial-Videos. Verwende dies, wenn der Benutzer Hilfe oder Anleitungen benötigt.",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Suchbegriff für YouTube (z.B. 'Lackierung Tutorial', 'Reifen wechseln')"
                    }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createKunde",
            description: "Erstellt einen neuen Kundeneintrag in der Datenbank.",
            parameters: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "Name des Kunden"
                    },
                    email: {
                        type: "string",
                        description: "E-Mail-Adresse (optional)"
                    },
                    telefon: {
                        type: "string",
                        description: "Telefonnummer"
                    },
                    adresse: {
                        type: "string",
                        description: "Straße und Hausnummer (optional)"
                    },
                    plz: {
                        type: "string",
                        description: "Postleitzahl (optional)"
                    },
                    ort: {
                        type: "string",
                        description: "Ort (optional)"
                    },
                    notizen: {
                        type: "string",
                        description: "Zusätzliche Notizen (optional)"
                    }
                },
                required: ["name", "telefon"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "createTermin",
            description: "Erstellt einen neuen Abnahme-Termin im Kalender. Verwende dies, wenn ein Termin vereinbart werden soll.",
            parameters: {
                type: "object",
                properties: {
                    fahrzeugId: {
                        type: "string",
                        description: "Firestore ID des Fahrzeugs (optional)"
                    },
                    kennzeichen: {
                        type: "string",
                        description: "Kfz-Kennzeichen (optional, wenn fahrzeugId angegeben)"
                    },
                    datum: {
                        type: "string",
                        description: "Datum des Termins. Akzeptiert: 'heute', 'morgen', 'Freitag', '28.10.', '28.10.2025'"
                    },
                    uhrzeit: {
                        type: "string",
                        description: "Uhrzeit des Termins (Format: HH:MM, z.B. '14:00'). Standard: 09:00"
                    },
                    typ: {
                        type: "string",
                        enum: ["abnahme", "annahme", "beratung", "sonstiges"],
                        description: "Art des Termins. Standard: abnahme"
                    },
                    notizen: {
                        type: "string",
                        description: "Zusätzliche Notizen zum Termin (optional)"
                    }
                },
                required: ["datum"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getTermine",
            description: "Zeigt Termine an. Kann nach verschiedenen Kriterien gefiltert werden.",
            parameters: {
                type: "object",
                properties: {
                    fahrzeugId: {
                        type: "string",
                        description: "Filter nach Fahrzeug-ID (optional)"
                    },
                    kennzeichen: {
                        type: "string",
                        description: "Filter nach Kennzeichen (optional)"
                    },
                    datum: {
                        type: "string",
                        description: "Filtere nach spezifischem Datum (z.B. 'heute', 'morgen', '28.10.')"
                    },
                    zeitraum: {
                        type: "string",
                        enum: ["heute", "diese_woche", "naechste_woche"],
                        description: "Zeitraum-Filter: heute, diese_woche, naechste_woche"
                    },
                    status: {
                        type: "string",
                        enum: ["geplant", "bestaetigt", "abgeschlossen", "abgesagt"],
                        description: "Status-Filter"
                    },
                    limit: {
                        type: "number",
                        description: "Maximale Anzahl Ergebnisse (Standard: 50)"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateTermin",
            description: "Aktualisiert einen bestehenden Termin (Datum, Uhrzeit, Status, Notizen).",
            parameters: {
                type: "object",
                properties: {
                    terminId: {
                        type: "string",
                        description: "Firestore Document ID des Termins"
                    },
                    datum: {
                        type: "string",
                        description: "Neues Datum (Format siehe createTermin)"
                    },
                    uhrzeit: {
                        type: "string",
                        description: "Neue Uhrzeit (Format: HH:MM)"
                    },
                    status: {
                        type: "string",
                        enum: ["geplant", "bestaetigt", "abgeschlossen", "abgesagt"],
                        description: "Neuer Status"
                    },
                    notizen: {
                        type: "string",
                        description: "Aktualisierte Notizen"
                    }
                },
                required: ["terminId"]
            }
        }
    },
    // ========================================
    // MATERIAL-BESTELLUNGEN TOOLS (Phase 4)
    // ========================================
    {
        type: "function",
        function: {
            name: "createBestellung",
            description: "Erstellt eine neue Material-Bestellung. Verwende dies, wenn Material nachbestellt werden muss (z.B. Lack, Reifen, Ersatzteile).",
            parameters: {
                type: "object",
                properties: {
                    beschreibung: {
                        type: "string",
                        description: "Beschreibung des benötigten Materials (z.B. 'Lack RAL 9016 weiss, 5 Liter', 'Winterreifen 225/45 R17')"
                    },
                    mitarbeiter: {
                        type: "string",
                        description: "Name des Mitarbeiters der die Bestellung aufgibt (optional, Standard: KI-Agent)"
                    },
                    notizen: {
                        type: "string",
                        description: "Zusätzliche Notizen zur Bestellung (optional)"
                    }
                },
                required: ["beschreibung"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getBestellungen",
            description: "Ruft Material-Bestellungen ab. Kann nach Status oder Mitarbeiter gefiltert werden.",
            parameters: {
                type: "object",
                properties: {
                    status: {
                        type: "string",
                        enum: ["pending", "ordered", "delivered"],
                        description: "Filter nach Bestellstatus: pending (ausstehend), ordered (bestellt), delivered (geliefert)"
                    },
                    mitarbeiter: {
                        type: "string",
                        description: "Filter nach Mitarbeiter-Name"
                    },
                    limit: {
                        type: "number",
                        description: "Maximale Anzahl der Bestellungen (Standard: alle)"
                    }
                },
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "updateBestellung",
            description: "Aktualisiert eine Material-Bestellung (z.B. Status ändern von 'pending' auf 'ordered' oder 'delivered').",
            parameters: {
                type: "object",
                properties: {
                    bestellungId: {
                        type: "string",
                        description: "ID der Bestellung (Format: req_TIMESTAMP)"
                    },
                    status: {
                        type: "string",
                        enum: ["pending", "ordered", "delivered"],
                        description: "Neuer Status: pending (ausstehend), ordered (bestellt), delivered (geliefert)"
                    },
                    notizen: {
                        type: "string",
                        description: "Aktualisierte Notizen"
                    }
                },
                required: ["bestellungId"]
            }
        }
    },
    // ========================================
    // DASHBOARD TOOLS (Phase 5)
    // ========================================
    {
        type: "function",
        function: {
            name: "getDashboardOverview",
            description: "Gibt eine vollständige Übersicht aller wichtigen Dashboard-Kennzahlen zurück (Fahrzeuge, Kunden, Termine, Material). Verwende dies für allgemeine Status-Abfragen.",
            parameters: {
                type: "object",
                properties: {},
                required: []
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getStatistiken",
            description: "Gibt detaillierte Statistiken basierend auf Zeitraum und Service-Typ zurück. Verwende dies für spezifische Analysen.",
            parameters: {
                type: "object",
                properties: {
                    zeitraum: {
                        type: "string",
                        enum: ["gesamt", "heute", "woche", "monat"],
                        description: "Zeitraum für die Statistik (Standard: gesamt)"
                    },
                    serviceTyp: {
                        type: "string",
                        enum: ["Lackierung", "Reifen", "Mechanik", "Pflege", "TÜV", "Versicherung"],
                        description: "Filter nach Service-Typ (optional)"
                    }
                },
                required: []
            }
        }
    },
    // TOOL 11: Get Mitarbeiter Notifications
    {
        type: "function",
        function: {
            name: "getMitarbeiterNotifications",
            description: "Zeigt ungelesene Benachrichtigungen des eingeloggten Mitarbeiters an. Nutze dies wenn der Benutzer nach Benachrichtigungen, Aufgaben oder To-Dos fragt.",
            parameters: {
                type: "object",
                properties: {
                    limit: {
                        type: "number",
                        description: "Maximale Anzahl der anzuzeigenden Benachrichtigungen (Standard: 5)"
                    }
                },
                required: []
            }
        }
    },
    // TOOL 12: Speak Notifications
    {
        type: "function",
        function: {
            name: "speakNotifications",
            description: "Liest alle ungelesenen Benachrichtigungen laut vor (Text-to-Speech). Nutze dies wenn der Benutzer fragt 'Was ist heute zu tun?' oder 'Was gibt es neues?'",
            parameters: {
                type: "object",
                properties: {
                    includeAll: {
                        type: "boolean",
                        description: "true = Alle Benachrichtigungen vorlesen, false = Nur high/urgent priority (Standard: false)"
                    }
                },
                required: []
            }
        }
    }
];

// ============================================
// TOOL 10: CREATE BESTELLUNG (Material-Bestellung erstellen)
// ============================================

/**
 * Erstellt eine neue Material-Bestellung in Firestore
 * @param {Object} params - Bestellungs-Parameter
 * @returns {Promise<Object>} Result mit Erfolgs-Status und Bestellungs-ID
 */
async function createBestellung(params) {
    try {
        const {
            beschreibung,
            mitarbeiter,
            notizen
        } = params;

        // Validation
        if (!beschreibung) {
            throw new Error('Beschreibung ist erforderlich (z.B. "Lack RAL 9016 weiss, 5 Liter")');
        }

        // Request-ID generieren
        const requestId = 'req_' + Date.now();

        // Material-Request Daten
        const requestData = {
            id: requestId,
            photo: null, // KI kann kein Foto erstellen, wird später manuell hinzugefügt
            description: beschreibung,
            requestedBy: mitarbeiter || 'KI-Agent',
            timestamp: new Date().toISOString(),
            status: 'pending', // pending, ordered, delivered
            notizen: notizen || '',
            createdBy: 'KI-Agent'
        };

        // In Firestore speichern (Multi-Tenant: materialRequests_mosbach)
        const materialCollection = window.getCollection('materialRequests');
        await materialCollection.doc(requestId).set(requestData);

        console.log(`✅ KI-Agent: Material-Bestellung erstellt - ID: ${requestId}`);

        // Event dispatchen für Real-Time UI Updates
        if (window.appEvents) {
            window.appEvents.materialBestellt({
                requestId: requestId,
                ...requestData
            });
        }

        return {
            success: true,
            message: `Material-Bestellung "${beschreibung}" wurde erfolgreich erstellt!`,
            requestId: requestId,
            data: requestData,
            hinweis: 'Foto kann später manuell in material.html hinzugefügt werden.'
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei createBestellung:', error);
        return {
            success: false,
            message: `Fehler beim Erstellen der Bestellung: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 11: GET BESTELLUNGEN (Material-Bestellungen abrufen)
// ============================================

/**
 * Ruft Material-Bestellungen aus Firestore ab
 * @param {Object} params - Query-Parameter
 * @returns {Promise<Object>} Result mit Bestellungen
 */
async function getBestellungen(params) {
    try {
        const {
            status,     // 'pending', 'ordered', 'delivered'
            mitarbeiter,
            limit
        } = params;

        // Firestore Query (Multi-Tenant: materialRequests_mosbach)
        let query = window.getCollection('materialRequests');

        // Filter nach Status
        if (status) {
            query = query.where('status', '==', status);
        }

        // Filter nach Mitarbeiter
        if (mitarbeiter) {
            query = query.where('requestedBy', '==', mitarbeiter);
        }

        // Sortierung nach timestamp (neueste zuerst)
        query = query.orderBy('timestamp', 'desc');

        // Limit
        if (limit && limit > 0) {
            query = query.limit(parseInt(limit));
        }

        const snapshot = await query.get();

        // Bestellungen in Array umwandeln
        const bestellungen = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            bestellungen.push({
                id: doc.id,
                ...data,
                // Foto nicht an AI senden (zu groß)
                photo: data.photo ? '[Foto vorhanden]' : null
            });
        });

        console.log(`✅ KI-Agent: ${bestellungen.length} Material-Bestellungen gefunden`);

        return {
            success: true,
            count: bestellungen.length,
            bestellungen: bestellungen,
            filter: {
                status: status || 'alle',
                mitarbeiter: mitarbeiter || 'alle'
            }
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei getBestellungen:', error);
        return {
            success: false,
            message: `Fehler beim Abrufen der Bestellungen: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 12: UPDATE BESTELLUNG (Material-Bestellung aktualisieren)
// ============================================

/**
 * Aktualisiert eine Material-Bestellung in Firestore
 * @param {Object} params - Update-Parameter
 * @returns {Promise<Object>} Result mit Erfolgs-Status
 */
async function updateBestellung(params) {
    try {
        const {
            bestellungId,  // req_TIMESTAMP
            status,        // 'pending', 'ordered', 'delivered'
            notizen
        } = params;

        // Validation
        if (!bestellungId) {
            throw new Error('bestellungId ist erforderlich (Format: req_TIMESTAMP)');
        }

        // Prüfe ob Bestellung existiert
        const materialCollection = window.getCollection('materialRequests');
        const docRef = materialCollection.doc(bestellungId);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error(`Material-Bestellung mit ID ${bestellungId} wurde nicht gefunden`);
        }

        // Update-Daten vorbereiten
        const updateData = {
            updatedAt: new Date().toISOString(),
            updatedBy: 'KI-Agent'
        };

        // Status aktualisieren (wenn angegeben)
        if (status) {
            const validStatuses = ['pending', 'ordered', 'delivered'];
            if (!validStatuses.includes(status)) {
                throw new Error(`Ungültiger Status: ${status}. Erlaubt: ${validStatuses.join(', ')}`);
            }
            updateData.status = status;
        }

        // Notizen aktualisieren (wenn angegeben)
        if (notizen !== undefined) {
            updateData.notizen = notizen;
        }

        // In Firestore aktualisieren
        await docRef.update(updateData);

        console.log(`✅ KI-Agent: Material-Bestellung ${bestellungId} aktualisiert`);

        // Event dispatchen für Real-Time UI Updates
        if (window.appEvents) {
            window.appEvents.materialUpdated({
                requestId: bestellungId,
                updates: updateData
            });
        }

        return {
            success: true,
            message: `Material-Bestellung ${bestellungId} wurde erfolgreich aktualisiert!`,
            bestellungId: bestellungId,
            updates: updateData
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei updateBestellung:', error);
        return {
            success: false,
            message: `Fehler beim Aktualisieren: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 13: GET DASHBOARD OVERVIEW (Dashboard-Übersicht)
// ============================================

/**
 * Gibt eine vollständige Übersicht aller wichtigen Dashboard-Kennzahlen
 * @returns {Promise<Object>} Dashboard-Daten mit allen Kennzahlen
 */
async function getDashboardOverview() {
    try {
        console.log('🤖 KI-Agent: Dashboard-Übersicht wird geladen...');

        // Multi-Tenant Collections
        const fahrzeugeCollection = window.getCollection('fahrzeuge');
        const kundenCollection = window.getCollection('kunden');
        const kalenderCollection = window.getCollection('kalender');
        const materialCollection = window.getCollection('materialRequests');

        // Parallel alle Daten laden
        const [fahrzeugeSnap, kundenSnap, termineSnap, materialSnap] = await Promise.all([
            fahrzeugeCollection.get(),
            kundenCollection.get(),
            kalenderCollection.get(),
            materialCollection.get()
        ]);

        // Fahrzeuge auswerten
        const fahrzeuge = [];
        fahrzeugeSnap.forEach(doc => fahrzeuge.push(doc.data()));

        const fahrzeugStats = {
            total: fahrzeuge.length,
            offen: fahrzeuge.filter(f => f.status === 'Offen').length,
            in_arbeit: fahrzeuge.filter(f => f.status === 'In Bearbeitung').length,
            abgeschlossen: fahrzeuge.filter(f => f.status === 'Abgeschlossen').length
        };

        // Kunden auswerten
        const kunden = [];
        kundenSnap.forEach(doc => kunden.push(doc.data()));

        const kundenStats = {
            total: kunden.length,
            stammkunden: kunden.filter(k => k.anzahlBesuche >= 2).length,
            neukunden: kunden.filter(k => k.anzahlBesuche === 1).length
        };

        // Termine auswerten
        const termine = [];
        termineSnap.forEach(doc => termine.push(doc.data()));

        const heute = new Date();
        heute.setHours(0, 0, 0, 0);
        const naechsteWoche = new Date(heute);
        naechsteWoche.setDate(heute.getDate() + 7);

        const terminStats = {
            total: termine.length,
            heute: termine.filter(t => {
                if (!t.datum) return false;
                const tDate = new Date(t.datum);
                tDate.setHours(0, 0, 0, 0);
                return tDate.getTime() === heute.getTime();
            }).length,
            diese_woche: termine.filter(t => {
                if (!t.datum) return false;
                const tDate = new Date(t.datum);
                return tDate >= heute && tDate < naechsteWoche;
            }).length
        };

        // Material auswerten
        const materialRequests = [];
        materialSnap.forEach(doc => materialRequests.push(doc.data()));

        const materialStats = {
            total: materialRequests.length,
            pending: materialRequests.filter(m => m.status === 'pending').length,
            ordered: materialRequests.filter(m => m.status === 'ordered').length,
            delivered: materialRequests.filter(m => m.status === 'delivered').length
        };

        const overview = {
            fahrzeuge: fahrzeugStats,
            kunden: kundenStats,
            termine: terminStats,
            material: materialStats,
            timestamp: new Date().toISOString()
        };

        console.log('✅ KI-Agent: Dashboard-Übersicht geladen', overview);

        return {
            success: true,
            message: 'Dashboard-Übersicht erfolgreich geladen',
            data: overview
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei getDashboardOverview:', error);
        return {
            success: false,
            message: `Fehler beim Laden der Dashboard-Übersicht: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 14: GET STATISTIKEN (Erweiterte Statistiken)
// ============================================

/**
 * Gibt detaillierte Statistiken basierend auf Zeitraum und Filter
 * @param {Object} params - Filter-Parameter
 * @returns {Promise<Object>} Detaillierte Statistiken
 */
async function getStatistiken(params) {
    try {
        const { zeitraum = 'gesamt', serviceTyp = null } = params;

        console.log(`🤖 KI-Agent: Statistiken werden geladen (${zeitraum}, ${serviceTyp || 'alle'})`);

        // Multi-Tenant Collection
        const fahrzeugeCollection = window.getCollection('fahrzeuge');
        let query = fahrzeugeCollection;

        // Filter nach Service-Typ
        if (serviceTyp) {
            query = query.where('serviceTyp', '==', serviceTyp);
        }

        // Daten laden
        const snapshot = await query.get();
        const fahrzeuge = [];
        snapshot.forEach(doc => fahrzeuge.push(doc.data()));

        // Zeitraum-Filter anwenden
        let filteredFahrzeuge = fahrzeuge;
        const heute = new Date();

        if (zeitraum === 'heute') {
            heute.setHours(0, 0, 0, 0);
            const morgen = new Date(heute);
            morgen.setDate(heute.getDate() + 1);
            filteredFahrzeuge = fahrzeuge.filter(f => {
                if (!f.timestamp) return false;
                const fDate = new Date(f.timestamp);
                return fDate >= heute && fDate < morgen;
            });
        } else if (zeitraum === 'woche') {
            const wochenStart = new Date(heute);
            wochenStart.setDate(heute.getDate() - heute.getDay());
            wochenStart.setHours(0, 0, 0, 0);
            filteredFahrzeuge = fahrzeuge.filter(f => {
                if (!f.timestamp) return false;
                return new Date(f.timestamp) >= wochenStart;
            });
        } else if (zeitraum === 'monat') {
            const monatsStart = new Date(heute.getFullYear(), heute.getMonth(), 1);
            filteredFahrzeuge = fahrzeuge.filter(f => {
                if (!f.timestamp) return false;
                return new Date(f.timestamp) >= monatsStart;
            });
        }

        // Statistiken berechnen
        const stats = {
            zeitraum,
            serviceTyp: serviceTyp || 'alle',
            anzahl: filteredFahrzeuge.length,
            status_verteilung: {
                offen: filteredFahrzeuge.filter(f => f.status === 'Offen').length,
                in_arbeit: filteredFahrzeuge.filter(f => f.status === 'In Bearbeitung').length,
                abgeschlossen: filteredFahrzeuge.filter(f => f.status === 'Abgeschlossen').length
            },
            service_verteilung: {}
        };

        // Service-Typ Verteilung (nur wenn kein Service-Filter)
        if (!serviceTyp) {
            const serviceTypen = ['Lackierung', 'Reifen', 'Mechanik', 'Pflege', 'TÜV', 'Versicherung'];
            serviceTypen.forEach(typ => {
                stats.service_verteilung[typ] = filteredFahrzeuge.filter(f => f.serviceTyp === typ).length;
            });
        }

        console.log('✅ KI-Agent: Statistiken geladen', stats);

        return {
            success: true,
            message: `Statistiken für ${zeitraum} erfolgreich geladen`,
            data: stats
        };

    } catch (error) {
        console.error('❌ KI-Agent: Fehler bei getStatistiken:', error);
        return {
            success: false,
            message: `Fehler beim Laden der Statistiken: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// TOOL 11: GET MITARBEITER NOTIFICATIONS
// ============================================

/**
 * Get unread notifications for the current employee
 * @param {Object} args - { limit: number }
 * @returns {Object} { success, count, notifications }
 */
async function getMitarbeiterNotifications(args = {}) {
    try {
        console.log('📥 AI Agent Tool: getMitarbeiterNotifications');

        // Check if notification manager is available
        if (!window.mitarbeiterNotifications) {
            return {
                success: false,
                message: 'Benachrichtigungs-System ist nicht verfügbar',
                count: 0,
                notifications: []
            };
        }

        // Load notifications
        const notifications = await window.mitarbeiterNotifications.loadNotifications();
        const limit = args.limit || 5;
        const limitedNotifications = notifications.slice(0, limit);

        // Format for AI response
        const formattedNotifications = limitedNotifications.map((notif, index) => ({
            nr: index + 1,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            priority: notif.priority,
            timeAgo: window.mitarbeiterNotifications.getTimeAgo(notif.createdAt)
        }));

        console.log(`✅ ${notifications.length} Benachrichtigungen gefunden (zeige ${limitedNotifications.length})`);

        return {
            success: true,
            count: notifications.length,
            limit: limit,
            notifications: formattedNotifications,
            message: notifications.length === 0
                ? 'Du hast keine neuen Benachrichtigungen.'
                : `Du hast ${notifications.length} neue Benachrichtigung${notifications.length > 1 ? 'en' : ''}.`
        };

    } catch (error) {
        console.error('❌ Error getting notifications:', error);
        return {
            success: false,
            message: `Fehler beim Laden der Benachrichtigungen: ${error.message}`,
            count: 0,
            notifications: []
        };
    }
}

// ============================================
// TOOL 12: SPEAK NOTIFICATIONS
// ============================================

/**
 * Speak all unread notifications aloud using AI Agent TTS
 * @param {Object} args - { includeAll: boolean }
 * @returns {Object} { success, message, spoken }
 */
async function speakNotifications(args = {}) {
    try {
        console.log('🔊 AI Agent Tool: speakNotifications');

        // Check if notification manager is available
        if (!window.mitarbeiterNotifications) {
            return {
                success: false,
                message: 'Benachrichtigungs-System ist nicht verfügbar',
                spoken: 0
            };
        }

        // Check if AI Agent is available
        if (!window.aiAgent) {
            return {
                success: false,
                message: 'AI Agent ist nicht verfügbar',
                spoken: 0
            };
        }

        // Load notifications
        const notifications = await window.mitarbeiterNotifications.loadNotifications();

        if (notifications.length === 0) {
            const message = 'Du hast keine neuen Benachrichtigungen.';
            await window.aiAgent.speak(message);
            return {
                success: true,
                message: message,
                spoken: 0
            };
        }

        // Build speech text
        let speechText = `Du hast ${notifications.length} neue Benachrichtigung${notifications.length > 1 ? 'en' : ''}. `;

        // Include all notifications or only high priority?
        const includeAll = args.includeAll || false;
        const notificationsToSpeak = includeAll
            ? notifications
            : notifications.filter(n => ['high', 'urgent'].includes(n.priority));

        notificationsToSpeak.forEach((notif, index) => {
            if (index > 0) speechText += ' ';
            speechText += `${index + 1}. ${notif.sprachausgabe || notif.title}. `;
        });

        // Speak
        await window.aiAgent.speak(speechText);

        console.log(`✅ ${notificationsToSpeak.length} Benachrichtigungen vorgelesen`);

        return {
            success: true,
            message: `${notificationsToSpeak.length} Benachrichtigungen vorgelesen`,
            spoken: notificationsToSpeak.length,
            total: notifications.length
        };

    } catch (error) {
        console.error('❌ Error speaking notifications:', error);
        return {
            success: false,
            message: `Fehler beim Vorlesen: ${error.message}`,
            spoken: 0
        };
    }
}

// ============================================
// TOOL EXECUTOR
// ============================================

/**
 * Executes a tool based on OpenAI Function Calling response
 * @param {string} toolName - Name of the tool to execute
 * @param {Object} args - Tool arguments from OpenAI
 * @returns {Promise<Object>} Tool execution result
 */
async function executeAITool(toolName, args) {
    console.log(`🤖 KI-Agent: Executing tool ${toolName}`, args);

    const tools = {
        'createFahrzeug': createFahrzeug,
        'updateFahrzeugStatus': updateFahrzeugStatus,
        'getFahrzeuge': getFahrzeuge,
        'navigateToPage': navigateToPage,
        'searchYouTube': searchYouTube,
        'createKunde': createKunde,
        'createTermin': createTermin,
        'getTermine': getTermine,
        'updateTermin': updateTermin,
        // Material-Bestellungen Tools (Phase 4)
        'createBestellung': createBestellung,
        'getBestellungen': getBestellungen,
        'updateBestellung': updateBestellung,
        // Dashboard Tools (Phase 5)
        'getDashboardOverview': getDashboardOverview,
        'getStatistiken': getStatistiken,
        // Notification Tools (Phase 3.2.4)
        'getMitarbeiterNotifications': getMitarbeiterNotifications,
        'speakNotifications': speakNotifications
    };

    const tool = tools[toolName];

    if (!tool) {
        console.error(`❌ KI-Agent: Unknown tool: ${toolName}`);
        return {
            success: false,
            message: `Unbekanntes Tool: ${toolName}`,
            error: 'UNKNOWN_TOOL'
        };
    }

    try {
        const result = await tool(args);
        console.log(`✅ KI-Agent: Tool ${toolName} completed`, result);
        return result;
    } catch (error) {
        console.error(`❌ KI-Agent: Tool ${toolName} failed`, error);
        return {
            success: false,
            message: `Tool-Fehler: ${error.message}`,
            error: error.message
        };
    }
}

// ============================================
// EXPORTS
// ============================================

// Make tools available globally
window.aiTools = {
    createFahrzeug,
    updateFahrzeugStatus,
    getFahrzeuge,
    navigateToPage,
    searchYouTube,
    createKunde,
    createTermin,
    getTermine,
    updateTermin,
    getMitarbeiterNotifications,
    speakNotifications,
    executeAITool,
    AI_TOOLS
};

console.log('✅ AI Agent Tools loaded successfully');
console.log('Available tools:', Object.keys(window.aiTools));
