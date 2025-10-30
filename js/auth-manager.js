/**
 * Authentication Manager
 *
 * MULTI-TENANT 2-STAGE AUTHENTICATION:
 *
 * STAGE 1: Workshop Login (Firebase Auth)
 * - One account per workshop (e.g., werkstatt-mosbach@...)
 * - Stored in Firestore 'users' collection
 * - Provides werkstattId for data separation
 *
 * STAGE 2: Employee Selection (Firestore only, NO Firebase Auth)
 * - Employees stored in Firestore 'mitarbeiter_{werkstattId}' collection
 * - Individual tracking + permissions
 * - Password hashed with SHA-256
 *
 * BENEFITS:
 * ✅ Simple workshop access (one password to share)
 * ✅ Individual employee tracking (audit logs)
 * ✅ Perfect data isolation between workshops
 * ✅ Easy to sell/onboard new workshops
 */

// ============================================
// AUTHENTICATION STATE
// ============================================

let currentAuthUser = null;     // Workshop account (Firebase Auth)
let currentWerkstatt = null;     // Workshop data (after Stage 1)
let currentMitarbeiter = null;   // Employee data (after Stage 2)

// ============================================
// FIREBASE AUTH - ALL USERS
// ============================================

/**
 * Register new Partner/Kunde (Self-Service)
 * @param {Object} userData - { email, password, name, company, role }
 * @returns {Promise<Object>} User data
 */
async function registerUser(userData) {
  const { email, password, name, company, role } = userData;

  if (!email || !password || !name || !role) {
    throw new Error('Alle Pflichtfelder müssen ausgefüllt sein!');
  }

  if (password.length < 8) {
    throw new Error('Passwort muss mindestens 8 Zeichen lang sein!');
  }

  try {
    console.log('🔐 Registriere neuen User:', email);

    // 1. Create Firebase Auth user
    const userCredential = await window.auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;

    console.log('✅ Firebase Auth User erstellt:', firebaseUser.uid);

    // 2. Create user document in Firestore
    const userDoc = {
      uid: firebaseUser.uid,
      email: email,
      name: name,
      company: company || '',
      role: role, // 'partner' or 'kunde'
      status: 'pending', // Admin must approve
      createdAt: new Date().toISOString(),
      lastLogin: null
    };

    // GLOBAL collection (not werkstatt-specific) → use db.collection() directly
    await window.db.collection('users').doc(firebaseUser.uid).set(userDoc);
    console.log('✅ User-Dokument in Firestore erstellt');

    // 3. Send email verification
    await firebaseUser.sendEmailVerification();
    console.log('✅ Verifizierungs-E-Mail gesendet');

    return userDoc;

  } catch (error) {
    console.error('❌ Registrierung fehlgeschlagen:', error);

    // User-friendly error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Diese E-Mail-Adresse ist bereits registriert!');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Ungültige E-Mail-Adresse!');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Passwort zu schwach! Mindestens 8 Zeichen erforderlich.');
    } else {
      throw error;
    }
  }
}

/**
 * STAGE 1: Workshop Login (Firebase Auth)
 * @param {string} email - Workshop email (e.g., werkstatt-mosbach@...)
 * @param {string} password - Workshop password
 * @returns {Promise<Object>} Workshop data with werkstattId
 */
