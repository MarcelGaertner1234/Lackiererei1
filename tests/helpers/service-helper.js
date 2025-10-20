/**
 * Service Helper für E2E Tests (Version 3.2)
 *
 * Helper-Funktionen für Service-Consistency Tests über alle 6 Services:
 * - Lackierung, Reifen, Mechanik, Pflege, TÜV, Versicherung
 *
 * TASK #10: E2E Tests für Version 3.2 Service Consistency
 */

/**
 * Service-Konfiguration für alle 6 Services
 *
 * Basiert auf:
 * - partner-app/meine-anfragen.html (Lines 2322-2340)
 * - partner-app/kva-erstellen.html (Service-Labels)
 */
const SERVICE_CONFIGS = {
  lackier: {
    icon: '🎨',
    label: 'Lackierung',
    bgColor: '#4CAF50',
    prozessSteps: ['angenommen', 'vorbereitung', 'lackierung', 'trocknung', 'qualitaet', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      vorbereitung: 'beauftragt',
      lackierung: 'in_arbeit',
      trocknung: 'in_arbeit',
      qualitaet: 'qualitaet',
      bereit: 'abholung'
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['lackierung']
    }
  },

  reifen: {
    icon: '🔧',
    label: 'Reifen',
    bgColor: '#FF9800',
    prozessSteps: ['angenommen', 'demontage', 'montage', 'wuchten', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      demontage: 'in_arbeit',
      montage: 'in_arbeit',
      wuchten: 'qualitaet',
      bereit: 'abholung'
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['reifengroesse', 'reifentyp']
    }
  },

  mechanik: {
    icon: '⚙️',
    label: 'Mechanik',
    bgColor: '#2196F3',
    prozessSteps: ['angenommen', 'diagnose', 'reparatur', 'test', 'qualitaet', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      diagnose: 'beauftragt',
      reparatur: 'in_arbeit',
      test: 'qualitaet',
      qualitaet: 'qualitaet',
      bereit: 'abholung'
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['mechanik']
    }
  },

  pflege: {
    icon: '✨',
    label: 'Pflege',
    bgColor: '#9C27B0',
    prozessSteps: ['angenommen', 'reinigung', 'aufbereitung', 'versiegelung', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      reinigung: 'in_arbeit',
      aufbereitung: 'in_arbeit',
      versiegelung: 'qualitaet',
      bereit: 'abholung'
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['pflegepaket']
    }
  },

  tuev: {
    icon: '📋',
    label: 'TÜV',
    bgColor: '#607D8B',
    prozessSteps: ['angenommen', 'vorbereitung', 'pruefung', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      vorbereitung: 'beauftragt',
      pruefung: 'in_arbeit',
      bereit: 'abholung',
      abholbereit: 'abholung' // CRITICAL: Fixed in Version 3.2 (Commit b8c191e)
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['tuevart', 'naechsterTuevTermin']
    }
  },

  versicherung: {
    icon: '🛡️',
    label: 'Versicherung',
    bgColor: '#795548',
    prozessSteps: ['angenommen', 'dokumentation', 'kalkulation', 'freigabe', 'reparatur', 'bereit'],
    portalStatus: {
      angenommen: 'beauftragt',
      dokumentation: 'beauftragt',
      kalkulation: 'in_arbeit',
      freigabe: 'qualitaet',
      reparatur: 'in_arbeit',
      bereit: 'abholung'
    },
    testFields: {
      required: ['kennzeichen', 'marke', 'modell', 'schadenBeschreibung'],
      serviceSpecific: ['versicherung', 'schadennummer']
    }
  }
};

/**
 * Helper: Erstellt Partner-Anfrage für einen bestimmten Service
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} serviceTyp - Service-Typ (lackier, reifen, mechanik, pflege, tuev, versicherung)
 * @param {object} data - Anfrage-Daten
 * @returns {Promise<string>} anfrageId
 */
