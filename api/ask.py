"""Hosted, fixed-question Sanity Context agent. No credentials reach the browser."""

import asyncio
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agent import CASES, research_answer  # noqa: E402
from scripts.model_config import missing_settings  # noqa: E402


def is_ready():
    return os.getenv("AGENT_DEMO_ENABLED", "").lower() in {"1", "true"} and not missing_settings(os.environ)


class handler(BaseHTTPRequestHandler):
    def respond(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.respond(200, {"ready": bool(is_ready()), "cases": list(CASES)})

    def do_POST(self):
        if not is_ready():
            self.respond(503, {"error": "The live research agent is not configured for this deployment."})
            return
        origin = self.headers.get("Origin")
        if origin:
            parsed = urlparse(origin)
            if parsed.scheme != "https" or parsed.netloc != self.headers.get("Host"):
                self.respond(403, {"error": "Use this website to run the agent."})
                return
        if self.headers.get("Content-Type", "").split(";", 1)[0].lower() != "application/json":
            self.respond(415, {"error": "Send a JSON request."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 1 <= length <= 256:
                raise ValueError("Request must contain one short case ID.")
            body = json.loads(self.rfile.read(length))
            if not isinstance(body, dict) or set(body) != {"case"} or body["case"] not in CASES:
                raise ValueError("Choose compare or price.")
        except (ValueError, TypeError, json.JSONDecodeError):
            self.respond(400, {"error": "Choose the compare or price research question."})
            return
        try:
            result = asyncio.run(asyncio.wait_for(research_answer(CASES[body["case"]]), timeout=52))
            self.respond(200, {"case": body["case"], **result})
        except TimeoutError:
            self.respond(504, {"error": "The agent took too long. Please try again."})
        except RuntimeError as error:
            if str(error).startswith("Answer withheld: the agent did not call required Sanity tools:"):
                self.respond(424, {"error": str(error)})
            elif str(error).startswith("Gemini is temporarily overloaded"):
                self.respond(503, {"error": "The model is temporarily overloaded. Try again later."})
            else:
                self.log_error("Agent request failed: RuntimeError")
                self.respond(502, {"error": "The agent or its source connection is unavailable. Try again later."})
        except Exception as error:
            # Model and MCP exceptions can contain source text or request details.
            self.log_error("Agent request failed: %s", type(error).__name__)
            self.respond(502, {"error": "The agent or its source connection is unavailable. Try again later."})

    def do_OPTIONS(self):
        self.send_response(405)
        self.send_header("Allow", "GET, POST")
        self.end_headers()
