# 📊 Kanban System - Code-Referenz

**Purpose:** Vollständige Dokumentation des Kanban Board Systems in der Fahrzeugannahme App

**Zuletzt aktualisiert:** 2025-10-31 (Test Session)

---

## 🎯 Overview

Das Kanban Board visualisiert **10 verschiedene Service-Prozesse** mit jeweils individuellen Workflow-Steps:

| Service | Process Steps | Icon |
|---------|--------------|------|
| **Alle** | 6 Steps (Allgemeiner Workflow) | 📋 |
| **Lackierung** | 7 Steps | 🎨 |
| **Reifen** | 7 Steps | 🚗 |
| **Mechanik** | 8 Steps | 🔧 |
| **Pflege** | 6 Steps | ✨ |
| **TÜV/AU** | 6 Steps | ✅ |
| **Versicherung** | 7 Steps | 🛡️ |
| **Dellen** | 7 Steps | 🔨 |
| **Klima** | 7 Steps | ❄️ |
| **Glas** | 7 Steps | 🔍 |

**Key Features:**
- ✅ Service-spezifische Workflow-Definitionen
- ✅ Drag & Drop zwischen Steps
- ✅ Realtime Updates (Firestore Snapshot Listener)
- ✅ Multi-Tenant Support (fahrzeuge_{werkstattId})
- ✅ Farbcodierung nach Status
- ✅ Auto-Refresh bei Änderungen

---

## 📍 Code Locations

### 1. Process Definitions

**File:** `kanban.html`
**Lines:** 1683-1802

```javascript
const processDefinitions = {
    alle: {
        name: '📋 Alle Prozesse',
        steps: [
            { id: 'angenommen', icon: '📥', label: 'Neu/Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'vorbereitung', icon: '🔧', label: 'Vorbereitung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'in_arbeit', icon: '⚙️', label: 'In Arbeit', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'qualitaetskontrolle', icon: '🔍', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'bereit', icon: '✅', label: 'Fertig/Bereit', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    lackier: {
        name: '🎨 Lackierung',
        steps: [
            { id: 'angenommen', icon: '📋', label: 'Angenommen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'vorbereitung', icon: '🔧', label: 'Vorbereitung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'lackierung', icon: '🎨', label: 'Lackierung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'trocknung', icon: '⏱️', label: 'Trocknung', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'qualitaetskontrolle', icon: '🔍', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'bereit', icon: '✅', label: 'Bereit', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    reifen: {
        name: '🚗 Reifen-Service',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'bestellung', icon: '🛒', label: 'Bestellung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'angekommen', icon: '📦', label: 'Angekommen', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'montage', icon: '🔧', label: 'Montage', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'wuchten', icon: '⚖️', label: 'Wuchten', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    mechanik: {
        name: '🔧 Mechanik',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'diagnose', icon: '🔍', label: 'Diagnose', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'angebot', icon: '💰', label: 'Angebot', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'beauftragt', icon: '✅', label: 'Beauftragt', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'test', icon: '🧪', label: 'Test', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    pflege: {
        name: '✨ Fahrzeugpflege',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'termin', icon: '🗓️', label: 'Termin', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'aufbereitung', icon: '✨', label: 'Aufbereitung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    tuev: {
        name: '✅ TÜV/AU',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'termin_gebucht', icon: '🗓️', label: 'Termin gebucht', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'pruefung', icon: '🔍', label: 'Prüfung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' },
            { id: 'abholbereit', icon: '🚗', label: 'Abholbereit', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    versicherung: {
        name: '🛡️ Versicherung',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'gutachten', icon: '📋', label: 'Gutachten', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'freigabe', icon: '✅', label: 'Freigabe', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    dellen: {
        name: '🔨 Dellen-Drückung',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'begutachtung', icon: '🔍', label: 'Begutachtung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'drueckung', icon: '🔨', label: 'Drückung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'politur', icon: '✨', label: 'Politur', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'qualitaet', icon: '🔬', label: 'Qualität', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    klima: {
        name: '❄️ Klima-Service',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'diagnose', icon: '🔍', label: 'Diagnose', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'wartung', icon: '🔧', label: 'Wartung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'fuellen', icon: '💨', label: 'Befüllen', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'test', icon: '🧪', label: 'Test', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '✅', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    },
    glas: {
        name: '🔍 Glas-Reparatur',
        steps: [
            { id: 'neu', icon: '📥', label: 'Eingegangen', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'terminiert', icon: '📅', label: 'Terminiert', color: 'rgba(110, 110, 115, 0.7)' },
            { id: 'begutachtung', icon: '🔍', label: 'Begutachtung', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'reparatur', icon: '🔧', label: 'Reparatur', color: 'rgba(0, 122, 255, 0.7)' },
            { id: 'aushärten', icon: '⏱️', label: 'Aushärten', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'politur', icon: '✨', label: 'Politur', color: 'rgba(255, 149, 0, 0.7)' },
            { id: 'fertig', icon: '🏁', label: 'Fertig', color: 'rgba(52, 199, 89, 0.7)' }
        ]
    }
};
```

