# Market Evidence Desk

An early working slice for two September 2026 challenges. This project is deliberately **research only**: no wallet, keys, orders, price predictions, or live trading.

## Run the interactive demo

```bash
cd market-evidence-desk
python -m http.server 8000
```

Open `http://localhost:8000/web/`. The demo uses **fictional illustrative data**, not current market facts.

Validate the source and claim graph with `python scripts/validate_demo.py`.

## Run the Sanity Context research agent

Context is enabled for organization `oso5hthoq`. The **Market Evidence Desk Sourcebook**
Knowledge Base (`kbu9WNgZ9ocF`) currently has one real source: a March 23, 2023
[SEC investor alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities),
ingested as one page and organized into three cited entries. The read-only
`market-evidence-research` Context MCP endpoint serves the `production` dataset
with a filter limited to `source`, `marketEvent`, and `evidenceClaim`. The dataset
still has **zero published documents**. The SEC Knowledge Base is ready, but is
not attached to that dataset endpoint; it needs a separate Knowledge Base
endpoint to be queried by this runner. Create an **organization** API token with
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
a command-line prototype. No live query has been verified against this
project yet. The Knowledge Base has historical SEC guidance, but the current
endpoint cannot query it. With an empty dataset, the agent must abstain.

## Edit real content in Sanity Studio

The Studio configuration now points to project `cxjysvlq`, dataset `production`. The project ID is public metadata, not an API key. From this directory:

```bash
npm install
npx sanity login
npm run schema:deploy
npx sanity documents create sanity/seed/sec-investor-alert.json --missing
npm run studio
```

Open `http://localhost:3333` and sign in with the Sanity account that owns the project. The seed command will create three linked published documents (a Source, Research question, and Evidence claim) based on the March 23, 2023 SEC alert. `--missing` skips their fixed IDs if already created. Review the claim in Studio: its human review state is `needs-human-review`, and the seed records an observation time rather than a live price or market event. Add newer primary sources before making current-market claims. The `web/` demo still reads fictional JSON; it is not yet connected to the Studio dataset or an AI model.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- A transparent, deterministic research brief assembled from fictional sample claims.
- An AI agent command-line runner wired for Sanity Context MCP; the endpoint exists and its live model connection still needs a private token and verification.
- One cited SEC page ingested in Sanity Context as three Knowledge Base entries; a separate endpoint is needed to serve it over MCP. It is historical guidance, not live market data.
- Sanity document schemas for sources, events, evidence claims, and briefs, ready to register in a new Sanity project.

## Next integration steps

1. Deploy the Studio schema and publish real research documents; never present the demo examples as current news.
2. Add the published dataset as a source of the existing Knowledge Base and rebuild its entries. Give the Knowledge Base its own MCP endpoint to serve its SEC entries. Configure the local `.env` with an organization Context Viewer token and an OpenAI API key, and verify the agent returns source URLs and abstains when sources are missing or contradictory.
3. Replace demo JSON with scoped Sanity reads and add a human approval transition before publishing any brief.
4. Record a Binance demo showing the research workflow, including one conflicting evidence case. Confirm the contest's full rules, posting method, and jurisdiction requirements from its original post before entering.
5. For DEV's Sanity Challenge Path One, submit a DEV post with `#sanitychallenge`, the Sanity project ID, working demo, code, and an honest account of the agent's use of Context MCP. Deadline: October 4, 2026, 11:59 PM PDT. Entrants must meet the contest's age and other eligibility rules.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
