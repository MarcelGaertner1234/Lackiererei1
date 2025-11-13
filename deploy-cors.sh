#!/bin/bash

# CORS Deployment Script für Firebase Storage
# Erstellt von Claude Code - 2025-11-13

echo "═══════════════════════════════════════════════════════════"
echo "  CORS-Konfiguration für Firebase Storage"
echo "  Auto-Lackierzentrum Mosbach"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Set PATH
export PATH="/Users/marcelgaertner/google-cloud-sdk/bin:$PATH"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ ERROR: Google Cloud SDK nicht gefunden!"
    echo "   Bitte installiere zuerst: brew install --cask google-cloud-sdk"
    exit 1
fi

echo "✅ Google Cloud SDK gefunden"
echo ""

# Check if already authenticated
AUTH_STATUS=$(gcloud auth list --format="value(account)" 2>/dev/null)
if [ -z "$AUTH_STATUS" ]; then
    echo "🔐 Keine Authentifizierung gefunden - starte Login..."
    echo ""
    echo "➡️  Ein Browser-Fenster öffnet sich jetzt."
    echo "➡️  Bitte melde dich an mit: gaertnerstoreangel@gmail.com"
    echo ""
    read -p "Drücke ENTER um fortzufahren..."

    gcloud auth login

    if [ $? -ne 0 ]; then
        echo ""
        echo "❌ Login fehlgeschlagen!"
        exit 1
    fi
else
    echo "✅ Bereits eingeloggt als: $AUTH_STATUS"
fi

echo ""
echo "🔧 Setze Firebase-Projekt..."
gcloud config set project auto-lackierzentrum-mosbach

echo ""
echo "📤 Deploye CORS-Konfiguration..."
echo "   Bucket: auto-lackierzentrum-mosbach.firebasestorage.app"
echo "   Origin: https://marcelgaertner1234.github.io"
echo ""

# Change to app directory
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

# Check if cors.json exists
if [ ! -f "cors.json" ]; then
    echo "❌ ERROR: cors.json nicht gefunden!"
    echo "   Pfad: $(pwd)/cors.json"
    exit 1
fi

echo "✅ cors.json gefunden: $(pwd)/cors.json"
echo ""

# Deploy CORS
gsutil cors set cors.json gs://auto-lackierzentrum-mosbach.firebasestorage.app

if [ $? -eq 0 ]; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo "  ✅ CORS ERFOLGREICH DEPLOYED!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "📋 Nächste Schritte:"
    echo "   1. Warte 5 Minuten (CORS-Propagierung)"
    echo "   2. Öffne Browser und mache Hard-Refresh (Cmd+Shift+R)"
    echo "   3. Gehe zu: https://marcelgaertner1234.github.io/Lackiererei1/annahme.html"
    echo "   4. Erstelle eine Fahrzeugannahme und generiere PDF"
    echo "   5. Logo sollte jetzt im PDF erscheinen!"
    echo ""
    echo "🔍 Verifiziere CORS-Konfiguration:"
    echo "   gsutil cors get gs://auto-lackierzentrum-mosbach.firebasestorage.app"
    echo ""
else
    echo ""
    echo "❌ CORS-Deployment fehlgeschlagen!"
    echo "   Bitte prüfe die Fehlermeldung oben."
    exit 1
fi

read -p "Drücke ENTER um zu beenden..."