**Color Coding:**
- Gray (`rgba(110, 110, 115, 0.7)`): Initial steps (Neu, Angenommen, Terminiert)
- Blue (`rgba(0, 122, 255, 0.7)`): Work in progress
- Orange (`rgba(255, 149, 0, 0.7)`): Quality control / Waiting
- Green (`rgba(52, 199, 89, 0.7)`): Finished / Ready

---

### 2. Drag & Drop Implementation

**File:** `kanban.html`
**Lines:** 2500+ (setupDragAndDrop function)

```javascript
function setupDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const columns = document.querySelectorAll('.kanban-cards');

    // Drag Start
    cards.forEach(card => {
        const dragStartHandler = (e) => {
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', card.dataset.id);
        };

        window.listenerRegistry.registerDOM(card, 'dragstart', dragStartHandler, 'Kanban Drag Start');
    });

    // Drag Over (allow drop)
    columns.forEach(column => {
        const dragOverHandler = (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            column.classList.add('drag-over');
        };

        window.listenerRegistry.registerDOM(column, 'dragover', dragOverHandler, 'Kanban Drag Over');
    });

    // Drag Leave
    columns.forEach(column => {
        const dragLeaveHandler = () => {
            column.classList.remove('drag-over');
        };

        window.listenerRegistry.registerDOM(column, 'dragleave', dragLeaveHandler, 'Kanban Drag Leave');
    });

    // Drop
    columns.forEach(column => {
        const dropHandler = async (e) => {
            e.preventDefault();
            column.classList.remove('drag-over');

            const vehicleId = e.dataTransfer.getData('text/plain');
            const newStep = column.dataset.step;

            // Update Firestore
            await updateVehicleStep(vehicleId, newStep);
        };

        window.listenerRegistry.registerDOM(column, 'drop', dropHandler, 'Kanban Drop');
    });

    // Drag End
    cards.forEach(card => {
        const dragEndHandler = () => {
            card.classList.remove('dragging');
        };

        window.listenerRegistry.registerDOM(card, 'dragend', dragEndHandler, 'Kanban Drag End');
    });
}
```

**Key Points:**
- Uses `window.listenerRegistry` for memory-leak prevention
- `card.dataset.id` → Vehicle ID
- `column.dataset.step` → Target step ID
- Visual feedback: `dragging`, `drag-over` CSS classes

---

### 3. Update Vehicle Step (Firestore)

**File:** `kanban.html`
**Lines:** ~2600+

```javascript
async function updateVehicleStep(vehicleId, newStep) {
    try {
        const fahrzeuge = window.getCollection('fahrzeuge');

        await fahrzeuge.doc(vehicleId).update({
            processStep: newStep,
            lastModified: Date.now()
        });

        console.log(`✅ Fahrzeug ${vehicleId} → Step: ${newStep}`);

        // Dispatch event for other listeners
        window.dispatchEvent(new CustomEvent('vehicleStepChanged', {
            detail: { vehicleId, newStep }
        }));

    } catch (error) {
        console.error('❌ Error updating vehicle step:', error);
        alert('Fehler beim Aktualisieren des Status');
    }
}
```

