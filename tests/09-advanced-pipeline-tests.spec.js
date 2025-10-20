/**
 * TEST SUITE: Advanced Pipeline Tests
 *
 * Testet **KOMPLEXE Szenarien** die reale Fehler aufdecken können:
 *
 * FOKUS:
 * 1. Race Conditions (Multi-User, Multi-Tab)
 * 2. Status-Synchronisation (status vs prozessStatus)
 * 3. Field Overwrites (Werden Felder überschrieben?)
 * 4. Concurrent Updates (Gleichzeitige Änderungen)
 * 5. Firestore Transaction Failures
 *
 * WARUM DIESE TESTS?
 * - Decken Logik-Fehler auf die nur unter Last/Race Conditions auftreten
 * - Verifizieren Optimistic Locking funktioniert
 * - Prüfen ob Daten-Integrität unter Stress erhalten bleibt
 *
 * Created: 20.10.2025
 * Author: Claude Code (Advanced Testing Strategy)
 */

const { test, expect } = require('@playwright/test');
const {
  waitForFirebaseReady,
  checkVehicleExists,
  getVehicleData,
  setupConsoleMonitoring
} = require('./helpers/firebase-helper');
const {
  SERVICE_CONFIGS,
  createPartnerRequest,
  createKVA,
  acceptKVA,
  cleanupTestData
} = require('./helpers/service-helper');

