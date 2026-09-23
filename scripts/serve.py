"""Serve the demo and a read-only Sanity graph endpoint on localhost."""

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit

from sanity_graph import fetch_graph


ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / "web"
MIME = {".html": "text/html", ".css": "text/css", ".js": "text/javascript"}


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, body, content_type):
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        path = unquote(urlsplit(self.path).path)
        if path == "/":
            self.send_response(302)
            self.send_header("Location", "/web/")
            self.end_headers()
            return
        if path == "/api/graph":
            try:
                body = json.dumps(fetch_graph()).encode("utf-8")
                self.respond(200, body, "application/json; charset=utf-8")
            except (HTTPError, URLError, TimeoutError, ValueError, json.JSONDecodeError) as exc:
                self.log_error("Sanity read failed: %s", exc)
                self.respond(502, b'{"error":"Published Sanity data is unavailable. Check dataset access and try again."}', "application/json; charset=utf-8")
            return
        if path == "/data/demo.json":
            self.respond(200, (ROOT / "data" / "demo.json").read_bytes(), "application/json; charset=utf-8")
            return
        if path == "/web/":
            path = "/web/index.html"
        if not path.startswith("/web/"):
            self.respond(404, b"Not found", "text/plain; charset=utf-8")
            return
        target = (ROOT / path.lstrip("/")).resolve()
        if not target.is_relative_to(WEB) or target.suffix not in MIME or not target.is_file():
            self.respond(404, b"Not found", "text/plain; charset=utf-8")
            return
        self.respond(200, target.read_bytes(), MIME[target.suffix] + "; charset=utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run the Market Evidence Desk on localhost")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()
    with ThreadingHTTPServer(("127.0.0.1", args.port), Handler) as server:
        print(f"Open http://127.0.0.1:{server.server_port}/web/", flush=True)
        server.serve_forever()
