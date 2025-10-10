#!/bin/bash

# ====================================================================
# FIREBASE CLI INSTALLATION + DEPLOYMENT (ALLES IN EINEM)
# ====================================================================
#
# Dieses Script:
# 1. Installiert Firebase CLI (falls nicht vorhanden)
# 2. Führt Firebase Login aus
# 3. Deployed Storage Rules
#
# VERWENDUNG:
# chmod +x install-and-deploy.sh
# ./install-and-deploy.sh
#
# ====================================================================

echo ""
echo "🚀 Firebase Setup + Deployment"
echo "==============================="
echo ""

# Ins richtige Verzeichnis wechseln
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "📁 Arbeitsverzeichnis: $SCRIPT_DIR"
echo ""

# Prüfen ob Firebase CLI installiert ist
echo "🔍 Prüfe Firebase CLI..."
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI nicht gefunden"
    echo ""
    echo "🔧 Installiere Firebase CLI..."
    echo "   (Dies kann 1-2 Minuten dauern)"
    echo ""

    # Firebase CLI installieren
    npm install -g firebase-tools

    if [ $? -eq 0 ]; then
        echo ""
        echo "✅ Firebase CLI erfolgreich installiert!"
        echo ""
    else
        echo ""
        echo "❌ Installation fehlgeschlagen!"
        echo ""
        echo "Bitte installieren Sie manuell:"
        echo "  npm install -g firebase-tools"
        echo ""
        exit 1
    fi
else
    echo "✅ Firebase CLI bereits installiert: $(firebase --version)"
    echo ""
fi

# Firebase Login
echo "🔐 Firebase Login..."
echo ""
echo "Ein Browser-Fenster öffnet sich gleich."
echo "Bitte melden Sie sich mit Ihrem Google-Account an."
echo ""
read -p "Drücken Sie Enter um fortzufahren..."

firebase login

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Login fehlgeschlagen!"
    exit 1
fi

echo ""
echo "✅ Login erfolgreich!"
echo ""

# Storage Rules deployen
echo "🚀 Deploye Storage Rules..."
echo ""

firebase deploy --only storage

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║                                                                ║"
    echo "║  ✅ ✅ ✅  DEPLOYMENT ERFOLGREICH!  ✅ ✅ ✅                   ║"
    echo "║                                                                ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📝 Testen Sie jetzt die Multi-Service Anfrage:"
    echo "   https://marcelgaertner1234.github.io/Lackiererei1/partner-app/multi-service-anfrage.html"
    echo ""
    echo "✅ CORS-Fehler sollten jetzt behoben sein!"
    echo ""
else
    echo ""
    echo "❌ Deployment fehlgeschlagen!"
    echo ""
    exit 1
fi
