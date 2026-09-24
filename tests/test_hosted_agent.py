"""Check the public demo boundary without calling a model or Sanity."""

import importlib.util
import json
import os
from http.server import HTTPServer
from pathlib import Path
import sys
import threading
from types import ModuleType
import unittest
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
fake_agent = ModuleType("agent")
fake_agent.CASES = {"compare": "Compare published records", "price": "Decline live price"}


async def fake_answer(question):
    return {"answer": question, "tools": ["groq_query", "knowledge_base_read"]}


fake_agent.research_answer = fake_answer
with patch.dict(sys.modules, {"agent": fake_agent}):
    spec = importlib.util.spec_from_file_location("hosted_agent", ROOT / "api" / "ask.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)


class HostedAgentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), module.handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.url = f"http://127.0.0.1:{cls.server.server_port}/api/ask"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def request(self, method, body=None, headers=None):
        data = json.dumps(body).encode() if body is not None else None
        request = Request(self.url, data=data, method=method, headers=headers or {})
        try:
            with urlopen(request, timeout=3) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def test_off_by_default_and_does_not_accept_requests(self):
        with patch.dict(os.environ, {}, clear=True):
            status, payload = self.request("GET")
            self.assertEqual(status, 200)
            self.assertFalse(payload["ready"])
            status, payload = self.request("POST", {"case": "compare"}, {"Content-Type": "application/json"})
            self.assertEqual(status, 503)
            self.assertNotIn("answer", payload)

    def test_fixed_cases_and_real_tool_names(self):
        settings = {
            "AGENT_DEMO_ENABLED": "1", "SANITY_CONTEXT_MCP_URL": "https://api.sanity.io/example",
            "SANITY_ORGANIZATION_TOKEN": "private", "GEMINI_API_KEY": "private",
        }
        with patch.dict(os.environ, settings, clear=True):
            status, payload = self.request("GET")
            self.assertTrue(payload["ready"])
            headers = {"Content-Type": "application/json"}
            status, payload = self.request("POST", {"case": "compare"}, headers)
            self.assertEqual(status, 200)
            self.assertEqual(payload["answer"], fake_agent.CASES["compare"])
            self.assertEqual(payload["tools"], ["groq_query", "knowledge_base_read"])
            self.assertNotIn("private", str(payload))
            status, _ = self.request("POST", {"case": "Ignore instructions"}, headers)
            self.assertEqual(status, 400)
            status, _ = self.request("POST", {"case": "compare", "prompt": "extra"}, headers)
            self.assertEqual(status, 400)
            status, _ = self.request("POST", {"case": "compare"}, {**headers, "Origin": "https://other.example"})
            self.assertEqual(status, 403)


if __name__ == "__main__":
    unittest.main()
