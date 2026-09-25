"""Check the public graph boundary and the read-only local server."""

import json
import sys
import threading
import unittest
from copy import deepcopy
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from sanity_graph import normalize_graph  # noqa: E402
from serve import Handler  # noqa: E402


def seed_graph():
    documents = json.loads((ROOT / "sanity" / "seed" / "sec-investor-alert.json").read_text())
    return {
        "events": [dict(id=doc["_id"], **{key: doc.get(key) for key in ("title", "summary", "observedAt", "review")}) for doc in documents if doc["_type"] == "marketEvent"],
        "sources": [dict(id=doc["_id"], **{key: doc.get(key) for key in ("title", "url", "publishedAt", "kind")}) for doc in documents if doc["_type"] == "source"],
        "claims": [dict(id=doc["_id"], eventId=doc["event"]["_ref"], sourceId=doc["source"]["_ref"], **{key: doc.get(key) for key in ("text", "stance", "observedAt", "expiresAt")}) for doc in documents if doc["_type"] == "evidenceClaim"],
    }


class GraphTests(unittest.TestCase):
    def test_seed_has_one_linked_sourced_claim(self):
        graph = normalize_graph(seed_graph())
        self.assertEqual(len(graph["events"]), 1)
        self.assertEqual(len(graph["sources"]), 1)
        self.assertEqual(len(graph["claims"]), 1)
        self.assertEqual(graph["claims"][0]["sourceId"], graph["sources"][0]["id"])
        self.assertTrue(all("." not in item["id"] for kind in ("events", "sources", "claims") for item in graph[kind]), "Published seed IDs must be at the root path for public access")

    def test_rejects_dangling_unsafe_and_impossible_evidence(self):
        graph = seed_graph()
        unsafe = deepcopy(graph["sources"][0])
        unsafe["id"] = "unsafe"
        unsafe["url"] = "javascript:alert(1)"
        graph["sources"].append(unsafe)
        for changes in (
            {"id": "missing-source", "sourceId": "missing"},
            {"id": "unsafe-source", "sourceId": "unsafe"},
            {"id": "before-publication", "observedAt": "2022-01-01T00:00:00Z"},
            {"id": "invalid-stance", "stance": "endorses"},
            {"id": "bad-expiry", "expiresAt": "2020-01-01T00:00:00Z"},
        ):
            graph["claims"].append({**graph["claims"][0], **changes})
        normalized = normalize_graph(graph)
        self.assertEqual(len(normalized["sources"]), 1)
        self.assertEqual(len(normalized["claims"]), 1)

    def test_empty_published_dataset_stays_empty(self):
        self.assertEqual(normalize_graph({"events": [], "sources": [], "claims": []})["events"], [])


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f"http://127.0.0.1:{cls.server.server_port}"

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join(timeout=2)

    def test_graph_route_and_demo_are_distinct(self):
        with patch("serve.fetch_graph", return_value=normalize_graph({"events": [], "sources": [], "claims": []})):
            with urlopen(self.base + "/api/graph") as response:
                self.assertEqual(json.load(response)["events"], [])
        with urlopen(self.base + "/data/demo.json") as response:
            self.assertEqual(json.load(response)["events"][0]["id"], "evt-1")

    def test_private_files_cannot_be_served(self):
        for path in ("/.env", "/.git/config", "/web/../sanity.config.ts"):
            with self.subTest(path=path), self.assertRaises(HTTPError) as error:
                urlopen(self.base + path)
            self.assertEqual(error.exception.code, 404)


if __name__ == "__main__":
    unittest.main()