async function loginWerkstatt(email, password) {
  try {
    console.log('🔐 STAGE 1: Workshop Login:', email);

    // 1. Sign in with Firebase Auth
    const userCredential = await window.auth.signInWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;

    console.log('✅ Firebase Auth erfolgreich:', firebaseUser.uid);

    // 🆕 PHASE 2.4: Set Custom Claims für Werkstatt users
    try {
      console.log('🔐 Setting Custom Claims for werkstatt user...');
      const setWerkstattClaims = window.functions.httpsCallable('setWerkstattClaims');
      const claimsResult = await setWerkstattClaims({
        uid: firebaseUser.uid,
        email: email
        // werkstattId extracted from email in Cloud Function
      });
      console.log('✅ Custom claims set:', claimsResult.data.claims);

      // Force token refresh to apply new claims
      await firebaseUser.getIdToken(true);
      console.log('✅ Token refreshed with new claims');
    } catch (claimsError) {
      console.warn('⚠️ Could not set custom claims:', claimsError.message);
      // Non-critical: Continue with login (fallback to Firestore users doc)
    }

    // 2. Get workshop document from Firestore
    // GLOBAL collection (not werkstatt-specific) → use db.collection() directly
    const userDoc = await window.db.collection('users').doc(firebaseUser.uid).get();

    if (!userDoc.exists) {
      throw new Error('Werkstatt-Dokument nicht gefunden!');
    }

    const userData = userDoc.data();

    // 3. Check if workshop is active
    if (userData.status !== 'active') {
      throw new Error(`Account ist ${userData.status}. Bitte warten Sie auf Freigabe durch Admin.`);
    }

    // 4. Verify werkstattId exists
    if (!userData.werkstattId) {
      throw new Error('Werkstatt-ID fehlt! Bitte kontaktieren Sie den Administrator.');
    }

    // 5. Update last login timestamp
    // GLOBAL collection (not werkstatt-specific) → use db.collection() directly
    await window.db.collection('users').doc(firebaseUser.uid).update({
      lastLogin: new Date().toISOString()
    });

    // 6. Set werkstatt data
    currentWerkstatt = {
      uid: firebaseUser.uid,
      email: userData.email,
      name: userData.name,
      werkstattId: userData.werkstattId,
      role: 'werkstatt',
      authType: 'firebase'
    };

    // 7. Set currentAuthUser (for Firebase Auth state)
    currentAuthUser = currentWerkstatt;

    console.log('✅ STAGE 1 erfolgreich - Werkstatt eingeloggt:', currentWerkstatt);
    console.log('   WerkstattID:', currentWerkstatt.werkstattId);
    console.log('   ⚠️ STAGE 2 REQUIRED: Mitarbeiter auswählen!');

    return currentWerkstatt;

  } catch (error) {
    console.error('❌ Workshop-Login fehlgeschlagen:', error);

    // User-friendly error messages
    if (error.code === 'auth/user-not-found') {
      throw new Error('Kein Werkstatt-Account mit dieser E-Mail gefunden!');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Falsches Passwort!');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Ungültige E-Mail-Adresse!');
    } else {
      throw error;
    }
  }
}

/**
 * STAGE 2: Employee Login (Firestore only, no Firebase Auth)
 * @param {string} mitarbeiterId - Employee ID
 * @param {string} password - Employee password
 * @returns {Promise<Object>} Employee data with werkstattId
 */
async function loginMitarbeiter(mitarbeiterId, password) {
  try {
    console.log('🔐 STAGE 2: Mitarbeiter Login:', mitarbeiterId);

    // Check if werkstatt is logged in
    if (!currentWerkstatt || !currentWerkstatt.werkstattId) {
      throw new Error('Werkstatt muss zuerst eingeloggt werden (STAGE 1)!');
    }

    const werkstattId = currentWerkstatt.werkstattId;
    console.log('   WerkstattID:', werkstattId);

    // Get employee from Firestore (werkstatt-specific collection)
    const mitarbeiterRef = window.db.collection(`mitarbeiter_${werkstattId}`).doc(mitarbeiterId);
    const mitarbeiterDoc = await mitarbeiterRef.get();

    if (!mitarbeiterDoc.exists) {
      throw new Error('Mitarbeiter nicht gefunden!');
    }

    const mitarbeiterData = mitarbeiterDoc.data();

    // Check if employee is active
    if (mitarbeiterData.status !== 'active') {
      throw new Error(`Mitarbeiter-Account ist ${mitarbeiterData.status}!`);
    }

    // Verify password (SHA-256 hash)
    const passwordHash = await hashPassword(password);
    if (passwordHash !== mitarbeiterData.passwordHash) {
      throw new Error('Falsches Passwort!');
    }

    // Update last login timestamp
    await mitarbeiterRef.update({
      lastLogin: new Date().toISOString()
    });

    // Set current employee
    currentMitarbeiter = {
      id: mitarbeiterId,
      name: mitarbeiterData.name,
      role: 'mitarbeiter',
      berechtigungen: mitarbeiterData.berechtigungen || {},
      werkstattId: werkstattId
    };

    console.log('✅ STAGE 2 erfolgreich - Mitarbeiter eingeloggt:', currentMitarbeiter);
    console.log('   Berechtigungen:', currentMitarbeiter.berechtigungen);

    // Initialize Mitarbeiter Notifications (Phase 3.2.3)
    if (window.mitarbeiterNotifications) {
      try {
        await window.mitarbeiterNotifications.initialize();
        const notifications = await window.mitarbeiterNotifications.loadNotifications();

        // Show all unread notifications
        notifications.forEach(notif => {
          window.mitarbeiterNotifications.showNotificationToast(notif);

          // Speak high/urgent priority notifications
          if (['high', 'urgent'].includes(notif.priority)) {
            window.mitarbeiterNotifications.speakNotification(notif);
          }
        });

        console.log(`✅ ${notifications.length} Benachrichtigungen geladen und angezeigt`);
      } catch (error) {
        console.error('❌ Error loading notifications:', error);
      }
    }

    return currentMitarbeiter;

  } catch (error) {
    console.error('❌ Mitarbeiter-Login fehlgeschlagen:', error);
    throw error;
  }
}

