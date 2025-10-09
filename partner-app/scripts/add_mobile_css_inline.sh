#!/bin/bash

# Add minimalistic mobile CSS optimizations to files with inline styles

FILES=("reifen-anfrage.html" "mechanik-anfrage.html" "pflege-anfrage.html" "tuev-anfrage.html" "versicherung-anfrage.html")

MOBILE_CSS='
        /* Enhanced Mobile Optimizations - Minimalistic */
        @media (max-width: 768px) {
            body { padding: 10px !important; }
            .container { padding: 15px !important; border-radius: 8px !important; }
            .header h1 { font-size: 18px !important; margin-bottom: 6px !important; }
            .header p { font-size: 12px !important; }
            .wizard-nav { gap: 10px !important; }
            .btn { padding: 8px 14px !important; font-size: 12px !important; border-radius: 6px !important; }
            .btn-back { padding: 8px 12px !important; }
            .form-group label { font-size: 11px !important; }
            .form-group input, .form-group textarea, .form-group select {
                padding: 8px !important; font-size: 12px !important; border: 1px solid #e0e0e0 !important;
            }
            .wizard-step .step-title { font-size: 16px !important; }
            .wizard-step .step-title .icon { font-size: 22px !important; }
            .photo-upload { padding: 20px !important; border-width: 2px !important; }
            .photo-upload .icon { font-size: 40px !important; }
            .photo-upload .text { font-size: 12px !important; }
            .toggle-option, .radio-option, .termin-option { padding: 10px !important; }
            .radio-option .label { font-size: 12px !important; }
            .radio-option .description { font-size: 11px !important; }
            .summary-section { padding: 12px !important; }
            .summary-section h3 { font-size: 12px !important; }
            .summary-section p { font-size: 12px !important; }
        }

        @media (max-width: 480px) {
            .container { padding: 12px !important; }
            .header h1 { font-size: 16px !important; }
            .btn { padding: 6px 10px !important; font-size: 10px !important; }
            .btn-back { padding: 6px 10px !important; font-size: 10px !important; }
            .wizard-step .step-title { font-size: 15px !important; }
            .form-group label { font-size: 10px !important; }
            .photo-upload { padding: 15px !important; }
        }'

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "Adding enhanced mobile CSS to $file..."
        
        # Insert before the closing </style> tag (before line ~750)
        # Use awk to find the last </style> and insert before it
        awk -v css="$MOBILE_CSS" '
            /<\/style>/ && !inserted {
                print css
                inserted=1
            }
            {print}
        ' "$file" > "${file}.tmp" && mv "${file}.tmp" "$file"
        
        echo "  ✓ $file updated"
    fi
done

echo "✅ Enhanced mobile CSS added to all 5 files"
