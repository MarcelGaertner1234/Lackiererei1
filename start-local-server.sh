#!/bin/bash
# ====================================================================
# LOCAL SERVER SCRIPT - Python HTTP Server für Development
# ====================================================================
#
# Startet einen lokalen HTTP Server auf Port 8000
# Für lokales Testing der Fahrzeugannahme-App
#
# Usage:
#   ./start-local-server.sh              # Port 8000
#   ./start-local-server.sh 3000         # Eigener Port
#
# ====================================================================

# Farben
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

PORT="${1:-8000}"

echo -e "${BLUE}=====================================================================${NC}"
echo -e "${BLUE}  Lokaler HTTP Server - Fahrzeugannahme-App${NC}"
echo -e "${BLUE}=====================================================================${NC}"
echo ""

# Prüfe ob Port bereits belegt ist
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Port $PORT ist bereits belegt!${NC}"
    echo ""
    echo "Laufender Prozess:"
    lsof -i :$PORT | grep LISTEN
    echo ""
    echo "Möchtest du den Prozess beenden? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        PID=$(lsof -ti:$PORT)
        kill -9 $PID
        echo -e "${GREEN}✅ Prozess beendet${NC}"
        echo ""
    else
        echo "Abgebrochen. Bitte wähle einen anderen Port."
        exit 1
    fi
fi

# Wechsel ins App-Verzeichnis
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

echo -e "${GREEN}✅ Server startet...${NC}"
echo ""
echo -e "${BLUE}📂 Verzeichnis: $APP_DIR${NC}"
echo -e "${BLUE}🌐 Port:        $PORT${NC}"
echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo -e "${GREEN}  Server läuft!${NC}"
echo -e "${GREEN}=====================================================================${NC}"
echo ""
echo -e "${BLUE}URLs:${NC}"
echo -e "  ${BLUE}Landing:    http://localhost:$PORT/${NC}"
echo -e "  ${BLUE}Annahme:    http://localhost:$PORT/annahme.html${NC}"
echo -e "  ${BLUE}Abnahme:    http://localhost:$PORT/abnahme.html${NC}"
echo -e "  ${BLUE}Liste:      http://localhost:$PORT/liste.html${NC}"
echo -e "  ${BLUE}Kanban:     http://localhost:$PORT/kanban.html${NC}"
echo -e "  ${BLUE}Kunden:     http://localhost:$PORT/kunden.html${NC}"
echo -e "  ${BLUE}Kalender:   http://localhost:$PORT/kalender.html${NC}"
echo ""
echo -e "${YELLOW}Drücke Ctrl+C zum Beenden${NC}"
echo ""
echo -e "${GREEN}=====================================================================${NC}"
echo ""

# Server starten
python3 -m http.server $PORT
