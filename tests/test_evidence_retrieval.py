"""Scale checks for graph retrieval and curated publication metadata."""

import json
import contextlib
import io
from pathlib import Path
import unittest

from scripts.evidence_retrieval import scoped_query
from scripts.build_question_bundle import QUESTIONS, SOURCES, build
from scripts import verify_published_questions
from unittest.mock import patch


class EvidenceExpansionTests(unittest.TestCase):
    def test_custom_query_is_bounded_and_cannot_inject_groq(self):
        query = scoped_query('What does EU MiCA say about wallet security?" || true')
        self.assertIn('text match "*mica*"', query)
        self.assertIn('[0...35]', query)
        self.assertNotIn('|| true', query)
        self.assertIn('"source":source->', query)
        with self.assertRaises(ValueError):
            scoped_query('What about crypto?')
        with self.assertRaises(ValueError):
            scoped_query('risk', 'market-event-xxx" || true')

    def test_bundle_has_distinct_questions_and_source_backing(self):
        docs = build()
        sources = {doc['_id'] for doc in docs if doc['_type'] == 'source'}
        events = {doc['_id'] for doc in docs if doc['_type'] == 'marketEvent'}
        claims = [doc for doc in docs if doc['_type'] == 'evidenceClaim']
        self.assertEqual(len(events), len(QUESTIONS))
        self.assertEqual(len(sources), len(SOURCES))
        self.assertEqual(len(claims), len(events))
        self.assertEqual(len({doc['title'].casefold() for doc in docs if doc['_type'] == 'marketEvent'}), len(events))
        self.assertEqual(len({doc['text'].casefold() for doc in claims}), len(claims))
        self.assertTrue(all(doc['source']['_ref'] in sources and doc['event']['_ref'] in events for doc in claims))
        self.assertTrue(all(doc['review'] == 'needs-human-review' for doc in docs if doc['_type'] == 'marketEvent'))
        path = Path(__file__).resolve().parents[1] / 'sanity/seed/investor-protection-questions.json'
        self.assertEqual(json.loads(path.read_text()), docs)

    def test_public_verifier_reports_missing_records(self):
        ids = [doc['_id'] for doc in build()]

        def response(query, **params):
            if query.startswith('count('):
                return 50
            return [identifier for identifier in params['ids'] if identifier != ids[0]]

        with patch.object(verify_published_questions, 'public_query', side_effect=response):
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(verify_published_questions.verify(), 1)


if __name__ == '__main__':
    unittest.main()