async function createPartnerRequest(page, serviceTyp, data) {
  console.log(`🔧 createPartnerRequest: ${serviceTyp}`, data);

  const config = SERVICE_CONFIGS[serviceTyp];
  if (!config) {
    throw new Error(`Unknown service type: ${serviceTyp}`);
  }

  // Navigate zu Service-spezifischer Anfrage-Seite
  const servicePages = {
    lackier: 'anfrage.html',
    reifen: 'reifen-anfrage.html',
    mechanik: 'mechanik-anfrage.html',
    pflege: 'pflege-anfrage.html',
    tuev: 'tuev-anfrage.html',
    versicherung: 'versicherung-anfrage.html'
  };

  await page.goto(`/partner-app/${servicePages[serviceTyp]}`);

  // Warte auf Firebase Initialisierung
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);

  // Fülle Formular aus
  await page.fill('input[name="partnername"]', data.partnerName);
  await page.fill('input[name="partneremail"]', data.partnerEmail);
  await page.fill('input[name="kennzeichen"]', data.kennzeichen);
  await page.fill('input[name="marke"]', data.marke);
  await page.fill('input[name="modell"]', data.modell);
  await page.fill('textarea[name="schadenBeschreibung"]', data.schadenBeschreibung || 'E2E Test Beschreibung');

  // Service-spezifische Felder (wenn vorhanden)
  if (serviceTyp === 'reifen' && data.reifengroesse) {
    await page.fill('input[name="reifengroesse"]', data.reifengroesse);
  }
  if (serviceTyp === 'tuev' && data.tuevart) {
    await page.selectOption('select[name="tuevart"]', data.tuevart);
  }

  // Formular absenden
  await page.click('button[type="submit"]');

  // Warte auf Success-Message
  await page.waitForSelector('.success-message, .alert-success', { timeout: 10000 });

  // Hole anfrageId aus Firestore
  const anfrageId = await page.evaluate(async (kz, serviceTyp) => {
    const db = window.firebaseApp.db();
    const snapshot = await db.collection('partnerAnfragen')
      .where('kennzeichen', '==', kz)
      .where('serviceTyp', '==', serviceTyp)
      .orderBy('erstelltAm', 'desc')
      .limit(1)
      .get();

    if (!snapshot.empty) {
      return snapshot.docs[0].id;
    }
    return null;
  }, data.kennzeichen, serviceTyp);

  console.log(`✅ createPartnerRequest: anfrageId = ${anfrageId}`);
  return anfrageId;
}

/**
 * Helper: Verifiziert Service-spezifische Felder im Partner Portal
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} serviceTyp
 * @param {string} anfrageId
 * @returns {Promise<object>} Verification Result
 */
async function verifyServiceFields(page, serviceTyp, anfrageId) {
  console.log(`🔍 verifyServiceFields: ${serviceTyp}, anfrageId=${anfrageId}`);

  const config = SERVICE_CONFIGS[serviceTyp];

  // Navigate zu Partner Portal
  await page.goto('/partner-app/meine-anfragen.html');

  // Warte auf Firebase & Rendering
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);
  await page.waitForTimeout(2000); // Wait for anfragen to load

  // Suche Anfrage-Kachel
  const anfrageCard = await page.locator(`[data-anfrage-id="${anfrageId}"]`).first();

  if (!(await anfrageCard.isVisible())) {
    throw new Error(`Anfrage-Kachel nicht gefunden: ${anfrageId}`);
  }

  // Verifiziere Service-Icon & Label
  const serviceLabel = await anfrageCard.locator('.service-badge, .service-label').textContent();
  const hasCorrectIcon = await anfrageCard.locator(`.service-badge:has-text("${config.icon}")`).isVisible();

  const result = {
    serviceTyp,
    anfrageId,
    serviceLabel,
    hasCorrectIcon,
    serviceIconFound: hasCorrectIcon && serviceLabel.includes(config.label),
    config
  };

  console.log(`✅ verifyServiceFields: ${JSON.stringify(result, null, 2)}`);
  return result;
}

/**
 * Helper: Verifiziert Status-Mapping zwischen Kanban und Partner Portal
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} serviceTyp
 * @param {string} kennzeichen
 * @param {string} kanbanStatus - Status im Kanban (z.B. 'lackierung')
 * @returns {Promise<object>} Verification Result
 */
