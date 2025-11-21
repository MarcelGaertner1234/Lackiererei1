#!/bin/bash
# Wrap all console.log('🔍...) with if (window.DEBUG)

# List of files to process (excluding tests)
FILES=(
    "partner-app/anfrage-detail.html"
    "kanban.html"
    "partner-app/meine-anfragen.html"
    "material.html"
    "kunden.html"
    "annahme.html"
    "rechnungen-admin.html"
    "partner-app/auto-login.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Processing: $file"
        
        # Use sed to wrap console.log('🔍 with if (window.DEBUG)
        # Pattern: console.log('🔍 → if (window.DEBUG) console.log('🔍
        sed -i '' -E "s/^([[:space:]]*)console\.log\('🔍/\1if (window.DEBUG) console.log('🔍/g" "$file"
        
        # Also handle double-quoted strings
        sed -i '' -E 's/^([[:space:]]*)console\.log\("🔍/\1if (window.DEBUG) console.log\("🔍/g' "$file"
        
        echo "✅ Done: $file"
    else
        echo "⚠️  Not found: $file"
    fi
done

echo ""
echo "✅ All files processed!"
