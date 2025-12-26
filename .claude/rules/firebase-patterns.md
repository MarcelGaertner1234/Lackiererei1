# Firebase & Firestore Patterns

> Kritische Patterns für Firebase-Operationen

---

## Timestamp Handling

```javascript
// Problem: Timestamps können verschiedene Typen haben
// Lösung: Universelle Formatierung

function formatFirestoreDate(timestamp) {
  if (!timestamp) return 'N/A';

  // Firestore Timestamp Object
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toLocaleDateString('de-DE');
  }

  // ISO String oder andere
  return new Date(timestamp).toLocaleDateString('de-DE');
}
```

### Timestamp Konsistenz

```javascript
// RICHTIG - Firestore native Timestamp
storniertAm: firebase.firestore.Timestamp.now()

// FALSCH - String (bricht Date-Vergleiche!)
storniertAm: new Date().toISOString()
```

---

## Listener Management (Memory Leak Prevention)

```javascript
// Bei Page-Load oder Component-Mount
window.listenerRegistry?.cleanup();

// Listener registrieren
const unsubscribe = window.getCollection('fahrzeuge')
  .onSnapshot(snapshot => {
    // Handle updates
  });

// Zur Registry hinzufügen
window.listenerRegistry?.add(unsubscribe);

// Bei Navigation
safeNavigate('liste.html');  // Cleanup automatisch
```

---

## Batch Operations

```javascript
// Für multiple Updates
const batch = db.batch();

vehicles.forEach(vehicle => {
  const ref = window.getCollection('fahrzeuge').doc(vehicle.id);
  batch.update(ref, { status: 'updated' });
});

await batch.commit();
```

---

## Query Patterns

### Type-Safe ID Vergleiche
```javascript
// RICHTIG
const vehicle = vehicles.find(v => String(v.id) === String(vehicleId));

// FALSCH - Type Mismatch möglich!
const vehicle = vehicles.find(v => v.id === vehicleId);
```

### Compound Queries
```javascript
// Firestore erlaubt nur einen range operator pro Query
// RICHTIG
query.where('status', '==', 'aktiv')
     .where('createdAt', '>=', startDate)
     .orderBy('createdAt')

// FALSCH - Zwei Range Operators!
query.where('createdAt', '>=', startDate)
     .where('updatedAt', '<=', endDate)
```

---

## Security Rules Patterns

### Rollen-Hierarchie
1. `superadmin` - Voller Systemzugriff
2. `admin/werkstatt` - Werkstatt-Management
3. `mitarbeiter` - Zeiterfassung, eigene Daten
4. `partner` - Eigene Anfragen
5. `kunde` - Status-Ansicht (read-only)
6. `steuerberater` - Finanzdaten (read-only)

### Custom Claims vs Firestore Lookup
```javascript
// Priority 1: Custom Claims (schneller)
function getUserRole() {
  return (request.auth.token.role != null)
    ? request.auth.token.role
    : get(/databases/.../users/$(request.auth.uid)).data.role;
}
```

### Rules Order (WICHTIG!)
```javascript
// Spezifisch ZUERST
allow read: if isAdmin();           // Specific
allow read: if request.auth != null; // Generic SECOND
```

---

## Storage Patterns

| Pfad | Max Size | Auth Required |
|------|----------|---------------|
| `/progress-photos/**` | 10 MB | Nein |
| `/fahrzeuge/**` | 10 MB | Ja |
| `/partner-anfragen/**` | 10 MB | Nein* |
| `/pdfs/**` | 50 MB | Ja |

*Partner haben kein Firebase Auth → MIME/Size-Validation

---

## Cloud Functions Patterns

### Error Handling
```javascript
exports.myFunction = functions.https.onCall(async (data, context) => {
  // Auth Check
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Login required');
  }

  try {
    // Function logic
  } catch (error) {
    console.error('Function error:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

---

_Referenz: CLAUDE.md Section "Firebase" + firestore.rules_
