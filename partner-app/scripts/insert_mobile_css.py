#!/usr/bin/env python3

import os
import re

PARTNER_APP_DIR = "/Users/marcelgaertner/Desktop/Chrisstopher Gàrtner /Marketing/06_Digitale_Tools/Fahrzeugannahme_App/partner-app"

FILES = [
    "reifen-anfrage.html",
    "mechanik-anfrage.html",
    "pflege-anfrage.html",
    "tuev-anfrage.html",
    "versicherung-anfrage.html"
]

MOBILE_CSS = """
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
        }
"""

def insert_css_before_last_style_close(file_path):
    """Insert CSS before the last </style> tag in the file"""
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find the last occurrence of </style>
    # We'll insert our CSS right before it
    last_style_close = content.rfind('</style>')

    if last_style_close == -1:
        print(f"  ⚠️  No </style> tag found in {file_path}")
        return False

    # Insert the mobile CSS before the last </style>
    new_content = content[:last_style_close] + MOBILE_CSS + '\n    ' + content[last_style_close:]

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)

    return True

def main():
    os.chdir(PARTNER_APP_DIR)

    print("🔧 Inserting enhanced mobile CSS into 5 service form files...")
    print("=" * 60)

    for filename in FILES:
        if os.path.exists(filename):
            print(f"Processing {filename}...")
            if insert_css_before_last_style_close(filename):
                print(f"  ✓ Successfully updated {filename}")
            else:
                print(f"  ✗ Failed to update {filename}")
        else:
            print(f"  ⚠️  File not found: {filename}")

    print("\n✅ Mobile CSS insertion complete!")

if __name__ == '__main__':
    main()
