#!/bin/bash

# ====================================================================
# FIREBASE STORAGE RULES DEPLOYMENT SCRIPT
# ====================================================================
#
# Dieses Script deployed die storage.rules zu Firebase
#
# VERWENDUNG:
# chmod +x deploy-storage-rules.sh
# ./deploy-storage-rules.sh
#
# SICHERHEIT:
# - Verwendet Firebase CLI mit OAuth (keine API Keys)
# - User behält volle Kontrolle über Credentials
# - Browser-basierte Authentifizierung
#
# ====================================================================

echo ""
echo "🚀 Firebase Storage Rules Deployment"
echo "===================================="
echo ""

# Farben für bessere Lesbarkeit
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Prüfen ob firebase CLI installiert ist
echo -e "${BLUE}🔍 Prüfe Firebase CLI Installation...${NC}"
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}❌ Firebase CLI nicht installiert!${NC}"
    echo ""
    echo "Installation mit npm:"
    echo "  npm install -g firebase-tools"
    echo ""
    echo "Oder mit curl:"
    echo "  curl -sL https://firebase.tools | bash"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Firebase CLI gefunden: $(firebase --version)${NC}"
echo ""

# Ins richtige Verzeichnis wechseln
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}📁 Arbeitsverzeichnis: ${NC}$SCRIPT_DIR"
echo ""

# Prüfen ob storage.rules existiert
if [ ! -f "storage.rules" ]; then
    echo -e "${RED}❌ storage.rules Datei nicht gefunden!${NC}"
    echo ""
    echo "Erwarteter Pfad:"
    echo "  $SCRIPT_DIR/storage.rules"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ storage.rules gefunden${NC}"
echo ""

# Prüfen ob firebase.json existiert
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}❌ firebase.json nicht gefunden!${NC}"
    echo ""
    echo "Stellen Sie sicher, dass Sie im richtigen Verzeichnis sind."
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ firebase.json gefunden${NC}"
echo ""

# Firebase Login Status prüfen
echo -e "${BLUE}🔐 Prüfe Firebase Login-Status...${NC}"
if ! firebase projects:list &> /dev/null; then
    echo -e "${YELLOW}⚠️  Nicht eingeloggt. Starte Login-Prozess...${NC}"
    echo ""
    echo "Ein Browser-Fenster öffnet sich gleich."
    echo "Bitte melden Sie sich mit Ihrem Google-Account an."
    echo ""
    read -p "Drücken Sie Enter um fortzufahren..."

    firebase login

    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Login fehlgeschlagen!${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Firebase Login erfolgreich${NC}"
echo ""

# Aktuelles Firebase-Projekt anzeigen
echo -e "${BLUE}📋 Aktuelles Firebase-Projekt:${NC}"
firebase use
echo ""

# Sicherheitsabfrage vor Deployment
echo -e "${YELLOW}⚠️  ACHTUNG: Sie sind dabei, die Storage Rules zu deployen.${NC}"
echo ""
echo "Dies überschreibt die aktuellen Rules in Firebase!"
echo ""
read -p "Möchten Sie fortfahren? (j/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[JjYy]$ ]]; then
    echo -e "${YELLOW}Deployment abgebrochen.${NC}"
    exit 0
fi

echo ""

# Storage Rules deployen
echo -e "${BLUE}🚀 Deploye Storage Rules...${NC}"
echo ""

firebase deploy --only storage

DEPLOY_STATUS=$?

echo ""

if [ $DEPLOY_STATUS -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}║  ✅ ✅ ✅  DEPLOYMENT ERFOLGREICH!  ✅ ✅ ✅                   ║${NC}"
    echo -e "${GREEN}║                                                                ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}📝 Nächste Schritte:${NC}"
    echo ""
    echo "1. 🌐 Öffnen Sie:"
    echo "   https://marcelgaertner1234.github.io/Lackiererei1/partner-app/multi-service-anfrage.html"
    echo ""
    echo "2. 📝 Erstellen Sie eine Multi-Service Anfrage mit Fotos"
    echo ""
    echo "3. ✅ CORS-Fehler sollten verschwunden sein!"
    echo ""
    echo -e "${GREEN}Die neuen Storage Rules sind jetzt aktiv:${NC}"
    echo "  - progress-photos/**     (Produktionsfotos)"
    echo "  - fahrzeuge/**           (Annahme/Abnahme Fotos)"
    echo "  - partner-anfragen/**    (Multi-Service Anfragen) ← NEU!"
    echo ""
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}║  ❌ ❌ ❌  DEPLOYMENT FEHLGESCHLAGEN!  ❌ ❌ ❌               ║${NC}"
    echo -e "${RED}║                                                                ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${YELLOW}Prüfen Sie die Fehlermeldung oben.${NC}"
    echo ""
    echo "Häufige Ursachen:"
    echo "  - Keine Berechtigung für Firebase-Projekt"
    echo "  - Falsches Projekt ausgewählt"
    echo "  - Internetverbindung unterbrochen"
    echo ""
    echo "Hilfe:"
    echo "  firebase projects:list    (Alle Projekte anzeigen)"
    echo "  firebase use <projekt>    (Projekt wechseln)"
    echo ""
    exit 1
fi
