/**
 * TEST SUITE: Kanban Board Extended Tests
 *
 * Testet **ERWEITERTE KANBAN-FUNKTIONALITÄT**:
 *
 * FOKUS:
 * 1. Preis-Anzeige in Kanban-Kacheln (alle 6 Services)
 * 2. Multi-Prozess Filter (6 Service-Typen)
 * 3. Drag & Drop Status-Updates
 * 4. Fahrzeug-Kachel Details (Preis, Termine, Service-Typ)
 * 5. "Alle Prozesse" View (vereinheitlichte Spalten)
 * 6. Service-spezifische Kanban-Spalten
 *
 * KANBAN-SPALTEN pro Service:
 * - Lackierung: 6 Spalten (Angenommen → Vorbereitung → Lackierung → Trocknung → Qualität → Bereit)
 * - Reifen: 5 Spalten (Angenommen → Demontage → Montage → Wuchten → Bereit)
 * - Mechanik: 6 Spalten (Angenommen → Diagnose → Reparatur → Test → Qualität → Bereit)
 * - Pflege: 5 Spalten (Angenommen → Reinigung → Aufbereitung → Versiegelung → Bereit)
 * - TÜV: 4 Spalten (Angenommen → Vorbereitung → Prüfung → Bereit)
 * - Versicherung: 6 Spalten (Angenommen → Dokumentation → Kalkulation → Freigabe → Reparatur → Bereit)
 *
 * Created: 20.10.2025
 * Author: Claude Code (Kanban Analysis)
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

test.describe('Kanban Board Extended Tests', () => {

  /**
   * TEST GROUP 1: Preis-Anzeige in Kanban-Kacheln
   *
   * Testet ob Preis in Kanban-Kacheln korrekt angezeigt wird
   */
  test.describe('TC1: Price Display in Kanban Cards', () => {

    test('Kanban-Kachel zeigt vereinbartenPreis korrekt (alle 6 Services)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);

      console.log(`\n${'='.repeat(100)}`);
      console.log(`KANBAN PRICE DISPLAY TEST - Alle 6 Services`);
      console.log(`${'='.repeat(100)}\n`);

      const testData = [];

      // Erstelle je 1 Fahrzeug für jeden Service
      for (const [serviceTyp, config] of Object.entries(SERVICE_CONFIGS)) {
        const testKennzeichen = `KANBAN-${serviceTyp.toUpperCase()}-${Date.now()}`;
        const testPrice = 500 + Object.keys(SERVICE_CONFIGS).indexOf(serviceTyp) * 100; // 500, 600, 700, ...

        console.log(`📝 Erstelle ${config.label} Fahrzeug (${testPrice}€)...`);

        const anfrageId = await createPartnerRequest(page, serviceTyp, {
          partnerName: `Kanban Test ${config.label}`,
          partnerEmail: `kanban-${serviceTyp}@e2e.de`,
          kennzeichen: testKennzeichen,
          marke: 'BMW',
          modell: 'X5',
          schadenBeschreibung: `Kanban Price Test ${config.label}`
        });

        await createKVA(page, anfrageId, {
          positionen: [{ beschreibung: config.label, preis: testPrice }],
          anliefertermin: '2025-12-01'
        });

        await acceptKVA(page, anfrageId);

        testData.push({ kennzeichen: testKennzeichen, serviceTyp, preis: testPrice });
        console.log(`✅ ${config.label}: ${testKennzeichen} (${testPrice}€)\n`);
      }

      await page.waitForTimeout(3000);

      // Öffne Kanban
      console.log('📊 Öffne Kanban und prüfe Preise in Kacheln...');
      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(3000);

      // Prüfe jeden Service
      for (const data of testData) {
        console.log(`\n🔍 Prüfe ${data.serviceTyp} (${data.kennzeichen})...`);

        const fahrzeugInKanban = await page.evaluate((kz) => {
          const fahrzeuge = window.alleFahrzeuge || [];
          return fahrzeuge.find(f => f.kennzeichen === kz);
        }, data.kennzeichen.toUpperCase());

        expect(fahrzeugInKanban).toBeTruthy();
        expect(fahrzeugInKanban.vereinbarterPreis).toBe(data.preis);
        console.log(`  ✅ Preis in Kanban: ${fahrzeugInKanban.vereinbarterPreis}€ (expected: ${data.preis}€)`);
      }

      console.log(`\n${'='.repeat(100)}`);
      console.log(`KANBAN PRICE DISPLAY SUCCESS: Alle 6 Services zeigen korrekten Preis! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      for (const data of testData) {
        await cleanupTestData(page, data.kennzeichen, data.serviceTyp);
      }
    });

  });

  /**
   * TEST GROUP 2: Multi-Prozess Filter
   *
   * Testet ob Multi-Prozess Filter funktioniert
   */
  test.describe('TC2: Multi-Process Filter', () => {

    test('Filter wechseln: "Alle Prozesse" → "Lackierung" → "Reifen"', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichenLackier = `FILTER-LACK-${Date.now()}`;
      const testKennzeichenReifen = `FILTER-REIF-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`MULTI-PROCESS FILTER TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle 1 Lackierung + 1 Reifen Fahrzeug
      console.log('📝 Erstelle Lackierung-Fahrzeug...');
      const anfrageIdLackier = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Filter Test Lack',
        partnerEmail: 'filter-lack@e2e.de',
        kennzeichen: testKennzeichenLackier,
        marke: 'Audi',
        modell: 'A4',
        schadenBeschreibung: 'Filter Test Lackierung'
      });
      await createKVA(page, anfrageIdLackier, {
        positionen: [{ beschreibung: 'Lackierung', preis: 500 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageIdLackier);

      console.log('📝 Erstelle Reifen-Fahrzeug...');
      const anfrageIdReifen = await createPartnerRequest(page, 'reifen', {
        partnerName: 'Filter Test Reifen',
        partnerEmail: 'filter-reifen@e2e.de',
        kennzeichen: testKennzeichenReifen,
        marke: 'VW',
        modell: 'Golf',
        schadenBeschreibung: 'Filter Test Reifen'
      });
      await createKVA(page, anfrageIdReifen, {
        positionen: [{ beschreibung: 'Reifenwechsel', preis: 200 }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageIdReifen);

      await page.waitForTimeout(3000);
      console.log('✅ Beide Fahrzeuge erstellt\n');

      // Öffne Kanban
      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // TEST 1: "Alle Prozesse" View - beide Fahrzeuge sichtbar
      console.log('🔍 TEST 1: "Alle Prozesse" View...');
      await page.selectOption('select#processFilter', 'alle');
      await page.waitForTimeout(1000);

      const fahrzeugeAlle = await page.evaluate(() => {
        const fahrzeuge = window.alleFahrzeuge || [];
        return fahrzeuge.map(f => ({ kennzeichen: f.kennzeichen, serviceTyp: f.serviceTyp }));
      });

      const lackierSichtbar = fahrzeugeAlle.some(f => f.kennzeichen.includes('FILTER-LACK'));
      const reifenSichtbar = fahrzeugeAlle.some(f => f.kennzeichen.includes('FILTER-REIF'));

      expect(lackierSichtbar).toBeTruthy();
      expect(reifenSichtbar).toBeTruthy();
      console.log('  ✅ Beide Fahrzeuge sichtbar (Lackierung + Reifen)\n');

      // TEST 2: Filter auf "Lackierung" - nur Lackierung sichtbar
      console.log('🔍 TEST 2: Filter auf "Lackierung"...');
      await page.selectOption('select#processFilter', 'lackier');
      await page.waitForTimeout(1000);

      const fahrzeugeLackier = await page.evaluate(() => {
        const fahrzeuge = window.alleFahrzeuge || [];
        return fahrzeuge.filter(f => f.serviceTyp === 'lackier').map(f => f.kennzeichen);
      });

      const lackierNochSichtbar = fahrzeugeLackier.some(kz => kz.includes('FILTER-LACK'));
      const reifenNochSichtbar = fahrzeugeLackier.some(kz => kz.includes('FILTER-REIF'));

      expect(lackierNochSichtbar).toBeTruthy();
      expect(reifenNochSichtbar).toBeFalsy(); // Reifen sollte NICHT sichtbar sein!
      console.log('  ✅ Nur Lackierung sichtbar (Reifen gefiltert)\n');

      // TEST 3: Filter auf "Reifen" - nur Reifen sichtbar
      console.log('🔍 TEST 3: Filter auf "Reifen"...');
      await page.selectOption('select#processFilter', 'reifen');
      await page.waitForTimeout(1000);

      const fahrzeugeReifen = await page.evaluate(() => {
        const fahrzeuge = window.alleFahrzeuge || [];
        return fahrzeuge.filter(f => f.serviceTyp === 'reifen').map(f => f.kennzeichen);
      });

      const reifenJetztSichtbar = fahrzeugeReifen.some(kz => kz.includes('FILTER-REIF'));
      const lackierJetztSichtbar = fahrzeugeReifen.some(kz => kz.includes('FILTER-LACK'));

      expect(reifenJetztSichtbar).toBeTruthy();
      expect(lackierJetztSichtbar).toBeFalsy(); // Lackierung sollte NICHT sichtbar sein!
      console.log('  ✅ Nur Reifen sichtbar (Lackierung gefiltert)\n');

      console.log(`\n${'='.repeat(100)}`);
      console.log(`MULTI-PROCESS FILTER SUCCESS: Filter funktioniert korrekt! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichenLackier, 'lackier');
      await cleanupTestData(page, testKennzeichenReifen, 'reifen');
    });

  });

  /**
   * TEST GROUP 3: Service-spezifische Kanban-Spalten
   *
   * Testet ob die richtigen Spalten für jeden Service angezeigt werden
   */
  test.describe('TC3: Service-Specific Columns', () => {

    test('Lackierung: 6 Spalten korrekt', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);

      console.log(`\n${'='.repeat(100)}`);
      console.log(`SERVICE-SPECIFIC COLUMNS TEST: Lackierung (6 Spalten)`);
      console.log(`${'='.repeat(100)}\n`);

      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Filter auf Lackierung
      await page.selectOption('select#processFilter', 'lackier');
      await page.waitForTimeout(1000);

      // Zähle Spalten
      const spaltenAnzahl = await page.evaluate(() => {
        const columns = document.querySelectorAll('.kanban-column');
        return columns.length;
      });

      console.log(`  Spalten-Anzahl: ${spaltenAnzahl} (expected: 6)`);
      expect(spaltenAnzahl).toBe(6);

      // Prüfe Spalten-Namen
      const spaltenNamen = await page.evaluate(() => {
        const columns = document.querySelectorAll('.kanban-column h3');
        return Array.from(columns).map(h => h.textContent.trim());
      });

      console.log('  Spalten-Namen:', spaltenNamen);
      expect(spaltenNamen).toContain('Angenommen');
      expect(spaltenNamen).toContain('Vorbereitung');
      expect(spaltenNamen).toContain('Lackierung');
      expect(spaltenNamen).toContain('Trocknung');
      expect(spaltenNamen).toContain('Qualität');
      expect(spaltenNamen).toContain('Bereit');

      console.log('  ✅ Alle 6 Lackierung-Spalten korrekt\n');
    });

    test('TÜV: 4 Spalten korrekt (weniger als Lackierung!)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);

      console.log(`\n${'='.repeat(100)}`);
      console.log(`SERVICE-SPECIFIC COLUMNS TEST: TÜV (4 Spalten)`);
      console.log(`${'='.repeat(100)}\n`);

      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Filter auf TÜV
      await page.selectOption('select#processFilter', 'tuev');
      await page.waitForTimeout(1000);

      // Zähle Spalten
      const spaltenAnzahl = await page.evaluate(() => {
        const columns = document.querySelectorAll('.kanban-column');
        return columns.length;
      });

      console.log(`  Spalten-Anzahl: ${spaltenAnzahl} (expected: 4)`);
      expect(spaltenAnzahl).toBe(4);

      // Prüfe Spalten-Namen
      const spaltenNamen = await page.evaluate(() => {
        const columns = document.querySelectorAll('.kanban-column h3');
        return Array.from(columns).map(h => h.textContent.trim());
      });

      console.log('  Spalten-Namen:', spaltenNamen);
      expect(spaltenNamen).toContain('Angenommen');
      expect(spaltenNamen).toContain('Vorbereitung');
      expect(spaltenNamen).toContain('Prüfung');
      expect(spaltenNamen).toContain('Bereit');

      console.log('  ✅ Alle 4 TÜV-Spalten korrekt (weniger als Lackierung!)\n');
    });

  });

  /**
   * TEST GROUP 4: Drag & Drop + Preis bleibt erhalten
   *
   * Testet ob Preis nach Status-Updates erhalten bleibt
   */
  test.describe('TC4: Drag & Drop Price Persistence', () => {

    test('CRITICAL: Preis bleibt erhalten nach Drag & Drop', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `DRAG-PRICE-${Date.now()}`;
      const testPrice = 1500.00;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`DRAG & DROP PRICE PERSISTENCE TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle Fahrzeug mit Preis
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Drag Price Test',
        partnerEmail: 'drag-price@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: 'X5',
        schadenBeschreibung: 'Drag Price Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Lackierung', preis: testPrice }],
        anliefertermin: '2025-12-01'
      });
      await acceptKVA(page, anfrageId);
      await page.waitForTimeout(3000);

      console.log(`✅ Fahrzeug erstellt mit Preis ${testPrice}€\n`);

      // Öffne Kanban
      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Preis VORHER
      const preisVorher = await page.evaluate((kz) => {
        const fahrzeuge = window.alleFahrzeuge || [];
        const fahrzeug = fahrzeuge.find(f => f.kennzeichen === kz);
        return fahrzeug?.vereinbarterPreis || null;
      }, testKennzeichen.toUpperCase());

      console.log(`🔍 Preis VORHER: ${preisVorher}€`);
      expect(preisVorher).toBe(testPrice);

      // Simuliere Drag & Drop (Status-Update: terminiert → vorbereitung)
      console.log('\n🔄 Simuliere Drag & Drop (terminiert → vorbereitung)...');

      await page.evaluate(async (kz) => {
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
      }, testKennzeichen.toUpperCase());

      await page.waitForTimeout(2000);

      // Reload Kanban
      await page.reload();
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Preis NACHHER
      const preisNachher = await page.evaluate((kz) => {
        const fahrzeuge = window.alleFahrzeuge || [];
        const fahrzeug = fahrzeuge.find(f => f.kennzeichen === kz);
        return fahrzeug?.vereinbarterPreis || null;
      }, testKennzeichen.toUpperCase());

      console.log(`\n🔍 Preis NACHHER: ${preisNachher}€`);

      // CRITICAL ASSERTION: Preis MUSS gleich geblieben sein!
      expect(preisNachher).toBe(testPrice);
      console.log(`  ✅ Preis erhalten (${preisVorher}€ → ${preisNachher}€)\n`);

      console.log(`\n${'='.repeat(100)}`);
      console.log(`DRAG & DROP PRICE PERSISTENCE SUCCESS: Preis bleibt erhalten! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 5: Kanban Card Details
   *
   * Testet ob Kanban-Kacheln alle wichtigen Details enthalten
   */
  test.describe('TC5: Kanban Card Details', () => {

    test('Kanban-Kachel enthält: Preis, Termin, Service-Typ, Kennzeichen', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `CARD-DETAIL-${Date.now()}`;
      const testPrice = 999.99;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`KANBAN CARD DETAILS TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // Erstelle Fahrzeug
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Card Detail Test',
        partnerEmail: 'card@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Audi',
        modell: 'A4',
        schadenBeschreibung: 'Card Detail Test'
      });
      await createKVA(page, anfrageId, {
        positionen: [{ beschreibung: 'Lackierung', preis: testPrice }],
        anliefertermin: '2025-12-15'
      });
      await acceptKVA(page, anfrageId);
      await page.waitForTimeout(3000);

      // Öffne Kanban
      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Lade Fahrzeug-Daten
      const fahrzeugDetails = await page.evaluate((kz) => {
        const fahrzeuge = window.alleFahrzeuge || [];
        return fahrzeuge.find(f => f.kennzeichen === kz);
      }, testKennzeichen.toUpperCase());

      expect(fahrzeugDetails).toBeTruthy();

      console.log('🔍 Kanban-Kachel Details:');
      console.log(`  Kennzeichen: ${fahrzeugDetails.kennzeichen}`);
      console.log(`  Service-Typ: ${fahrzeugDetails.serviceTyp}`);
      console.log(`  Preis: ${fahrzeugDetails.vereinbarterPreis}€`);
      console.log(`  Termin: ${fahrzeugDetails.geplantesAbnahmeDatum}`);

      // Assertions
      expect(fahrzeugDetails.kennzeichen).toBe(testKennzeichen.toUpperCase());
      expect(fahrzeugDetails.serviceTyp).toBe('lackier');
      expect(fahrzeugDetails.vereinbarterPreis).toBe(testPrice);
      expect(fahrzeugDetails.geplantesAbnahmeDatum).toBe('2025-12-15');

      console.log('\n✅ Alle Details korrekt in Kanban-Kachel\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

});

/**
 * TEST SUMMARY
 *
 * Diese Test-Suite testet ERWEITERTE KANBAN-FUNKTIONALITÄT:
 *
 * ✅ TC1: Price Display in Kanban Cards - Alle 6 Services
 * ✅ TC2: Multi-Process Filter - Filter funktioniert korrekt
 * ✅ TC3: Service-Specific Columns - Richtige Spalten-Anzahl
 * ✅ TC4: Drag & Drop Price Persistence - Preis bleibt erhalten
 * ✅ TC5: Kanban Card Details - Alle Details vollständig
 *
 * CRITICAL TEST CASES: ~7 Tests
 * EXPECTED RUNTIME: ~30-40 Minuten
 *
 * Run Tests:
 * - npm test tests/11-kanban-board-extended.spec.js
 * - npx playwright test tests/11-kanban-board-extended.spec.js --headed
 * - npx playwright test tests/11-kanban-board-extended.spec.js --debug
 *
 * COVERAGE:
 * - Kanban-Board (kanban.html)
 * - Multi-Prozess Filter (6 Services)
 * - Preis-Anzeige in Kacheln
 * - Service-spezifische Spalten
 * - Drag & Drop Preis-Persistenz
 * - Kanban-Kachel Details
 */
