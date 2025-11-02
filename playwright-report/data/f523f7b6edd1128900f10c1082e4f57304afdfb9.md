# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e4]:
        - button "Zurück" [ref=e5] [cursor=pointer]
        - generic [ref=e6]:
          - heading "Admin-Einstellungen" [level=1] [ref=e7]
          - paragraph [ref=e8]: Werkstatt-Profil, Benachrichtigungen, System-Konfiguration
      - generic [ref=e9]:
        - button "Neu laden" [ref=e10] [cursor=pointer]
        - button "Speichern" [ref=e11] [cursor=pointer]: Speichern
    - generic [ref=e13]:
      - button "Werkstatt-Profil" [ref=e14] [cursor=pointer]: Werkstatt-Profil
      - button "Benachrichtigungen" [ref=e15] [cursor=pointer]: Benachrichtigungen
      - button "Standard-Werte" [ref=e16] [cursor=pointer]: Standard-Werte
      - button "E-Mail-Vorlagen" [ref=e17] [cursor=pointer]: E-Mail-Vorlagen
      - button "System-Config" [ref=e18] [cursor=pointer]: System-Config
      - button "Backup & Export" [ref=e19] [cursor=pointer]: Backup & Export
      - button "Datenbank-Wartung" [ref=e20] [cursor=pointer]: Datenbank-Wartung
    - generic [ref=e22]:
      - heading "Backup & Export" [level=2] [ref=e23]: Backup & Export
      - paragraph [ref=e24]: Exportieren Sie Ihre Daten als Backup oder für externe Analysen.
      - generic [ref=e26]:
        - strong [ref=e27]: "Wichtig:"
        - text: Backups enthalten alle Werkstatt-Daten inkl. Fahrzeuge, Kunden, Mitarbeiter und Einstellungen.
      - generic [ref=e28]:
        - heading "Schnell-Export" [level=3] [ref=e29]
        - generic [ref=e30]:
          - button "Komplett-Export (JSON)" [active] [ref=e31] [cursor=pointer]: Komplett-Export (JSON)
          - button "Fahrzeuge (CSV)" [ref=e32] [cursor=pointer]: Fahrzeuge (CSV)
          - button "Kunden (CSV)" [ref=e33] [cursor=pointer]: Kunden (CSV)
      - generic [ref=e36]: "✅ Export erfolgreich: backup_null_2025-10-31.json"
  - paragraph [ref=e37]: Running in emulator mode. Do not use with production credentials.
  - iframe [ref=e38]:
    
```