/**
 * Logout employee only (keep workshop logged in)
 */
function logoutMitarbeiter() {
  console.log('👋 Mitarbeiter ausloggen:', currentMitarbeiter?.name);
  currentMitarbeiter = null;
  console.log('✅ Mitarbeiter ausgeloggt - Werkstatt bleibt eingeloggt');
}

/**
 * Logout Workshop (Firebase Auth + clear employee)
 */
async function logout() {
  try {
    console.log('👋 Vollständiger Logout: Werkstatt + Mitarbeiter');

    await window.auth.signOut();
    currentAuthUser = null;
    currentWerkstatt = null;
    currentMitarbeiter = null;

    console.log('✅ Logout erfolgreich');
  } catch (error) {
    console.error('❌ Logout fehlgeschlagen:', error);
    throw error;
  }
}

// ============================================
// STATE CHECKS
// ============================================

/**
 * Get currently logged in user (combined werkstatt + mitarbeiter)
 * @returns {Object|null} Combined user data or null
 *
 * Returns combined data structure:
 * {
 *   werkstattId: string,        // From werkstatt
 *   name: string,                // From mitarbeiter OR werkstatt
 *   role: string,                // 'mitarbeiter' or 'werkstatt'
 *   berechtigungen: Object,      // From mitarbeiter
 *   mitarbeiterId: string,       // From mitarbeiter (if logged in)
 *   werkstattName: string,       // From werkstatt
 *   email: string                // From werkstatt
 * }
 */
function getCurrentUser() {
  // No werkstatt logged in → no access
  if (!currentWerkstatt) {
    return null;
  }

  // Werkstatt logged in, but no mitarbeiter → return werkstatt data
  if (!currentMitarbeiter) {
    return {
      werkstattId: currentWerkstatt.werkstattId,
      name: currentWerkstatt.name,
      role: 'werkstatt',
      berechtigungen: {},
      werkstattName: currentWerkstatt.name,
      email: currentWerkstatt.email,
      loginStage: 1  // Only Stage 1 completed
    };
  }

  // Both logged in → return combined data (mitarbeiter takes priority)
  return {
    werkstattId: currentWerkstatt.werkstattId,
    name: currentMitarbeiter.name,
    role: 'mitarbeiter',
    berechtigungen: currentMitarbeiter.berechtigungen || {},
    mitarbeiterId: currentMitarbeiter.id,
    werkstattName: currentWerkstatt.name,
    email: currentWerkstatt.email,
    loginStage: 2  // Both stages completed
  };
}

/**
 * Check if user is logged in
 * @returns {boolean}
 */
