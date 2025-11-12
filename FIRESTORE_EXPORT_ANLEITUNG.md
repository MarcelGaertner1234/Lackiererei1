# Firestore Export Anleitung

**Erstellt:** 2025-11-12
**Zweck:** Vollständiges Firestore-Backup vor Multi-Service Feature Implementation

---

## 🎯 Warum dieser Export?

Vor der Multi-Service Feature Implementierung erstellen wir ein vollständiges Firestore-Backup, um im Fehlerfall alle Daten wiederherstellen zu können.

**Backup-Komponenten:**
1. ✅ **Git Backup:** Tag `v3.4.0-backup-vor-multi-service` (COMPLETED)
2. ✅ **Local Code Backup:** ZIP-Archiv 2.1MB (COMPLETED)
3. ⏳ **Firestore Data Backup:** Dieser Export (PENDING)

---

## 📋 Schritt-für-Schritt Anleitung

### Option 1: Firebase Console (Empfohlen - GUI)

**Schritt 1: Firebase Console öffnen**
```
https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore/data
```

**Schritt 2: Export starten**
1. Klicke oben auf den Tab "**Data**" (sollte bereits ausgewählt sein)
2. Klicke auf das **3-Punkte-Menü** (⋮) rechts oben
3. Wähle "**Import/Export**"
4. Klicke auf "**Export all collections**" (oder wähle spezifische Collections)

**Schritt 3: Export-Einstellungen**
- **Cloud Storage Bucket:** `auto-lackierzentrum-mosbach.appspot.com`
- **Export Path:** `backups/2025-11-12-vor-multi-service/`
- **Collections:** ALLE auswählen (Standard)

**Schritt 4: Export bestätigen**
- Klicke "**Export**"
- Warte ca. 1-2 Minuten (abhängig von Datenmenge)
- Du siehst eine Bestätigung wenn der Export abgeschlossen ist

**Schritt 5: Export verifizieren**
1. Gehe zu Firebase Storage:
   ```
   https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/storage
   ```
2. Navigiere zu: `backups/2025-11-12-vor-multi-service/`
3. Sollte folgende Dateien enthalten:
   - `all_namespaces/` Ordner
   - `all_namespaces/kind_{CollectionName}/` für jede Collection
   - `.export_metadata` Datei

---

### Option 2: Firebase CLI (Für Automatisierung)

**Voraussetzung:**
```bash
firebase login  # Muss als Admin eingeloggt sein
```

**Export Befehl:**
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

firebase firestore:export \
  gs://auto-lackierzentrum-mosbach.appspot.com/backups/2025-11-12-vor-multi-service \
  --project auto-lackierzentrum-mosbach
```

**Erwartete Ausgabe:**
```
✔ Firestore export started successfully
Export operation: projects/.../operations/ASA...
```

**Export Status prüfen:**
```bash
firebase firestore:operations:list --project auto-lackierzentrum-mosbach
```

---

## 📦 Was wird exportiert?

**Alle Collections für Werkstatt Mosbach:**

| Collection | Beschreibung | Ungefähre Größe |
|------------|--------------|-----------------|
| `fahrzeuge_mosbach` | Alle Fahrzeug-Aufträge | ~100-500 Dokumente |
| `mitarbeiter_mosbach` | Mitarbeiter-Stammdaten | ~5-20 Dokumente |
| `kunden_mosbach` | Kunden-Stammdaten | ~50-200 Dokumente |
| `dienstplan_mosbach` | Schichtpläne | ~30-100 Dokumente |
| `zeiterfassung_mosbach` | Zeiterfassungs-Daten | ~100-500 Dokumente |
| `urlaub_mosbach` | Urlaubsanträge | ~10-50 Dokumente |
| `guidelines_mosbach` | Wissensdatenbank Guidelines | ~5-20 Dokumente |
| `announcements_mosbach` | Ankündigungen | ~5-20 Dokumente |
| `shift_handovers_mosbach` | Schichtübergaben | ~10-50 Dokumente |
| `categories_mosbach` | Kategorien | ~3-10 Dokumente |
| `rechnungen_mosbach` | Rechnungen | ~50-200 Dokumente |
| `ersatzteile_mosbach` | Ersatzteil-Datenbank | ~100-500 Dokumente |
| `material_requests_mosbach` | Material-Anfragen | ~20-100 Dokumente |

**Partner-Portal Collections:**
- `service_requests_{partner_id}` (alle 12 Service-Typen)
- `kva_quotes_{partner_id}`

---

## 🔄 Wiederherstellung (Falls nötig)

**Im Fehlerfall (Multi-Service Implementation schief gelaufen):**

### Schritt 1: Code zurücksetzen
```bash
cd "Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

# Option A: Zum Backup-Tag zurück
git checkout v3.4.0-backup-vor-multi-service

# Option B: Lokales ZIP entpacken
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/"
unzip "Fahrzeugannahme_App_BACKUP_2025-11-12_vor-multi-service.zip" -d "Fahrzeugannahme_App_RESTORED"
```

### Schritt 2: Firestore wiederherstellen

**Firebase Console:**
1. Gehe zu: https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore/data
2. Klicke "Import/Export" → "Import from Cloud Storage"
3. Wähle Bucket: `auto-lackierzentrum-mosbach.appspot.com`
4. Path: `backups/2025-11-12-vor-multi-service/all_namespaces/`
5. Klicke "Import"

**Firebase CLI:**
```bash
firebase firestore:import \
  gs://auto-lackierzentrum-mosbach.appspot.com/backups/2025-11-12-vor-multi-service \
  --project auto-lackierzentrum-mosbach
```

⚠️ **WARNUNG:** Import ÜBERSCHREIBT existierende Daten!

---

## ✅ Backup Checklist

- [x] **Git Backup:** Tag `v3.4.0-backup-vor-multi-service` erstellt & gepusht
- [x] **Local Code Backup:** ZIP-Archiv `Fahrzeugannahme_App_BACKUP_2025-11-12_vor-multi-service.zip` (2.1MB)
- [ ] **Firestore Export:** Export in `backups/2025-11-12-vor-multi-service/` (PENDING)

**Erst wenn ALLE 3 Checkboxen ✅ sind, mit Multi-Service Implementation beginnen!**

---

## 📞 Hilfe & Troubleshooting

**Problem:** "Insufficient permissions for export"
- **Lösung:** Du musst als Owner/Editor im Firebase-Projekt eingeloggt sein

**Problem:** "Cloud Storage bucket not found"
- **Lösung:** Gehe zu Firebase Storage und erstelle den `backups/` Ordner manuell

**Problem:** "Export takes too long"
- **Lösung:** Normal bei großen Datenmengen (>10,000 Dokumente). Warte ab.

**Problem:** "Import failed - version mismatch"
- **Lösung:** Stelle sicher, dass du den richtigen Export-Path verwendest

---

## 🔗 Nützliche Links

- **Firebase Console Firestore:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/firestore/data
- **Firebase Console Storage:** https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/storage
- **Firebase CLI Docs:** https://firebase.google.com/docs/firestore/manage-data/export-import
- **GitHub Repository:** https://github.com/MarcelGaertner1234/Lackiererei1

---

_Erstellt: 2025-11-12_
_Status: Firestore Export PENDING - User muss diesen manuell ausführen_
_Nach Export: Tests ausführen (`npm run test:all`), dann Phase 1 starten_
