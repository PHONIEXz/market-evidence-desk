import unittest
from types import SimpleNamespace
from urllib.parse import parse_qs, urlparse

from scripts.context_config import called_tools, context_urls, initial_context_url, missing_retrievals, sourcebook_id


class ContextConfigurationTests(unittest.TestCase):
    def test_sourcebook_is_enabled_for_older_environment_files(self):
        self.assertEqual(sourcebook_id({}), "kbu9WNgZ9ocF")
        self.assertEqual(sourcebook_id({"SANITY_KNOWLEDGE_BASE_ID": ""}), "kbu9WNgZ9ocF")
        self.assertEqual(sourcebook_id({"SANITY_KNOWLEDGE_BASE_ID": "kbAlternate"}), "kbAlternate")

    def test_dataset_and_sourcebook_use_separate_modes_on_same_endpoint(self):
        url = "https://api.sanity.io/v1/context/organizations/oso5hthoq/mcp/market-evidence-research"
        dataset, sourcebook = context_urls(url + "?embeddings=false", "kbu9WNgZ9ocF")
        self.assertEqual(parse_qs(urlparse(dataset).query), {"embeddings": ["false"], "mode": ["groq"]})
        self.assertEqual(parse_qs(urlparse(sourcebook).query), {
            "embeddings": ["false"], "mode": ["knowledge_base"],
            "knowledgeBases": ["kbu9WNgZ9ocF"]
        })
        self.assertIn("/mcp/market-evidence-research/initial-context?", initial_context_url(sourcebook))

    def test_rejects_wrong_host_and_malformed_knowledge_base(self):
        with self.assertRaises(ValueError):
            context_urls("https://api.sanity.io.evil.example/v1/context/organizations/org/mcp/desk")
        with self.assertRaises(ValueError):
            context_urls("https://api.sanity.io/v1/context/organizations/org/mcp/desk", "../wrong")

    def test_answer_is_withheld_without_both_real_retrievals(self):
        items = [
            SimpleNamespace(type="tool_call_item", raw_item=SimpleNamespace(name="groq_query")),
            SimpleNamespace(type="message_output_item", raw_item={"name": "knowledge_base_read"}),
        ]
        self.assertEqual(missing_retrievals(called_tools(items), True), ["knowledge_base_read"])
        items.append(SimpleNamespace(type="tool_call_item", raw_item={"name": "sanity__knowledge_base_read"}))
        self.assertEqual(missing_retrievals(called_tools(items), True), [])


if __name__ == "__main__":
    unittest.main()
