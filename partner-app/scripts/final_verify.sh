#!/bin/bash

echo "=== FINAL VERIFICATION REPORT ==="
echo ""
echo "1. Mobile CSS Verification:"
for file in anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html; do
    css768=$(grep -c "@media (max-width: 768px)" "$file" 2>/dev/null || echo "0")
    css480=$(grep -c "@media (max-width: 480px)" "$file" 2>/dev/null || echo "0")
    printf "  %-35s @768px:%s @480px:%s\n" "$file:" "$css768" "$css480"
done

echo ""
echo "2. File Sizes:"
ls -lh anfrage.html reifen-anfrage.html mechanik-anfrage.html pflege-anfrage.html tuev-anfrage.html versicherung-anfrage.html | awk '{printf "  %-35s %s\n", $9":", $5}'

echo ""
echo "3. Backup Files Created:"
backup_count=$(ls -1 *BACKUP*.html *MINIMOBILE*.html 2>/dev/null | wc -l | tr -d ' ')
echo "  Total backups: $backup_count"

echo ""
echo "✅ Optimization Complete!"
echo ""
echo "Next step: Review OPTIMIZATION_REPORT.md for details"
