import unittest

from scripts.model_config import fallback_model, missing_settings, model_credentials


class ModelConfigurationTests(unittest.TestCase):
    def test_gemini_key_and_existing_alias(self):
        for name in ("GEMINI_API_KEY", "GEMINIAPIKEY"):
            with self.subTest(name=name):
                environment = {name: "gemini-secret", "OPENAI_API_KEY": "openai-secret"}
                self.assertEqual(model_credentials(environment), (
                    "gemini", "gemini-secret", "gemini-3.5-flash-lite"
                ))

    def test_openai_fallback_and_model_override(self):
        self.assertEqual(model_credentials({"OPENAI_API_KEY": "openai-secret"}),
                         ("openai", "openai-secret", ""))
        self.assertEqual(model_credentials({"GEMINI_API_KEY": "gemini-secret", "GEMINI_MODEL": "gemini-custom"}),
                         ("gemini", "gemini-secret", "gemini-custom"))

    def test_missing_settings_identifies_placeholders(self):
        self.assertEqual(missing_settings({
            "SANITY_CONTEXT_MCP_URL": "https://example.test/mcp",
            "SANITY_ORGANIZATION_TOKEN": "YOUR_ORGANIZATION_CONTEXT_VIEWER_TOKEN",
            "GEMINI_API_KEY": "YOUR_GEMINI_API_KEY",
        }), ["SANITY_ORGANIZATION_TOKEN", "GEMINI_API_KEY (or GEMINIAPIKEY or OPENAI_API_KEY)"])

    def test_fallback_only_on_overload_and_for_distinct_model(self):
        self.assertEqual(fallback_model({}, "gemini-3.5-flash-lite", 503), "gemini-3.1-flash-lite")
        self.assertEqual(fallback_model({}, "gemini-3.8-flash", 429), "")
        self.assertEqual(fallback_model({}, "gemini-3.1-flash-lite", 503), "")
        self.assertEqual(fallback_model({"GEMINI_FALLBACK_MODEL": "gemini-3.5-flash"},
                                        "gemini-3.8-flash", 503), "gemini-3.5-flash")


if __name__ == "__main__":
    unittest.main()
