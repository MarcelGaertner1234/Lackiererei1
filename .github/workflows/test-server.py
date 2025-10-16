#!/usr/bin/env python3
"""
RUN #38: Custom HTTP Server with Cache-Busting Headers

Problem: python3 -m http.server doesn't send cache-control headers
Solution: Custom server that forces browsers to reload files every time

Usage: python3 test-server.py [port]
Default port: 8000
"""

import http.server
import socketserver
import sys
from pathlib import Path

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """HTTP Request Handler that forces no-cache headers on all responses"""

    def end_headers(self):
        # RUN #38 CRITICAL FIX: Add cache-busting headers to EVERY response
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')

        # CORS headers (for local testing)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

        super().end_headers()

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.end_headers()

    def log_message(self, format, *args):
        """Override to show which file is being served"""
        # Show file path being served
        if len(args) >= 1:
            method_path = args[0].split(' ')[0] if ' ' in args[0] else args[0]
            print(f"[HTTP] Serving: {method_path} (no-cache headers sent)")
        super().log_message(format, *args)

if __name__ == '__main__':
    print(f"🌐 RUN #38: Starting HTTP Server with Cache-Busting Headers")
    print(f"   Port: {PORT}")
    print(f"   Root: {Path.cwd()}")
    print(f"   Cache-Control: no-cache, no-store, must-revalidate")
    print(f"   Pragma: no-cache")
    print(f"   Expires: 0")
    print(f"")
    print(f"   This ensures browsers ALWAYS reload files, never use cache!")
    print(f"")

    with socketserver.TCPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
        print(f"✅ Server running at http://localhost:{PORT}/")
        print(f"   Press Ctrl+C to stop\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n🛑 Server stopped")
            sys.exit(0)
