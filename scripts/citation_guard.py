"""Keep model-generated source links tied to the retrieved Sanity graph."""

import json
import re


class CitationError(RuntimeError):
    """The model cited a URL outside the retrieved source records."""


def checked_source_urls(published: str) -> set[str]:
    """Read linked source URLs from plain or JSON-escaped MCP content."""
    content = published.replace(r"\/", "/")
    for _ in range(3):
        try:
            parsed = json.loads(content)
        except (ValueError, TypeError):
            break
        if isinstance(parsed, str):
            content = parsed
            continue

        urls = set()

        def walk(item):
            if isinstance(item, list):
                for child in item:
                    walk(child)
            elif isinstance(item, dict):
                source = item.get("source")
                if isinstance(source, dict) and isinstance(source.get("url"), str):
                    urls.add(source["url"])
                if item.get("_type") == "source" and isinstance(item.get("url"), str):
                    urls.add(item["url"])
                for child in item.values():
                    walk(child)

        walk(parsed)
        return {url for url in urls if url.startswith("https://")}

    # Some MCP adapters wrap the JSON with prose; limit the fallback to source objects.
    pattern = r'(?:\\)?"source(?:\\)?"\s*:\s*\{[^{}]*?(?:\\)?"url(?:\\)?"\s*:\s*(?:\\)?"(https://[^"\\]+)'
    return set(re.findall(pattern, content))


def validate_answer_urls(answer: str, allowed: set[str], required: set[str] | None = None) -> None:
    """Never present a plausible-looking but ungrounded citation as a receipt."""
    cited = {url.rstrip('.,;:') for url in re.findall(r'''https?://[^\s<>\]\)"'`]+''', answer)}
    if cited - allowed:
        raise CitationError("Answer withheld: a citation URL was not in the retrieved source records.")
    if required and not required.issubset(cited):
        raise CitationError("Answer withheld: the requested original source was not cited.")


def validate_named_authorities(answer: str) -> None:
    """Keep named international bodies in the body tied to their original source list."""
    parts = re.split(r'(?im)^\s*Sources\s*:?\s*$', answer, maxsplit=1)
    body, sources = (parts[0], parts[1]) if len(parts) == 2 else (answer, "")
    authorities = (
        (r'\b(?:Financial Stability Board|FSB)\b', 'fsb.org'),
        (r'\b(?:Bank for International Settlements|BIS)\b', 'bis.org'),
    )
    for name, domain in authorities:
        if re.search(name, body, re.I) and not re.search(r'https://(?:www\.)?' + re.escape(domain) + r'/', sources, re.I):
            raise CitationError("Answer withheld: a named authority has no original source in the Sources section.")