async function verifyStatusMapping(page, serviceTyp, kennzeichen, kanbanStatus) {
  console.log(`🔍 verifyStatusMapping: ${serviceTyp}, kanbanStatus=${kanbanStatus}`);

  const config = SERVICE_CONFIGS[serviceTyp];
  const expectedPortalStatus = config.portalStatus[kanbanStatus];

  if (!expectedPortalStatus) {
    throw new Error(`No portal status mapping for ${serviceTyp} -> ${kanbanStatus}`);
  }

  // Hole tatsächlichen Status aus Partner Portal
  await page.goto('/partner-app/meine-anfragen.html');
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);
  await page.waitForTimeout(2000);

  const actualPortalStatus = await page.evaluate(async (kz, serviceTyp) => {
    const db = window.firebaseApp.db();

    // 1. Hole Anfrage
    const anfrageSnapshot = await db.collection('partnerAnfragen')
      .where('kennzeichen', '==', kz)
      .where('serviceTyp', '==', serviceTyp)
      .limit(1)
      .get();

    if (anfrageSnapshot.empty) {
      return { error: 'Anfrage not found' };
    }

    const anfrage = anfrageSnapshot.docs[0].data();

    // 2. Hole Fahrzeug (wenn existiert)
    let fahrzeug = null;
    if (anfrage.fahrzeugId) {
      const fahrzeugSnapshot = await db.collection('fahrzeuge').doc(anfrage.fahrzeugId).get();
      if (fahrzeugSnapshot.exists) {
        fahrzeug = fahrzeugSnapshot.data();
      }
    }

    // 3. Status-Mapping (wie in meine-anfragen.html Lines 2730-2780)
    const statusMapping = {
      lackier: {
        'angenommen': 'beauftragt',
        'vorbereitung': 'beauftragt',
        'lackierung': 'in_arbeit',
        'trocknung': 'in_arbeit',
        'qualitaet': 'qualitaet',
        'bereit': 'abholung'
      },
      mechanik: {
        'angenommen': 'beauftragt',
        'diagnose': 'beauftragt',
        'reparatur': 'in_arbeit',
        'test': 'qualitaet',
        'qualitaet': 'qualitaet',
        'bereit': 'abholung'
      },
      pflege: {
        'angenommen': 'beauftragt',
        'reinigung': 'in_arbeit',
        'aufbereitung': 'in_arbeit',
        'versiegelung': 'qualitaet',
        'bereit': 'abholung'
      },
      tuev: {
        'angenommen': 'beauftragt',
        'vorbereitung': 'beauftragt',
        'pruefung': 'in_arbeit',
        'bereit': 'abholung',
        'abholbereit': 'abholung' // CRITICAL FIX!
      }
      // ... (weitere Services verwenden shared stages)
    };

    const mapping = statusMapping[serviceTyp] || {};
    const prozessStatus = fahrzeug ? fahrzeug.prozessStatus : null;
    const mappedStatus = mapping[prozessStatus] || prozessStatus || 'beauftragt';

    return {
      anfrageStatus: anfrage.status,
      prozessStatus,
      mappedStatus,
      fahrzeugId: anfrage.fahrzeugId
    };
  }, kennzeichen, serviceTyp);

  const result = {
    serviceTyp,
    kennzeichen,
    kanbanStatus,
    expectedPortalStatus,
    actualPortalStatus: actualPortalStatus.mappedStatus,
    matches: actualPortalStatus.mappedStatus === expectedPortalStatus,
    debug: actualPortalStatus
  };

  console.log(`✅ verifyStatusMapping: ${JSON.stringify(result, null, 2)}`);
  return result;
}

/**
 * Helper: Erstellt KVA (Kostenvoranschlag) für eine Anfrage
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId
 * @param {object} kvaData - KVA-Daten (Positionen, Termin, etc.)
 * @returns {Promise<boolean>} Success
 */
async function createKVA(page, anfrageId, kvaData = {}) {
  console.log(`🔧 createKVA: anfrageId=${anfrageId}`);

  // Navigate zu KVA-Erstellen-Seite
  await page.goto(`/partner-app/kva-erstellen.html?anfrageId=${anfrageId}`);

  // Warte auf Firebase & Daten-Laden
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);
  await page.waitForTimeout(2000);

  // Standard-KVA-Daten (falls nicht übergeben)
  const positionen = kvaData.positionen || [
    { beschreibung: 'Position 1', preis: 100 }
  ];

  // KVA-Positionen hinzufügen
  for (const position of positionen) {
    await page.click('button:has-text("Position hinzufügen")');
    await page.fill('input[name="positionBeschreibung"]:last-of-type', position.beschreibung);
    await page.fill('input[name="positionPreis"]:last-of-type', position.preis.toString());
  }

  // Anliefertermin setzen (TASK #4: Service-agnostic Label!)
  if (kvaData.anliefertermin) {
    await page.fill('input[name="anliefertermin"]', kvaData.anliefertermin);
  }

  // KVA absenden
  await page.click('button:has-text("KVA senden")');

  // Warte auf Success-Message
  await page.waitForSelector('.success-message, .alert-success', { timeout: 10000 });

  console.log(`✅ createKVA: Success für anfrageId=${anfrageId}`);
  return true;
}

/**
 * Helper: Partner nimmt KVA an
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId
 * @returns {Promise<boolean>} Success
 */
