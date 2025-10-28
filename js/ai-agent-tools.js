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
    }
];

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
        'createKunde': createKunde
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
    executeAITool,
    AI_TOOLS
};

console.log('✅ AI Agent Tools loaded successfully');
console.log('Available tools:', Object.keys(window.aiTools));
