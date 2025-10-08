#!/bin/bash
# ====================================================================
# CHROME DEBUG SCRIPT - Remote Debugging für MCP Server
# ====================================================================
#
# Startet Chrome mit Remote Debugging auf Port 9222
# Ermöglicht Chrome DevTools MCP Server Zugriff
#
# Usage:
#   ./chrome-debug.sh                    # Startet lokalen Server + Chrome
#   ./chrome-debug.sh [URL]              # Öffnet spezifische URL
#
# ====================================================================

# Farben für Output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  Chrome DevTools Remote Debugging - Fahrzeugannahme-App${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Chrome-Pfad (macOS)
CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Prüfe ob Chrome installiert ist
if [ ! -f "$CHROME_PATH" ]; then
    echo -e "${YELLOW}⚠️  Google Chrome nicht gefunden unter: $CHROME_PATH${NC}"
    echo ""
    echo "Bitte installiere Google Chrome oder passe CHROME_PATH an."
    exit 1
fi

# Standard-URL (lokaler Server)
DEFAULT_URL="http://localhost:8000/kalender.html"
URL="${1:-$DEFAULT_URL}"

# User Data Directory (temporär, damit normaler Chrome weiterlaufen kann)
USER_DATA_DIR="/tmp/chrome-debug-profile"

# Remote Debugging Port
DEBUG_PORT=9222

echo -e "${GREEN}✅ Chrome gefunden${NC}"
echo -e "${BLUE}📂 User Data Dir: $USER_DATA_DIR${NC}"
echo -e "${BLUE}🔌 Debug Port:    $DEBUG_PORT${NC}"
echo -e "${BLUE}🌐 URL:           $URL${NC}"
echo ""

# Prüfe ob lokaler Server läuft (wenn localhost URL)
if [[ "$URL" == *"localhost"* ]]; then
    if ! nc -z localhost 8000 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Lokaler Server läuft nicht!${NC}"
        echo ""
        echo "Starte Server in separatem Terminal:"
        echo -e "${BLUE}cd \"$PWD\" && python3 -m http.server 8000${NC}"
        echo ""
        echo "Oder drücke Enter um fortzufahren..."
        read
    else
        echo -e "${GREEN}✅ Lokaler Server läuft auf Port 8000${NC}"
        echo ""
    fi
fi

# Alte Chrome-Instanzen mit Debug-Port killen
EXISTING_PID=$(lsof -ti:$DEBUG_PORT 2>/dev/null)
if [ ! -z "$EXISTING_PID" ]; then
    echo -e "${YELLOW}⚠️  Chrome läuft bereits mit Debug-Port $DEBUG_PORT (PID: $EXISTING_PID)${NC}"
    echo "Beende alte Instanz..."
    kill -9 $EXISTING_PID 2>/dev/null
    sleep 1
    echo -e "${GREEN}✅ Alte Instanz beendet${NC}"
    echo ""
fi

# User Data Directory aufräumen (optional)
# rm -rf "$USER_DATA_DIR" 2>/dev/null

echo -e "${GREEN}🚀 Starte Chrome mit Remote Debugging...${NC}"
echo ""
echo -e "${BLUE}DevTools Protocol läuft auf: http://localhost:$DEBUG_PORT${NC}"
echo -e "${BLUE}Inspect-UI:                  http://localhost:$DEBUG_PORT/json${NC}"
echo ""
echo -e "${YELLOW}WICHTIG: Schließe NICHT dieses Terminal-Fenster!${NC}"
echo -e "${YELLOW}         Chrome wird sonst beendet.${NC}"
echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo ""

# Chrome starten mit Remote Debugging
"$CHROME_PATH" \
  --remote-debugging-port=$DEBUG_PORT \
  --user-data-dir="$USER_DATA_DIR" \
  --no-first-run \
  --no-default-browser-check \
  --disable-blink-features=AutomationControlled \
  "$URL" \
  2>&1 | grep -v "DevTools listening"

# Cleanup nach Beendigung
echo ""
echo -e "${GREEN}✅ Chrome beendet${NC}"
echo -e "${BLUE}Cleanup User Data Directory...${NC}"
# rm -rf "$USER_DATA_DIR" 2>/dev/null
echo -e "${GREEN}✅ Fertig!${NC}"
