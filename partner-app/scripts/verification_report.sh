#!/bin/bash

echo "=== OPTIMIZATION VERIFICATION ==="
echo ""
echo "1. Emoji Removal Check:"
for file in anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html; do
    echo "  $file:"
    emoji_count=$(grep -o "[🎨📍🛞🔧✨🚗💡📤📷🔍📝📅✅⚠️📋🛠️]" "$file" | wc -l | tr -d ' ')
    echo "    Remaining emojis in HTML: $emoji_count"
done

echo ""
echo "2. Mobile CSS Check (@768px breakpoint):"
for file in anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html; do
    count=$(grep -c "@media (max-width: 768px)" "$file" 2>/dev/null || echo "0")
    echo "  $file: $count instances"
done

echo ""
echo "3. @480px Extra-Mobile Check:"
for file in anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html; do
    count=$(grep -c "@media (max-width: 480px)" "$file" 2>/dev/null || echo "0")
    echo "  $file: $count instances"
done

echo ""
echo "4. File Sizes:"
for file in anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html; do
    size=$(wc -c < "$file" | awk '{print int($1/1024)"KB"}')
    echo "  $file: $size"
done

echo ""
echo "✅ Verification complete"