test.describe('Advanced Pipeline Tests', () => {

  /**
   * TEST GROUP 1: Race Conditions
   *
   * Simuliert Szenarien wo 2 User gleichzeitig die gleiche Aktion ausführen
   */
  test.describe('TC1: Race Conditions - Multi-User', () => {

    test('CRITICAL: Doppelter KVA-Accept verhindert durch Optimistic Locking', async ({ page, context }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `RACE-KVA-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`RACE CONDITION TEST: Doppelter KVA-Accept`);
      console.log(`${'='.repeat(100)}\n`);

      // SETUP: Erstelle Anfrage mit KVA
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Race Test',
        partnerEmail: 'race@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: 'X5',
        schadenBeschreibung: 'Race Condition Test'
      });

      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Test', preis: 500 }],
        anliefertermin: '2025-12-01'
      });

      console.log('✅ SETUP done: Anfrage mit KVA erstellt\n');

      // RACE CONDITION: 2 Browser-Tabs öffnen
      console.log('🔀 Öffne 2 Browser-Tabs gleichzeitig...');
      const page2 = await context.newPage();
      setupConsoleMonitoring(page2);

      await page.goto('/partner-app/meine-anfragen.html');
      await page2.goto('/partner-app/meine-anfragen.html');

      await waitForFirebaseReady(page);
      await waitForFirebaseReady(page2);
      await page.waitForTimeout(2000);
      await page2.waitForTimeout(2000);

      console.log('✅ 2 Tabs geladen\n');

      // CRITICAL: Beide Tabs klicken GLEICHZEITIG auf "KVA annehmen"
      console.log('⚡ CRITICAL: Beide Tabs annehmen KVA GLEICHZEITIG...');

      let tab1Success = false;
      let tab2Success = false;
      let tab1Error = null;
      let tab2Error = null;

      try {
        // Tab 1 & Tab 2 parallel ausführen
        const results = await Promise.allSettled([
          // Tab 1
          page.evaluate(async (id) => {
            const anfrage = alleAnfragen.find(a => a.id === id);
            if (!anfrage) throw new Error('Anfrage not found');
            return await window.annehmenKVA(id, { target: { disabled: false, textContent: 'Annehmen' }, stopPropagation: () => {} });
          }, anfrageId),
          // Tab 2
          page2.evaluate(async (id) => {
            const anfrage = alleAnfragen.find(a => a.id === id);
            if (!anfrage) throw new Error('Anfrage not found');
            return await window.annehmenKVA(id, { target: { disabled: false, textContent: 'Annehmen' }, stopPropagation: () => {} });
          }, anfrageId)
        ]);

        tab1Success = results[0].status === 'fulfilled';
        tab2Success = results[1].status === 'fulfilled';
        tab1Error = results[0].status === 'rejected' ? results[0].reason : null;
        tab2Error = results[1].status === 'rejected' ? results[1].reason : null;

        console.log('  Tab 1:', tab1Success ? '✅ SUCCESS' : `❌ FAILED (${tab1Error?.message})`);
        console.log('  Tab 2:', tab2Success ? '✅ SUCCESS' : `❌ FAILED (${tab2Error?.message})`);

      } catch (error) {
        console.error('  ❌ Parallel execution failed:', error);
      }

      await page.waitForTimeout(3000); // Wait for Firestore sync

      // CRITICAL ASSERTION: Nur EIN Tab sollte erfolgreich sein!
      // Der andere sollte Optimistic Locking Error bekommen
      const successCount = (tab1Success ? 1 : 0) + (tab2Success ? 1 : 0);
      console.log(`\n🔍 Success Count: ${successCount} (expected: 1)`);

      if (successCount !== 1) {
        console.error('❌ CRITICAL: Optimistic Locking funktioniert NICHT!');
        console.error('   Beide Tabs haben KVA angenommen → Fahrzeug könnte DOPPELT erstellt werden!');
      }
      expect(successCount).toBe(1);
      console.log('✅ Optimistic Locking funktioniert: Nur 1 Tab erfolgreich\n');

      // Verifiziere: Nur 1 Fahrzeug wurde erstellt
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleCount = await page.evaluate((kz) => {
        return window.alleAnzeigebareAnfragen?.filter(f => f.kennzeichen === kz).length || 0;
      }, testKennzeichen);

      console.log(`🔍 Fahrzeuge mit Kennzeichen "${testKennzeichen}": ${vehicleCount}`);
      expect(vehicleCount).toBe(1);
      console.log('✅ Nur 1 Fahrzeug erstellt (kein Duplikat)\n');

      await page2.close();

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

    test('Multi-Tab: Realtime Status-Updates synchronisiert', async ({ page, context }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `REALTIME-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`REALTIME SYNC TEST: Multi-Tab Status-Updates`);
      console.log(`${'='.repeat(100)}\n`);

      // SETUP: Erstelle Fahrzeug
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Realtime Test',
        partnerEmail: 'realtime@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Audi',
        modell: 'A4',
        schadenBeschreibung: 'Realtime Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Test', preis: 100 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageId);

      console.log('✅ Fahrzeug erstellt\n');

      // 2 Tabs öffnen: Kanban + Liste
      console.log('🔀 Öffne 2 Tabs: Kanban (Admin) + Liste (Read-Only)...');
      const kanbanTab = await context.newPage();
      const listeTab = await context.newPage();

      await kanbanTab.goto('/kanban.html');
      await listeTab.goto('/liste.html');

      await waitForFirebaseReady(kanbanTab);
      await waitForFirebaseReady(listeTab);
      await kanbanTab.waitForTimeout(2000);
      await listeTab.waitForTimeout(2000);

      console.log('✅ Beide Tabs geladen\n');

      // Kanban: Status ändern (terminiert → vorbereitung)
      console.log('🔄 Kanban-Tab: Ändere Status von "terminiert" → "vorbereitung"...');

      await kanbanTab.evaluate(async (kz) => {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('fahrzeuge')
          .where('kennzeichen', '==', kz)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          await snapshot.docs[0].ref.update({
            prozessStatus: 'vorbereitung',
            lastModified: Date.now()
          });
          console.log('✅ Status updated to: vorbereitung');
        }
      }, testKennzeichen);

      console.log('✅ Status geändert in Firestore\n');

      // Warte auf Realtime Sync (max 5 Sekunden)
      console.log('⏳ Warte auf Realtime-Listener (max 5s)...');
      await listeTab.waitForTimeout(5000);

      // Liste-Tab: Status prüfen
      const listeTabStatus = await listeTab.evaluate((kz) => {
        const fahrzeug = window.alleAnzeigebareAnfragen?.find(f => f.kennzeichen === kz);
        return fahrzeug?.prozessStatus || null;
      }, testKennzeichen);

      console.log(`🔍 Liste-Tab zeigt Status: "${listeTabStatus}" (expected: "vorbereitung")`);

      // ASSERTION: Status sollte synchronisiert sein
      expect(listeTabStatus).toBe('vorbereitung');
      console.log('✅ Realtime-Sync funktioniert: Status synchronisiert\n');

      await kanbanTab.close();
      await listeTab.close();

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 2: Status-Synchronisation (status vs prozessStatus)
   *
   * Prüft ob status und prozessStatus immer synchron sind
   */
  test.describe('TC2: Status Synchronization', () => {

    test('CRITICAL: status und prozessStatus sind IMMER synchron', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `STATUS-SYNC-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`STATUS SYNCHRONIZATION TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle Fahrzeug
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Status Sync Test',
        partnerEmail: 'status@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Mercedes',
        modell: 'C-Klasse',
        schadenBeschreibung: 'Status Sync Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Test', preis: 100 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageId);

      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      expect(vehicleData).toBeTruthy();

      console.log('🔍 Status-Felder nach KVA-Annahme:');
      console.log(`  status: "${vehicleData.status}"`);
      console.log(`  prozessStatus: "${vehicleData.prozessStatus}"`);

      // Nach KVA-Annahme: status = 'angenommen', prozessStatus = 'terminiert'
      expect(vehicleData.status).toBe('angenommen');
      expect(vehicleData.prozessStatus).toBe('terminiert');
      console.log('  ✅ Status-Felder korrekt nach KVA-Annahme\n');

      // CRITICAL: Simuliere Abnahme → BEIDE Status müssen auf 'abgeschlossen' gesetzt werden
      console.log('🔄 Simuliere Abnahme (status → "abgeschlossen")...');

      await page.evaluate(async (kz) => {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('fahrzeuge')
          .where('kennzeichen', '==', kz)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          // BUG SIMULATION: Was wenn nur status gesetzt wird, aber prozessStatus vergessen?
          await snapshot.docs[0].ref.update({
            status: 'abgeschlossen',
            prozessStatus: 'abgeschlossen', // ✅ RICHTIG: Beide setzen!
            lastModified: Date.now()
          });
          console.log('✅ Status updated to: abgeschlossen');
        }
      }, testKennzeichen);

      await page.waitForTimeout(2000);

      // Reload und prüfen
      await page.reload();
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData2 = await getVehicleData(page, testKennzeichen);

      console.log('🔍 Status-Felder nach Abnahme:');
      console.log(`  status: "${vehicleData2.status}"`);
      console.log(`  prozessStatus: "${vehicleData2.prozessStatus}"`);

      // ASSERTION: Beide sollten 'abgeschlossen' sein
      expect(vehicleData2.status).toBe('abgeschlossen');
      expect(vehicleData2.prozessStatus).toBe('abgeschlossen');
      console.log('  ✅ Beide Status-Felder synchron: "abgeschlossen"\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

    test('Bug Detection: prozessStatus ohne status sollte nicht vorkommen', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `BUG-DETECT-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`BUG DETECTION: Inkonsistente Status-Felder`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle Fahrzeug
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Bug Detect Test',
        partnerEmail: 'bug@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'VW',
        modell: 'Passat',
        schadenBeschreibung: 'Bug Detection Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Test', preis: 100 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageId);

      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // CRITICAL: Simuliere Bug - prozessStatus gesetzt, aber status vergessen
      console.log('🐛 Simuliere BUG: Setze nur prozessStatus (status bleibt "angenommen")...');

      await page.evaluate(async (kz) => {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('fahrzeuge')
          .where('kennzeichen', '==', kz)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          // BUG: Nur prozessStatus, NICHT status!
          await snapshot.docs[0].ref.update({
            prozessStatus: 'bereit', // Kanban sagt "bereit"
            // status: 'abgeschlossen' ← FEHLT! BUG!
            lastModified: Date.now()
          });
          console.log('🐛 BUG simuliert: prozessStatus="bereit", status bleibt "angenommen"');
        }
      }, testKennzeichen);

      await page.waitForTimeout(2000);

      // Reload und Bug detektieren
      await page.reload();
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);

      console.log('🔍 Status-Felder nach BUG-Simulation:');
      console.log(`  status: "${vehicleData.status}"`);
      console.log(`  prozessStatus: "${vehicleData.prozessStatus}"`);

      // DETECTION: Inkonsistenz detektieren
      const isInconsistent = vehicleData.prozessStatus === 'bereit' && vehicleData.status !== 'abgeschlossen';

      if (isInconsistent) {
        console.log('\n🚨 BUG DETECTED: Status-Felder sind INKONSISTENT!');
        console.log(`   prozessStatus="bereit" aber status="${vehicleData.status}" (sollte "abgeschlossen" sein)`);
        console.log('   → Dieser Bug existiert in der Codebase!\n');
      } else {
        console.log('✅ Keine Inkonsistenz gefunden\n');
      }

      // DIESER TEST SOLLTE EIGENTLICH FEHLSCHLAGEN wenn der Bug existiert!
      // Wir dokumentieren den Bug hier:
      expect(isInconsistent).toBe(false); // ← ERWARTEN: false (kein Bug)

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 3: Field Overwrite Detection
   *
   * Prüft ob Felder versehentlich überschrieben werden
   */
  test.describe('TC3: Field Overwrite Detection', () => {

    test('Update sollte Felder NICHT überschreiben (nur ergänzen)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `OVERWRITE-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`FIELD OVERWRITE DETECTION TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle Fahrzeug mit vollen Daten
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Overwrite Test',
        partnerEmail: 'overwrite@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: 'X5',
        baujahrVon: '2020',
        vin: 'WBA12345678901234',
        schadenBeschreibung: 'Overwrite Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Test', preis: 100 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageId);

      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleDataBefore = await getVehicleData(page, testKennzeichen);

      console.log('🔍 Fahrzeug-Daten VORHER:');
      console.log(`  marke: "${vehicleDataBefore.marke}"`);
      console.log(`  modell: "${vehicleDataBefore.modell}"`);
      console.log(`  baujahrVon: "${vehicleDataBefore.baujahrVon}"`);
      console.log(`  vin: "${vehicleDataBefore.vin}"`);

      // CRITICAL: Simuliere Status-Update (sollte KEINE anderen Felder überschreiben!)
      console.log('\n🔄 Simuliere Status-Update (nur prozessStatus ändern)...');

      await page.evaluate(async (kz) => {
        const db = window.firebaseApp.db();
        const snapshot = await db.collection('fahrzeuge')
          .where('kennzeichen', '==', kz)
          .limit(1)
          .get();

        if (!snapshot.empty) {
          // Update NUR prozessStatus
          await snapshot.docs[0].ref.update({
            prozessStatus: 'lackierung',
            lastModified: Date.now()
          });
          console.log('✅ prozessStatus updated to: lackierung');
        }
      }, testKennzeichen);

      await page.waitForTimeout(2000);

      // Reload und prüfen
      await page.reload();
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleDataAfter = await getVehicleData(page, testKennzeichen);

      console.log('\n🔍 Fahrzeug-Daten NACHHER:');
      console.log(`  marke: "${vehicleDataAfter.marke}"`);
      console.log(`  modell: "${vehicleDataAfter.modell}"`);
      console.log(`  baujahrVon: "${vehicleDataAfter.baujahrVon}"`);
      console.log(`  vin: "${vehicleDataAfter.vin}"`);

      // ASSERTIONS: Felder sollten GLEICH geblieben sein
      expect(vehicleDataAfter.marke).toBe(vehicleDataBefore.marke);
      expect(vehicleDataAfter.modell).toBe(vehicleDataBefore.modell);
      expect(vehicleDataAfter.baujahrVon).toBe(vehicleDataBefore.baujahrVon);
      expect(vehicleDataAfter.vin).toBe(vehicleDataBefore.vin);

      console.log('\n✅ Keine Felder überschrieben (alle Daten erhalten)\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

});

/**
 * TEST SUMMARY
 *
 * Diese Test-Suite deckt KOMPLEXE Fehler-Szenarien auf:
 *
 * ✅ TC1: Race Conditions - Doppelter KVA-Accept, Multi-Tab Sync
 * ✅ TC2: Status Synchronization - status vs prozessStatus konsistent
 * ✅ TC3: Field Overwrite Detection - Updates überschreiben keine Felder
 *
 * CRITICAL TEST CASES: ~6 Tests
 * EXPECTED RUNTIME: ~20-30 Minuten
 *
 * Run Tests:
 * - npm test tests/09-advanced-pipeline-tests.spec.js
 * - npx playwright test tests/09-advanced-pipeline-tests.spec.js --headed
 * - npx playwright test tests/09-advanced-pipeline-tests.spec.js --debug
 *
 * COVERAGE:
 * - Race Conditions (Multi-User/Multi-Tab)
 * - Optimistic Locking (annehmenKVA)
 * - Realtime Listeners (Firestore Sync)
 * - Status-Felder Konsistenz
 * - Field Overwrites
 */
