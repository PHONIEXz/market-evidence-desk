"""Check linked evidence bundles before importing published Sanity documents."""

import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
SEEDS = sorted((ROOT / "sanity" / "seed").glob("*.json"))


def timestamp(value):
    if not isinstance(value, str) or not value.endswith("Z"):
        raise ValueError(f"Expected UTC ISO date, got {value!r}")
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def validate():
    documents = [doc for path in SEEDS for doc in json.loads(path.read_text())]
    ids = [doc["_id"] for doc in documents]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicate document ID across seed files")
    by_id = {doc["_id"]: doc for doc in documents}
    referenced = Counter()
    today = datetime.now(timezone.utc)

    for doc in documents:
        kind = doc["_type"]
        if kind == "source":
            url = urlparse(doc["url"])
            if url.scheme != "https" or not url.hostname or url.username or url.password:
                raise ValueError(f"Unsafe source URL: {doc['_id']}")
            if not doc.get("title") or not doc.get("notes"):
                raise ValueError(f"Missing source title or scope note: {doc['_id']}")
            if timestamp(doc["publishedAt"]) > today:
                raise ValueError(f"Future source date: {doc['_id']}")
        elif kind == "marketEvent":
            if not doc.get("summary") or doc.get("review") not in {"needs-human-review", "approved", "rejected"}:
                raise ValueError(f"Missing summary or review status: {doc['_id']}")
            timestamp(doc["observedAt"])
        elif kind == "evidenceClaim":
            event_id, source_id = doc["event"]["_ref"], doc["source"]["_ref"]
            event, source = by_id.get(event_id), by_id.get(source_id)
            if not event or event["_type"] != "marketEvent" or not source or source["_type"] != "source":
                raise ValueError(f"Broken event or source link: {doc['_id']}")
            if doc.get("stance") not in {"supports", "conflicts", "context"} or not doc.get("text"):
                raise ValueError(f"Missing claim text or stance: {doc['_id']}")
            if timestamp(doc["observedAt"]) < timestamp(source["publishedAt"]):
                raise ValueError(f"Claim predates source: {doc['_id']}")
            referenced[event_id] += 1
            referenced[source_id] += 1
        else:
            raise ValueError(f"Unexpected document type: {kind}")

    for doc in documents:
        if doc["_type"] in {"marketEvent", "source"} and not referenced[doc["_id"]]:
            raise ValueError(f"Unlinked document: {doc['_id']}")
    totals = Counter(doc["_type"] for doc in documents)
    print(f"Validated {len(documents)} linked seed records across {len(SEEDS)} bundles: {dict(totals)}")


if __name__ == "__main__":
    validate()
