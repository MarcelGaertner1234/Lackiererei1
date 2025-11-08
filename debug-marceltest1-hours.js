/**
 * DIAGNOSTIC SCRIPT: Marceltest1 Hours Investigation
 *
 * USAGE:
 * 1. Open dienstplan.html in Browser
 * 2. Login as Werkstatt user
 * 3. Open Browser Console (F12 → Console)
 * 4. Copy & Paste this ENTIRE file into Console
 * 5. Press Enter
 *
 * This script will:
 * - Find Marceltest1 in mitarbeiter_mosbach collection
 * - Show current gesamtstunden and monatlicheStunden
 * - Load ALL schichten assigned to this mitarbeiter
 * - Calculate what hours SHOULD be based on shifts
 * - Compare actual vs expected
 */

(async function debugMarceltest1Hours() {
    console.log('\n\n🔍 ========================================');
    console.log('🔍 DIAGNOSTIC: Marceltest1 Hours');
    console.log('🔍 ========================================\n');

    // ============================================
    // STEP 1: Check Firebase Initialization
    // ============================================
    console.log('📋 STEP 1: Checking Firebase...');

    if (!window.db) {
        console.error('❌ FEHLER: window.db ist nicht initialisiert!');
        return;
    }

    if (!window.werkstattId) {
        console.error('❌ FEHLER: window.werkstattId ist nicht gesetzt!');
        return;
    }

    console.log('✅ Firebase initialisiert');
    console.log('   werkstattId:', window.werkstattId);

    // ============================================
    // STEP 2: Find Marceltest1 in mitarbeiter
    // ============================================
    console.log('\n📋 STEP 2: Finding Marceltest1 in mitarbeiter_' + window.werkstattId + '...');

    let marceltest1 = null;
    let marceltest1Id = null;

    try {
        const mitarbeiterSnapshot = await window.getCollection('mitarbeiter').get();
        const mitarbeiterDocs = mitarbeiterSnapshot.docs.filter(doc => doc.id !== '_init');

        console.log(`✅ ${mitarbeiterDocs.length} Mitarbeiter geladen`);

        // Find by name
        for (const doc of mitarbeiterDocs) {
            const data = doc.data();
            if (data.name && data.name.toLowerCase().includes('marceltest1')) {
                marceltest1 = { id: doc.id, ...data };
                marceltest1Id = doc.id;
                break;
            }
        }

        if (!marceltest1) {
            console.error('❌ FEHLER: Mitarbeiter "Marceltest1" nicht gefunden!');
            console.log('\n📋 Verfügbare Mitarbeiter:');
            mitarbeiterDocs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`   [${index + 1}] ${data.name} (ID: ${doc.id})`);
            });
            return;
        }

        console.log('✅ Marceltest1 gefunden!');
        console.log('   ID:', marceltest1.id);
        console.log('   Name:', marceltest1.name);
        console.log('   📊 AKTUELLE STUNDEN IN FIRESTORE:');
        console.log('      gesamtstunden:', marceltest1.gesamtstunden || 0, 'h');
        console.log('      monatlicheStunden:', marceltest1.monatlicheStunden || 0, 'h/Monat');

    } catch (error) {
        console.error('❌ FEHLER beim Laden der Mitarbeiter:', error);
        return;
    }

    // ============================================
    // STEP 3: Load ALL Schichten for Marceltest1
    // ============================================
    console.log('\n📋 STEP 3: Loading ALL schichten for Marceltest1...');

    let schichten = [];
    try {
        const schichtenSnapshot = await window.getCollection('schichten')
            .where('mitarbeiterId', '==', String(marceltest1Id))
            .get();

        schichten = schichtenSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ ${schichten.length} Schichten gefunden`);

        if (schichten.length === 0) {
            console.warn('⚠️  WARNUNG: Keine Schichten für Marceltest1!');
            console.log('   → Erwartete Stunden = 0h');
        } else {
            console.log('   📅 Schicht-Übersicht:');
            schichten.forEach((schicht, index) => {
                console.log(`      [${index + 1}] ${schicht.datum} - ${schicht.schichtTypName || 'Unbekannt'}`);
            });
        }

    } catch (error) {
        console.error('❌ FEHLER beim Laden der Schichten:', error);
        return;
    }

    // ============================================
    // STEP 4: Load SchichtTypen
    // ============================================
    console.log('\n📋 STEP 4: Loading SchichtTypen...');

    let allSchichtTypen = [];
    try {
        // Try to use existing global array first
        if (window.allSchichtTypen && window.allSchichtTypen.length > 0) {
            allSchichtTypen = window.allSchichtTypen;
            console.log(`✅ ${allSchichtTypen.length} SchichtTypen geladen (from window)`);
        } else {
            const schichtTypenSnapshot = await window.getCollection('schichtTypen').get();
            allSchichtTypen = schichtTypenSnapshot.docs
                .filter(doc => doc.id !== '_init')
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
            console.log(`✅ ${allSchichtTypen.length} SchichtTypen geladen (from Firestore)`);
        }

        console.log('   📋 SchichtTypen:');
        allSchichtTypen.forEach((typ, index) => {
            const isSpecial = typ.isSpecial ? '🏖️ Special' : '⏰ Normal';
            console.log(`      [${index + 1}] ${typ.name} - ${isSpecial} (${typ.startzeit || 'N/A'} - ${typ.endzeit || 'N/A'})`);
        });

    } catch (error) {
        console.error('❌ FEHLER beim Laden der SchichtTypen:', error);
        return;
    }

    // ============================================
    // STEP 5: Calculate Expected Hours
    // ============================================
    console.log('\n📋 STEP 5: Calculating Expected Hours...');

    // Helper function to calculate hours (same as in dienstplan.html)
    function calculateShiftHours(startzeit, endzeit) {
        const [startH, startM] = startzeit.split(':').map(Number);
        const [endH, endM] = endzeit.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        let endMinutes = endH * 60 + endM;
        if (endMinutes < startMinutes) endMinutes += 24 * 60;
        const totalMinutes = endMinutes - startMinutes;
        return Math.round((totalMinutes / 60) * 100) / 100;
    }

    let totalHoursExpected = 0;
    let monthlyHoursExpected = 0;
    let schichtenWithHours = [];

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    for (const schicht of schichten) {
        const schichtTyp = allSchichtTypen.find(st => String(st.id) === String(schicht.schichtTypId));

        if (!schichtTyp) {
            console.warn(`   ⚠️  Schicht ${schicht.datum}: SchichtTyp nicht gefunden (ID: ${schicht.schichtTypId})`);
            continue;
        }

        // Only count non-special shifts (isSpecial = false)
        if (schichtTyp.isSpecial) {
            console.log(`   🏖️  Schicht ${schicht.datum}: "${schichtTyp.name}" (Special - nicht gezählt)`);
            continue;
        }

        const hours = calculateShiftHours(schichtTyp.startzeit, schichtTyp.endzeit);
        totalHoursExpected += hours;

        // Check if this shift is in current month
        const schichtDate = new Date(schicht.datum);
        if (schichtDate.getMonth() === currentMonth && schichtDate.getFullYear() === currentYear) {
            monthlyHoursExpected += hours;
        }

        schichtenWithHours.push({
            datum: schicht.datum,
            name: schichtTyp.name,
            hours: hours
        });

        console.log(`   ✅ Schicht ${schicht.datum}: "${schichtTyp.name}" (${schichtTyp.startzeit}-${schichtTyp.endzeit}) = ${hours}h`);
    }

    console.log('\n📊 ERWARTETE STUNDEN (Basierend auf Schichten):');
    console.log('   Gesamtstunden:', totalHoursExpected.toFixed(2), 'h');
    console.log('   Monatliche Stunden:', monthlyHoursExpected.toFixed(2), 'h (', new Date().toLocaleString('de-DE', { month: 'long', year: 'numeric' }), ')');

    // ============================================
    // STEP 6: Compare Actual vs Expected
    // ============================================
    console.log('\n📋 STEP 6: Vergleich Actual vs Expected...');

    const actualGesamtstunden = marceltest1.gesamtstunden || 0;
    const actualMonatlicheStunden = marceltest1.monatlicheStunden || 0;

    const gesamtDifferenz = actualGesamtstunden - totalHoursExpected;
    const monatlichDifferenz = actualMonatlicheStunden - monthlyHoursExpected;

    console.log('\n═══════════════════════════════════════');
    console.log('📊 VERGLEICH: ACTUAL vs EXPECTED');
    console.log('═══════════════════════════════════════\n');

    console.log('📌 GESAMTSTUNDEN:');
    console.log('   Actual (Firestore):  ', actualGesamtstunden.toFixed(2), 'h');
    console.log('   Expected (Schichten):', totalHoursExpected.toFixed(2), 'h');
    console.log('   Differenz:           ', gesamtDifferenz.toFixed(2), 'h', gesamtDifferenz === 0 ? '✅' : '❌');

    console.log('\n📌 MONATLICHE STUNDEN:');
    console.log('   Actual (Firestore):  ', actualMonatlicheStunden.toFixed(2), 'h');
    console.log('   Expected (Schichten):', monthlyHoursExpected.toFixed(2), 'h');
    console.log('   Differenz:           ', monatlichDifferenz.toFixed(2), 'h', monatlichDifferenz === 0 ? '✅' : '❌');

    // ============================================
    // STEP 7: Diagnosis
    // ============================================
    console.log('\n📋 STEP 7: Diagnose...\n');

    if (gesamtDifferenz === 0 && monatlichDifferenz === 0) {
        console.log('✅ ALLES KORREKT!');
        console.log('   Die Stunden in Firestore stimmen exakt mit den Schichten überein.');
        console.log('   → Falls die UI falsche Werte zeigt, liegt das Problem in der Anzeige-Logik.');
    } else {
        console.log('❌ DISKREPANZ GEFUNDEN!');
        console.log('\n🔍 MÖGLICHE URSACHEN:');

        if (Math.abs(gesamtDifferenz) > 0) {
            console.log(`\n   1️⃣ Gesamtstunden sind ${gesamtDifferenz > 0 ? 'zu HOCH' : 'zu NIEDRIG'} (${Math.abs(gesamtDifferenz).toFixed(2)}h)`);
            console.log('      → Mögliche Gründe:');
            console.log('        • Schichten wurden gelöscht, aber Stunden nicht aktualisiert');
            console.log('        • Schichten wurden hinzugefügt, aber Stunden nicht aktualisiert');
            console.log('        • Ein Tausch wurde durchgeführt, aber Stundenberechnung war falsch');
            console.log('        • Initialwert war falsch gesetzt');
        }

        if (Math.abs(monatlichDifferenz) > 0) {
            console.log(`\n   2️⃣ Monatliche Stunden sind ${monatlichDifferenz > 0 ? 'zu HOCH' : 'zu NIEDRIG'} (${Math.abs(monatlichDifferenz).toFixed(2)}h)`);
            console.log('      → Mögliche Gründe:');
            console.log('        • Schichten aus diesem Monat wurden getauscht');
            console.log('        • Monatliche Neuberechnung fehlgeschlagen');
        }

        console.log('\n💡 EMPFOHLENE MASSNAHMEN:');
        console.log('   1. Prüfe die bearbeiteTausch() Funktion (dienstplan.html ~Line 3000)');
        console.log('   2. Prüfe ob calculateShiftHours() korrekt rechnet');
        console.log('   3. Prüfe ob alle Schichten den richtigen schichtTypId haben');
        console.log('   4. Erwäge ein "Recalculate All Hours" Button für Admin');
    }

    // ============================================
    // STEP 8: Detailed Shift Breakdown
    // ============================================
    if (schichtenWithHours.length > 0) {
        console.log('\n📋 STEP 8: Detaillierte Schicht-Aufschlüsselung...\n');
        console.log('═══════════════════════════════════════');

        let runningTotal = 0;
        schichtenWithHours
            .sort((a, b) => new Date(a.datum) - new Date(b.datum))
            .forEach((schicht, index) => {
                runningTotal += schicht.hours;
                const isThisMonth = new Date(schicht.datum).getMonth() === currentMonth;
                console.log(`[${index + 1}] ${schicht.datum} | ${schicht.name.padEnd(15)} | +${schicht.hours.toFixed(2)}h | Gesamt: ${runningTotal.toFixed(2)}h ${isThisMonth ? '📅' : ''}`);
            });
    }

    console.log('\n\n🔍 ========================================');
    console.log('🔍 END OF DIAGNOSTIC SCRIPT');
    console.log('🔍 ========================================\n\n');
})();
