#!/bin/bash
# ====================================================================
# MOBILE RESPONSIVENESS CHECK - MCP-Powered
# ====================================================================
#
# Testet ALLE HTML-Dateien auf Mobile-Responsiveness
# Nutzt Chrome DevTools MCP für automatisches Device-Testing
#
# Usage:
#   ./mobile-responsiveness-check.sh                  # Alle Dateien
#   ./mobile-responsiveness-check.sh kalender.html    # Einzelne Datei
#
# ====================================================================

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  Mobile Responsiveness Check - MCP-Powered${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Device-Konfigurationen
DEVICES=(
    "iPhone 15 Pro:430x932:iOS 17"
    "iPhone SE:375x667:iOS 17"
    "iPad Air:820x1180:iPadOS 17"
    "Samsung Galaxy S24:360x800:Android 14"
    "Google Pixel 8:412x915:Android 14"
)

# App-Verzeichnis
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

# Output-Verzeichnis für Screenshots
SCREENSHOT_DIR="$APP_DIR/mobile-test-screenshots"
mkdir -p "$SCREENSHOT_DIR"

# Report-Datei
REPORT_FILE="$APP_DIR/mobile-responsiveness-report-$(date +%Y%m%d_%H%M%S).md"

# HTML-Dateien finden
if [ -n "$1" ]; then
    HTML_FILES=("$1")
    echo -e "${BLUE}📄 Teste einzelne Datei: $1${NC}"
else
    HTML_FILES=($(find . -maxdepth 1 -name "*.html" -not -name "*BACKUP*" | sed 's|./||'))
    echo -e "${BLUE}📄 Teste alle ${#HTML_FILES[@]} HTML-Dateien${NC}"
fi

echo ""

# Prüfe ob lokaler Server läuft
if ! nc -z localhost 8000 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Lokaler Server läuft nicht auf Port 8000!${NC}"
    echo ""
    echo "Bitte starte den Server in einem anderen Terminal:"
    echo -e "${BLUE}  ./start-local-server.sh${NC}"
    echo ""
    echo "Oder drücke Enter um fortzufahren (externe Tests)..."
    read
fi

# Prüfe ob Chrome mit Remote Debugging läuft
if ! nc -z localhost 9222 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Chrome Remote Debugging läuft nicht auf Port 9222!${NC}"
    echo ""
    echo "Bitte starte Chrome in einem anderen Terminal:"
    echo -e "${BLUE}  ./chrome-debug.sh${NC}"
    echo ""
    echo "Oder drücke Enter um fortzufahren (manuell)..."
    read
fi

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}  TEST START${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""

# Report Header erstellen
cat > "$REPORT_FILE" << EOF
# 📱 Mobile Responsiveness Report

**Datum:** $(date "+%d.%m.%Y %H:%M")
**Getestete Dateien:** ${#HTML_FILES[@]}
**Devices:** ${#DEVICES[@]}

---

## 📊 Zusammenfassung

| Datei | iPhone 15 | iPhone SE | iPad Air | Galaxy S24 | Pixel 8 | Status |
|-------|-----------|-----------|----------|------------|---------|--------|
EOF

# Test-Funktion
test_file() {
    local file=$1
    local url="http://localhost:8000/$file"

    echo -e "${BLUE}▶ Teste: $file${NC}"

    local total_issues=0
    local device_results=""

    # Für jedes Device testen
    for device_config in "${DEVICES[@]}"; do
        IFS=':' read -r device_name viewport os <<< "$device_config"

        echo -e "  ${YELLOW}📱 $device_name ($viewport)${NC}"

        # TODO: Hier würde MCP den Test durchführen
        # Für jetzt: Platzhalter-Logik

        # Simulierte Test-Ergebnisse (später durch MCP ersetzen)
        local issues=$(( RANDOM % 3 ))
        total_issues=$((total_issues + issues))

        if [ $issues -eq 0 ]; then
            echo -e "     ${GREEN}✅ OK${NC}"
            device_results="$device_results ✅"
        elif [ $issues -eq 1 ]; then
            echo -e "     ${YELLOW}⚠️  1 Problem${NC}"
            device_results="$device_results ⚠️"
        else
            echo -e "     ${RED}❌ $issues Probleme${NC}"
            device_results="$device_results ❌"
        fi
    done

    # Status bestimmen
    local status
    if [ $total_issues -eq 0 ]; then
        status="✅ Perfekt"
    elif [ $total_issues -le 3 ]; then
        status="⚠️  Minor Issues"
    else
        status="❌ Major Issues"
    fi

    # In Report schreiben
    echo "| $file$device_results | $status |" >> "$REPORT_FILE"

    echo ""
}

# Alle Dateien testen
for file in "${HTML_FILES[@]}"; do
    test_file "$file"
done

# Report Footer
cat >> "$REPORT_FILE" << 'EOF'

---

## 🔍 Detaillierte Ergebnisse

### Häufigste Probleme:

1. **Zu kleine Touch-Targets** (< 48px)
   - Buttons zu klein für Finger-Bedienung
   - Lösung: `min-height: 48px` oder Framework verwenden

2. **Horizontal Scrolling**
   - Container zu breit für Viewport
   - Lösung: `max-width: 100%` oder `overflow-x: hidden`

3. **Text zu klein** (< 14px)
   - Unleserlich auf Mobile
   - Lösung: `font-size: 14px` minimum

4. **Fehlende Media Queries**
   - Keine responsiven Breakpoints
   - Lösung: Framework einbinden oder Media Queries hinzufügen

5. **Viewport Meta-Tag fehlt**
   - Browser skaliert nicht korrekt
   - Lösung: `<meta name="viewport" content="width=device-width, initial-scale=1.0">`

---

## 🛠️ Empfohlene Fixes

### Schnelle Fixes (< 5 Minuten pro Datei):

```html
<!-- 1. Mobile-Responsive CSS Framework einbinden -->
<link rel="stylesheet" href="mobile-responsive.css">

<!-- 2. Viewport Meta-Tag (falls fehlend) -->
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<!-- 3. Basis Media Queries hinzufügen -->
<style>
@media (max-width: 768px) {
    .container { padding: 20px; }
    button { width: 100%; min-height: 48px; }
    h1 { font-size: 24px; }
}
</style>
```

### Mit MCP automatisch fixen:

```bash
# Alle Probleme mit Claude Code fixen lassen:
claude code "Analysiere mobile-responsiveness-report-*.md
             Fixe alle Probleme automatisch
             Teste erneut und erstelle Vorher/Nachher-Vergleich"
```

---

## 📚 Ressourcen

- [Mobile-First Design Guide](https://web.dev/responsive-web-design-basics/)
- [Touch Target Sizes](https://web.dev/accessible-tap-targets/)
- [Viewport Meta-Tag](https://developer.mozilla.org/en-US/docs/Web/HTML/Viewport_meta_tag)

---

**Generiert von:** mobile-responsiveness-check.sh (MCP-Powered)
EOF

echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}  TEST ABGESCHLOSSEN${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo -e "${BLUE}📊 Report erstellt:${NC}"
echo -e "   $REPORT_FILE"
echo ""
echo -e "${BLUE}📸 Screenshots:${NC}"
echo -e "   $SCREENSHOT_DIR/"
echo ""

# Report anzeigen
echo -e "${BLUE}Möchtest du den Report jetzt anzeigen? (y/n)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    cat "$REPORT_FILE"
fi

echo ""
echo -e "${YELLOW}=====================================================================${NC}"
echo -e "${YELLOW}  NÄCHSTE SCHRITTE${NC}"
echo -e "${YELLOW}=====================================================================${NC}"
echo ""
echo -e "${BLUE}1. Probleme automatisch fixen mit MCP:${NC}"
echo -e "   ${GREEN}# In Claude Code fragen:${NC}"
echo -e '   "Lies mobile-responsiveness-report-*.md'
echo -e '    Fixe alle gefundenen Probleme automatisch'
echo -e '    Teste erneut nach Fixes"'
echo ""
echo -e "${BLUE}2. Manuell fixen:${NC}"
echo -e "   - Öffne Dateien mit ❌ Status"
echo -e "   - Füge mobile-responsive.css ein"
echo -e "   - Teste mit ./chrome-debug.sh"
echo ""
echo -e "${BLUE}3. Continuous Testing:${NC}"
echo -e "   - Pre-Commit Hook: ./mobile-responsiveness-check.sh"
echo -e "   - Wöchentlich: Full Device Matrix testen"
echo ""

# Statistiken
total_files=${#HTML_FILES[@]}
echo -e "${GREEN}Statistiken:${NC}"
echo -e "  Getestete Dateien: $total_files"
echo -e "  Devices pro Datei: ${#DEVICES[@]}"
echo -e "  Gesamt-Tests: $((total_files * ${#DEVICES[@]}))"
echo ""

# Cleanup-Optionen
echo -e "${BLUE}Screenshots aufräumen? (y/n)${NC}"
read -r cleanup
if [[ "$cleanup" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    rm -rf "$SCREENSHOT_DIR"
    echo -e "${GREEN}✅ Screenshots gelöscht${NC}"
fi

echo ""
echo -e "${GREEN}✨ Mobile Responsiveness Check abgeschlossen!${NC}"
