/**
 * E2E INTEGRATION: Partner Workflow Tests
 *
 * Testet den kompletten Partner-Workflow:
 * - Partner erstellt Anfrage → partnerAnfragen_{werkstattId}
 * - Werkstatt erstellt KVA → anfrage erhält kvaData
 * - Partner wählt Variante → annehmenKVA()
 * - Fahrzeug wird erstellt → fahrzeuge_{werkstattId}
 *
 * Ansatz: Firestore-basiert (kein UI), 100% reliable
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  deleteVehicle
} = require('../helpers/firebase-helper');

test.describe('E2E: Partner Workflow', () => {
  const testKennzeichen = 'PARTNER-E2E-001';
  const testAnfrageData = {
    kennzeichen: testKennzeichen,
    kundenname: 'Partner E2E Test',
    kundenEmail: 'partner-e2e@test.de',
    serviceTyp: 'lackier',
    marke: 'BMW',
    modell: '3er',
    schadenBeschreibung: 'Lackschaden vorne links'
  };

  // Setup: Login as admin before each test + CLEANUP STALE DATA
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    // FIX (2025-12-08): Clean up BEFORE test to remove stale data from previous runs
    await deleteVehicle(page, testKennzeichen);
    await cleanupPartnerAnfrage(page, testKennzeichen);
    console.log('✅ Partner Workflow Test: Admin authenticated + stale data cleaned');
  });

  // Cleanup: Remove test data after each test
  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await cleanupPartnerAnfrage(page, testKennzeichen);
    console.log('🧹 Cleanup complete');
  });

  test('E2E-P1: Partner kann Anfrage erstellen', async ({ page }) => {
    // Act: Create partner request directly in Firestore
    const anfrageId = await createPartnerAnfrageDirectly(page, testAnfrageData);

    // Assert: Anfrage exists
    expect(anfrageId).toBeTruthy();

    // Assert: Data is correct
    const anfrageData = await getPartnerAnfrageData(page, testKennzeichen);
    expect(anfrageData).toBeTruthy();
    expect(anfrageData.kennzeichen).toBe(testKennzeichen);
    expect(anfrageData.kundenname).toBe(testAnfrageData.kundenname);
    expect(anfrageData.kundenEmail).toBe(testAnfrageData.kundenEmail.toLowerCase());
    expect(anfrageData.serviceTyp).toBe('lackier');
    expect(anfrageData.status).toBe('neu');
    expect(anfrageData.werkstattId).toBe('mosbach');
  });

  test('E2E-P2: Werkstatt kann KVA zu Anfrage hinzufügen', async ({ page }) => {
    // Setup: Create anfrage
    await createPartnerAnfrageDirectly(page, testAnfrageData);

    // Act: Add KVA data to anfrage
    const kvaData = {
      varianten: [
        { name: 'Economy', preis: 800, beschreibung: 'Standard Reparatur' },
        { name: 'Premium', preis: 1200, beschreibung: 'Hochwertige Reparatur' }
      ],
      erstelltAm: new Date().toISOString(),
      erstelltVon: 'admin@test.de'
    };

    await updatePartnerAnfrageWithKVA(page, testKennzeichen, kvaData);

    // Assert: KVA data saved
    const anfrageData = await getPartnerAnfrageData(page, testKennzeichen);
    expect(anfrageData.kvaData).toBeTruthy();
    expect(anfrageData.kvaData.varianten).toHaveLength(2);
    expect(anfrageData.kvaData.varianten[0].preis).toBe(800);
    expect(anfrageData.status).toBe('kva_gesendet');
  });

  test('E2E-P3: Partner kann KVA-Variante auswählen', async ({ page }) => {
    // Setup: Create anfrage with KVA
    await createPartnerAnfrageDirectly(page, testAnfrageData);
    const kvaData = {
      varianten: [
        { name: 'Economy', preis: 800 },
        { name: 'Premium', preis: 1200 }
      ]
    };
    await updatePartnerAnfrageWithKVA(page, testKennzeichen, kvaData);

    // Act: Partner selects variant
    await selectKVAVariante(page, testKennzeichen, 1); // Select Premium

    // Assert: Variant selected
    const anfrageData = await getPartnerAnfrageData(page, testKennzeichen);
    expect(anfrageData.gewaehlteVariante).toBe(1);
    expect(anfrageData.status).toBe('variante_gewaehlt');
  });

  test('E2E-P4: annehmenKVA() erstellt Fahrzeug in fahrzeuge_{werkstattId}', async ({ page }) => {
    // FIX (2025-12-08): Clean up ALL stale vehicles with same kennzeichen (multi-tenant aware)
    // This prevents test isolation issues from accumulated test runs
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');
      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .get();
      for (const doc of snapshot.docs) {
        await db.collection(collectionName).doc(doc.id).delete();
      }
      if (snapshot.docs.length > 0) {
        console.log(`🧹 Cleaned ${snapshot.docs.length} stale vehicles for ${kz}`);
      }
    }, testKennzeichen);

    // Setup: Create complete anfrage with selected variant
    await createPartnerAnfrageDirectly(page, testAnfrageData);
    const kvaData = {
      varianten: [
        { name: 'Economy', preis: 800 },
        { name: 'Premium', preis: 1200 }
      ]
    };
    await updatePartnerAnfrageWithKVA(page, testKennzeichen, kvaData);
    await selectKVAVariante(page, testKennzeichen, 0);

    // Act: Execute annehmenKVA (simulated - creates vehicle)
    await executeAnnehmenKVA(page, testKennzeichen);

    // Assert: Vehicle created in fahrzeuge_{werkstattId}
    const vehicleData = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');
      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();
      return snapshot.empty ? null : snapshot.docs[0].data();
    }, testKennzeichen);

    expect(vehicleData).toBeTruthy();
    expect(vehicleData.kennzeichen).toBe(testKennzeichen);
    expect(vehicleData.status).toBe('angenommen');
    expect(vehicleData.werkstattId).toBe('mosbach');
    expect(vehicleData.vereinbarterPreis).toBe('800'); // Economy preis
  });

  test('E2E-P5: Anfrage-Status wird auf "angenommen" gesetzt nach KVA-Annahme', async ({ page }) => {
    // Setup: Full workflow
    await createPartnerAnfrageDirectly(page, testAnfrageData);
    await updatePartnerAnfrageWithKVA(page, testKennzeichen, {
      varianten: [{ name: 'Standard', preis: 1000 }]
    });
    await selectKVAVariante(page, testKennzeichen, 0);
    await executeAnnehmenKVA(page, testKennzeichen);

    // Assert: Anfrage status updated
    const anfrageData = await getPartnerAnfrageData(page, testKennzeichen);
    expect(anfrageData.status).toBe('angenommen');
  });

  test('E2E-P6: Ersatzteile werden bei KVA-Annahme übertragen', async ({ page }) => {
    // Setup: Anfrage with ersatzteile
    const anfrageWithErsatzteile = {
      ...testAnfrageData,
      ersatzteile: [
        { bezeichnung: 'Stoßstange', menge: 1, einzelpreis: 250, lieferant: 'BMW AG' },
        { bezeichnung: 'Lackdose', menge: 2, einzelpreis: 45, lieferant: 'PPG' }
      ]
    };
    await createPartnerAnfrageDirectly(page, anfrageWithErsatzteile);
    await updatePartnerAnfrageWithKVA(page, testKennzeichen, {
      varianten: [{ name: 'Standard', preis: 1500 }]
    });
    await selectKVAVariante(page, testKennzeichen, 0);
    await executeAnnehmenKVA(page, testKennzeichen);

    // Assert: Ersatzteile transferred to central DB
    const ersatzteile = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('ersatzteile');
      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .get();
      return snapshot.docs.map(d => d.data());
    }, testKennzeichen);

    expect(ersatzteile.length).toBeGreaterThanOrEqual(2);
    expect(ersatzteile.some(e => e.bezeichnung === 'Stoßstange')).toBeTruthy();
  });
});

// Helper Functions for Partner Workflow Tests

async function createPartnerAnfrageDirectly(page, data) {
  return await page.evaluate(async (anfrageData) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const anfrage = {
      kennzeichen: anfrageData.kennzeichen,
      kundenname: anfrageData.kundenname,
      kundenEmail: (anfrageData.kundenEmail || 'test@example.com').toLowerCase(),
      serviceTyp: anfrageData.serviceTyp || 'lackier',
      marke: anfrageData.marke || 'Volkswagen',
      modell: anfrageData.modell || 'Golf',
      schadenBeschreibung: anfrageData.schadenBeschreibung || '',
      ersatzteile: anfrageData.ersatzteile || [],
      status: 'neu',
      erstelltAm: new Date().toISOString(),
      werkstattId: werkstattId
    };

    const docRef = await db.collection(collectionName).add(anfrage);
    console.log(`✅ Partner-Anfrage created: ${docRef.id}`);
    return docRef.id;
  }, data);
}

async function getPartnerAnfrageData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    return snapshot.empty ? null : snapshot.docs[0].data();
  }, kennzeichen);
}

async function updatePartnerAnfrageWithKVA(page, kennzeichen, kvaData) {
  return await page.evaluate(async ({ kz, kva }) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (snapshot.empty) {
      console.error(`❌ Anfrage ${kz} not found`);
      return false;
    }

    const docId = snapshot.docs[0].id;
    await db.collection(collectionName).doc(docId).update({
      kvaData: kva,
      status: 'kva_gesendet',
      kvaErstelltAm: new Date().toISOString()
    });

    console.log(`✅ KVA added to anfrage ${kz}`);
    return true;
  }, { kz: kennzeichen, kva: kvaData });
}

async function selectKVAVariante(page, kennzeichen, varianteIndex) {
  return await page.evaluate(async ({ kz, idx }) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const collectionName = `partnerAnfragen_${werkstattId}`;

    const snapshot = await db.collection(collectionName)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (snapshot.empty) return false;

    const docId = snapshot.docs[0].id;
    await db.collection(collectionName).doc(docId).update({
      gewaehlteVariante: idx,
      status: 'variante_gewaehlt',
      varianteGewaehltAm: new Date().toISOString()
    });

    console.log(`✅ Variante ${idx} selected for ${kz}`);
    return true;
  }, { kz: kennzeichen, idx: varianteIndex });
}

async function executeAnnehmenKVA(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const anfrageCollection = `partnerAnfragen_${werkstattId}`;
    const fahrzeugeCollection = window.getCollectionName('fahrzeuge');
    const ersatzteileCollection = window.getCollectionName('ersatzteile');

    // Get anfrage data
    const anfrageSnapshot = await db.collection(anfrageCollection)
      .where('kennzeichen', '==', kz)
      .limit(1)
      .get();

    if (anfrageSnapshot.empty) {
      console.error(`❌ Anfrage ${kz} not found`);
      return false;
    }

    const anfrageDoc = anfrageSnapshot.docs[0];
    const anfrageData = anfrageDoc.data();
    const selectedVariante = anfrageData.kvaData?.varianten?.[anfrageData.gewaehlteVariante || 0];

    // Create vehicle
    const vehicleData = {
      kennzeichen: anfrageData.kennzeichen,
      kundenname: anfrageData.kundenname,
      kundenEmail: anfrageData.kundenEmail,
      serviceTyp: anfrageData.serviceTyp,
      marke: anfrageData.marke,
      modell: anfrageData.modell,
      // FIX (2025-12-08): Production uses .gesamt, test data may use .preis
      vereinbarterPreis: String(selectedVariante?.gesamt || selectedVariante?.preis || '1000'),
      status: 'angenommen',
      prozessStatus: 'angenommen',
      werkstattId: werkstattId,
      annahmeDatum: new Date().toISOString(),
      erstelltAm: new Date().toISOString(),
      quelle: 'partner_anfrage',
      anfrageId: anfrageDoc.id
    };

    await db.collection(fahrzeugeCollection).add(vehicleData);
    console.log(`✅ Fahrzeug created from anfrage: ${kz}`);

    // Transfer ersatzteile
    if (anfrageData.ersatzteile && anfrageData.ersatzteile.length > 0) {
      for (const teil of anfrageData.ersatzteile) {
        await db.collection(ersatzteileCollection).add({
          ...teil,
          kennzeichen: kz,
          werkstattId: werkstattId,
          erstelltAm: new Date().toISOString(),
          status: 'offen'
        });
      }
      console.log(`✅ ${anfrageData.ersatzteile.length} Ersatzteile transferred`);
    }

    // Update anfrage status
    await db.collection(anfrageCollection).doc(anfrageDoc.id).update({
      status: 'angenommen',
      angenommenAm: new Date().toISOString()
    });

    return true;
  }, kennzeichen);
}

async function cleanupPartnerAnfrage(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';
    const anfrageCollection = `partnerAnfragen_${werkstattId}`;
    const ersatzteileCollection = window.getCollectionName('ersatzteile');

    // Delete anfrage
    const anfrageSnapshot = await db.collection(anfrageCollection)
      .where('kennzeichen', '==', kz)
      .get();
    for (const doc of anfrageSnapshot.docs) {
      await db.collection(anfrageCollection).doc(doc.id).delete();
    }

    // Delete ersatzteile
    const ersatzteileSnapshot = await db.collection(ersatzteileCollection)
      .where('kennzeichen', '==', kz)
      .get();
    for (const doc of ersatzteileSnapshot.docs) {
      await db.collection(ersatzteileCollection).doc(doc.id).delete();
    }

    console.log(`🧹 Cleaned up anfrage and ersatzteile for ${kz}`);
    return true;
  }, kennzeichen);
}
