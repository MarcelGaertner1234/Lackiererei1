#!/bin/bash
# Script to add DEBUG flag to all HTML files

DEBUG_CODE='
        // ✅ BUG #5 FIX: Global DEBUG flag for conditional logging
        window.DEBUG = (
            localStorage.getItem('\''DEBUG'\'') === '\''true'\'' ||
            window.location.search.includes('\''debug=true'\'') ||
            window.location.hostname === '\''localhost'\'' ||
            window.location.port === '\''8000'\''
        );'

# Find all HTML files (excluding index.html which is already done)
find . -name "*.html" -not -name "index.html" -not -path "./node_modules/*" -not -path "./tests/*" | while read file; do
    # Check if file already has DEBUG flag
    if grep -q "window.DEBUG =" "$file"; then
        echo "⏭️  SKIP: $file (already has DEBUG flag)"
    else
        # Find <head> tag and insert after first <script> or at beginning
        if grep -q "<head>" "$file"; then
            # Use sed to insert after <head>
            sed -i '' '/<head>/a\
    <script>'"$DEBUG_CODE"'    </script>
' "$file"
            echo "✅ ADDED: $file"
        else
            echo "⚠️  WARN: $file (no <head> tag found)"
        fi
    fi
done