function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Check if current user has specific role
 * @param {string} role - 'admin', 'partner', 'mitarbeiter', 'kunde'
 * @returns {boolean}
 */
function hasRole(role) {
  const user = getCurrentUser();
  return user && user.role === role;
}

/**
 * Check if current user has specific permission (Mitarbeiter only)
 * @param {string} permission - Permission key (e.g., 'annahme', 'abnahme')
 * @returns {boolean}
 */
function hasPermission(permission) {
  const user = getCurrentUser();
  if (!user || user.role !== 'mitarbeiter') {
    return false; // Only Mitarbeiter have permissions
  }
  return user.berechtigungen && user.berechtigungen[permission] === true;
}

// ============================================
// PASSWORD HASHING (for migration tool)
// ============================================

/**
 * Hash password using SHA-256
 * @param {string} password
 * @returns {Promise<string>} Hex-encoded hash
 */
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// ============================================
// FIREBASE AUTH STATE LISTENER
// ============================================

// Wait for Firebase to be ready before setting up auth listener
window.addEventListener('firebaseReady', () => {
  console.log('🔐 Auth Manager: Firebase ready, setting up auth listener...');

  // Listen for Firebase Auth state changes
  window.auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      console.log('🔐 Firebase Auth State Changed:', firebaseUser.email);

      // Load user data from Firestore
      try {
        // GLOBAL collection (not werkstatt-specific) → use db.collection() directly
        const userDoc = await window.db.collection('users').doc(firebaseUser.uid).get();

        if (userDoc.exists) {
          const userData = userDoc.data();

          // Check if this is a werkstatt user
          if (userData.role === 'werkstatt' && userData.werkstattId) {
            // Set currentWerkstatt for Multi-Tenant
            currentWerkstatt = {
              uid: firebaseUser.uid,
              email: userData.email,
              name: userData.name,
              werkstattId: userData.werkstattId,
              role: 'werkstatt',
              authType: 'firebase'
            };
            currentAuthUser = currentWerkstatt;
            console.log('✅ Current Auth User (Werkstatt):', currentAuthUser);
            console.log('   WerkstattID:', currentWerkstatt.werkstattId);
          } else {
            // Other user types (admin, partner, kunde)
            currentAuthUser = {
              uid: firebaseUser.uid,
              email: userData.email,
              name: userData.name,
              role: userData.role,
              company: userData.company || '',
              berechtigungen: userData.berechtigungen || {},
              authType: 'firebase'
            };
            console.log('✅ Current Auth User:', currentAuthUser);
          }

          // Dispatch custom event for UI updates
          window.dispatchEvent(new CustomEvent('authStateChanged', {
            detail: { user: currentAuthUser }
          }));
        }
      } catch (error) {
        console.error('❌ Fehler beim Laden von User-Daten:', error);
      }
    } else {
      console.log('🔐 Firebase Auth: No user logged in');
      currentAuthUser = null;
      currentWerkstatt = null; // Also clear werkstatt state
      currentMitarbeiter = null; // Also clear mitarbeiter state

      // Dispatch custom event
      window.dispatchEvent(new CustomEvent('authStateChanged', {
        detail: { user: null }
      }));
    }
  });

  console.log('✅ Auth state listener initialized');
});

// ============================================
// EXPORT (make functions globally available)
// ============================================

window.authManager = {
  // Registration
  registerUser,

  // Login (2-Stage Multi-Tenant)
  loginWerkstatt,              // Stage 1: Workshop login
  loginMitarbeiter,            // Stage 2: Employee login
  loginWithFirebase: loginWerkstatt,  // Backward compatibility alias
  login: loginWerkstatt,       // Backward compatibility alias

  // Logout
  logout,                      // Full logout (werkstatt + mitarbeiter)
  logoutMitarbeiter,           // Logout employee only

  // State checks
  getCurrentUser,              // Returns combined werkstatt + mitarbeiter data
  isLoggedIn,
  hasRole,
  hasPermission,

  // Utilities
  hashPassword
};

console.log('✅ Auth Manager initialized (Multi-Tenant 2-Stage Auth)');
