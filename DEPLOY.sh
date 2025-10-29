#!/bin/bash

###############################################################################
# DEPLOYMENT SCRIPT - Phase 3.2 Benachrichtigungen
###############################################################################
#
# Dieses Script deployed Firestore Rules + Cloud Functions zu Firebase Production
#
# WICHTIG: Vor dem Ausführen musst du dich einmalig einloggen:
#   firebase login
#
# Dann einfach ausführen:
#   chmod +x DEPLOY.sh
#   ./DEPLOY.sh
#
###############################################################################

set -e  # Exit on error

echo "🚀 Starting Firebase Deployment..."
echo ""

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null
then
    echo "❌ Firebase CLI ist nicht installiert!"
    echo "   Installation: npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in
if ! firebase projects:list &> /dev/null
then
    echo "❌ Du bist nicht eingeloggt!"
    echo "   Bitte erst ausführen: firebase login"
    exit 1
fi

echo "✅ Firebase CLI gefunden"
echo "✅ User ist eingeloggt"
echo ""

# Step 1: Deploy Firestore Rules
echo "📋 Step 1/2: Deploying Firestore Rules..."
firebase deploy --only firestore:rules --project auto-lackierzentrum-mosbach

if [ $? -eq 0 ]; then
    echo "✅ Firestore Rules deployed successfully"
else
    echo "❌ Firestore Rules deployment failed"
    exit 1
fi

echo ""

# Step 2: Deploy Cloud Functions
echo "☁️ Step 2/2: Deploying Cloud Functions..."
firebase deploy --only functions --project auto-lackierzentrum-mosbach

if [ $? -eq 0 ]; then
    echo "✅ Cloud Functions deployed successfully"
else
    echo "❌ Cloud Functions deployment failed"
    exit 1
fi

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo ""
echo "Deployed:"
echo "  ✅ Firestore Rules (globalChat + mitarbeiterNotifications)"
echo "  ✅ Cloud Functions:"
echo "     - createMitarbeiterNotifications (onCreate trigger)"
echo "     - fahrzeugStatusChanged (onUpdate trigger)"
echo "     - materialOrderOverdue (daily at 9 AM)"
echo ""
echo "Next Steps:"
echo "  1. Öffne die App und logge dich als Mitarbeiter ein"
echo "  2. Der Permission Error sollte verschwunden sein"
echo "  3. Erstelle ein Test-Fahrzeug → Mitarbeiter sollten Benachrichtigungen erhalten"
echo ""
