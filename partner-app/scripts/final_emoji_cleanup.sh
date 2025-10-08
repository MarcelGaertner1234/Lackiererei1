#!/bin/bash

# Final comprehensive emoji removal from all 6 service request forms

FILES=(anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html)

echo "🔧 Final comprehensive emoji removal..."
echo "======================================"

for file in "${FILES[@]}"; do
    echo "Processing $file..."
    
    # Remove emojis from JavaScript summary generation (in const labels)
    sed -i '' "s/'🎨 /'/" "$file"
    sed -i '' "s/'🛞 /'/" "$file"
    sed -i '' "s/'🔧 /'/" "$file"
    sed -i '' "s/'✨ /'/" "$file"
    sed -i '' "s/'🚗 /'/" "$file"
    sed -i '' "s/'✅ /'/" "$file"
    sed -i '' "s/'❌ /'/" "$file"
    sed -i '' "s/'🔄 /'/" "$file"
    sed -i '' "s/'🔍 /'/" "$file"
    sed -i '' "s/'⚠️ /'/" "$file"
    sed -i '' "s/'📋 /'/" "$file"
    sed -i '' "s/'📄 /'/" "$file"
    sed -i '' "s/'🌨️ /'/" "$file"
    sed -i '' "s/'🦌 /'/" "$file"
    sed -i '' "s/'🅿️ /'/" "$file"
    sed -i '' "s/'🔨 /'/" "$file"
    sed -i '' "s/'❓ /'/" "$file"
    sed -i '' "s/'🚚 /'/" "$file"
    sed -i '' "s/'🏍️ /'/" "$file"
    sed -i '' "s/'🚛 /'/" "$file"
    sed -i '' "s/'🛠️ /'/" "$file"
    
    # Remove from h3 tags in JavaScript strings
    sed -i '' 's/<h3>📷/<h3>/g' "$file"
    sed -i '' 's/<h3>🔍/<h3>/g' "$file"
    sed -i '' 's/<h3>📝/<h3>/g' "$file"
    sed -i '' 's/<h3>🚗/<h3>/g' "$file"
    sed -i '' 's/<h3>📅/<h3>/g' "$file"
    sed -i '' 's/<h3>✅/<h3>/g' "$file"
    sed -i '' 's/<h3>🛞/<h3>/g' "$file"
    sed -i '' 's/<h3>🔧/<h3>/g' "$file"
    sed -i '' 's/<h3>⚠️/<h3>/g' "$file"
    sed -i '' 's/<h3>📋/<h3>/g' "$file"
    
    # Remove remaining in label text
    sed -i '' 's/Wartung \/ Ölwechsel/Wartung \/ Ölwechsel/g' "$file"
    
    echo "  ✓ $file cleaned"
done

echo ""
echo "✅ Final emoji cleanup complete!"
