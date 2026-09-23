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
and the Sanity `production` dataset. The [hosted Studio](https://phoniex-market-evidence-desk.sanity.studio/) and its schema are deployed. Three documents were previously seeded with dotted IDs, which Sanity restricts to authenticated readers even in a public dataset. The CLI saw those documents because it had a stored login token; an unauthenticated HTTP query returned zero. The corrected seed uses root-level IDs so the public desk can read the SEC source, research question, and evidence claim. The Knowledge Base was previously rebuilt from the SEC page and Sanity dataset into five entries. The read-only `market-evidence-research` Context MCP
endpoint serves the dataset with a filter limited to `source`, `marketEvent`, and
`evidenceClaim`; its earlier preview showed all three. The agent connects to the same
endpoint in GROQ mode for the structured documents and in Knowledge Base mode for the
Sourcebook, defaulting to this project's Knowledge Base ID. Rebuild and review
the Sourcebook after the corrected seed to spot repeated or outdated evidence.
Create an **organization** API token with
**Context Viewer** access; a project token will not authenticate to Context.

```bash
python -m pip install -r requirements.txt
test -f .env || cp .env.example .env
# Edit .env locally; never commit it or paste tokens into a public post.
python agent.py "What evidence supports and conflicts with this research question?"
```

The `.env` file needs `SANITY_CONTEXT_MCP_URL`, `SANITY_ORGANIZATION_TOKEN`,
and `GEMINI_API_KEY` (the existing spelling `GEMINIAPIKEY` also works). The agent uses
Sourcebook ID `kbu9WNgZ9ocF` even if an older `.env` omits
`SANITY_KNOWLEDGE_BASE_ID`; set that variable only to select a different Knowledge Base. Gemini uses
`GEMINI_MODEL=gemini-3.5-flash-lite` by default, the same model as Signal's
default. If Gemini returns 503 for temporary high demand, the agent opens fresh
Sanity MCP connections and tries `gemini-3.1-flash-lite` as a fallback; set
`GEMINI_FALLBACK_MODEL` to choose another fallback. Change `GEMINI_MODEL` if your
API key has access to a different compatible model. Alternatively, `OPENAI_API_KEY` works if no Gemini key
is set. The Gemini key and Sanity organization token are separate credentials.
The agent obtains both initial contexts and must actually call
`groq_query` and `knowledge_base_read` before displaying an answer.
If both Gemini models return HTTP 503, run `python scripts/diagnose_gemini.py`.
It checks the model catalog without generating text, then makes two short requests
with the fallback model, one through the native Gemini API and one through Google's
OpenAI-compatible endpoint. It prints only model and HTTP statuses, never the key or
response body. Share those status lines to tell whether the issue affects basic
Gemini calls or the agent's longer request.
After confirming both generation routes return 503, use
`python scripts/diagnose_gemini.py --catalog-only` to check key access without
repeating the generation requests.
It avoids counting a copied SEC fact as independent corroboration. It is a command-line
prototype. An authenticated Gemini run on September 23, 2026 logged both `groq_query`
and `knowledge_base_read`, then answered the SEC proof-of-reserves question with the
source URL and March 23, 2023 publication date. Its detailed answer was compared to
the original SEC alert. The two retrieval paths have therefore been exercised live;
the agent's response to a current-market question remains unverified. Ask about this
week's market and confirm it declines without new evidence. Never share the `.env`
file or its token values.

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

Open `http://localhost:3333` for local development, or the [deployed Studio](https://phoniex-market-evidence-desk.sanity.studio/), and sign in with the Sanity account that owns the project. The original seed created three linked documents with dotted IDs such as `source.sec-investor-alert-2023-03-23`. Sanity treats every dotted ID as a private path even when the dataset is public. The corrected root-level seed was created in `cxjysvlq/production` and verified through unauthenticated HTTP. The older dotted documents remain in the dataset and are not modified or deleted. Run the corrected seed with `--missing` only if setting up a new dataset. Review the new claim in Studio: its human review state is `needs-human-review`, and the seed records an observation time rather than a live price or market event. Add newer primary sources before making current-market claims. The AI agent remains a separate command-line prototype.

After creating the corrected documents, verify the public query without a token:

```bash
curl -fsSG 'https://cxjysvlq.api.sanity.io/v2025-08-15/data/query/production' \
  --data-urlencode 'perspective=published' \
  --data-urlencode 'query=*[_type in ["source","marketEvent","evidenceClaim"]]{_id,_type}'
```

The result should list the three new root-level IDs. The CLI's `--anonymous` flag does not reliably prove an unauthenticated read in the installed version: its project client may still load the stored CLI token. Use the `curl` command above to verify actual public visibility. Do not start a second `sanity deploy` while the first one is still building. Once a Studio build completes, the CLI supports `sanity deploy --no-build` to upload that existing `dist/` output.

On a machine with too little RAM to build Studio, use the `Build Sanity Studio` GitHub Actions workflow on this branch. After a successful run, download its artifact from the repository root and deploy the already built files:

```bash
gh run download RUN_ID -R PHONIEXz/market-evidence-desk -n sanity-studio-dist -D dist
test -s dist/index.html
npm run studio:deploy -- --no-build
```

Replace `RUN_ID` with the numeric run ID in the successful Actions run URL. The GitHub workflow builds only; the deploy command uses your existing local Sanity login. Artifacts expire after three days. The `--no-build` deployment still extracts and uploads the Studio manifest, so it needs the source project alongside `dist/`.

The seeded evidence claim was checked against the linked [March 23, 2023 SEC alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities), specifically its proof-of-reserves discussion. It remains historical guidance and needs a human review decision in this project.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- A transparent, deterministic research brief assembled from published Sanity claims when available, plus a separate fictional sample view. All copied briefs are labeled drafts.
- A Gemini research agent calling both Sanity Context `groq_query` and `knowledge_base_read`; the SEC question was checked against the original alert in a live run. Current-market abstention still needs a separate run.
- The SEC page and three structured Sanity documents ingested into one Knowledge Base and rebuilt into five entries. The agent reads entries through Knowledge Base mode on the same Context endpoint. They are historical guidance, not live market data.
- Deployed Sanity document schemas for sources, events, evidence claims, and briefs.

## Next integration steps

1. Review the published claim and the generated Knowledge Base entries against the source. Never present the demo examples or the 2023 alert as current news.
2. Run an adversarial current-market question and confirm the agent declines unsupported live prices, predictions, and trades. Capture the exact tool names and final response for the demo.
3. The corrected root-level seed documents are public and the scoped read is wired into the local desk. Add a reviewed `researchBrief` approval transition before publishing or sharing briefs automatically. Recheck Knowledge Base entries now that the new documents have been added to avoid duplicated evidence.
4. Record a Binance demo showing the research workflow, including one conflicting evidence case. Confirm the contest's full rules, posting method, and jurisdiction requirements from its original post before entering.
5. For DEV's Sanity Challenge Path One, submit a DEV post with `#sanitychallenge`, the Sanity project ID, working demo, code, and an honest account of the agent's use of Context MCP. Deadline: October 4, 2026, 11:59 PM PDT. Entrants must meet the contest's age and other eligibility rules.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
