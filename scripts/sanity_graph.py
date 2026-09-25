"""Read a bounded, published-only evidence graph from the public Sanity dataset."""

import json
from datetime import datetime
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


PROJECT_ID = "cxjysvlq"
DATASET = "production"
QUERY = '''{
  "events": *[_type == "marketEvent"] | order(observedAt desc)[0...20]{
    "id": _id, title, summary, observedAt, review
  },
  "sources": *[_type == "source"][0...100]{
    "id": _id, title, url, publishedAt, kind
  },
  "claims": *[_type == "evidenceClaim"][0...100]{
    "id": _id, "eventId": event._ref, "sourceId": source._ref,
    text, stance, observedAt, expiresAt
  }
}'''


def timestamp(value):
    if not isinstance(value, str):
        raise ValueError("Missing timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Timestamp must include a timezone")
    return parsed


def text_field(value):
    return isinstance(value, str) and bool(value.strip())


def normalize_graph(result):
    """Exclude incomplete links instead of implying that they are sourced evidence."""
    if not isinstance(result, dict) or not all(
        isinstance(result.get(key), list) for key in ("events", "sources", "claims")
    ):
        raise ValueError("Sanity returned an unexpected graph")

    events = []
    for item in result["events"]:
        if not isinstance(item, dict) or not all(text_field(item.get(k)) for k in ("id", "title")):
            continue
        try:
            timestamp(item.get("observedAt"))
        except ValueError:
            continue
        events.append({key: item.get(key) for key in ("id", "title", "summary", "observedAt", "review")})

    sources = []
    for item in result["sources"]:
        if not isinstance(item, dict) or not all(text_field(item.get(k)) for k in ("id", "title", "url")):
            continue
        url = urlparse(item["url"])
        if url.scheme != "https" or not url.hostname or url.username or url.password:
            continue
        try:
            timestamp(item.get("publishedAt"))
        except ValueError:
            continue
        sources.append({key: item.get(key) for key in ("id", "title", "url", "publishedAt", "kind")})

    source_map = {item["id"]: item for item in sources}
    event_ids = {item["id"] for item in events}
    claims = []
    for item in result["claims"]:
        if not isinstance(item, dict) or not all(
            text_field(item.get(k)) for k in ("id", "eventId", "sourceId", "text")
        ):
            continue
        if item["eventId"] not in event_ids or item["sourceId"] not in source_map:
            continue
        if item.get("stance") not in ("supports", "conflicts", "context"):
            continue
        try:
            observed = timestamp(item.get("observedAt"))
            if observed < timestamp(source_map[item["sourceId"]]["publishedAt"]):
                continue
            if item.get("expiresAt") and timestamp(item["expiresAt"]) <= observed:
                continue
        except ValueError:
            continue
        claims.append({key: item.get(key) for key in (
            "id", "eventId", "sourceId", "text", "stance", "observedAt", "expiresAt"
        )})

    return {
        "notice": "Published Sanity content. Historical evidence is not current market news or a trading signal. Review every source before sharing.",
        "events": events,
        "sources": sources,
        "claims": claims,
    }


def fetch_graph():
    url = f"https://{PROJECT_ID}.api.sanity.io/v2025-02-19/data/query/{DATASET}?" + urlencode({
        "query": QUERY, "perspective": "published", "returnQuery": "false"
    })
    request = Request(url, headers={"Accept": "application/json", "User-Agent": "MarketEvidenceDesk/0.3"})
    with urlopen(request, timeout=15) as response:
        payload = json.load(response)
    return normalize_graph(payload.get("result"))
