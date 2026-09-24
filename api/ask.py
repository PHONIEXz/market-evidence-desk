"""Hosted, scoped Sanity Context agent. No credentials reach the browser."""

import asyncio
from http.server import BaseHTTPRequestHandler
import json
import os
from pathlib import Path
import re
import sys
from urllib.parse import urlparse

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from agent import CASES, research_answer  # noqa: E402
from scripts.model_config import missing_settings  # noqa: E402

TOPIC = re.compile(r"\b(?:reserves?|stablecoins?|bitcoin|btc|kraken|pcaob|sec|crypto|audits?|solvency|solvent|liabilit(?:y|ies))\b", re.I)


def question_from_body(body):
    """Accept preset cases or one short, in-scope, single-line question."""
    if not isinstance(body, dict):
        raise ValueError("Choose a research question.")
    if set(body) == {"case"} and type(body["case"]) is str and body["case"] in CASES:
        return body["case"], CASES[body["case"]]
    if set(body) != {"question"} or type(body["question"]) is not str:
        raise ValueError("Choose a preset or enter one research question.")
    raw = body["question"]
    question = " ".join(raw.split())
    if len(raw) > 240 or not 20 <= len(question) <= 240 or any(ord(c) < 32 for c in raw):
        raise ValueError("Ask one question in 20 to 240 characters.")
    if not TOPIC.search(question):
        raise ValueError("Ask about the reserve, stablecoin or crypto evidence in this desk.")
    return "custom", question


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
            if not 1 <= length <= 768:
                raise ValueError("Request must contain one short question.")
            body = json.loads(self.rfile.read(length))
            case, question = question_from_body(body)
        except (ValueError, TypeError, json.JSONDecodeError) as error:
            self.respond(400, {"error": str(error) or "Choose a research question."})
            return
        try:
            result = asyncio.run(asyncio.wait_for(research_answer(question), timeout=52))
            self.respond(200, {"case": case, **result})
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