**Firestore Update:**
```javascript
{
    processStep: 'montage',   // ← NEW step ID
    lastModified: 1730987654321
}
```

---

### 4. Realtime Listener (Firestore Snapshot)

**File:** `kanban.html`
**Lines:** ~1900+

```javascript
function setupRealtimeListener() {
    const fahrzeuge = window.getCollection('fahrzeuge');

    const unsubscribe = fahrzeuge
        .where('serviceTyp', '==', currentServiceTyp)
        .onSnapshot(snapshot => {
            console.log('📡 Realtime update:', snapshot.docChanges().length, 'changes');

            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    addVehicleToBoard(change.doc);
                } else if (change.type === 'modified') {
                    updateVehicleOnBoard(change.doc);
                } else if (change.type === 'removed') {
                    removeVehicleFromBoard(change.doc);
                }
            });

            setupDragAndDrop();  // Re-attach drag handlers
        });

    // Register for cleanup
    window.listenerRegistry.registerFirestore(unsubscribe, 'Kanban Realtime Listener');
}
```

**Why Realtime?**
- Multi-user support: Changes from other users appear instantly
- Auto-refresh when vehicle moves between steps
- No manual refresh needed

---

### 5. Render Kanban Board

**File:** `kanban.html`
**Lines:** ~2100+

```javascript
function renderKanbanBoard(serviceTyp) {
    const processDefinition = processDefinitions[serviceTyp];
    if (!processDefinition) {
        console.error('Unknown service type:', serviceTyp);
        return;
    }

    // Clear board
    const boardContainer = document.getElementById('kanban-board');
    boardContainer.innerHTML = '';

    // Render columns
    processDefinition.steps.forEach(step => {
        const column = document.createElement('div');
        column.className = 'kanban-column';
        column.innerHTML = `
            <div class="kanban-column-header" style="background: ${step.color}">
                <span class="step-icon">${step.icon}</span>
                <span class="step-label">${step.label}</span>
                <span class="step-count">0</span>
            </div>
            <div class="kanban-cards" data-step="${step.id}"></div>
        `;
        boardContainer.appendChild(column);
    });

    console.log(`✅ Kanban Board rendered for: ${processDefinition.name}`);
}
```

---

## 🔄 Data Flow

### Complete Workflow

```
1. User opens kanban.html
        ↓
2. Select Service-Typ (dropdown)
        ↓
3. renderKanbanBoard(serviceTyp)
        ↓
4. Load vehicles from Firestore
   const fahrzeuge = window.getCollection('fahrzeuge');
   const snapshot = await fahrzeuge.where('serviceTyp', '==', serviceTyp).get();
        ↓
5. Place vehicles in columns based on processStep
        ↓
6. Setup Drag & Drop handlers
        ↓
7. Setup Realtime Listener
        ↓
8. User drags card to new column
        ↓
9. dropHandler() → updateVehicleStep()
        ↓
10. Firestore update triggers onSnapshot()
        ↓
11. updateVehicleOnBoard() moves card visually
```

---

## 🧪 Testing Guide

### Test Case 1: Load Kanban Board

**SCHRITT 4.1 (Manual Testing):**

1. Navigate to `kanban.html`
2. **Expected Console Logs:**
```
✅ werkstattId set early: mosbach
🔥 Firebase initialized for Kanban
🔐 [KANBAN] Prüfe Auth State für Multi-Tenant...
✅ [KANBAN] Auth State: werkstatt (mosbach)
🏢 getCollectionName [window]: fahrzeuge → fahrzeuge_mosbach
✅ Kanban Board rendered for: 🚗 Reifen-Service
```

3. Select **Service-Typ: Reifen**
4. **Expected:** 7 columns rendered (Eingegangen → Terminiert → Bestellung → Angekommen → Montage → Wuchten → Fertig)
5. Vehicle cards appear in correct columns based on `processStep`

