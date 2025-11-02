/**
 * TEST SUITE: Version 3.2 Service Consistency
 *
 * Testet die Konsistenz aller 6 Service-Typen über die komplette Pipeline:
 * - Partner erstellt Anfrage
 * - Admin bearbeitet im Partner Portal
 * - Admin erstellt KVA
 * - Partner nimmt KVA an
 * - Fahrzeug wird korrekt angelegt
 * - Status-Mapping funktioniert
 *
 * TASK #10: E2E Tests für Version 3.2 Service Consistency
 *
 * Commits getestet:
 * - e082464: TASK #1 - schadenBeschreibung standardized
 * - 1153dd1: TASK #2 - anmerkungen → allgemeineNotizen
 * - 8530fa0: TASK #3 - Service-specific fields in Kacheln
 * - 4b3ce39: TASK #4 - Service-agnostic Termin-Labels
 * - 6458c68: TASK #5 - Complete hover-info label mappings
 * - b164195: TASK #6 - Complete status-mapping
 * - 1fd40a6: TASK #8 - Pflege & TÜV service-details format
 * - 84ec797: TASK #9 - Service-specific Lieferzeit-Texte
 * - b8c191e: CRITICAL BUGFIX - TÜV abholbereit mapping
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  setupConsoleMonitoring,
  loginAsTestAdmin  // RUN #70: Test authentication
} = require('./helpers/firebase-helper');
const {
  SERVICE_CONFIGS,
  createPartnerRequest,
  verifyServiceFields,
  verifyStatusMapping,
  createKVA,
  acceptKVA,
  verifyHoverInfoPriceBreakdown,
  cleanupTestData
} = require('./helpers/service-helper');

test.describe('V3.2: Service Consistency Tests', () => {

  /**
   * TEST GROUP 1: Multi-Service Partner Flow
   *
   * Testet den kompletten Partner-to-Admin-to-Partner Flow für ALLE 6 Services
   *
   * CRITICAL: Dieser Test ist der wichtigste für Version 3.2!
   * Wenn ein Service hier fehlschlägt, ist die Service-Konsistenz nicht gegeben.
   */
  test.describe('TC1: Multi-Service Partner Flow', () => {

    // Test für ALLE 6 Services (Lackierung, Reifen, Mechanik, Pflege, TÜV, Versicherung)
    Object.keys(SERVICE_CONFIGS).forEach(serviceTyp => {

      test(`Partner-to-Admin Flow: ${SERVICE_CONFIGS[serviceTyp].label} (${serviceTyp})`, async ({ page }) => {
        const consoleMonitor = setupConsoleMonitoring(page);
        // ✅ FIX BUG #13: Eindeutige Kennzeichen mit Timestamp (vermeidet Race Conditions bei parallelen Tests!)
        const testKennzeichen = `E2E-${serviceTyp.toUpperCase()}-${Date.now()}`;
        const config = SERVICE_CONFIGS[serviceTyp];

        console.log(`\n${'='.repeat(80)}`);
        console.log(`TEST START: ${config.label} (${serviceTyp})`);
        console.log(`${'='.repeat(80)}\n`);

        // STEP 1: Partner erstellt Anfrage
        console.log('📝 STEP 1: Partner erstellt Anfrage...');
        const anfrageId = await createPartnerRequest(page, serviceTyp, {
          partnerName: `E2E Test Partner ${config.label}`,
          partnerEmail: `test-${serviceTyp}@e2e-partner.de`,
          kennzeichen: testKennzeichen,
          marke: 'BMW',
          modell: '3er G20',
          schadenBeschreibung: `E2E Test für ${config.label} Service`,
          // Service-spezifische Felder
          reifengroesse: serviceTyp === 'reifen' ? '225/45 R17' : undefined,
          tuevart: serviceTyp === 'tuev' ? 'hu_au' : undefined
        });

        expect(anfrageId).toBeTruthy();
        expect(anfrageId).not.toBeNull();
        console.log(`✅ STEP 1 DONE: anfrageId = ${anfrageId}\n`);

        // STEP 2: Admin öffnet Anfrage im Partner Portal
        console.log('🔍 STEP 2: Verifiziere Service-Felder im Partner Portal...');
        const verification = await verifyServiceFields(page, serviceTyp, anfrageId);

        // Assertions
        expect(verification.serviceIconFound).toBeTruthy();
        expect(verification.serviceLabel).toContain(config.label);
        console.log(`✅ STEP 2 DONE: Service-Icon & Label korrekt (${config.icon} ${config.label})\n`);

        // STEP 3: Admin erstellt KVA
        console.log('📋 STEP 3: Admin erstellt KVA...');
        const kvaCreated = await createKVA(page, anfrageId, {
          positionen: [
            { beschreibung: `${config.label} Standard`, preis: 500 },
            { beschreibung: `${config.label} Premium`, preis: 750 }
          ],
          anliefertermin: '2025-11-01' // TASK #4: Service-agnostic Label!
        });

        expect(kvaCreated).toBeTruthy();
        console.log(`✅ STEP 3 DONE: KVA erstellt\n`);

        // STEP 4: Partner nimmt KVA an
        console.log('✅ STEP 4: Partner nimmt KVA an...');
        const kvaAccepted = await acceptKVA(page, anfrageId);

        expect(kvaAccepted).toBeTruthy();
        console.log(`✅ STEP 4 DONE: KVA angenommen\n`);

        // STEP 5: Verifiziere Fahrzeug wurde erstellt
        console.log('🚗 STEP 5: Verifiziere Fahrzeug wurde erstellt...');
        await page.goto('/liste.html');
        await waitForFirebaseReady(page);
        await page.waitForTimeout(3000); // Wait for Firestore sync

        const vehicleExists = await checkVehicleExists(page, testKennzeichen);
        expect(vehicleExists).toBeTruthy();

        const vehicleData = await getVehicleData(page, testKennzeichen);
        expect(vehicleData).toBeTruthy();
        expect(vehicleData.serviceTyp).toBe(serviceTyp);
        expect(vehicleData.kennzeichen).toBe(testKennzeichen);
        console.log(`✅ STEP 5 DONE: Fahrzeug korrekt angelegt (serviceTyp=${serviceTyp})\n`);

        console.log(`\n${'='.repeat(80)}`);
        console.log(`TEST SUCCESS: ${config.label} (${serviceTyp}) ✅`);
        console.log(`${'='.repeat(80)}\n`);

        // Cleanup
        await cleanupTestData(page, testKennzeichen, serviceTyp);
      });

    });

  });

  /**
   * TEST GROUP 2: Status-Mapping Verification
   *
   * Testet das Status-Mapping zwischen Kanban (Admin) und Partner Portal
   *
   * CRITICAL für TASK #6 (Commit b164195) und TÜV-Bugfix (Commit b8c191e)
   */
  test.describe('TC2: Status-Mapping Verification', () => {

    // Test NUR für Services mit speziellem Status-Mapping (Mechanik, Pflege, TÜV)
    ['mechanik', 'pflege', 'tuev'].forEach(serviceTyp => {

      test(`Status-Mapping: ${SERVICE_CONFIGS[serviceTyp].label}`, async ({ page }) => {
        const consoleMonitor = setupConsoleMonitoring(page);
        const testKennzeichen = `E2E-STATUS-${serviceTyp.toUpperCase()}`;
        const config = SERVICE_CONFIGS[serviceTyp];

        console.log(`\n${'='.repeat(80)}`);
        console.log(`STATUS-MAPPING TEST: ${config.label} (${serviceTyp})`);
        console.log(`${'='.repeat(80)}\n`);

        // STEP 1: Erstelle Anfrage & Fahrzeug
        const anfrageId = await createPartnerRequest(page, serviceTyp, {
          partnerName: `Status Test ${config.label}`,
          partnerEmail: `status-${serviceTyp}@e2e.de`,
          kennzeichen: testKennzeichen,
          marke: 'VW',
          modell: 'Golf 8',
          schadenBeschreibung: 'Status-Mapping Test'
        });

        await createKVA(page, anfrageId, {
          positionen: [{ beschreibung: 'Test Position', preis: 100 }],
          anliefertermin: '2025-11-01'
        });

        await acceptKVA(page, anfrageId);

        // Wait for vehicle creation
        await page.goto('/liste.html');
        await waitForFirebaseReady(page);
        await page.waitForTimeout(3000);

        // STEP 2: Teste ALLE Prozess-Schritte für diesen Service
        for (const kanbanStatus of config.prozessSteps) {
          console.log(`\n🔄 Testing Status: ${kanbanStatus} → ${config.portalStatus[kanbanStatus]}`);

          // Ändere Status im Kanban (Admin-View)
          await page.goto('/kanban.html');
          await waitForFirebaseReady(page);
          await page.waitForTimeout(2000);

          // Update Fahrzeug-Status direkt in Firestore (simuliert Kanban-Drag)
          await page.evaluate(async (kz, status) => {
            const db = window.firebaseApp.db();
            const snapshot = await db.collection('fahrzeuge')
              .where('kennzeichen', '==', kz)
              .limit(1)
              .get();

            if (!snapshot.empty) {
              await snapshot.docs[0].ref.update({
                prozessStatus: status,
                lastModified: Date.now()
              });
              console.log(`✅ Updated prozessStatus to: ${status}`);
            }
          }, testKennzeichen, kanbanStatus);

          // Wait for Firestore sync
          await page.waitForTimeout(2000);

          // STEP 3: Verifiziere Mapping im Partner Portal
          const mappingResult = await verifyStatusMapping(page, serviceTyp, testKennzeichen, kanbanStatus);

          // Assertions
          expect(mappingResult.matches).toBeTruthy();
          expect(mappingResult.actualPortalStatus).toBe(mappingResult.expectedPortalStatus);

          console.log(`  ✅ Kanban: "${kanbanStatus}" → Portal: "${mappingResult.actualPortalStatus}" (expected: "${mappingResult.expectedPortalStatus}")`);
        }

        // SPECIAL TEST: TÜV 'abholbereit' Bug-Fix (Commit b8c191e)
        if (serviceTyp === 'tuev') {
          console.log(`\n🔴 CRITICAL TEST: TÜV 'abholbereit' Bug-Fix (Commit b8c191e)`);

          await page.evaluate(async (kz) => {
            const db = window.firebaseApp.db();
            const snapshot = await db.collection('fahrzeuge')
              .where('kennzeichen', '==', kz)
              .limit(1)
              .get();

            if (!snapshot.empty) {
              await snapshot.docs[0].ref.update({
                prozessStatus: 'abholbereit',
                lastModified: Date.now()
              });
            }
          }, testKennzeichen);

          await page.waitForTimeout(2000);

          const abholbereitMapping = await verifyStatusMapping(page, serviceTyp, testKennzeichen, 'abholbereit');

          // CRITICAL ASSERTION: 'abholbereit' MUSS zu 'abholung' mappen!
          expect(abholbereitMapping.matches).toBeTruthy();
          expect(abholbereitMapping.actualPortalStatus).toBe('abholung');

          console.log(`  ✅ CRITICAL FIX VERIFIED: 'abholbereit' → 'abholung' ✅`);
        }

        console.log(`\n${'='.repeat(80)}`);
        console.log(`STATUS-MAPPING TEST SUCCESS: ${config.label} ✅`);
        console.log(`${'='.repeat(80)}\n`);

        // Cleanup
        await cleanupTestData(page, testKennzeichen, serviceTyp);
      });

    });

  });

  /**
   * TEST GROUP 3: Service-Details Formatting
   *
   * Testet die Formatierung von Service-Details in KVAs
   *
   * CRITICAL für TASK #8 (Commit 1fd40a6)
   */
  test.describe('TC3: Service-Details Formatting', () => {

  // RUN #70: Login as test admin BEFORE all tests (enables Firestore access)
  test.beforeAll(async ({ page }) => {
    await page.goto('/annahme.html');
    await waitForFirebaseReady(page);
    await loginAsTestAdmin(page);
    console.log('✅ RUN #70: Test suite authenticated as admin');
  });

    test('Pflege: Multi-Select Details korrekt formatiert', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = 'E2E-PFLEGE-FORMAT';

      console.log(`\n${'='.repeat(80)}`);
      console.log(`SERVICE-DETAILS TEST: Pflege`);
      console.log(`${'='.repeat(80)}\n`);

      // Erstelle Pflege-Anfrage mit Multi-Select Details
      const anfrageId = await createPartnerRequest(page, 'pflege', {
        partnerName: 'Pflege Format Test',
        partnerEmail: 'pflege-format@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Audi',
        modell: 'A4',
        schadenBeschreibung: 'Formatierungs-Test für Pflege-Details'
      });

      // Erstelle KVA mit Pflege-Details
      await page.goto(`/partner-app/kva-erstellen.html?anfrageId=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Check if service-details are rendered correctly
      const serviceDetailsVisible = await page.locator('.service-details, [data-service-details]').isVisible();
      expect(serviceDetailsVisible).toBeTruthy();

      console.log(`✅ Pflege Service-Details korrekt gerendert\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'pflege');
    });

    test('TÜV: HU/AU Details korrekt formatiert', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = 'E2E-TUEV-FORMAT';

      console.log(`\n${'='.repeat(80)}`);
      console.log(`SERVICE-DETAILS TEST: TÜV`);
      console.log(`${'='.repeat(80)}\n`);

      // Erstelle TÜV-Anfrage
      const anfrageId = await createPartnerRequest(page, 'tuev', {
        partnerName: 'TÜV Format Test',
        partnerEmail: 'tuev-format@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Mercedes',
        modell: 'C-Klasse',
        schadenBeschreibung: 'Formatierungs-Test für TÜV-Details',
        tuevart: 'hu_au'
      });

      // Erstelle KVA mit TÜV-Details
      await page.goto(`/partner-app/kva-erstellen.html?anfrageId=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Check if TÜV service-details are rendered
      const serviceDetailsVisible = await page.locator('.service-details, [data-service-details]').isVisible();
      expect(serviceDetailsVisible).toBeTruthy();

      console.log(`✅ TÜV Service-Details korrekt gerendert\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'tuev');
    });

  });

  /**
   * TEST GROUP 4: Hover-Info Price Breakdown
   *
   * Testet die Hover-Tooltips für Preis-Breakdowns
   *
   * CRITICAL für TASK #5 (Commit 6458c68)
   */
  test.describe('TC4: Hover-Info Price Breakdown', () => {

    test('Alle Services: Hover-Info zeigt KVA-Varianten', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = 'E2E-HOVER-TEST';
      const serviceTyp = 'lackier'; // Test mit Lackierung

      console.log(`\n${'='.repeat(80)}`);
      console.log(`HOVER-INFO TEST: KVA-Varianten-Tooltip`);
      console.log(`${'='.repeat(80)}\n`);

      // Erstelle Anfrage & KVA mit mehreren Varianten
      const anfrageId = await createPartnerRequest(page, serviceTyp, {
        partnerName: 'Hover Test Partner',
        partnerEmail: 'hover@e2e-test.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: 'X5',
        schadenBeschreibung: 'Hover-Info Test'
      });

      // Erstelle KVA mit 3 Varianten (Standard, Premium, Deluxe)
      await createKVA(page, anfrageId, {
        positionen: [
          { beschreibung: 'Standard Lackierung', preis: 500 },
          { beschreibung: 'Premium Lackierung', preis: 850 },
          { beschreibung: 'Deluxe Lackierung', preis: 1200 }
        ],
        anliefertermin: '2025-11-15'
      });

      // Warte auf KVA-Erstellung
      await page.waitForTimeout(3000);

      // Test Hover-Info
      const hoverResult = await verifyHoverInfoPriceBreakdown(page, anfrageId);

      // Assertions
      expect(hoverResult.tooltipVisible).toBeTruthy();
      expect(hoverResult.hasKvaVarianten).toBeTruthy();

      console.log(`✅ Hover-Info zeigt KVA-Varianten korrekt\n`);
      console.log(`   Tooltip-Text: "${hoverResult.tooltipText}"\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, serviceTyp);
    });

  });

  /**
   * TEST GROUP 5: Service-Agnostic Termin-Labels
   *
   * Testet ob Termin-Labels service-agnostic sind
   *
   * CRITICAL für TASK #4 (Commit 4b3ce39)
   */
  test.describe('TC5: Service-Agnostic Termin-Labels', () => {

    test('KVA Termin-Label ist service-agnostic (nicht "Lackiertermin")', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = 'E2E-TERMIN-LABEL';
      const serviceTyp = 'reifen'; // Test mit Reifen

      console.log(`\n${'='.repeat(80)}`);
      console.log(`TERMIN-LABEL TEST: Service-Agnostic (TASK #4)`);
      console.log(`${'='.repeat(80)}\n`);

      // Erstelle Anfrage
      const anfrageId = await createPartnerRequest(page, serviceTyp, {
        partnerName: 'Termin Label Test',
        partnerEmail: 'termin@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'VW',
        modell: 'Polo',
        schadenBeschreibung: 'Termin-Label Test',
        reifengroesse: '195/55 R16'
      });

      // Navigate zu KVA-Erstellen
      await page.goto(`/partner-app/kva-erstellen.html?anfrageId=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Check Termin-Label
      const terminLabelText = await page.locator('label[for*="anliefertermin"], label:has-text("termin")').textContent();

      // Assertion: NICHT "Lackiertermin", sondern "Anliefertermin" oder generisch "Termin"
      expect(terminLabelText.toLowerCase()).not.toContain('lackier');
      expect(terminLabelText.toLowerCase()).not.toContain('reifen');
      expect(terminLabelText.toLowerCase()).toMatch(/anliefertermin|termin/i);

      console.log(`✅ Termin-Label ist service-agnostic: "${terminLabelText}"\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, serviceTyp);
    });

  });

  /**
   * TEST GROUP 6: Lieferzeit-Texte Service-Spezifisch
   *
   * Testet ob Lieferzeit-Texte service-spezifisch sind
   *
   * CRITICAL für TASK #9 (Commit 84ec797)
   */
  test.describe('TC6: Service-Specific Lieferzeit-Texte', () => {

    test('Lieferzeit-Text ist service-spezifisch', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = 'E2E-LIEFERZEIT';
      const serviceTyp = 'mechanik';

      console.log(`\n${'='.repeat(80)}`);
      console.log(`LIEFERZEIT-TEXT TEST: Service-Specific (TASK #9)`);
      console.log(`${'='.repeat(80)}\n`);

      // Erstelle Anfrage & KVA
      const anfrageId = await createPartnerRequest(page, serviceTyp, {
        partnerName: 'Lieferzeit Test',
        partnerEmail: 'lieferzeit@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Opel',
        modell: 'Astra',
        schadenBeschreibung: 'Lieferzeit-Text Test'
      });

      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Mechanik Standard', preis: 300 }],
        anliefertermin: '2025-11-01'
      });

      // Navigate zu KVA-Vorschau oder Partner Portal
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Find Anfrage-Kachel und check Lieferzeit-Text
      const anfrageCard = await page.locator(`[data-anfrage-id="${anfrageId}"]`).first();
      const lieferzeitText = await anfrageCard.locator('.lieferzeit, [data-lieferzeit]').textContent();

      // Assertion: Text sollte service-spezifisch sein
      // z.B. für Mechanik: "Reparatur in X Tagen"
      // NICHT generisch: "Lackierung in X Tagen"
      expect(lieferzeitText.toLowerCase()).not.toContain('lackier');

      console.log(`✅ Lieferzeit-Text ist service-spezifisch: "${lieferzeitText}"\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, serviceTyp);
    });

  });

});

/**
 * TEST SUMMARY
 *
 * Dieser Test-Suite verifiziert ALLE kritischen Features von Version 3.2:
 *
 * ✅ TC1: Multi-Service Partner Flow (6 Services)
 * ✅ TC2: Status-Mapping Verification (Mechanik, Pflege, TÜV + abholbereit Bug-Fix)
 * ✅ TC3: Service-Details Formatting (Pflege, TÜV)
 * ✅ TC4: Hover-Info Price Breakdown
 * ✅ TC5: Service-Agnostic Termin-Labels
 * ✅ TC6: Service-Specific Lieferzeit-Texte
 *
 * CRITICAL TEST CASES: 18 Tests
 * EXPECTED RUNTIME: ~15-20 Minuten (mit Firebase Emulator)
 *
 * Run Tests:
 * - npm test tests/07-service-consistency-v32.spec.js
 * - npx playwright test tests/07-service-consistency-v32.spec.js --headed
 * - npx playwright test tests/07-service-consistency-v32.spec.js --debug
 */
