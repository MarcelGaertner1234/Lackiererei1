#!/bin/bash

# Firebase Functions Deployment Script
# Dieses Script löst Firebase CLI Authentication-Probleme

echo "🚀 Firebase Functions Deployment Script"
echo "========================================"
echo ""

# Schritt 1: Zum richtigen Verzeichnis wechseln
cd "/Users/marcelgaertner/Desktop/Chritstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App"

echo "✅ Verzeichnis: $(pwd)"
echo ""

# Schritt 2: Firebase Login Status prüfen
echo "🔐 Prüfe Firebase Login Status..."
if firebase projects:list > /dev/null 2>&1; then
    echo "✅ Sie sind bereits eingeloggt!"
else
    echo "❌ Nicht eingeloggt. Starte Login..."
    echo ""
    echo "📋 Ein Browser-Fenster wird sich öffnen."
    echo "   Bitte melden Sie sich mit Ihrem Google-Account an."
    echo ""
    firebase login --reauth

    # Warte auf Bestätigung
    echo ""
    read -p "✅ Login erfolgreich? (j/n): " login_success
    if [ "$login_success" != "j" ]; then
        echo "❌ Abgebrochen."
        exit 1
    fi
fi

echo ""
echo "🎯 Deploye Cloud Functions..."
echo ""

# Schritt 3: Functions deployen
firebase deploy --only functions

# Schritt 4: Status prüfen
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ ✅ ✅ DEPLOYMENT ERFOLGREICH! ✅ ✅ ✅"
    echo ""
    echo "📧 Email-System ist jetzt aktiv!"
    echo ""
    echo "3 Functions deployed:"
    echo "  1. onStatusChange (Firestore Trigger)"
    echo "  2. onNewPartnerAnfrage (Firestore Trigger)"
    echo "  3. onUserApproved (Firestore Trigger)"
    echo ""
    echo "🌐 Firebase Console:"
    echo "   https://console.firebase.google.com/project/auto-lackierzentrum-mosbach/functions"
else
    echo ""
    echo "❌ DEPLOYMENT FEHLGESCHLAGEN!"
    echo ""
    echo "Bitte Screenshot vom Fehler schicken an Claude."
    exit 1
fi
