#!/bin/bash
# Add service-types.js script tag to HTML files

SCRIPT_TAG='    <script src="../js/service-types.js?v=bug7-normalization"></script>'
SCRIPT_TAG_ROOT='    <script src="js/service-types.js?v=bug7-normalization"></script>'

# Partner-app files (need ../ path)
PARTNER_FILES=(
    "partner-app/glas-anfrage.html"
    "partner-app/dellen-anfrage-simplified.html"
    "partner-app/folierung-anfrage.html"
    "partner-app/klima-anfrage-simplified.html"
    "partner-app/mechanik-anfrage.html"
    "partner-app/pflege-anfrage.html"
    "partner-app/reifen-anfrage.html"
    "partner-app/steinschutz-anfrage.html"
    "partner-app/tuev-anfrage.html"
    "partner-app/versicherung-anfrage.html"
    "partner-app/werbebeklebung-anfrage.html"
    "partner-app/glas-anfrage-simplified.html"
)

# Root files
ROOT_FILES=(
    "index.html"
    "annahme.html"
)

echo "Adding service-types.js script tag to files..."
echo ""

# Process partner files
for file in "${PARTNER_FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if already has the script
        if grep -q "service-types.js" "$file"; then
            echo "⏭️  SKIP: $file (already has script)"
        else
            # Add after <head> tag
            sed -i '' "/<head>/a\\
$SCRIPT_TAG
" "$file"
            echo "✅ ADDED: $file"
        fi
    else
        echo "❌ NOT FOUND: $file"
    fi
done

# Process root files
for file in "${ROOT_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q "service-types.js" "$file"; then
            echo "⏭️  SKIP: $file (already has script)"
        else
            sed -i '' "/<head>/a\\
$SCRIPT_TAG_ROOT
" "$file"
            echo "✅ ADDED: $file"
        fi
    else
        echo "❌ NOT FOUND: $file"
    fi
done

echo ""
echo "✅ Script tag addition complete!"
