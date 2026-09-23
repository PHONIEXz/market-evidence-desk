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

Context is enabled for organization `oso5hthoq`. An empty Knowledge Base,
`kbu9WNgZ9ocF`, exists but has no sources or built entries. Deploy the Studio
schema, publish actual research documents, add the dataset as a Knowledge Base
source and build it, then create a Context MCP endpoint. Create an **organization**
API token with **Context Viewer** access. A project token will not authenticate
to Context.

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
project yet. If the dataset has no published content, it cannot give a
grounded answer.

## Edit real content in Sanity Studio

The Studio configuration now points to project `cxjysvlq`, dataset `production`. The project ID is public metadata, not an API key. From this directory:

```bash
npm install
npx sanity login
npm run studio
```

Open `http://localhost:3333` and sign in with the Sanity account that owns the project. Create **Source**, **Research question**, and **Evidence claim** documents in that order. Give each real claim a working source URL, original publication time, and observation time. To make the schema available to Sanity Context's dataset mode, run `npm run schema:deploy` after login. The `web/` demo still reads fictional JSON; it is not yet connected to the Studio dataset or an AI model.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- A transparent, deterministic research brief assembled from fictional sample claims.
- An AI agent command-line runner wired for Sanity Context MCP; its live connection still needs to be configured and verified.
- Sanity document schemas for sources, events, evidence claims, and briefs, ready to register in a new Sanity project.

## Next integration steps

1. Deploy the Studio schema and publish real research documents; never present the demo examples as current news.
2. Add the published dataset as a source of the existing Knowledge Base and build its entries. Create a scoped MCP endpoint, configure the local `.env` with an organization Context Viewer token and an OpenAI API key, and verify the agent returns source URLs and abstains when sources are missing or contradictory.
3. Replace demo JSON with scoped Sanity reads and add a human approval transition before publishing any brief.
4. Record a Binance demo showing the research workflow, including one conflicting evidence case. Confirm the contest's full rules, posting method, and jurisdiction requirements from its original post before entering.
5. For DEV's Sanity Challenge Path One, submit a DEV post with `#sanitychallenge`, the Sanity project ID, working demo, code, and an honest account of the agent's use of Context MCP. Deadline: October 4, 2026, 11:59 PM PDT. Entrants must meet the contest's age and other eligibility rules.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
