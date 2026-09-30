import unittest

from scripts.citation_guard import CitationError, checked_source_urls, validate_answer_urls


class CitationGuardTests(unittest.TestCase):
    def test_source_urls_from_mcp_content(self):
        plain = '{"source":{"url":"https://pcaob.org/original"},"text":"other"}'
        escaped = r'{\"source\":{\"url\":\"https:\/\/pcaob.org\/original\"}}'
        for content in (plain, escaped):
            with self.subTest(content=content):
                self.assertEqual(checked_source_urls(content), {'https://pcaob.org/original'})

    def test_wrong_path_is_withheld_even_on_the_same_domain(self):
        allowed = {'https://pcaob.org/advisory/with-third-party'}
        validate_answer_urls('See https://pcaob.org/advisory/with-third-party.', allowed)
        with self.assertRaises(CitationError):
            validate_answer_urls('See https://pcaob.org/advisory/third-party.', allowed)

    def test_named_original_must_appear(self):
        allowed = {'https://investor.gov/2023', 'https://investor.gov/2024'}
        with self.assertRaises(CitationError):
            validate_answer_urls('See https://investor.gov/2024', allowed, {'https://investor.gov/2023'})
        validate_answer_urls('See https://investor.gov/2023', allowed, {'https://investor.gov/2023'})


if __name__ == '__main__':
    unittest.main()
