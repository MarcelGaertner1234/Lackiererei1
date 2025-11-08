/**
 * DIAGNOSTIC SCRIPT: urlaubsAnfragen Permission Error Debugging
 *
 * USAGE:
 * 1. Open mitarbeiter-dienstplan.html in Browser
 * 2. Login as Mitarbeiter
 * 3. Open Browser Console (F12 → Console)
 * 4. Copy & Paste this ENTIRE file into Console
 * 5. Press Enter
 *
 * This script will test EVERY condition of the Security Rule step-by-step
 * and show you EXACTLY which condition is failing.
 */

(async function debugUrlaubsanfragen() {
    console.log('\n\n🔍 ========================================');
    console.log('🔍 DIAGNOSTIC SCRIPT: urlaubsAnfragen');
    console.log('🔍 ========================================\n');

    // ============================================
    // STEP 1: Check Firebase Auth
    // ============================================
    console.log('📋 STEP 1: Checking Firebase Auth...');

    if (!window.auth) {
        console.error('❌ FEHLER: window.auth ist nicht definiert!');
        console.log('   → Firebase Auth wurde nicht initialisiert');
        return;
    }

    const currentUser = window.auth.currentUser;
    if (!currentUser) {
        console.error('❌ FEHLER: Kein User eingeloggt!');
        console.log('   → Bitte als Mitarbeiter einloggen');
        return;
    }

    console.log('✅ Firebase Auth: User eingeloggt');
    console.log('   UID:', currentUser.uid);
    console.log('   Email:', currentUser.email);

    // ============================================
    // STEP 2: Check Custom Claims
    // ============================================
    console.log('\n📋 STEP 2: Checking Custom Claims...');

    try {
        const idTokenResult = await currentUser.getIdTokenResult();
        const claims = idTokenResult.claims;

        console.log('✅ Custom Claims geladen:');
        console.log('   role:', claims.role || '❌ NICHT GESETZT');
        console.log('   mitarbeiterId:', claims.mitarbeiterId || '❌ NICHT GESETZT');
        console.log('   werkstattId:', claims.werkstattId || '❌ NICHT GESETZT');

        if (!claims.role) {
            console.warn('⚠️  WARNUNG: Custom Claims role ist NICHT gesetzt!');
            console.log('   → getUserRole() wird auf Firestore users/{uid} zurückfallen');
        }
    } catch (error) {
        console.error('❌ FEHLER beim Laden der Custom Claims:', error);
    }

    // ============================================
    // STEP 3: Check users/{uid} Document
    // ============================================
    console.log('\n📋 STEP 3: Checking users/{uid} Document...');

    try {
        const userDoc = await window.db.collection('users').doc(currentUser.uid).get();

        if (!userDoc.exists) {
            console.error('❌ FEHLER: users/{uid} Dokument existiert NICHT!');
            console.log('   UID:', currentUser.uid);
            console.log('   → getUserRole() kann Rolle nicht aus Firestore lesen');
            console.log('   → isMitarbeiter() wird FEHLSCHLAGEN');
            console.log('\n💡 LÖSUNG: Erstelle users/' + currentUser.uid + ' Dokument mit:');
            console.log('   {');
            console.log('     role: "mitarbeiter",');
            console.log('     email: "' + currentUser.email + '",');
            console.log('     status: "active"');
            console.log('   }');
        } else {
            console.log('✅ users/{uid} Dokument gefunden');
            const userData = userDoc.data();
            console.log('   role:', userData.role || '❌ NICHT GESETZT');
            console.log('   status:', userData.status || '❌ NICHT GESETZT');
            console.log('   email:', userData.email || '❌ NICHT GESETZT');

            if (userData.role !== 'mitarbeiter') {
                console.warn('⚠️  WARNUNG: role ist "' + userData.role + '", nicht "mitarbeiter"!');
                console.log('   → isMitarbeiter() wird FEHLSCHLAGEN');
            }

            if (userData.status !== 'active') {
                console.warn('⚠️  WARNUNG: status ist "' + userData.status + '", nicht "active"!');
                console.log('   → isActive() wird FEHLSCHLAGEN (falls verwendet)');
            }
        }
    } catch (error) {
        console.error('❌ FEHLER beim Laden von users/{uid}:', error);
        console.log('   → Möglicherweise Permission Error');
    }

    // ============================================
    // STEP 4: Check urlaubsAnfragen Collection
    // ============================================
    console.log('\n📋 STEP 4: Checking urlaubsAnfragen_mosbach Collection...');

    try {
        // Try to load ALL documents (no filter)
        const allSnapshot = await window.db.collection('urlaubsAnfragen_mosbach').get();

        console.log('✅ Collection geladen (OHNE Filter)');
        console.log('   Anzahl Dokumente:', allSnapshot.docs.length);

        if (allSnapshot.docs.length === 0) {
            console.warn('⚠️  WARNUNG: Keine Dokumente in urlaubsAnfragen_mosbach!');
            console.log('   → Query wird 0 Ergebnisse zurückgeben (aber keinen Permission Error)');
        } else {
            console.log('   Dokumente gefunden:');
            allSnapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`   [${index + 1}] ID: ${doc.id}`);
                console.log(`       mitarbeiterId: ${data.mitarbeiterId}`);
                console.log(`       status: ${data.status}`);
                console.log(`       startDatum: ${data.startDatum}`);
                console.log(`       Match mit UID? ${data.mitarbeiterId === currentUser.uid ? '✅ JA' : '❌ NEIN'}`);
            });
        }
    } catch (error) {
        console.error('❌ FEHLER beim Laden der Collection (OHNE Filter):', error);
        console.log('   → Permission Error beim Lesen der Collection');
        console.log('   → Security Rule blockiert ALLE Reads');
    }

    // ============================================
    // STEP 5: Try Filtered Query
    // ============================================
    console.log('\n📋 STEP 5: Testing Filtered Query (MIT mitarbeiterId Filter)...');

    try {
        const filteredSnapshot = await window.db.collection('urlaubsAnfragen_mosbach')
            .where('mitarbeiterId', '==', currentUser.uid)
            .get();

        console.log('✅ Gefilterte Query erfolgreich!');
        console.log('   Anzahl Dokumente:', filteredSnapshot.docs.length);

        if (filteredSnapshot.docs.length === 0) {
            console.warn('⚠️  WARNUNG: Query gibt 0 Dokumente zurück');
            console.log('   → Entweder: Keine Dokumente mit mitarbeiterId = ' + currentUser.uid);
            console.log('   → Oder: Security Rule blockiert Dokumente');
        } else {
            console.log('   Dokumente gefunden:');
            filteredSnapshot.docs.forEach((doc, index) => {
                const data = doc.data();
                console.log(`   [${index + 1}] ${data.startDatum} - ${data.endDatum} (${data.anzahlTage} Tage)`);
            });
        }
    } catch (error) {
        console.error('❌ FEHLER bei gefilterter Query:', error);
        console.log('   → Dies ist der GLEICHE Fehler wie in loadUrlaubsantraege()');
        console.log('   → Security Rule blockiert Query');
    }

    // ============================================
    // STEP 6: Security Rule Condition Analysis
    // ============================================
    console.log('\n📋 STEP 6: Analyzing Security Rule Conditions...');
    console.log('\nDie READ Rule hat folgende Bedingungen:');
    console.log('1. urlaubsAnfragenCollection.matches("urlaubsAnfragen_.*")');
    console.log('   → ✅ PASS (Collection ist urlaubsAnfragen_mosbach)');
    console.log('\n2. isAuthenticated()');
    console.log('   → ✅ PASS (User ist eingeloggt)');
    console.log('\n3. isMitarbeiter()');
    console.log('   → Ruft getUserRole() auf');
    console.log('   → getUserRole() prüft Custom Claims ODER liest users/{uid}');

    // Simulate getUserRole() check
    const idTokenResult = await currentUser.getIdTokenResult();
    const hasCustomClaimsRole = idTokenResult.claims.role != null;

    if (hasCustomClaimsRole) {
        console.log('   → ✅ Custom Claims role vorhanden: ' + idTokenResult.claims.role);
        if (idTokenResult.claims.role === 'mitarbeiter') {
            console.log('   → ✅ PASS (role = mitarbeiter)');
        } else {
            console.log('   → ❌ FAIL (role ≠ mitarbeiter)');
        }
    } else {
        console.log('   → Custom Claims role FEHLT, Fallback zu Firestore...');
        try {
            const userDoc = await window.db.collection('users').doc(currentUser.uid).get();
            if (userDoc.exists) {
                const role = userDoc.data().role;
                console.log('   → Firestore role: ' + role);
                if (role === 'mitarbeiter') {
                    console.log('   → ✅ PASS (role = mitarbeiter)');
                } else {
                    console.log('   → ❌ FAIL (role ≠ mitarbeiter)');
                }
            } else {
                console.log('   → ❌ FAIL (users/{uid} existiert nicht)');
            }
        } catch (error) {
            console.log('   → ❌ FAIL (Firestore Read Error: ' + error.message + ')');
        }
    }

    console.log('\n4. resource.data.mitarbeiterId == request.auth.uid');
    console.log('   → Wird für JEDES Dokument geprüft');
    console.log('   → request.auth.uid = ' + currentUser.uid);

    // ============================================
    // FINAL RECOMMENDATION
    // ============================================
    console.log('\n\n🎯 ========================================');
    console.log('🎯 EMPFEHLUNG');
    console.log('🎯 ========================================\n');

    // Check most likely issues
    const userDocCheck = await window.db.collection('users').doc(currentUser.uid).get();
    const hasUserDoc = userDocCheck.exists;
    const userRole = hasUserDoc ? userDocCheck.data().role : null;

    if (!hasUserDoc) {
        console.log('❌ HAUPTPROBLEM: users/{uid} Dokument existiert NICHT');
        console.log('\n💡 LÖSUNG:');
        console.log('1. Gehe zu Firebase Console → Firestore');
        console.log('2. Erstelle Dokument: users/' + currentUser.uid);
        console.log('3. Füge Felder hinzu:');
        console.log('   {');
        console.log('     "role": "mitarbeiter",');
        console.log('     "email": "' + currentUser.email + '",');
        console.log('     "status": "active"');
        console.log('   }');
        console.log('4. Speichern');
        console.log('5. Hard-Refresh (Cmd+Shift+R) und erneut testen');
    } else if (userRole !== 'mitarbeiter') {
        console.log('❌ HAUPTPROBLEM: users/{uid}.role ist "' + userRole + '", nicht "mitarbeiter"');
        console.log('\n💡 LÖSUNG:');
        console.log('1. Gehe zu Firebase Console → Firestore');
        console.log('2. Öffne Dokument: users/' + currentUser.uid);
        console.log('3. Ändere Feld "role" zu: "mitarbeiter"');
        console.log('4. Speichern');
        console.log('5. Hard-Refresh (Cmd+Shift+R) und erneut testen');
    } else if (!hasCustomClaimsRole) {
        console.log('⚠️  PERFORMANCE PROBLEM: Custom Claims sind nicht gesetzt');
        console.log('\n💡 EMPFEHLUNG (Optional):');
        console.log('1. Custom Claims verbessern für bessere Performance');
        console.log('2. Oder: Security Rule vereinfachen (entferne isMitarbeiter() Check)');
    } else {
        console.log('✅ Alle Bedingungen scheinen OK zu sein!');
        console.log('\n🤔 Falls trotzdem Fehler:');
        console.log('1. Prüfe ob Rules deployed sind: firebase deploy --only firestore:rules');
        console.log('2. Warte 1-2 Minuten bis Rules aktiv sind');
        console.log('3. Hard-Refresh (Cmd+Shift+R)');
    }

    console.log('\n🔍 ========================================');
    console.log('🔍 END OF DIAGNOSTIC SCRIPT');
    console.log('🔍 ========================================\n\n');
})();
