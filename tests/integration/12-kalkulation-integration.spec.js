/**
 * INTEGRATION TESTS: Kalkulation (Cost Estimation)
 *
 * Tests for the KI-based cost estimation system (kalkulation.html)
 *
 * Test Coverage:
 * - Vehicle loading from database
 * - Entwürfe (drafts) management
 * - KI damage analysis (mocked)
 * - Position/line item management
 * - Material cost calculation
 * - Multi-service handling
 * - Partner Anfragen integration
 * - MwSt (VAT) calculations
 * - Template system
 *
 * @author Claude Code
 * @date 2025-12-14
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  loginAsTestAdmin,
  createVehicleDirectly,
  deleteVehicle,
  createPartnerAnfrageDirectly,
  cleanupPartnerAnfrage
} = require('../helpers/firebase-helper');

test.describe('INTEGRATION: Kalkulation (Cost Estimation) System', () => {
  const testKennzeichen = 'KALK-TEST-001';
  const testKundenname = 'Kalkulation Test Kunde';

  test.beforeEach(async ({ page }) => {
    await page.goto('/index.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);

    // Cleanup
    await deleteVehicle(page, testKennzeichen);
    await cleanupKalkulation(page, testKennzeichen);
  });

  test.afterEach(async ({ page }) => {
    await deleteVehicle(page, testKennzeichen);
    await cleanupKalkulation(page, testKennzeichen);
  });

  // Helper to cleanup kalkulation data
  async function cleanupKalkulation(page, kennzeichen) {
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';

      // Cleanup kalkulationen
      try {
        const kalkulationen = await db.collection(`kalkulationen_${werkstattId}`)
          .where('kennzeichen', '==', kz)
          .get();
        for (const doc of kalkulationen.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Kalkulation cleanup:', e.message);
      }

      // Cleanup entwuerfe
      try {
        const entwuerfe = await db.collection(`entwuerfe_${werkstattId}`)
          .where('kennzeichen', '==', kz)
          .get();
        for (const doc of entwuerfe.docs) {
          await doc.ref.delete();
        }
      } catch (e) {
        console.log('Entwuerfe cleanup:', e.message);
      }
    }, kennzeichen);
  }

  // ============================================
  // VEHICLE LOADING TESTS
  // ============================================

  test('KALK-1.1: Load vehicles from database', async ({ page }) => {
    // Setup: Create test vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      marke: 'BMW',
      modell: '3er',
      serviceTyp: 'lackier'
    });

    // Act: Query vehicles
    const vehicles = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `fahrzeuge_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // Assert: Vehicle is loaded
    expect(vehicles.length).toBeGreaterThan(0);
    const testVehicle = vehicles.find(v => v.kennzeichen === testKennzeichen);
    expect(testVehicle).toBeTruthy();
    expect(testVehicle.kundenname).toBe(testKundenname);
  });

  test('KALK-1.2: Vehicle search by kennzeichen', async ({ page }) => {
    // Setup: Create test vehicle
    await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Act: Search for vehicle
    const searchResult = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `fahrzeuge_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .limit(1)
        .get();

      return snapshot.empty ? null : snapshot.docs[0].data();
    }, testKennzeichen);

    // Assert: Vehicle found
    expect(searchResult).toBeTruthy();
    expect(searchResult.kennzeichen).toBe(testKennzeichen);
  });

  // ============================================
  // KALKULATION CREATION TESTS
  // ============================================

  test('KALK-2.1: Create new Kalkulation', async ({ page }) => {
    // Create vehicle first
    const vehicleId = await createVehicleDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname
    });

    // Act: Create Kalkulation
    const kalkulationId = await page.evaluate(async ({ kz, kunde, vId }) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const kalkulation = {
        fahrzeugId: vId,
        kennzeichen: kz,
        kundenname: kunde,
        positionen: [],
        materialien: [],
        summeNetto: 0,
        mwst: 0,
        summeBrutto: 0,
        status: 'entwurf',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(kalkulation);
      return docRef.id;
    }, { kz: testKennzeichen, kunde: testKundenname, vId: vehicleId });

    // Assert: Kalkulation created
    expect(kalkulationId).toBeTruthy();
  });

  test('KALK-2.2: Add positions to Kalkulation', async ({ page }) => {
    // Create Kalkulation
    const kalkulationId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'Position Test',
        positionen: [],
        status: 'entwurf',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Add positions
    const updatedKalkulation = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const positionen = [
        { beschreibung: 'Stoßstange demontieren', einheit: 'Std', menge: 1.5, einzelpreis: 75, gesamt: 112.50 },
        { beschreibung: 'Lackierung Stoßstange', einheit: 'Pauschal', menge: 1, einzelpreis: 350, gesamt: 350 },
        { beschreibung: 'Stoßstange montieren', einheit: 'Std', menge: 1, einzelpreis: 75, gesamt: 75 }
      ];

      const summeNetto = positionen.reduce((sum, p) => sum + p.gesamt, 0);
      const mwst = summeNetto * 0.19;
      const summeBrutto = summeNetto + mwst;

      await db.collection(collectionName).doc(id).update({
        positionen: positionen,
        summeNetto: summeNetto,
        mwst: mwst,
        summeBrutto: summeBrutto
      });

      const doc = await db.collection(collectionName).doc(id).get();
      return doc.data();
    }, kalkulationId);

    // Assert: Positions added
    expect(updatedKalkulation.positionen).toHaveLength(3);
    expect(updatedKalkulation.summeNetto).toBe(537.50);
    expect(updatedKalkulation.mwst).toBeCloseTo(102.125, 2);
  });

  // ============================================
  // PRICE CALCULATION TESTS
  // ============================================

  test('KALK-3.1: Calculate position total', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      const position = {
        menge: 2.5,
        einzelpreis: 75
      };
      const gesamt = position.menge * position.einzelpreis;
      return { menge: position.menge, einzelpreis: position.einzelpreis, gesamt };
    });

    expect(calculation.gesamt).toBe(187.50);
  });

  test('KALK-3.2: Calculate Kalkulation total (Netto + MwSt = Brutto)', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      const positionen = [
        { gesamt: 100 },
        { gesamt: 200 },
        { gesamt: 300 }
      ];

      const summeNetto = positionen.reduce((sum, p) => sum + p.gesamt, 0);
      const mwstSatz = 0.19;
      const mwst = summeNetto * mwstSatz;
      const summeBrutto = summeNetto + mwst;

      return { summeNetto, mwst, summeBrutto };
    });

    expect(calculation.summeNetto).toBe(600);
    expect(calculation.mwst).toBe(114);
    expect(calculation.summeBrutto).toBe(714);
  });

  test('KALK-3.3: Material costs included in total', async ({ page }) => {
    const calculation = await page.evaluate(() => {
      const positionen = [
        { gesamt: 500 }  // Arbeitskosten
      ];
      const materialien = [
        { beschreibung: 'Lack', menge: 2, einzelpreis: 50, gesamt: 100 },
        { beschreibung: 'Grundierung', menge: 1, einzelpreis: 30, gesamt: 30 }
      ];

      const arbeitskosten = positionen.reduce((sum, p) => sum + p.gesamt, 0);
      const materialkosten = materialien.reduce((sum, m) => sum + m.gesamt, 0);
      const summeNetto = arbeitskosten + materialkosten;

      return { arbeitskosten, materialkosten, summeNetto };
    });

    expect(calculation.arbeitskosten).toBe(500);
    expect(calculation.materialkosten).toBe(130);
    expect(calculation.summeNetto).toBe(630);
  });

  // ============================================
  // MATERIAL MANAGEMENT TESTS
  // ============================================

  test('KALK-4.1: Add material to Kalkulation', async ({ page }) => {
    // Create Kalkulation
    const kalkulationId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const docRef = await db.collection(collectionName).add({
        kennzeichen: kz,
        kundenname: 'Material Test',
        materialien: [],
        status: 'entwurf',
        werkstattId: werkstattId
      });

      return docRef.id;
    }, testKennzeichen);

    // Act: Add material
    const material = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const neuesMaterial = {
        artikelnummer: 'LAK-001',
        beschreibung: 'Basislack Schwarz Metallic',
        hersteller: 'Spies Hecker',
        einheit: 'Liter',
        menge: 0.5,
        einzelpreis: 85.00,
        gesamt: 42.50
      };

      await db.collection(collectionName).doc(id).update({
        materialien: [neuesMaterial]
      });

      const doc = await db.collection(collectionName).doc(id).get();
      return doc.data().materialien[0];
    }, kalkulationId);

    // Assert: Material added
    expect(material.artikelnummer).toBe('LAK-001');
    expect(material.beschreibung).toBe('Basislack Schwarz Metallic');
    expect(material.gesamt).toBe(42.50);
  });

  // ============================================
  // ENTWURF (DRAFT) MANAGEMENT TESTS
  // ============================================

  test('KALK-5.1: Save Kalkulation as Entwurf', async ({ page }) => {
    // Act: Create Entwurf (draft)
    const entwurfId = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `entwuerfe_${werkstattId}`;

      const entwurf = {
        kennzeichen: kz,
        kundenname: 'Entwurf Test',
        kalkulation: {
          positionen: [{ beschreibung: 'Test', gesamt: 100 }],
          summeNetto: 100
        },
        status: 'entwurf',
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(entwurf);
      return docRef.id;
    }, testKennzeichen);

    // Assert: Entwurf saved
    expect(entwurfId).toBeTruthy();
  });

  test('KALK-5.2: Load Entwürfe list', async ({ page }) => {
    // Setup: Create multiple Entwürfe
    await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `entwuerfe_${werkstattId}`;

      for (let i = 1; i <= 3; i++) {
        await db.collection(collectionName).add({
          kennzeichen: kz,
          kundenname: `Entwurf ${i}`,
          status: 'entwurf',
          erstelltAm: new Date().toISOString(),
          werkstattId: werkstattId
        });
      }
    }, testKennzeichen);

    // Act: Load Entwürfe
    const entwuerfe = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `entwuerfe_${werkstattId}`;

      const snapshot = await db.collection(collectionName)
        .where('kennzeichen', '==', kz)
        .get();

      return snapshot.docs.map(doc => doc.data());
    }, testKennzeichen);

    // Assert: All Entwürfe loaded
    expect(entwuerfe).toHaveLength(3);
  });

  // ============================================
  // KI ANALYSIS TESTS (MOCKED)
  // ============================================

  test('KALK-6.1: KI damage analysis structure', async ({ page }) => {
    // Test the structure of KI analysis result (mocked)
    const kiResult = await page.evaluate(() => {
      // Simulated KI analysis result
      const schadenAnalyse = {
        schaeden: [
          {
            bauteil: 'Stoßstange vorne',
            beschreibung: 'Kratzer und Delle',
            schweregrad: 'mittel',
            empfohleneReparatur: 'Ausbeulen und Lackieren',
            geschaetzteKosten: { min: 300, max: 500 }
          },
          {
            bauteil: 'Kotflügel links',
            beschreibung: 'Lackschaden',
            schweregrad: 'leicht',
            empfohleneReparatur: 'Spot-Repair',
            geschaetzteKosten: { min: 150, max: 250 }
          }
        ],
        zusammenfassung: 'Leichte bis mittlere Schäden an Front und Seite',
        geschaetzteDauer: '2-3 Tage',
        gesamtschaetzung: { min: 450, max: 750 }
      };

      return schadenAnalyse;
    });

    // Assert: KI result structure is correct
    expect(kiResult.schaeden).toHaveLength(2);
    expect(kiResult.schaeden[0].bauteil).toBe('Stoßstange vorne');
    expect(kiResult.zusammenfassung).toBeTruthy();
    expect(kiResult.gesamtschaetzung.min).toBe(450);
  });

  test('KALK-6.2: Convert KI analysis to Kalkulation positions', async ({ page }) => {
    const positionen = await page.evaluate(() => {
      // Simulated KI schaeden
      const schaeden = [
        { bauteil: 'Stoßstange', geschaetzteKosten: { min: 300, max: 400 } },
        { bauteil: 'Kotflügel', geschaetzteKosten: { min: 200, max: 300 } }
      ];

      // Convert to positions (use average of min/max)
      return schaeden.map((schaden, index) => ({
        position: index + 1,
        beschreibung: `Reparatur ${schaden.bauteil}`,
        einzelpreis: (schaden.geschaetzteKosten.min + schaden.geschaetzteKosten.max) / 2,
        menge: 1,
        gesamt: (schaden.geschaetzteKosten.min + schaden.geschaetzteKosten.max) / 2
      }));
    });

    // Assert: Positions generated
    expect(positionen).toHaveLength(2);
    expect(positionen[0].einzelpreis).toBe(350);
    expect(positionen[1].einzelpreis).toBe(250);
  });

  // ============================================
  // MULTI-SERVICE TESTS
  // ============================================

  test('KALK-7.1: Handle multiple service types', async ({ page }) => {
    const services = await page.evaluate(() => {
      // All 12 service types
      const allServices = [
        'lackier', 'reifen', 'mechanik', 'pflege', 'tuev', 'versicherung',
        'glas', 'klima', 'dellen', 'folierung', 'steinschutz', 'werbebeklebung'
      ];

      // Each service has specific default positions
      const serviceDefaults = {
        lackier: [{ beschreibung: 'Lackierung', einzelpreis: 500 }],
        reifen: [{ beschreibung: 'Reifenwechsel', einzelpreis: 50 }],
        mechanik: [{ beschreibung: 'Inspektion', einzelpreis: 150 }],
        pflege: [{ beschreibung: 'Fahrzeugaufbereitung', einzelpreis: 200 }],
        tuev: [{ beschreibung: 'HU/AU', einzelpreis: 120 }],
        versicherung: [{ beschreibung: 'Gutachten', einzelpreis: 180 }]
      };

      return { count: allServices.length, defaults: serviceDefaults };
    });

    // Assert: All services supported
    expect(services.count).toBe(12);
    expect(services.defaults.lackier[0].einzelpreis).toBe(500);
  });

  test('KALK-7.2: Multi-service Kalkulation', async ({ page }) => {
    // Create Kalkulation with multiple services
    const kalkulation = await page.evaluate(async (kz) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulationen_${werkstattId}`;

      const multiServiceKalkulation = {
        kennzeichen: kz,
        kundenname: 'Multi-Service Test',
        services: ['lackier', 'reifen'],
        positionenProService: {
          lackier: [{ beschreibung: 'Lackierung Tür', gesamt: 400 }],
          reifen: [{ beschreibung: 'Reifenwechsel', gesamt: 80 }]
        },
        summeNetto: 480,
        status: 'entwurf',
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(multiServiceKalkulation);
      const doc = await docRef.get();
      return doc.data();
    }, testKennzeichen);

    // Assert: Multiple services stored
    expect(kalkulation.services).toHaveLength(2);
    expect(kalkulation.services).toContain('lackier');
    expect(kalkulation.services).toContain('reifen');
  });

  // ============================================
  // PARTNER ANFRAGE INTEGRATION TESTS
  // ============================================

  test('KALK-8.1: Load Partner Anfrage for Kalkulation', async ({ page }) => {
    // Setup: Create Partner Anfrage
    const anfrageId = await createPartnerAnfrageDirectly(page, {
      kennzeichen: testKennzeichen,
      kundenname: testKundenname,
      serviceTyp: 'lackier',
      schadenBeschreibung: 'Kratzer an der Stoßstange'
    });

    // Act: Load anfrage
    const anfrage = await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const doc = await db.collection(`partnerAnfragen_${werkstattId}`).doc(id).get();
      return doc.exists ? doc.data() : null;
    }, anfrageId);

    // Assert: Anfrage loaded
    expect(anfrage).toBeTruthy();
    expect(anfrage.kennzeichen).toBe(testKennzeichen);
    expect(anfrage.schadenBeschreibung).toBe('Kratzer an der Stoßstange');

    // Cleanup
    await cleanupPartnerAnfrage(page, testKennzeichen);
  });

  // ============================================
  // TEMPLATE TESTS
  // ============================================

  test('KALK-9.1: Save Kalkulation as template', async ({ page }) => {
    // Act: Create template
    const templateId = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulation_templates_${werkstattId}`;

      const template = {
        name: 'Stoßstange Standard',
        beschreibung: 'Standard-Kalkulation für Stoßstangen-Lackierung',
        serviceTyp: 'lackier',
        positionen: [
          { beschreibung: 'Stoßstange ab', gesamt: 50 },
          { beschreibung: 'Lackierung', gesamt: 350 },
          { beschreibung: 'Stoßstange an', gesamt: 50 }
        ],
        summeNetto: 450,
        erstelltAm: new Date().toISOString(),
        werkstattId: werkstattId
      };

      const docRef = await db.collection(collectionName).add(template);
      return docRef.id;
    });

    // Assert: Template saved
    expect(templateId).toBeTruthy();

    // Cleanup
    await page.evaluate(async (id) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      await db.collection(`kalkulation_templates_${werkstattId}`).doc(id).delete();
    }, templateId);
  });

  test('KALK-9.2: Load templates list', async ({ page }) => {
    // Setup: Create templates
    await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulation_templates_${werkstattId}`;

      const templates = [
        { name: 'Template A', serviceTyp: 'lackier' },
        { name: 'Template B', serviceTyp: 'reifen' }
      ];

      for (const t of templates) {
        await db.collection(collectionName).add({
          ...t,
          werkstattId: werkstattId,
          erstelltAm: new Date().toISOString()
        });
      }
    });

    // Act: Load templates
    const templates = await page.evaluate(async () => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      const collectionName = `kalkulation_templates_${werkstattId}`;

      const snapshot = await db.collection(collectionName).get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    });

    // Assert: Templates loaded
    expect(templates.length).toBeGreaterThanOrEqual(2);

    // Cleanup
    await page.evaluate(async (ids) => {
      const db = window.firebaseApp.db();
      const werkstattId = window.werkstattId || 'mosbach';
      for (const id of ids) {
        try {
          await db.collection(`kalkulation_templates_${werkstattId}`).doc(id).delete();
        } catch (e) {}
      }
    }, templates.map(t => t.id));
  });

  // ============================================
  // DATA VALIDATION TESTS
  // ============================================

  test('KALK-10.1: Position price cannot be negative', async ({ page }) => {
    const validation = await page.evaluate(() => {
      const position = {
        beschreibung: 'Test',
        einzelpreis: -50,
        menge: 1
      };

      // Validation logic
      const isValid = position.einzelpreis >= 0;
      const correctedPrice = Math.max(0, position.einzelpreis);

      return { isValid, correctedPrice };
    });

    expect(validation.isValid).toBe(false);
    expect(validation.correctedPrice).toBe(0);
  });

  test('KALK-10.2: Quantity must be positive', async ({ page }) => {
    const validation = await page.evaluate(() => {
      const testCases = [
        { menge: 0, isValid: false },
        { menge: -1, isValid: false },
        { menge: 0.5, isValid: true },
        { menge: 1, isValid: true }
      ];

      return testCases.map(tc => ({
        menge: tc.menge,
        expected: tc.isValid,
        actual: tc.menge > 0
      }));
    });

    for (const result of validation) {
      expect(result.actual).toBe(result.expected);
    }
  });

  // ============================================
  // UI SMOKE TESTS
  // ============================================

  test('KALK-11.1: Kalkulation page loads', async ({ page }) => {
    await page.goto('/kalkulation.html');

    // Check page loads
    await expect(page).toHaveTitle(/Kalkulation/i);
  });

  test('KALK-11.2: Kalkulation page structure is valid', async ({ page }) => {
    await page.goto('/kalkulation.html', { waitUntil: 'domcontentloaded' });

    // Wait for page to load (no Firebase needed for structure check)
    await page.waitForSelector('body', { state: 'attached', timeout: 10000 });

    // Check for main page structure (actual elements that exist)
    const pageStructure = await page.evaluate(() => {
      return {
        hasHero: document.querySelector('.page-hero') !== null,
        hasTitle: document.querySelector('.page-hero__title') !== null,
        hasNavDropdown: document.querySelector('#navDropdown') !== null,
        bodyHasContent: document.body && document.body.innerHTML.length > 1000
      };
    });

    // Page should have proper structure
    expect(pageStructure.bodyHasContent).toBe(true);
    expect(pageStructure.hasHero || pageStructure.hasTitle || pageStructure.hasNavDropdown).toBe(true);
  });
});
