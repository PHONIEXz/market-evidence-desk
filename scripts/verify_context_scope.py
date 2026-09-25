"""Preview the bounded dataset selection for the Sourcebook Knowledge Base.

This is a read-only, anonymous check. Edit the dataset source query in Sanity
Context separately; running this script does not change the Knowledge Base.
"""

import sys

if __package__:
    from .verify_published_questions import public_query
else:
    from verify_published_questions import public_query


MAX_DATASET_DOCUMENTS = 140
OTHER_SOURCE_ALLOWANCE = 1  # The Sourcebook also indexes the SEC alert URL.
PLAN_LIMIT = 150

# Sources sort ahead of claims so every original publication retains metadata.
# The same source/claim links remain queryable in full via Context GROQ mode.
DATASET_SOURCE_QUERY = (
    '*[_type in ["source", "evidenceClaim"]] '
    '| order(_type desc, observedAt desc, _id asc)[0...140]'
    '{_id,_type,title,url,publishedAt,kind,notes,text,stance,'
    '"question":event->title,"questionSummary":event->summary,'
    '"sourceTitle":source->title,"sourceUrl":source->url,'
    '"sourcePublishedAt":source->publishedAt}'
)


def preview():
    selected = public_query(DATASET_SOURCE_QUERY)
    if not isinstance(selected, list):
        raise ValueError("The dataset source query returned no document list.")
    counts = {name: sum(doc.get("_type") == name for doc in selected)
              for name in ("source", "evidenceClaim")}
    eligible = public_query('count(*[_type in ["source", "evidenceClaim"]])')
    if not isinstance(eligible, int) or eligible < len(selected):
        raise ValueError("The dataset count did not match the query results.")
    print(f"Dataset records selected: {len(selected)}/{eligible} eligible "
          f"({counts['source']} sources, {counts['evidenceClaim']} claims).")
    print(f"Allowing {OTHER_SOURCE_ALLOWANCE} website record: "
          f"at most {len(selected) + OTHER_SOURCE_ALLOWANCE}/{PLAN_LIMIT} indexed documents "
          "for these two sources.")
    if len(selected) > MAX_DATASET_DOCUMENTS or len(selected) + OTHER_SOURCE_ALLOWANCE > PLAN_LIMIT:
        raise ValueError("The Sourcebook selection exceeds its reserved plan budget.")
    if eligible > len(selected):
        print("Some claims are not indexed in the Sourcebook; "
              "Context GROQ mode still reads the published dataset at request time.")


if __name__ == "__main__":
    try:
        preview()
    except (OSError, KeyError, ValueError) as error:
        print(f"Could not verify Sourcebook scope: {error}", file=sys.stderr)
        sys.exit(1)
