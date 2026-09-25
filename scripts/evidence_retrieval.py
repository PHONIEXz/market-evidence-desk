"""Build bounded, source-linked GROQ for a growing published evidence graph."""

import re

CLAIM_PROJECTION = (
    '{_id,_type,title,summary,text,stance,review,publishedAt,url,kind,notes,'
    '"source":source->{_id,title,url,publishedAt,kind,notes},'
    '"event":event->{_id,title,summary,review}}'
)
STOP_WORDS = {
    "about", "after", "against", "asset", "assets", "before", "claim", "claims",
    "could", "crypto", "does", "evidence", "from", "have", "into", "might",
    "question", "report", "reports", "research", "should", "source", "sources",
    "their", "these", "this", "those", "under", "using", "what", "when",
    "where", "which", "with", "would", "your", "today", "right", "now",
}


def scoped_query(question: str, event_id: str | None = None) -> str:
    """Constrain the query to a preset event or relevant custom claim text."""
    if event_id:
        if not re.fullmatch(r"market-event-[a-z0-9-]+", event_id):
            raise ValueError("Invalid research question ID")
        return (
            '*[_type in ["marketEvent", "evidenceClaim"] && '
            f'(_id == "{event_id}" || event._ref == "{event_id}")][0...20]'
            + CLAIM_PROJECTION
        )
    terms = list(dict.fromkeys(
        word for word in re.findall(r"[a-z0-9]{4,}", question.lower())
        if word not in STOP_WORDS
    ))[:5]
    if not terms:
        raise ValueError("Ask a more specific question about the published evidence.")
    filters = " || ".join(
        f'(text match "*{term}*" || event->title match "*{term}*")'
        for term in terms
    )
    return (
        '*[_type == "evidenceClaim" && (' + filters + ')]'
        '|order(observedAt desc)[0...35]' + CLAIM_PROJECTION
    )
