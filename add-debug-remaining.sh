#!/bin/bash
# Add DEBUG flag and wrap logs for remaining files

FILES=(
    "pending-registrations.html"
    "mitarbeiter-verwaltung.html"
    "abnahme.html"
    "partner-app/kva-erstellen.html"
    "partner-app/index.html"
    "partner-app/admin-anfragen.html"
)

DEBUG_FLAG='    <script>
        // ✅ BUG #5 FIX: Global DEBUG flag for conditional logging
        window.DEBUG = (
            localStorage.getItem('\''DEBUG'\'') === '\''true'\'' ||
            window.location.search.includes('\''debug=true'\'') ||
            window.location.hostname === '\''localhost'\'' ||
            window.location.port === '\''8000'\''
        );
    </script>'

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing $file..."
        
        # Add DEBUG flag after <head>
        if ! grep -q "window\.DEBUG = " "$file"; then
            sed -i '' '/<head>/a\
'"$DEBUG_FLAG"'
' "$file"
            echo "  ✅ Added DEBUG flag"
        else
            echo "  ⏭️  Already has DEBUG flag"
        fi
        
        # Wrap DEBUG logs
        sed -i '' -E "s/^([[:space:]]+)console\.log\('🔍/\1if (window.DEBUG) console.log('🔍/g" "$file"
        sed -i '' 's/\([ ]*\)console\.log(`🔍/\1if (window.DEBUG) console.log(`🔍/g' "$file"
        echo "  ✅ Wrapped DEBUG logs"
    else
        echo "  ❌ File not found: $file"
    fi
done

echo ""
echo "✅ All files processed!"
