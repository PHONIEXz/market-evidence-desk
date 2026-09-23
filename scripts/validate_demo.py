"""Check structural integrity of the local, fictional research graph."""
import json
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse


def parse_time(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


data = json.loads((Path(__file__).resolve().parents[1] / "data" / "demo.json").read_text())
sources = {source["id"]: source for source in data["sources"]}
events = {event["id"]: event for event in data["events"]}
assert len(sources) == len(data["sources"]), "Duplicate source ID"
assert len(events) == len(data["events"]), "Duplicate event ID"
assert len({claim["id"] for claim in data["claims"]}) == len(data["claims"]), "Duplicate claim ID"
for source in sources.values():
    assert urlparse(source["url"]).scheme == "https", "Source URL must be HTTPS"
    parse_time(source["publishedAt"])
for claim in data["claims"]:
    assert claim["sourceId"] in sources, "Claim refers to missing source"
    assert claim["eventId"] in events, "Claim refers to missing event"
    assert claim["stance"] in {"supports", "conflicts", "context"}, "Unknown stance"
    assert parse_time(claim["observedAt"]) >= parse_time(sources[claim["sourceId"]]["publishedAt"]), "Observation predates publication"
    if claim.get("expiresAt"):
        assert parse_time(claim["expiresAt"]) > parse_time(claim["observedAt"]), "Expiry predates observation"
print("Validated fictional graph: sources, events, claims and time relationships.")
