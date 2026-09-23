"""Configure the two read-only Sanity Context retrieval modes."""

import re
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


def context_urls(endpoint, knowledge_base_id=""):
    parsed = urlparse(endpoint)
    if parsed.scheme != "https" or parsed.hostname != "api.sanity.io" or parsed.username or parsed.password:
        raise ValueError("SANITY_CONTEXT_MCP_URL must be a Sanity HTTPS endpoint")
    if not re.fullmatch(r"/v1/context/organizations/[^/]+/mcp/[^/]+/?", parsed.path):
        raise ValueError("SANITY_CONTEXT_MCP_URL must point to a Context MCP endpoint")
    if parsed.fragment:
        raise ValueError("SANITY_CONTEXT_MCP_URL must not contain a fragment")

    query = dict(parse_qsl(parsed.query, keep_blank_values=True))
    query["mode"] = "groq"
    dataset_url = urlunparse(parsed._replace(query=urlencode(query)))
    if not knowledge_base_id:
        return dataset_url, None
    if not re.fullmatch(r"kb[A-Za-z0-9]+", knowledge_base_id):
        raise ValueError("SANITY_KNOWLEDGE_BASE_ID must start with kb and contain only letters and digits")
    query["mode"] = "knowledge_base"
    query["knowledgeBases"] = knowledge_base_id
    return dataset_url, urlunparse(parsed._replace(query=urlencode(query)))


def initial_context_url(endpoint):
    parsed = urlparse(endpoint)
    return urlunparse(parsed._replace(path=parsed.path.rstrip("/") + "/initial-context"))


def called_tools(items):
    """Report tool names from the SDK run, without logging tool inputs or credentials."""
    names = []
    for item in items:
        if getattr(item, "type", None) != "tool_call_item":
            continue
        raw = item.raw_item
        name = raw.get("name") if isinstance(raw, dict) else getattr(raw, "name", None)
        if isinstance(name, str):
            names.append(name)
    return names


def missing_retrievals(names, require_knowledge_base):
    required = ["groq_query"]
    if require_knowledge_base:
        required.append("knowledge_base_read")
    return [tool for tool in required if not any(name.endswith(tool) for name in names)]
