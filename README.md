# Market Evidence Desk

An early working slice for two September 2026 challenges. This project is deliberately **research only**: no wallet, keys, orders, price predictions, or live trading.

## Run the research desk locally

```bash
cd market-evidence-desk
python scripts/serve.py
```

Open `http://127.0.0.1:8000/web/`. The default view reads the **published** `cxjysvlq/production` Sanity dataset through the local read-only `/api/graph` route; it does not need API keys or browser CORS settings. If Sanity returns no research questions, the desk shows an empty state. Select **Fictional demo** to see the separate illustrative graph; those entries are not market facts. The server binds to localhost and serves only the web assets, fictional JSON, and the scoped graph route. A private dataset will require a separate authenticated server-side integration later; never put a Sanity token in browser code.

Validate the source and claim graph with `python scripts/validate_demo.py`.
Check the read-only graph boundary with `python -m unittest discover -s tests -v`.

## Run the Sanity Context research agent

Context is enabled for organization `oso5hthoq`. The **Market Evidence Desk Sourcebook**
Knowledge Base (`kbu9WNgZ9ocF`) has two sources: a March 23, 2023
[SEC investor alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities)
and the Sanity `production` dataset. The Studio schema is deployed. To use the dataset through Context MCP, deploy the hosted Studio application too with `npm run studio:deploy`; schema deployment alone does not register the Studio. Three documents were previously seeded with dotted IDs, which Sanity restricts to authenticated readers even in a public dataset. The CLI saw those documents because it had a stored login token; an unauthenticated HTTP query returned zero. The corrected seed uses root-level IDs so the public desk can read the SEC source, research question, and evidence claim. The Knowledge Base was previously rebuilt from the SEC page and Sanity dataset into five entries. The read-only `market-evidence-research` Context MCP
endpoint serves the dataset with a filter limited to `source`, `marketEvent`, and
`evidenceClaim`; its earlier preview showed all three. The Knowledge Base is not attached
to this dataset-mode endpoint. To query the entries through MCP, configure a
separate Knowledge Base-only endpoint. Create an **organization** API token with
**Context Viewer** access; a project token will not authenticate to Context.

```bash
python -m pip install -r requirements.txt
cp .env.example .env
# Edit .env locally; never commit it or paste tokens into a public post.
python agent.py "What evidence supports and conflicts with this research question?"
```

The `.env` file needs `SANITY_CONTEXT_MCP_URL`, `SANITY_ORGANIZATION_TOKEN`,
and `OPENAI_API_KEY`. The agent gets the current schema or Knowledge Base
outline from Context, then uses the Context MCP tools to query content. It is
a command-line prototype. An earlier endpoint preview found all three documents, but
no authenticated model query has been verified against this project yet.
Questions about current markets still lack current evidence and must be declined.

## Edit real content in Sanity Studio

The Studio configuration now points to project `cxjysvlq`, dataset `production`. The project ID is public metadata, not an API key. From this directory:

```bash
npm install
npx sanity login
npm run schema:deploy
npx sanity documents create sanity/seed/sec-investor-alert.json --missing --project-id cxjysvlq --dataset production
npm run studio:deploy
npm run studio
```

Open `http://localhost:3333` and sign in with the Sanity account that owns the project. The hosted Studio deployment asks for a unique `*.sanity.studio` hostname on the first run. The original seed created three linked documents with dotted IDs such as `source.sec-investor-alert-2023-03-23`. Sanity treats every dotted ID as a private path even when the dataset is public. The corrected seed in this branch uses IDs without dots and points the claim references to the new source and question. Run the seed command above once after pulling this branch; `--missing` makes reruns safe. The older dotted documents remain in the dataset and are not modified or deleted. Review the new claim in Studio: its human review state is `needs-human-review`, and the seed records an observation time rather than a live price or market event. Add newer primary sources before making current-market claims. The AI agent remains a separate command-line prototype.

After creating the corrected documents, verify the public query without a token:

```bash
curl -fsSG 'https://cxjysvlq.api.sanity.io/v2025-08-15/data/query/production' \
  --data-urlencode 'perspective=published' \
  --data-urlencode 'query=*[_type in ["source","marketEvent","evidenceClaim"]]{_id,_type}'
```

The result should list the three new root-level IDs. The CLI's `--anonymous` flag does not reliably prove an unauthenticated read in the installed version: its project client may still load the stored CLI token. Use the `curl` command above to verify actual public visibility. Do not start a second `sanity deploy` while the first one is still building. Once a Studio build completes, the CLI supports `sanity deploy --no-build` to upload that existing `dist/` output.

The seeded evidence claim was checked against the linked [March 23, 2023 SEC alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities), specifically its proof-of-reserves discussion. It remains historical guidance and needs a human review decision in this project.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- A transparent, deterministic research brief assembled from published Sanity claims when available, plus a separate fictional sample view. All copied briefs are labeled drafts.
- An AI agent command-line runner wired for Sanity Context MCP; an earlier endpoint preview found the original three documents. Its live model connection still needs private credentials and verification.
- The SEC page and three structured Sanity documents ingested into one Knowledge Base and rebuilt into five entries. A separate endpoint is needed to serve those entries over MCP. They are historical guidance, not live market data.
- Deployed Sanity document schemas for sources, events, evidence claims, and briefs.

## Next integration steps

1. Review the published claim and the generated Knowledge Base entries against the source. Never present the demo examples or the 2023 alert as current news.
2. Configure the local `.env` with an organization Context Viewer token and an OpenAI API key, then verify the agent returns the SEC URL and publication date and abstains when newer evidence is missing. A separate Knowledge Base-only endpoint is optional if the agent needs those entries instead of GROQ access to the dataset.
3. Create and verify the corrected root-level seed documents in the public dataset. The scoped read is wired into the local desk; add a reviewed `researchBrief` approval transition before publishing or sharing briefs automatically. Recheck Knowledge Base entries after the new documents are added to avoid duplicated evidence.
4. Record a Binance demo showing the research workflow, including one conflicting evidence case. Confirm the contest's full rules, posting method, and jurisdiction requirements from its original post before entering.
5. For DEV's Sanity Challenge Path One, submit a DEV post with `#sanitychallenge`, the Sanity project ID, working demo, code, and an honest account of the agent's use of Context MCP. Deadline: October 4, 2026, 11:59 PM PDT. Entrants must meet the contest's age and other eligibility rules.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