---

### Test Case 2: Drag & Drop

**SCHRITT 4.2:**

1. Drag vehicle card from "Eingegangen" to "Bestellung"
2. **Expected Console:**
```
📡 Realtime update: 1 changes
✅ Fahrzeug 1730987654321 → Step: bestellung
```

3. Card moves visually to new column
4. **Verify Firestore:**
   - Open Firebase Console
   - Check `fahrzeuge_mosbach` collection
   - Document should have `processStep: 'bestellung'`

---

### Test Case 3: Realtime Updates (Multi-Tab)

**SCHRITT 4.3:**

1. Open `kanban.html` in **two browser tabs**
2. In Tab 1: Drag vehicle from "Bestellung" → "Montage"
3. **Expected in Tab 2:**
   - Console: `📡 Realtime update: 1 changes`
   - Vehicle card **automatically moves** to "Montage" column
   - No manual refresh needed!

---

## 📊 Firestore Data Structure

### Vehicle Document (with processStep)

```javascript
{
    id: "1730987654321",
    kennzeichen: "HD-AB 123",
    kunde: { name: "Max Mustermann" },
    serviceTyp: "reifen",       // ← Determines which processDefinition to use
    processStep: "montage",     // ← Current step in workflow
    status: "in-arbeit",        // ← Legacy field (may be deprecated)
    notizen: "Winterreifen montieren",
    createdAt: 1730987654321,
    lastModified: 1730987654321,
    werkstattId: "mosbach"
}
```

**Key Fields:**
- `serviceTyp`: Maps to processDefinitions key (`reifen`, `mechanik`, etc.)
- `processStep`: Current step ID (`neu`, `bestellung`, `montage`, etc.)
- `lastModified`: Timestamp for change tracking

---

## ⚠️ Common Errors

### Error 1: Unknown service type

**Symptom:**
```
Unknown service type: lackierung
```

**Cause:** Service-Typ name mismatch

**Fix:**
```javascript
// ✅ CORRECT - processDefinitions key
serviceTyp: 'lackier'  // NOT 'lackierung'!

// Check processDefinitions keys
Object.keys(processDefinitions);
// ['alle', 'lackier', 'reifen', 'mechanik', 'pflege', 'tuev', 'versicherung', 'dellen', 'klima', 'glas']
```

---

### Error 2: Vehicles don't move on drag

**Symptom:** Drag works, but card doesn't move to new column

**Cause:** Realtime listener not set up

**Debug:**
```javascript
// Check listener registry
console.log(window.listenerRegistry);
// Should show 'Kanban Realtime Listener'
```

**Fix:** Ensure `setupRealtimeListener()` is called after board renders

---

### Error 3: Duplicate cards after realtime update

**Symptom:** Same vehicle appears in multiple columns

**Cause:** Not removing old card before adding new

**Fix:**
```javascript
function updateVehicleOnBoard(doc) {
    // ✅ CORRECT - Remove old card first
    const oldCard = document.querySelector(`[data-id="${doc.id}"]`);
    if (oldCard) {
        oldCard.remove();
    }

    // Then add to new column
    addVehicleToColumn(doc);
}
```

---

## 🔗 Related References

- [REFERENCE_SERVICE_FIELDS.md](REFERENCE_SERVICE_FIELDS.md) - Service-spezifische Felder
- [REFERENCE_MULTI_TENANT.md](REFERENCE_MULTI_TENANT.md) - getCollection() usage
- [REFERENCE_VEHICLE_INTAKE.md](REFERENCE_VEHICLE_INTAKE.md) - Creating vehicles
- [REFERENCE_FIREBASE_INIT.md](REFERENCE_FIREBASE_INIT.md) - Firebase init pattern
- [CODEBASE_INDEX.md](CODEBASE_INDEX.md) - Master Index

---

_Created: 2025-10-31 during Manual Test Session_
_Last Updated: 2025-10-31_
