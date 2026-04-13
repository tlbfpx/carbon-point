#!/usr/bin/env python3
"""
Custom HTTP server for Carbon Point Dashboard E2E testing.
Serves built dist files with proper routing for both dashboard and platform apps.

Usage:
    python serve_dist.py [--port PORT]

Serves:
    http://localhost:PORT/dashboard/* -> dist/dashboard/index.html (dashboard app)
    http://localhost:PORT/saas/*      -> dist/dashboard/platform.html (platform app)
    All other paths -> dist/dashboard/index.html
"""

import os
import sys
import argparse
from http.server import HTTPServer, SimpleHTTPRequestHandler


class SPAHandler(SimpleHTTPRequestHandler):
    """Custom handler that serves index.html for client-side routing."""

    def __init__(self, *args, **kwargs):
        self.dist_dir = os.path.join(os.path.dirname(__file__), 'dist', 'dashboard')
        super().__init__(*args, directory=self.dist_dir, **kwargs)

    def do_GET(self):
        """Serve files with SPA routing support."""
        path = self.path.split('?')[0]  # Remove query string

        # E2E test routes: pre-populate auth before React
        if path == '/e2e/enterprise' or path == '/e2e-enterprise':
            file_path = os.path.join(self.dist_dir, 'e2e-enterprise.html')
            content_type = 'text/html'
        elif path == '/e2e/platform' or path == '/e2e-platform':
            file_path = os.path.join(self.dist_dir, 'e2e-platform.html')
            content_type = 'text/html'
        # Platform app routes: /saas/*
        elif path.startswith('/saas/') or path == '/saas':
            file_path = os.path.join(self.dist_dir, 'platform.html')
            content_type = 'text/html'
        # Dashboard app routes: /dashboard/*
        elif path.startswith('/dashboard/') or path == '/dashboard':
            file_path = os.path.join(self.dist_dir, 'index.html')
            content_type = 'text/html'
        # Root -> dashboard app
        elif path == '/' or path == '':
            file_path = os.path.join(self.dist_dir, 'index.html')
            content_type = 'text/html'
        # Try to serve the file directly
        else:
            file_path = os.path.join(self.dist_dir, path.lstrip('/'))
            content_type = self.guess_type(file_path)

        if os.path.exists(file_path) and os.path.isfile(file_path):
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.send_header('Cache-Control', 'no-cache')
            self.end_headers()
            with open(file_path, 'rb') as f:
                self.wfile.write(f.read())
        else:
            # SPA fallback - serve index.html
            if path.startswith('/saas') or path == '/saas':
                index_path = os.path.join(self.dist_dir, 'platform.html')
            else:
                index_path = os.path.join(self.dist_dir, 'index.html')

            if os.path.exists(index_path):
                self.send_response(200)
                self.send_header('Content-Type', 'text/html')
                self.send_header('Cache-Control', 'no-cache')
                self.end_headers()
                with open(index_path, 'rb') as f:
                    self.wfile.write(f.read())
            else:
                self.send_error(404, 'File not found')

    def log_message(self, format, *args):
        """Log requests."""
        sys.stderr.write(f"[SPA Server] {args[0]}\n")


def main():
    parser = argparse.ArgumentParser(description='Carbon Point SPA Server')
    parser.add_argument('--port', type=int, default=3001, help='Port to listen on')
    args = parser.parse_args()

    dist_dir = os.path.join(os.path.dirname(__file__), 'dist', 'dashboard')
    if not os.path.exists(dist_dir):
        print(f"Error: dist directory not found at {dist_dir}")
        print("Run 'pnpm build' first to build the dashboard app.")
        sys.exit(1)

    if not os.path.exists(os.path.join(dist_dir, 'index.html')):
        print(f"Error: index.html not found in {dist_dir}")
        sys.exit(1)

    server = HTTPServer(('0.0.0.0', args.port), SPAHandler)
    print(f"Carbon Point SPA Server running on http://localhost:{args.port}/")
    print(f"  Dashboard: http://localhost:{args.port}/dashboard/")
    print(f"  Platform:  http://localhost:{args.port}/saas/")
    print(f"Dist: {dist_dir}")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")


if __name__ == '__main__':
    main()
