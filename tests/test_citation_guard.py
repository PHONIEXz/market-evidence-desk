import unittest

from scripts.citation_guard import CitationError, checked_source_urls, validate_answer_urls, validate_named_authorities


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

    def test_named_international_authority_needs_a_listed_source(self):
        body = 'The Financial Stability Board and BIS discuss redemption design.'
        with self.assertRaises(CitationError):
            validate_named_authorities(body + '\nSources:\n- https://www.fsb.org/report')
        validate_named_authorities(body + '\nSources:\n- https://www.fsb.org/report\n- https://www.bis.org/report')

    def test_division_and_commissioner_need_their_distinct_statements(self):
        body = 'The Division of Corporation Finance described the practice; Commissioner Crenshaw disagreed.'
        crenshaw = 'https://www.sec.gov/newsroom/speeches-statements/crenshaw-statement-stablecoins-040425'
        division = 'https://www.sec.gov/newsroom/speeches-statements/statement-stablecoins-040425'
        with self.assertRaises(CitationError):
            validate_named_authorities(body + '\nSources:\n- ' + crenshaw)
        validate_named_authorities(body + '\nSources:\n- ' + crenshaw + '\n- ' + division)


if __name__ == '__main__':
    unittest.main()
