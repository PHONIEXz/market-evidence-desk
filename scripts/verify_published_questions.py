"""Verify the exact imported IDs through the unauthenticated published perspective."""

import json
from pathlib import Path
import sys
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "sanity/seed/investor-protection-questions.json"
ENDPOINT = "https://cxjysvlq.api.sanity.io/v2025-08-15/data/query/production"


def public_query(query, **parameters):
    params = {"perspective": "published", "query": query}
    params.update({"$" + key: json.dumps(value) for key, value in parameters.items()})
    request = Request(ENDPOINT + "?" + urlencode(params), headers={"Accept": "application/json"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)["result"]


def verify():
    docs = json.loads(BUNDLE.read_text())
    ids = [doc["_id"] for doc in docs]
    # Small batches keep the URL below typical gateway limits.
    visible = set()
    for offset in range(0, len(ids), 25):
        found = public_query('*[_id in $ids]._id', ids=ids[offset:offset + 25])
        visible.update(found)
    missing = [identifier for identifier in ids if identifier not in visible]
    total = public_query('count(*[_type == "marketEvent"])')
    print(f"Publicly visible: {len(visible)}/{len(ids)} bundle records; {total} research questions in production.")
    if missing:
        print("Missing from the anonymous published perspective:")
        for identifier in missing:
            print("  " + identifier)
        return 1
    return 0


if __name__ == "__main__":
    try:
        sys.exit(verify())
    except (KeyError, OSError, ValueError) as error:
        print(f"Could not verify public records: {error}", file=sys.stderr)
        sys.exit(2)
