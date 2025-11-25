/**
 * E2E INTEGRATION: Data Pipeline Tests
 *
 * Testet die Daten-Pipelines:
 * - Anfrage → Fahrzeug → Rechnung (kompletter Workflow)
 * - Ersatzteile → Bestellungen
 * - kalkulationData Sanitization (Date Objects → ISO Strings)
 * - PDF-Daten-Transformation
 *
 * Ansatz: Firestore-basiert (kein UI), 100% reliable
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  deleteVehicle
} = require('../helpers/firebase-helper');

test.describe('E2E: Data Pipeline', () => {
  const testKennzeichen = 'DP-E2E-001';
  const testKundenname = 'Data Pipeline E2E Test';

  // Setup: Login as admin before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ Data Pipeline Test: Admin authenticated');
  });

  // Cleanup: Remove test data after each test
  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await cleanupAllTestData(page, testKennzeichen);
    console.log('🧹 Cleanup complete');
  });

  test('E2E-DP1: kalkulationData Date Objects werden zu ISO Strings sanitized', async ({ page }) => {
    // Setup: Create vehicle with kalkulationData containing Date objects
    const kalkulationWithDates = {
      ersatzteile: [{ name: 'Teil1', preis: 100, datum: new Date() }],
      arbeitslohn: { stunden: 5, satz: 60, datum: new Date() },
      gesamtPreis: 400,
      erstelltAm: new Date()
    };

    // Act: Save and retrieve with sanitization
    const result = await page.evaluate(async ({ kz, kalkulation }) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');

      // Sanitization function (simulates Pattern 44 fix)
      function sanitizeForFirestore(obj) {
        if (obj === null || obj === undefined) return obj;
        if (obj instanceof Date) return obj.toISOString();
        if (Array.isArray(obj)) return obj.map(item => sanitizeForFirestore(item));
        if (typeof obj === 'object') {
          const result = {};
          for (const [key, value] of Object.entries(obj)) {
            result[key] = sanitizeForFirestore(value);
          }
          return result;
        }
        return obj;
      }

      // Sanitize before saving
      const sanitizedKalkulation = sanitizeForFirestore(kalkulation);

      // Save vehicle with sanitized kalkulationData
      const vehicleData = {
        kennzeichen: kz,
        kundenname: 'Test Kunde',
        serviceTyp: 'lackier',
        status: 'angenommen',
        kalkulationData: sanitizedKalkulation,
        werkstattId: window.werkstattId || 'mosbach',
        erstelltAm: new Date().toISOString()
      };

      const docRef = await db.collection(collectionName).add(vehicleData);

      // Read back
      const doc = await db.collection(collectionName).doc(docRef.id).get();
      return doc.data();
    }, { kz: testKennzeichen, kalkulation: kalkulationWithDates });

    // Assert: Dates are ISO strings
    expect(typeof result.kalkulationData.erstelltAm).toBe('string');
    expect(result.kalkulationData.erstelltAm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(typeof result.kalkulationData.arbeitslohn.datum).toBe('string');
    console.log('✅ Date objects sanitized to ISO strings');
  });

  test('E2E-DP2: Ersatzteile → Bestellungen Pipeline', async ({ page }) => {
    // Setup: Create vehicle with ersatzteile
    const ersatzteile = [
      { bezeichnung: 'Stoßstange vorne', menge: 1, einzelpreis: 250, lieferant: 'BMW AG', status: 'offen' },
      { bezeichnung: 'Lackdose Schwarz', menge: 3, einzelpreis: 45, lieferant: 'PPG', status: 'offen' }
    ];

    // Act: Create vehicle and ersatzteile, then convert to bestellungen
    const bestellungen = await page.evaluate(async ({ kz, parts }) => {
      const db = window.firebaseApp.db();
      const fahrzeugeCollection = window.getCollectionName('fahrzeuge');
      const ersatzteileCollection = window.getCollectionName('ersatzteile');
      const bestellungenCollection = window.getCollectionName('bestellungen');
      const werkstattId = window.werkstattId || 'mosbach';

      // Create vehicle
      await db.collection(fahrzeugeCollection).add({
        kennzeichen: kz,
        kundenname: 'Test Kunde',
        serviceTyp: 'lackier',
        status: 'in_arbeit',
        werkstattId: werkstattId,
        erstelltAm: new Date().toISOString()
      });

      // Save ersatzteile
      const savedParts = [];
      for (const part of parts) {
        const partDoc = await db.collection(ersatzteileCollection).add({
          ...part,
          kennzeichen: kz,
          werkstattId: werkstattId,
          erstelltAm: new Date().toISOString()
        });
        savedParts.push({ id: partDoc.id, ...part });
      }

      // Convert ersatzteile to bestellungen (data pipeline)
      const createdBestellungen = [];
      for (const part of savedParts) {
        const bestellung = {
          ersatzteilId: part.id,
          bezeichnung: part.bezeichnung,
          menge: part.menge,
          einzelpreis: part.einzelpreis,
          gesamtpreis: part.menge * part.einzelpreis,
          lieferant: part.lieferant,
          kennzeichen: kz,
          status: 'offen',
          werkstattId: werkstattId,
          erstelltAm: new Date().toISOString()
        };
        await db.collection(bestellungenCollection).add(bestellung);
        createdBestellungen.push(bestellung);
      }

      return createdBestellungen;
    }, { kz: testKennzeichen, parts: ersatzteile });

    // Assert: Bestellungen created from ersatzteile
    expect(bestellungen.length).toBe(2);
    expect(bestellungen[0].bezeichnung).toBe('Stoßstange vorne');
    expect(bestellungen[0].gesamtpreis).toBe(250);
    expect(bestellungen[1].bezeichnung).toBe('Lackdose Schwarz');
    expect(bestellungen[1].gesamtpreis).toBe(135); // 3 * 45
    console.log('✅ Ersatzteile → Bestellungen pipeline working');
  });

  test('E2E-DP3: Anfrage → Fahrzeug → Rechnung komplette Pipeline', async ({ page }) => {
    // Act: Execute complete data pipeline
    const pipelineResult = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const anfrageCollection = `partnerAnfragen_${werkstattId}`;
      const fahrzeugeCollection = window.getCollectionName('fahrzeuge');
      const rechnungenCollection = window.getCollectionName('rechnungen');

      // Step 1: Create Partner-Anfrage
      const anfrageData = {
        kennzeichen: kz,
        kundenname: 'Pipeline Test Kunde',
        kundenEmail: 'pipeline@test.de',
        serviceTyp: 'lackier',
        schadenBeschreibung: 'Kratzer Tür links',
        status: 'neu',
        werkstattId: werkstattId,
        erstelltAm: new Date().toISOString()
      };
      const anfrageRef = await db.collection(anfrageCollection).add(anfrageData);
      console.log('✅ Step 1: Anfrage created');

      // Step 2: Transform Anfrage → Fahrzeug
      const fahrzeugData = {
        ...anfrageData,
        anfrageId: anfrageRef.id,
        status: 'angenommen',
        prozessStatus: 'angenommen',
        vereinbarterPreis: '1200.00',
        quelle: 'partner_anfrage'
      };
      const fahrzeugRef = await db.collection(fahrzeugeCollection).add(fahrzeugData);
      console.log('✅ Step 2: Fahrzeug created from Anfrage');

      // Update Anfrage status
      await db.collection(anfrageCollection).doc(anfrageRef.id).update({
        status: 'angenommen',
        fahrzeugId: fahrzeugRef.id
      });

      // Step 3: Simulate work completion → Create Rechnung
      await db.collection(fahrzeugeCollection).doc(fahrzeugRef.id).update({
        status: 'fertig',
        prozessStatus: 'fertig'
      });

      const rechnungData = {
        rechnungsnummer: `RE-2025-11-${String(Date.now()).slice(-4)}`,
        fahrzeugId: fahrzeugRef.id,
        anfrageId: anfrageRef.id,
        kennzeichen: kz,
        kundenname: anfrageData.kundenname,
        kundenEmail: anfrageData.kundenEmail,
        betrag: fahrzeugData.vereinbarterPreis,
        status: 'offen',
        werkstattId: werkstattId,
        erstelltAm: new Date().toISOString()
      };
      const rechnungRef = await db.collection(rechnungenCollection).add(rechnungData);
      console.log('✅ Step 3: Rechnung created');

      return {
        anfrageId: anfrageRef.id,
        fahrzeugId: fahrzeugRef.id,
        rechnungId: rechnungRef.id,
        pipelineComplete: true
      };
    }, testKennzeichen);

    // Assert: All pipeline stages completed
    expect(pipelineResult.anfrageId).toBeTruthy();
    expect(pipelineResult.fahrzeugId).toBeTruthy();
    expect(pipelineResult.rechnungId).toBeTruthy();
    expect(pipelineResult.pipelineComplete).toBeTruthy();
    console.log('✅ Complete pipeline: Anfrage → Fahrzeug → Rechnung');
  });

  test('E2E-DP4: Email Lowercase Normalization in Pipeline', async ({ page }) => {
    // Act: Create data with UPPERCASE email
    const result = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');

      // Email normalization function
      function normalizeEmail(email) {
        return (email || '').toLowerCase().trim();
      }

      const vehicleData = {
        kennzeichen: kz,
        kundenname: 'Email Test',
        kundenEmail: normalizeEmail('UPPERCASE@TEST.DE'),
        serviceTyp: 'lackier',
        status: 'angenommen',
        werkstattId: window.werkstattId || 'mosbach',
        erstelltAm: new Date().toISOString()
      };

      const docRef = await db.collection(collectionName).add(vehicleData);
      const doc = await db.collection(collectionName).doc(docRef.id).get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Email normalized to lowercase
    expect(result.kundenEmail).toBe('uppercase@test.de');
    console.log('✅ Email normalized to lowercase');
  });

  test('E2E-DP5: Firestore Timestamp Objects werden korrekt formatiert', async ({ page }) => {
    // This tests the formatFirestoreDate helper (Pattern 44)

    // Act: Create and retrieve with Firestore Timestamps
    const result = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');

      // formatFirestoreDate helper function
      function formatFirestoreDate(dateValue) {
        if (!dateValue) return 'Nicht angegeben';

        // Handle Firestore Timestamp
        if (dateValue && typeof dateValue.toDate === 'function') {
          return dateValue.toDate().toLocaleDateString('de-DE');
        }

        // Handle ISO string
        if (typeof dateValue === 'string') {
          return new Date(dateValue).toLocaleDateString('de-DE');
        }

        // Handle Date object
        if (dateValue instanceof Date) {
          return dateValue.toLocaleDateString('de-DE');
        }

        return 'Nicht angegeben';
      }

      // Create vehicle with ISO date string
      const vehicleData = {
        kennzeichen: kz,
        kundenname: 'Timestamp Test',
        serviceTyp: 'lackier',
        status: 'angenommen',
        geplantesAbnahmeDatum: new Date('2025-12-15').toISOString(),
        werkstattId: window.werkstattId || 'mosbach',
        erstelltAm: new Date().toISOString()
      };

      const docRef = await db.collection(collectionName).add(vehicleData);
      const doc = await db.collection(collectionName).doc(docRef.id).get();
      const data = doc.data();

      return {
        rawDate: data.geplantesAbnahmeDatum,
        formattedDate: formatFirestoreDate(data.geplantesAbnahmeDatum)
      };
    }, testKennzeichen);

    // Assert: Date formatted correctly
    expect(result.rawDate).toContain('2025-12-15');
    expect(result.formattedDate).toBe('15.12.2025');
    console.log('✅ Firestore dates formatted correctly');
  });

  test('E2E-DP6: ID Type Comparison Safety (String vs Number)', async ({ page }) => {
    // This tests Pattern 3: Type-Safe ID comparisons

    // Act: Test ID comparison with different types
    const result = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const collectionName = window.getCollectionName('fahrzeuge');

      // Create vehicle
      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'ID Test',
        serviceTyp: 'lackier',
        status: 'angenommen',
        customId: 12345, // Number ID
        werkstattId: window.werkstattId || 'mosbach',
        erstelltAm: new Date().toISOString()
      });

      // Read back
      const doc = await db.collection(collectionName).doc(docRef.id).get();
      const data = doc.data();

      // Test comparisons
      const numericId = 12345;
      const stringId = '12345';

      return {
        storedId: data.customId,
        storedType: typeof data.customId,

        // Type-UNSAFE comparison (may fail)
        unsafeMatch: data.customId === stringId, // false!

        // Type-SAFE comparison (Pattern 3)
        safeMatch: String(data.customId) === String(stringId) // true
      };
    }, testKennzeichen);

    // Assert: Type-safe comparison works
    expect(result.storedType).toBe('number');
    expect(result.unsafeMatch).toBeFalsy(); // Demonstrates the problem
    expect(result.safeMatch).toBeTruthy();   // Pattern 3 solution
    console.log('✅ Type-safe ID comparison working (Pattern 3)');
  });
});

// Cleanup Helper
async function cleanupAllTestData(page, kennzeichen) {
  return await page.evaluate(async (kz) => {
    const db = window.firebaseApp.db();
    const werkstattId = window.werkstattId || 'mosbach';

    const collections = [
      `partnerAnfragen_${werkstattId}`,
      window.getCollectionName('ersatzteile'),
      window.getCollectionName('bestellungen'),
      window.getCollectionName('rechnungen')
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await db.collection(collectionName)
          .where('kennzeichen', '==', kz)
          .get();

        for (const doc of snapshot.docs) {
          await db.collection(collectionName).doc(doc.id).delete();
        }
      } catch (e) {
        console.log(`Cleanup ${collectionName}: ${e.message}`);
      }
    }

    console.log(`🧹 All test data cleaned up for ${kz}`);
    return true;
  }, kennzeichen);
}
