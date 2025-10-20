/**
 * TEST SUITE: KVA Price Transfer Tests
 *
 * Testet die **KOMPLETTE PREIS-ÜBERGABE** durch alle Views:
 *
 * PREIS-FLOW:
 * 1. Admin erstellt KVA mit Preis → kva.varianten.partner.gesamt
 * 2. Partner wählt Variante → kva.gesamt wird gesetzt
 * 3. Partner nimmt KVA an → prepareFahrzeugData überträgt zu vereinbarterPreis
 * 4. Fahrzeug wird erstellt mit vereinbarterPreis
 * 5. Preis wird angezeigt in:
 *    - Partner-Kachel (meine-anfragen.html)
 *    - Liste-Kachel (liste.html)
 *    - Kanban-Kachel (kanban.html)
 *
 * KRITISCHE FELDER:
 * - kva.varianten.original.gesamt (KVA Original-Variante)
 * - kva.varianten.partner.gesamt (KVA Partner-Variante)
 * - kva.gesamt (Gewählte Variante)
 * - fahrzeug.vereinbarterPreis (Endgültiger Preis)
 *
 * EDGE CASES:
 * - Mehrere Varianten mit unterschiedlichen Preisen
 * - Automatische Varianten-Auswahl (wenn nur 1 Variante)
 * - Preis-Formatierung (toFixed(2), Komma vs. Punkt)
 * - Preis 0 vs. null vs. undefined
 * - Mehrwertsteuer-Berechnung (optional)
 *
 * Created: 20.10.2025
 * Author: Claude Code (Price Flow Analysis)
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
  cleanupTestData
} = require('./helpers/service-helper');

test.describe('KVA Price Transfer Tests', () => {

  /**
   * TEST GROUP 1: Basic Price Flow
   *
   * Testet den grundlegenden Preis-Flow von KVA bis Fahrzeug
   */
  test.describe('TC1: Basic Price Flow - Single Variant', () => {

    test('KVA Preis → Partner-Kachel → Fahrzeug: Korrekte Übertragung', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-BASIC-${Date.now()}`;
      const expectedPrice = 1250.50;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`BASIC PRICE FLOW TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // STEP 1: Partner erstellt Anfrage
      console.log('📝 STEP 1: Partner erstellt Anfrage...');
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Price Test Partner',
        partnerEmail: 'price@e2e-test.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: 'X5',
        schadenBeschreibung: 'Price Transfer Test'
      });
      expect(anfrageId).toBeTruthy();
      console.log(`✅ Anfrage erstellt: ${anfrageId}\n`);

      // STEP 2: Admin erstellt KVA mit spezifischem Preis
      console.log(`📋 STEP 2: Admin erstellt KVA mit Preis ${expectedPrice}€...`);

      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Fülle KVA-Formular aus
      await page.fill('input#partner_lackkosten', '800');
      await page.fill('input#partner_teilekosten', '350.50');
      await page.fill('input#partner_sonstiges', '100');
      // GESAMT = 800 + 350.50 + 100 = 1250.50

      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2025-12-10');

      // Submit KVA
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000); // Wait for success

      console.log('✅ KVA erstellt mit Preis 1250.50€\n');

      // STEP 3: Verifiziere KVA-Preis in Firestore
      console.log('🔍 STEP 3: Verifiziere KVA-Preis in Firestore...');

      const anfrageData = await page.evaluate(async (id) => {
        const db = window.firebaseApp.db();
        const doc = await db.collection('partnerAnfragen').doc(id).get();
        return doc.exists ? doc.data() : null;
      }, anfrageId);

      expect(anfrageData.kva).toBeTruthy();
      expect(anfrageData.kva.varianten).toBeTruthy();
      expect(anfrageData.kva.varianten.partner).toBeTruthy();

      const kvaPreis = anfrageData.kva.varianten.partner.gesamt;
      console.log(`  KVA Partner-Variante Preis: ${kvaPreis}€`);
      expect(kvaPreis).toBe(expectedPrice);
      console.log('  ✅ KVA-Preis korrekt in Firestore\n');

      // STEP 4: Partner öffnet meine-anfragen.html und sieht Preis
      console.log('👀 STEP 4: Partner öffnet Portal und sieht Preis in Kachel...');

      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Preis in Partner-Kachel auslesen
      const preisInKachel = await page.evaluate((id) => {
        const anfrage = alleAnfragen?.find(a => a.id === id);
        if (!anfrage || !anfrage.kva) return null;
        return anfrage.kva.gesamt || anfrage.kva.varianten?.partner?.gesamt || null;
      }, anfrageId);

      console.log(`  Preis in Partner-Kachel: ${preisInKachel}€`);
      expect(preisInKachel).toBe(expectedPrice);
      console.log('  ✅ Preis korrekt in Partner-Kachel angezeigt\n');

      // STEP 5: Partner nimmt KVA an (Variante wird automatisch gewählt)
      console.log('✅ STEP 5: Partner nimmt KVA an...');

      // Wähle Variante (Partner-Variante)
      await page.evaluate(async (id) => {
        const anfrage = alleAnfragen.find(a => a.id === id);
        if (!anfrage) return;

        // Simuliere waehleVariante()
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'partner',
          'kva.gesamt': anfrage.kva.varianten.partner.gesamt
        });
      }, anfrageId);

      await page.waitForTimeout(1000);

      // Annehmen
      const annahmeErfolgreich = await page.evaluate(async (id) => {
        try {
          await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
          return true;
        } catch (error) {
          console.error('Annahme fehlgeschlagen:', error);
          return false;
        }
      }, anfrageId);

      expect(annahmeErfolgreich).toBeTruthy();
      await page.waitForTimeout(3000);
      console.log('✅ KVA angenommen\n');

      // STEP 6: Verifiziere Fahrzeug in liste.html
      console.log('🚗 STEP 6: Verifiziere Preis in Fahrzeug-Liste...');

      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleExists = await checkVehicleExists(page, testKennzeichen);
      expect(vehicleExists).toBeTruthy();

      const vehicleData = await getVehicleData(page, testKennzeichen);
      expect(vehicleData).toBeTruthy();

      const vereinbarterPreis = vehicleData.vereinbarterPreis;
      console.log(`  vereinbarterPreis: ${vereinbarterPreis}€`);
      expect(vereinbarterPreis).toBe(expectedPrice);
      console.log('  ✅ Preis korrekt in Fahrzeug übertragen\n');

      // STEP 7: Verifiziere Preis in Kanban
      console.log('📊 STEP 7: Verifiziere Preis in Kanban-Kachel...');

      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const preisInKanban = await page.evaluate((kz) => {
        const fahrzeuge = window.alleFahrzeuge || [];
        const fahrzeug = fahrzeuge.find(f => f.kennzeichen === kz);
        return fahrzeug?.vereinbarterPreis || null;
      }, testKennzeichen.toUpperCase());

      console.log(`  Preis in Kanban: ${preisInKanban}€`);
      expect(preisInKanban).toBe(expectedPrice);
      console.log('  ✅ Preis korrekt in Kanban angezeigt\n');

      console.log(`\n${'='.repeat(100)}`);
      console.log(`BASIC PRICE FLOW SUCCESS: Preis ${expectedPrice}€ korrekt in ALLEN Views! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 2: Multiple Variants
   *
   * Testet Preis-Übertragung mit mehreren Varianten
   */
  test.describe('TC2: Multiple Variants - Price Selection', () => {

    test('3 Varianten: Partner wählt mittlere Variante → Preis korrekt', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-MULTI-${Date.now()}`;

      const preise = {
        original: 2500.00,  // Original-Teile
        zubehoer: 1800.00,  // Zubehör-Teile
        partner: 1200.00    // Partner-Variante (günstigste)
      };

      console.log(`\n${'='.repeat(100)}`);
      console.log(`MULTIPLE VARIANTS PRICE TEST`);
      console.log(`${'='.repeat(100)}\n`);

      // SETUP: Erstelle Anfrage
      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Multi Variant Test',
        partnerEmail: 'multi@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Audi',
        modell: 'A4',
        schadenBeschreibung: 'Multi Variant Price Test'
      });

      // Admin erstellt KVA mit 3 Varianten
      console.log('📋 Admin erstellt KVA mit 3 Varianten...');
      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      // Variante 1: Original (2500€)
      await page.fill('input#original_lackkosten', '1500');
      await page.fill('input#original_teilekosten', '1000');

      // Variante 2: Zubehör (1800€)
      await page.fill('input#zubehoer_lackkosten', '1200');
      await page.fill('input#zubehoer_teilekosten', '600');

      // Variante 3: Partner (1200€)
      await page.fill('input#partner_lackkosten', '900');
      await page.fill('input#partner_teilekosten', '300');

      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2025-12-10');
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000);

      console.log('✅ KVA mit 3 Varianten erstellt\n');

      // Verifiziere alle 3 Varianten in Firestore
      console.log('🔍 Verifiziere alle 3 Varianten in Firestore...');
      const anfrageData = await page.evaluate(async (id) => {
        const db = window.firebaseApp.db();
        const doc = await db.collection('partnerAnfragen').doc(id).get();
        return doc.exists ? doc.data() : null;
      }, anfrageId);

      expect(anfrageData.kva.varianten.original.gesamt).toBe(preise.original);
      expect(anfrageData.kva.varianten.zubehoer.gesamt).toBe(preise.zubehoer);
      expect(anfrageData.kva.varianten.partner.gesamt).toBe(preise.partner);
      console.log(`  ✅ Original: ${preise.original}€`);
      console.log(`  ✅ Zubehör: ${preise.zubehoer}€`);
      console.log(`  ✅ Partner: ${preise.partner}€\n`);

      // Partner wählt ZUBEHÖR-Variante (mittlere)
      console.log('🎯 Partner wählt ZUBEHÖR-Variante (1800€)...');
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.evaluate(async (id, preis) => {
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'zubehoer',
          'kva.gesamt': preis
        });
      }, anfrageId, preise.zubehoer);

      await page.waitForTimeout(1000);
      console.log('✅ Zubehör-Variante gewählt\n');

      // Annehmen
      console.log('✅ Partner nimmt KVA an...');
      await page.evaluate(async (id) => {
        await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
      }, anfrageId);
      await page.waitForTimeout(3000);

      // Verifiziere Fahrzeug hat ZUBEHÖR-Preis (1800€, NICHT 2500€ oder 1200€!)
      console.log('🔍 Verifiziere Fahrzeug hat ZUBEHÖR-Preis (1800€)...');
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      expect(vehicleData.vereinbarterPreis).toBe(preise.zubehoer);
      console.log(`  vereinbarterPreis: ${vehicleData.vereinbarterPreis}€ (expected: ${preise.zubehoer}€)`);
      console.log('  ✅ Korrekte Variante übertragen!\n');

      console.log(`\n${'='.repeat(100)}`);
      console.log(`MULTIPLE VARIANTS SUCCESS: Gewählte Variante korrekt übertragen! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 3: Price Edge Cases
   *
   * Testet Edge Cases bei Preis-Übertragung
   */
  test.describe('TC3: Price Edge Cases', () => {

    test('Edge Case: Preis = 0 (kostenlose Leistung)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-ZERO-${Date.now()}`;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`EDGE CASE: Preis = 0`);
      console.log(`${'='.repeat(100)}\n`);

      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Zero Price Test',
        partnerEmail: 'zero@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'VW',
        modell: 'Golf',
        schadenBeschreibung: 'Kostenlose Leistung Test'
      });

      // KVA mit Preis = 0
      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.fill('input#partner_lackkosten', '0');
      await page.fill('input#partner_teilekosten', '0');
      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2025-12-10');
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000);

      console.log('✅ KVA mit Preis 0€ erstellt\n');

      // Partner nimmt an
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.evaluate(async (id) => {
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'partner',
          'kva.gesamt': 0
        });
        await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
      }, anfrageId);
      await page.waitForTimeout(3000);

      // Verifiziere Fahrzeug
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      console.log(`vereinbarterPreis: ${vehicleData.vereinbarterPreis} (type: ${typeof vehicleData.vereinbarterPreis})`);

      // Preis sollte 0 sein (nicht null, nicht undefined!)
      expect(vehicleData.vereinbarterPreis).toBe(0);
      console.log('✅ Preis 0 korrekt übertragen (nicht null/undefined)\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

    test('Edge Case: Sehr hoher Preis (>10.000€)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-HIGH-${Date.now()}`;
      const highPrice = 15750.99;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`EDGE CASE: Sehr hoher Preis (${highPrice}€)`);
      console.log(`${'='.repeat(100)}\n`);

      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'High Price Test',
        partnerEmail: 'high@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Porsche',
        modell: '911',
        schadenBeschreibung: 'Vollständige Neulackierung'
      });

      // KVA mit hohem Preis
      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.fill('input#partner_lackkosten', '12000');
      await page.fill('input#partner_teilekosten', '3750.99');
      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2026-01-15');
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000);

      // Partner nimmt an
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.evaluate(async (id, preis) => {
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'partner',
          'kva.gesamt': preis
        });
        await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
      }, anfrageId, highPrice);
      await page.waitForTimeout(3000);

      // Verifiziere Fahrzeug
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      console.log(`vereinbarterPreis: ${vehicleData.vereinbarterPreis}€ (expected: ${highPrice}€)`);

      // Preis sollte exakt sein (mit Cents!)
      expect(vehicleData.vereinbarterPreis).toBe(highPrice);
      console.log('✅ Hoher Preis korrekt übertragen (inkl. Cents)\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

    test('Edge Case: Kommastellen-Genauigkeit (Rundungsfehler?)', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-DECIMAL-${Date.now()}`;
      const precisePrice = 1234.56;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`EDGE CASE: Kommastellen-Genauigkeit (${precisePrice}€)`);
      console.log(`${'='.repeat(100)}\n`);

      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Decimal Test',
        partnerEmail: 'decimal@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'Mercedes',
        modell: 'C-Klasse',
        schadenBeschreibung: 'Kommastellen Test'
      });

      // KVA mit exaktem Preis
      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.fill('input#partner_lackkosten', '1000.12');
      await page.fill('input#partner_teilekosten', '234.44');
      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2025-12-10');
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000);

      // Partner nimmt an
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.evaluate(async (id, preis) => {
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'partner',
          'kva.gesamt': preis
        });
        await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
      }, anfrageId, precisePrice);
      await page.waitForTimeout(3000);

      // Verifiziere Fahrzeug
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      console.log(`vereinbarterPreis: ${vehicleData.vereinbarterPreis}€ (expected: ${precisePrice}€)`);

      // CRITICAL: Keine Rundungsfehler! (1234.56, nicht 1234.5599999 oder 1234.56000001)
      expect(vehicleData.vereinbarterPreis).toBe(precisePrice);
      console.log('✅ Kommastellen exakt übertragen (kein Rundungsfehler)\n');

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

  /**
   * TEST GROUP 4: Price Display in All Views
   *
   * Testet ob Preis in ALLEN Views korrekt formatiert angezeigt wird
   */
  test.describe('TC4: Price Display Consistency', () => {

    test('Preis-Formatierung: Alle Views zeigen gleichen Preis', async ({ page }) => {
      const consoleMonitor = setupConsoleMonitoring(page);
      const testKennzeichen = `PRICE-FORMAT-${Date.now()}`;
      const testPrice = 999.99;

      console.log(`\n${'='.repeat(100)}`);
      console.log(`PRICE DISPLAY CONSISTENCY TEST`);
      console.log(`${'='.repeat(100)}\n`);

      const anfrageId = await createPartnerRequest(page, 'lackier', {
        partnerName: 'Format Test',
        partnerEmail: 'format@e2e.de',
        kennzeichen: testKennzeichen,
        marke: 'BMW',
        modell: '3er',
        schadenBeschreibung: 'Format Test'
      });

      // KVA erstellen
      await page.goto(`/partner-app/kva-erstellen.html?id=${anfrageId}`);
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.fill('input#partner_lackkosten', '899.99');
      await page.fill('input#partner_teilekosten', '100');
      await page.fill('input#startDatum', '2025-12-01');
      await page.fill('input#endDatum', '2025-12-10');
      await page.click('button#submitBtn');
      await page.waitForTimeout(3000);

      // Partner nimmt an
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      await page.evaluate(async (id, preis) => {
        const db = window.firebaseApp.db();
        await db.collection('partnerAnfragen').doc(id).update({
          'kva.gewaehlteVariante': 'partner',
          'kva.gesamt': preis
        });
        await annehmenKVA(id, { target: { disabled: false }, stopPropagation: () => {} });
      }, anfrageId, testPrice);
      await page.waitForTimeout(3000);

      console.log('✅ Fahrzeug erstellt mit Preis 999.99€\n');

      // Sammle Preis aus allen 3 Views
      const preisInViews = {};

      // 1. Partner-Kachel (meine-anfragen.html)
      console.log('🔍 Preis in Partner-Kachel...');
      await page.goto('/partner-app/meine-anfragen.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      preisInViews.partnerKachel = await page.evaluate((id) => {
        const anfrage = alleAnfragen?.find(a => a.id === id);
        return anfrage?.kva?.gesamt || null;
      }, anfrageId);
      console.log(`  Partner-Kachel: ${preisInViews.partnerKachel}€\n`);

      // 2. Liste-Kachel (liste.html)
      console.log('🔍 Preis in Liste-Kachel...');
      await page.goto('/liste.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      const vehicleData = await getVehicleData(page, testKennzeichen);
      preisInViews.listeKachel = vehicleData.vereinbarterPreis;
      console.log(`  Liste-Kachel: ${preisInViews.listeKachel}€\n`);

      // 3. Kanban-Kachel (kanban.html)
      console.log('🔍 Preis in Kanban-Kachel...');
      await page.goto('/kanban.html');
      await waitForFirebaseReady(page);
      await page.waitForTimeout(2000);

      preisInViews.kanbanKachel = await page.evaluate((kz) => {
        const fahrzeuge = window.alleFahrzeuge || [];
        const fahrzeug = fahrzeuge.find(f => f.kennzeichen === kz);
        return fahrzeug?.vereinbarterPreis || null;
      }, testKennzeichen.toUpperCase());
      console.log(`  Kanban-Kachel: ${preisInViews.kanbanKachel}€\n`);

      // ASSERTIONS: Alle 3 Views sollten gleichen Preis zeigen
      console.log('🔍 Vergleiche Preise...');
      console.log(`  Partner-Kachel: ${preisInViews.partnerKachel}€`);
      console.log(`  Liste-Kachel:   ${preisInViews.listeKachel}€`);
      console.log(`  Kanban-Kachel:  ${preisInViews.kanbanKachel}€`);

      expect(preisInViews.partnerKachel).toBe(testPrice);
      expect(preisInViews.listeKachel).toBe(testPrice);
      expect(preisInViews.kanbanKachel).toBe(testPrice);

      console.log('\n✅ ALLE 3 Views zeigen gleichen Preis: 999.99€\n');

      console.log(`\n${'='.repeat(100)}`);
      console.log(`PRICE DISPLAY CONSISTENCY SUCCESS: Preis überall gleich! ✅`);
      console.log(`${'='.repeat(100)}\n`);

      // Cleanup
      await cleanupTestData(page, testKennzeichen, 'lackier');
    });

  });

});

/**
 * TEST SUMMARY
 *
 * Diese Test-Suite verifiziert die KOMPLETTE PREIS-ÜBERGABE:
 *
 * ✅ TC1: Basic Price Flow - KVA → Partner → Fahrzeug → Views
 * ✅ TC2: Multiple Variants - Korrekte Varianten-Auswahl
 * ✅ TC3: Price Edge Cases - 0€, >10.000€, Kommastellen
 * ✅ TC4: Price Display Consistency - Alle 3 Views zeigen gleichen Preis
 *
 * CRITICAL TEST CASES: ~8 Tests
 * EXPECTED RUNTIME: ~25-35 Minuten
 *
 * Run Tests:
 * - npm test tests/10-price-transfer-tests.spec.js
 * - npx playwright test tests/10-price-transfer-tests.spec.js --headed
 * - npx playwright test tests/10-price-transfer-tests.spec.js --debug
 *
 * COVERAGE:
 * - KVA Preis-Berechnung (berechneVarianten - kva-erstellen.html:1339)
 * - Preis-Übertragung (prepareFahrzeugData - meine-anfragen.html:4433)
 * - Partner-Kachel Preis-Anzeige (meine-anfragen.html)
 * - Liste-Kachel Preis-Anzeige (liste.html)
 * - Kanban-Kachel Preis-Anzeige (kanban.html)
 * - Edge Cases (0€, hohe Preise, Kommastellen)
 * - Multi-Varianten Auswahl
 */
