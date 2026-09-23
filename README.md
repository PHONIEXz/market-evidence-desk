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
Knowledge Base (`kbu9WNgZ9ocF`) has two sources: a March 23, 2023
[SEC investor alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities)
and the Sanity `production` dataset. The Studio schema is deployed. To use the dataset through Context MCP, deploy the hosted Studio application too with `npm run studio:deploy`; schema deployment alone does not register the Studio. The dataset has
**three published documents**: a source, a research question, and an evidence claim,
all grounded in that one historical alert. The Knowledge Base was rebuilt from both
sources into five entries. The read-only `market-evidence-research` Context MCP
endpoint serves the dataset with a filter limited to `source`, `marketEvent`, and
`evidenceClaim`; its preview shows all three. The Knowledge Base is not attached
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
a command-line prototype. The endpoint preview finds all three documents, but
no authenticated model query has been verified against this project yet.
Questions about current markets still lack current evidence and must be declined.

## Edit real content in Sanity Studio

The Studio configuration now points to project `cxjysvlq`, dataset `production`. The project ID is public metadata, not an API key. From this directory:

```bash
npm install
npx sanity login
npm run schema:deploy
npx sanity documents create sanity/seed/sec-investor-alert.json --missing
npm run studio:deploy
npm run studio
```

Open `http://localhost:3333` and sign in with the Sanity account that owns the project. The hosted Studio deployment asks for a unique `*.sanity.studio` hostname on the first run. The seed command has been run successfully for the three linked published documents (a Source, Research question, and Evidence claim) based on the March 23, 2023 SEC alert. `--missing` skips their fixed IDs if already created. Review the claim in Studio: its human review state is `needs-human-review`, and the seed records an observation time rather than a live price or market event. Add newer primary sources before making current-market claims. The `web/` demo still reads fictional JSON; it is not yet connected to the Studio dataset or an AI model.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- A transparent, deterministic research brief assembled from fictional sample claims.
- An AI agent command-line runner wired for Sanity Context MCP; the endpoint finds three documents, and the live model connection still needs private credentials and verification.
- The SEC page and three structured Sanity documents ingested into one Knowledge Base and rebuilt into five entries. A separate endpoint is needed to serve those entries over MCP. They are historical guidance, not live market data.
- Deployed Sanity document schemas for sources, events, evidence claims, and briefs.

## Next integration steps

1. Review the published claim and the generated Knowledge Base entries against the source. Never present the demo examples or the 2023 alert as current news.
2. Configure the local `.env` with an organization Context Viewer token and an OpenAI API key, then verify the agent returns the SEC URL and publication date and abstains when newer evidence is missing. A separate Knowledge Base-only endpoint is optional if the agent needs those entries instead of GROQ access to the dataset.
3. Replace demo JSON with scoped Sanity reads and add a human approval transition before publishing any brief.
4. Record a Binance demo showing the research workflow, including one conflicting evidence case. Confirm the contest's full rules, posting method, and jurisdiction requirements from its original post before entering.
5. For DEV's Sanity Challenge Path One, submit a DEV post with `#sanitychallenge`, the Sanity project ID, working demo, code, and an honest account of the agent's use of Context MCP. Deadline: October 4, 2026, 11:59 PM PDT. Entrants must meet the contest's age and other eligibility rules.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
