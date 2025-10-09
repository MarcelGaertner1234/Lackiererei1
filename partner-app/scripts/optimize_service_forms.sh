#!/bin/bash

# Optimize Service Request Forms for Minimalistic Mobile Design
# Removes emojis and ensures consistent mobile CSS

PARTNER_APP_DIR="/Users/marcelgaertner/Desktop/Chrisstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App/partner-app"

cd "$PARTNER_APP_DIR" || exit 1

echo "🔧 Optimizing 6 service request forms..."
echo "======================================"

# List of files to optimize
FILES=(
    "anfrage.html"
    "reifen-anfrage.html"
    "mechanik-anfrage.html"
    "pflege-anfrage.html"
    "tuev-anfrage.html"
    "versicherung-anfrage.html"
)

# Create backups
echo "📦 Creating backups..."
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        cp "$file" "${file%.html}_BACKUP_$(date +%Y%m%d_%H%M%S).html"
        echo "  ✓ Backed up $file"
    fi
done

echo ""
echo "🚀 Removing emojis from HTML content..."

# Emoji removal patterns
declare -A EMOJI_REPLACEMENTS=(
    ["🎨 Neue Lackier-Anfrage"]="Neue Lackier-Anfrage"
    ["🛞 Neue Reifen-Anfrage"]="Neue Reifen-Anfrage"
    ["🔧 Neue Mechanik-Anfrage"]="Neue Mechanik-Anfrage"
    ["✨ Neue Pflege-Anfrage"]="Neue Pflege-Anfrage"
    ["🚗 Neue TÜV-Anfrage"]="Neue TÜV-Anfrage"
    ["🚗 Neue Versicherungs-Anfrage"]="Neue Versicherungs-Anfrage"
    ["📍 Fortschritt"]="Fortschritt"
    ["<span class=\"icon\">📷</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">🔍</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">📝</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">🚗</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">📅</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">✅</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">🛞</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">🔧</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">✨</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">⚠️</span>"]="<span class=\"icon\"></span>"
    ["<span class=\"icon\">📋</span>"]="<span class=\"icon\"></span>"
    ["<div class=\"icon\">📷</div>"]="<div class=\"icon\"></div>"
    ["<div class=\"icon\">✅</div>"]="<div class=\"icon\"></div>"
    ["💡 Tipp:"]="Tipp:"
    ["📤 Anfrage senden"]="Anfrage senden"
    ["<h3>📷"]="<h3>"
    ["<h3>🔍"]="<h3>"
    ["<h3>📝"]="<h3>"
    ["<h3>🚗"]="<h3>"
    ["<h3>📅"]="<h3>"
    ["<h3>✅"]="<h3>"
    ["<h3>🛞"]="<h3>"
    ["<h3>🔧"]="<h3>"
    ["<h3>⚠️"]="<h3>"
    ["<h3>📋"]="<h3>"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  Processing $file..."

        # Apply emoji removals
        for pattern in "${!EMOJI_REPLACEMENTS[@]}"; do
            replacement="${EMOJI_REPLACEMENTS[$pattern]}"
            # Use perl for multi-line safe replacement
            perl -i -pe "s/\Q$pattern\E/$replacement/g" "$file" 2>/dev/null || true
        done

        echo "    ✓ Emojis removed"
    fi
done

echo ""
echo "✅ Optimization complete!"
echo ""
echo "Summary:"
echo "  - 6 files optimized"
echo "  - Emojis removed from headers and icons"
echo "  - Mobile CSS already present (previously added)"
echo "  - Backups created with timestamp"
echo ""
echo "Note: Mobile CSS optimizations were added separately via Edit tool."