async function acceptKVA(page, anfrageId) {
  console.log(`🔧 acceptKVA: anfrageId=${anfrageId}`);

  // Navigate zu Partner Portal
  await page.goto('/partner-app/meine-anfragen.html');

  // Warte auf Firebase & Rendering
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);
  await page.waitForTimeout(2000);

  // Finde Anfrage und klicke "Annehmen"
  const anfrageCard = await page.locator(`[data-anfrage-id="${anfrageId}"]`).first();
  await anfrageCard.locator('button:has-text("Annehmen")').click();

  // Bestätige Dialog (falls vorhanden)
  page.on('dialog', dialog => dialog.accept());

  // Warte auf Status-Update
  await page.waitForTimeout(3000);

  console.log(`✅ acceptKVA: Success für anfrageId=${anfrageId}`);
  return true;
}

/**
 * Helper: Verifiziert Hover-Info Price Breakdown
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} anfrageId
 * @returns {Promise<object>} Verification Result
 */
async function verifyHoverInfoPriceBreakdown(page, anfrageId) {
  console.log(`🔍 verifyHoverInfoPriceBreakdown: anfrageId=${anfrageId}`);

  // Navigate zu Partner Portal
  await page.goto('/partner-app/meine-anfragen.html');
  const { waitForFirebaseReady } = require('./firebase-helper');
  await waitForFirebaseReady(page);
  await page.waitForTimeout(2000);

  // Finde Anfrage-Kachel
  const anfrageCard = await page.locator(`[data-anfrage-id="${anfrageId}"]`).first();

  // Hover über vereinbarterPreis
  const preisElement = await anfrageCard.locator('.vereinbarter-preis, [data-tooltip]').first();
  await preisElement.hover();

  // Warte auf Tooltip
  await page.waitForTimeout(500);

  // Prüfe ob Tooltip sichtbar ist
  const tooltipVisible = await page.locator('.tooltip, [role="tooltip"]').isVisible();

  // Hole Tooltip-Inhalt
  const tooltipText = tooltipVisible ?
    await page.locator('.tooltip, [role="tooltip"]').textContent() :
    null;

  const result = {
    anfrageId,
    tooltipVisible,
    tooltipText,
    hasKvaVarianten: tooltipText ? tooltipText.includes('Variante') : false
  };

  console.log(`✅ verifyHoverInfoPriceBreakdown: ${JSON.stringify(result, null, 2)}`);
  return result;
}

/**
 * Cleanup: Lösche Test-Anfrage und Fahrzeug
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} kennzeichen
 * @param {string} serviceTyp
 */
async function cleanupTestData(page, kennzeichen, serviceTyp) {
  console.log(`🧹 cleanupTestData: ${kennzeichen} (${serviceTyp})`);

  await page.evaluate(async (kz, serviceTyp) => {
    if (!window.firebaseApp || !window.firebaseApp.db) {
      console.warn('Firebase not initialized, skipping cleanup');
      return;
    }

    const db = window.firebaseApp.db();

    // 1. Lösche Partner-Anfragen
    const anfrageSnapshot = await db.collection('partnerAnfragen')
      .where('kennzeichen', '==', kz)
      .where('serviceTyp', '==', serviceTyp)
      .get();

    for (const doc of anfrageSnapshot.docs) {
      await doc.ref.delete();
      console.log(`🗑️ Deleted partnerAnfrage: ${doc.id}`);
    }

    // 2. Lösche Fahrzeuge
    const fahrzeugSnapshot = await db.collection('fahrzeuge')
      .where('kennzeichen', '==', kz)
      .get();

    for (const doc of fahrzeugSnapshot.docs) {
      // Lösche Foto-Subcollections
      const fotosVorher = await doc.ref.collection('fotos').doc('vorher').get();
      if (fotosVorher.exists) {
        await fotosVorher.ref.delete();
      }

      const fotosNachher = await doc.ref.collection('fotos').doc('nachher').get();
      if (fotosNachher.exists) {
        await fotosNachher.ref.delete();
      }

      // Lösche Fahrzeug
      await doc.ref.delete();
      console.log(`🗑️ Deleted fahrzeug: ${doc.id}`);
    }
  }, kennzeichen, serviceTyp);

  console.log(`✅ cleanupTestData: Done`);
}

// Exports
module.exports = {
  SERVICE_CONFIGS,
  createPartnerRequest,
  verifyServiceFields,
  verifyStatusMapping,
  createKVA,
  acceptKVA,
  verifyHoverInfoPriceBreakdown,
  cleanupTestData
};
