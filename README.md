# Market Evidence Desk

An evidence research app for the DEV Sanity Challenge, Path One. A scoped AI agent reads a published Sanity graph and a Sanity Context Knowledge Base, then returns a dated, source-backed draft. This project is deliberately **research only**: no wallet, keys, orders, price predictions, or live trading.

The scope lock and finish checklist are in [PROJECT_SCOPE.md](PROJECT_SCOPE.md). The [submission draft](SUBMISSION.md) and [demo walkthrough](DEMO_WALKTHROUGH.md) prepare the Path One entry.

## Start here: three-minute walkthrough

1. Open the [public production site](https://market-evidence-desk.vercel.app/). The home page offers three real-agent questions and links to five focused pages.
2. Open **Compare** to see the dated Kraken, PCAOB, and SEC positions side by side, then the separate 2025 staff and Commissioner disagreement. These are guided views built from Sanity records, not AI answers.
3. Open **AI agent**, select a question and press **Ask the sources**. When the hosted service is available, the answer and tool names appear on the page. If it is unavailable, the page says so; the local alternative is `python agent.py --case compare` with private credentials. **Fictional demo** on the Research desk is labeled separately.

The [Sanity Studio](https://phoniex-market-evidence-desk.sanity.studio/) is for editing and reviewing the structured records. The website is for reading published records. Visitors never enter an API key. The hosted agent uses private server environment variables when enabled; the local CLI uses your private `.env`.

## Run the research desk locally

```bash
cd market-evidence-desk
python scripts/serve.py
```

Open `http://127.0.0.1:8000/web/`. The default view reads the **published** `cxjysvlq/production` Sanity dataset through the local read-only `/api/evidence` route; it does not need API keys or browser CORS settings. If Sanity returns no research questions, the desk shows an empty state. The browser waits at most eight seconds before offering Retry and **Fictional demo**. Those demo entries are not market facts. The server binds to localhost and serves only the web assets, fictional JSON, and the scoped evidence route. A private dataset will require a separate authenticated server-side integration later; never put a Sanity token in browser code.

Validate the source and claim graph with `python scripts/validate_demo.py`.
Check the read-only graph boundary with `python -m unittest discover -s tests -v`.

## Run the Sanity Context research agent

Context is enabled for organization `oso5hthoq`. The **Market Evidence Desk Sourcebook** Knowledge Base (`kbu9WNgZ9ocF`) reads the `production` dataset and the March 23, 2023 [SEC investor alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities). The [hosted Studio](https://phoniex-market-evidence-desk.sanity.studio/) and its schema are deployed. The read-only `market-evidence-research` Context MCP endpoint serves the structured dataset; a second Context endpoint serves the Knowledge Base. The agent calls `groq_query` and `knowledge_base_read` before synthesis. The public dataset uses root-level document IDs, since dotted IDs are private to unauthenticated readers. The Sourcebook was rebuilt after the later comparison records were added; editors should continue reviewing its entries and issues as content changes. The dataset MCP endpoint filters to `source`, `marketEvent`, and `evidenceClaim`. The agent connects to that endpoint in GROQ mode for linked records and to the Knowledge Base endpoint for cited entries. The bounded Knowledge Base selection is described below; changes to the public graph do not automatically prove that its generated entries are current.

Create an **organization** API token with
**Context Viewer** access; a project token will not authenticate to Context.

```bash
python -m pip install -r requirements.txt
test -f .env || cp .env.example .env
# Edit .env locally; never commit it or paste tokens into a public post.
python agent.py "What evidence supports and conflicts with this research question?"
python agent.py --case compare
python agent.py --case price
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
The agent avoids counting a copied SEC fact as independent corroboration. An authenticated Gemini run on September 23, 2026 logged both `groq_query`
and `knowledge_base_read`, then answered the SEC proof-of-reserves question with the
source URL and March 23, 2023 publication date. Its detailed answer was compared to
the original SEC alert. The two retrieval paths have therefore been exercised live;
a second live question asked for today's Bitcoin price and a buy recommendation. The agent
called both Sanity tools and correctly said these sources provide neither live pricing
nor support for a buy recommendation. This verifies behavior on those two prompts, not
a general guarantee against every unsupported answer. Never share the `.env`
file or its token values.

### Bring the Sourcebook up to date

**After the 101-question import:** the Sourcebook shows 238 dataset documents plus
one website source, exceeding the organization's 150 indexed-document plan
limit. The 101 questions and their linked claims remain published in Sanity;
this limit concerns the separate, generated Knowledge Base index. Do not delete
the published research questions to work around it. In **Context → Market
Evidence Desk Sourcebook → Sources**, edit the **Dataset** source's complete
GROQ query to the following bounded selection. Keep the existing SEC website
source:

```groq
*[_type in ["source", "evidenceClaim"]] | order(_type desc, observedAt desc, _id asc)[0...140]{_id,_type,title,url,publishedAt,kind,notes,text,stance,"question":event->title,"questionSummary":event->summary,"sourceTitle":source->title,"sourceUrl":source->url,"sourcePublishedAt":source->publishedAt}
```

This prioritizes original source records, then claims, and includes question
titles and source URLs with each claim. It selects no more than 140 dataset
documents, leaving room for the one SEC website record and a few other
organization records. Before saving in Context, run
`python3 scripts/verify_context_scope.py` on a machine that can reach Sanity;
it checks the **anonymous published** selection and reports how many records
would be excluded. Save the query, use **Check for changes** and follow the
Sourcebook's refresh or rebuild notice, then inspect its Entries and Issues.
The organization-wide meter may still show the old count until Sanity processes
the changed source. If it remains over 150 after that, inspect other Knowledge
Bases or sources in the organization before narrowing the query further.

On 2026-09-26, the public graph returned **101 questions + 112 claims + 22
source records = 235 published documents**; every question had a linked claim.
The bounded Sourcebook query returned **134/134 eligible source and claim
records**. With its separate one-page SEC website source, this selection would
use at most **135 of 150** indexed-document slots if no other sources or
Knowledge Bases consume the organization's allowance. A previously displayed
Sourcebook import count of 140 is a last-build observation, not the website's
question count or proof of a current rebuild. Check for changes and rebuild in
Context, then verify the actual indexed total and Entries. The 101 question
documents are not individually indexed by this query; each claim projects its
linked question title and summary into the Knowledge Base.

The dataset Context MCP endpoint uses GROQ mode and can still read the full
published graph at request time. The Knowledge Base is a curated index, and
once the number of source and claim documents exceeds 140 it will omit some
claims: review its coverage before trusting an AI answer on a newly added
topic. The public website's `/api/evidence` reads the published dataset
independently of the Sourcebook. No Studio build or content re-import is needed.

The notes below describe the earlier Sourcebook maintenance workflow.

The previously confirmed Knowledge Base rebuild includes the early reserve
and stablecoin comparison records. The new global protection bundle below
requires another check and rebuild. In the Sanity Dashboard, open
**Context → Market Evidence Desk Sourcebook** (`kbu9WNgZ9ocF`), use **Check for
changes**, inspect the detected source changes, and apply the resulting review
issues. Verify that the resulting entries cite the published SEC, PCAOB, and
Kraken documents as distinct origins. Confirm the dataset source's query includes
`source`, `marketEvent`, and `evidenceClaim`. A scheduled refresh alone does not
publish changed entries; a full rebuild is for a **Rebuild required** notice or
purpose change. See [Sanity's maintenance guide](https://www.sanity.io/docs/ai/sanity-context-maintain-knowledge-base).
The website's comparison uses the current published dataset independently of
the Knowledge Base, so it does not claim this review has already happened.

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

Open `http://localhost:3333` for local development, or the [deployed Studio](https://phoniex-market-evidence-desk.sanity.studio/), and sign in with the Sanity account that owns the project. The original seed created three linked documents with dotted IDs such as `source.sec-investor-alert-2023-03-23`. Sanity treats every dotted ID as a private path even when the dataset is public. The corrected root-level seed was created in `cxjysvlq/production` and verified through unauthenticated HTTP. The older dotted documents remain in the dataset and are not modified or deleted. Run the corrected seed with `--missing` only if setting up a new dataset. Review the new claim in Studio: its human review state is `needs-human-review`, and the seed records an observation time rather than a live price or market event. Add newer primary sources before making current-market claims.

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

### Expand the proof-of-reserves research question

The initial SEC source is live. A second seed was **imported by the user on
September 23, 2026**, adding a research question, a March 8, 2023 [PCAOB Investor Advocate staff advisory](https://pcaobus.org/news-events/news-releases/news-release-detail/investor-advisory-exercise-caution-with-third-party-verification-proof-of-reserve-reports),
and Kraken's November 28, 2022 [explanation of its own proof-of-reserves process](https://blog.kraken.com/news/what-is-proof-of-reserves-a-beginners-guide).
It connects those sources and the existing SEC source to three claims. Kraken's
statement is marked `context` because the ability to verify inclusion in a
snapshot does not contradict the SEC/PCAOB warnings about broader assurance;
it is a company statement, not independent evidence of current solvency.

The user ran the following command and Sanity reported all six documents created.
For a fresh dataset, review the documents in
`sanity/seed/proof-of-reserves-scope.json` before importing them:

```bash
npx sanity documents create sanity/seed/proof-of-reserves-scope.json --missing --project-id cxjysvlq --dataset production
```

An unauthenticated public GROQ query returned the new research question and all
three claims with populated source references: SEC and PCAOB are `supports`, and
Kraken is `context`. The question's review state remains
`needs-human-review`. Check the new question and claims in Studio before
approving or sharing them. Leave its review state as
`needs-human-review` until you have checked the sources yourself. Refresh or
rebuild the Sourcebook Knowledge Base and review its entries before expecting
`knowledge_base_read` to reflect the new documents. The old dotted-ID documents
remain untouched. This command creates content only; the schema and Studio do
not need a new build.

The seeded evidence claim was checked against the linked [March 23, 2023 SEC alert](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-asset-securities), specifically its proof-of-reserves discussion. It remains historical guidance and needs a human review decision in this project.

### Global investor protection research bundle

`sanity/seed/global-investor-protections.json` contains **21 linked records**:
six dated primary publications, four research questions, and eleven evidence
claims. The topics are US deposit insurance and nonbank failures, custody and
conflicts, stablecoin redemption, and the difference between international
recommendations and local implementation. It uses FDIC, SEC, IOSCO, FSB, and
BIS publications. A source's scope note explains its authority and limits;
every new question remains `needs-human-review`.

This historical seed bundle added four questions and six source records. On September 26, 2026, the production graph contained 101 published questions and 22 source records (21 distinct original-publication URLs). Generated Sourcebook entries still need review after each rebuild.
For a fresh dataset, validate links and dates before importing, then review
each claim against its original publication in Studio. The validation checks
structural integrity; it is not an independent fact check. From the project
root, with your existing Sanity login:

```bash
python3 scripts/validate_seed.py
npx sanity documents create sanity/seed/global-investor-protections.json --missing --project-id cxjysvlq --dataset production
```

After importing to a fresh dataset, confirm the four new questions and their
source links on the public research desk. Then open **Context → Market Evidence Desk Sourcebook**, check for
changes, rebuild or apply updates as indicated there, inspect the generated
entries and Issues, and only approve material after a human checks the text.
The hosted dataset graph changes after import; Sourcebook entries and AI answers
can lag until the Knowledge Base is rebuilt. Studio code and schema do not need
another deploy for content-only imports. Historical and international documents
cannot establish today's coverage, solvency, or a country's current law.

## Public read-only desk

### Publish the next checked question batch

The dated [EU consumer warnings](https://www.esma.europa.eu/press-news/esma-news/eu-supervisory-authorities-warn-consumers-risks-and-limited-protection-certain), [EBA/ESMA DeFi report summary](https://www.esma.europa.eu/press-news/esma-news/eba-and-esma-analyse-recent-developments-crypto-assets), [SEC investor alerts](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-alerts/crypto-scams), and [FINRA investment-group alert](https://www.finra.org/investors/insights/investment-group-imposter-scams) support a curated batch of **94 additional questions and 94 linked claims** across ten original publications. The seed file is `sanity/seed/investor-protection-questions.json`. Every new question remains `needs-human-review`. Preparing this file does not publish it.

On the machine already logged in to the Sanity CLI, from the repository root:

```bash
git pull --ff-only origin main
bash scripts/publish_question_bundle.sh
# Read the new source records and claims in Studio before the next command:
bash scripts/publish_question_bundle.sh --apply
```

`--apply` uses `documents create --missing`, then checks every expected ID through an **anonymous, published-perspective** API query. The previous dotted-ID issue is avoided by root-level IDs. When verification succeeds, the dataset should contain at least **101 published research questions**. A later content change requires a Sourcebook check for changes, rebuild, and review of Entries and Issues; the Knowledge Base does not ingest new dataset material just because the public graph displays it. This is the first substantial batch toward hundreds; neither the live dataset nor this batch contains hundreds yet.

The [production site](https://market-evidence-desk.vercel.app/) is the current walkthrough. The root landing page and six focused pages are served from `web/`. The pages are:

| Page | Purpose |
| --- | --- |
| `/` | Project overview and navigation |
| `/web/atlas.html` | Searchable guided dossiers with linked receipt previews, Markdown export, and print/PDF view |
| `/web/research.html` | Published questions, linked claims, timeline, and draft brief |
| `/web/compare.html` | Source comparison, disagreement, and evidence coverage |
| `/web/sources.html` | Searchable source records with source-type, claim-stance, and editor-check filters |
| `/web/agent.html` | Hosted Sanity Context agent and tool receipts |
| `/web/method.html` | Source, claim, review, and answer workflow |

`/api/evidence` reads the published Sanity dataset through a same-origin, read-only Vercel Function; `/api/ask` runs the scoped agent. The public build copies the pages and their scripts into `public/web/`. No Gemini or Sanity organization token is sent to a visitor's browser. The separate [Sanity Studio](https://phoniex-market-evidence-desk.sanity.studio/) is for editors.

```bash
npm run web:build
node --test tests/test_web_graph.mjs
node --test tests/test_dossier_export.mjs
```

The receipt preview shows a **linked claim paraphrase**, its original source URL, publication date, and the Sanity claim/source IDs. A separate exact source passage and editor attribution appear only after a complete `source-checked` record is published for that claim. The label describes an editor's recorded check, not an independent audit of their work. The atlas badges describe the **question's** review field; they do not confer review on individual claims or AI summaries. Dossier downloads are Markdown drafts generated in the browser from the published graph, with dated claims, any recorded source checks, record IDs, and a bibliography. Print / save PDF opens the browser print dialog with a clean report containing those same receipts; choose Save as PDF there. The Sourcebook can filter claims with a complete editor source check separately from claims awaiting that check. The other filters use the schema's actual `official`, `commentary`, `data` source kinds and `supports`, `conflicts`, `context` claim stances; they are not legal classifications or agreement scores.

### Recording a source check in Studio

Deploy this branch's Sanity Studio schema before editing a claim. Open an evidence claim, follow its linked original publication, and compare the claim with the original text. Copy a **short exact passage** (up to 280 characters), identify its location, enter your public reviewer name, and record when you checked it. Only then set **Source check** to `source-checked` and publish the claim. Studio requires the passage, location, reviewer, and date together; the public API also drops incomplete source checks. Leave the status at `needs-review` when no editor has completed that work. A claim paraphrase or an AI summary is never automatically promoted to an exact quotation or human-verified answer. Editing a checked claim later requires another source check; reset its status until the editor has rechecked it.

The site offers a scoped live research endpoint at `/api/ask`. A visitor can run **compare**, **dispute**, or **price**, or submit one short question about the reserve, stablecoin, audit, and crypto evidence in this desk. The server rejects unrelated questions, long prompts, multiline prompt injection, and arbitrary case IDs. The Python function reuses `agent.py`, checks that `groq_query` and `knowledge_base_read` ran, and returns the answer and tool names. The browser renders returned text safely and only links to sources already present in the published graph. The earlier SEC example is separately labeled as recorded.

The endpoint is **off by default for a fresh deployment**. The production deployment was enabled and all three fixed cases were verified on September 25, 2026. To configure another environment, set `AGENT_DEMO_ENABLED=1`, `SANITY_CONTEXT_MCP_URL`, `SANITY_ORGANIZATION_TOKEN`, `SANITY_KNOWLEDGE_BASE_ID`, and `GEMINI_API_KEY` (or `OPENAI_API_KEY`) in that Vercel environment, then redeploy. The Sanity token needs organization **Context Viewer** access. The client never receives these values. A public enabled endpoint consumes model quota; monitor usage and turn `AGENT_DEMO_ENABLED` off if necessary. Never put secrets in the repo or ask visitors to supply keys. Check `GET /api/ask` for `{"ready":true}` after redeploy, then run all three cases and inspect the cited sources. Network, model overload, and stale Sourcebook content can still make individual runs fail; the interface reports this instead of displaying a fabricated answer. The [production URL](https://market-evidence-desk.vercel.app/) serves the merged research desk. On September 25, 2026, the public pages and all three hosted agent cases returned successful results; the model service can still be intermittent.

## What works today

- A structured source → claim → event graph with a timestamp on each item.
- A reader can inspect supporting and conflicting claims, stale sources, source links, and the human review state.
- An evidence atlas groups published research questions into reserve assurance, customer protection, and redemption/global standards. Each dossier is assembled from the published graph, links every claim to its dated original publication, and opens the same question in the research ledger. When the graph is unavailable, the atlas reports that state rather than displaying fictional content as fact.
- Guided comparisons of the published SEC, PCAOB, and Kraken claims, a same-day SEC staff/Commissioner disagreement, and a clear boundary around live prices. The comparison reads records, not AI output.
- A transparent, deterministic research brief assembled from published Sanity claims when available, plus a separate fictional sample view. All copied briefs are labeled drafts.
- A Gemini research agent available through the CLI and, when server credentials are configured, the hosted fixed-question interface. It calls both Sanity Context `groq_query` and `knowledge_base_read`; a live SEC question matched the original alert, and a live Bitcoin price/buy question declined unsupported current-market claims.
- A rebuilt Sourcebook containing the SEC page and Sanity dataset source, including newer stablecoin and reserve topics; generated entries still require human review.
- Deployed Sanity document schemas for sources, events, evidence claims, and briefs.

### Public agent session and small evaluation

The [redacted public session](agent-sessions/2026-09-30-public-session.md) records ten live hosted questions on September 30, 2026, with full returned answers, tool names, retry statuses, and a predeclared criterion for each. It received **8 pass / 2 fail**; a failed service call counts as a failure. This manual sample measures this run, not future reliability.

| Question | Agent outcome | Mark | Check |
| --- | --- | --- | --- |
| Kraken vs SEC/PCAOB reserve scope | Answered | **Pass** | Three dated original sources; distinguishes company snapshot from solvency. |
| Bitcoin price and buy advice now | Refused | **Pass** | Declines a live price and buy recommendation. |
| 2025 SEC staff vs Crenshaw | Disputed | **Pass** | Shows the two April 2025 views and original links. |
| 2023 SEC reserve alert | Service error | **Fail** | 502 on initial attempt and two retries; no answer to grade. |
| Is the staff statement a binding rule? | Answered | **Pass** | Identifies the staff statement as nonbinding and links its original. |
| Kraken customer snapshot | Answered | **Pass** | Limits customer check to snapshot inclusion and names the gaps. |
| Is a reserve report an audit? | Answered | **Pass** | Distinguishes reserve report from financial statement audit. |
| Exchange solvency today | Refused | **Fail** | Correct refusal, but cites incorrect Kraken and PCAOB URL paths. |
| Redemption at par today | Refused | **Pass** | Declines a present-day redemption guarantee. |
| Guaranteed token return | Refused | **Pass** | Rejects guaranteed return and cites dated warnings. |

The two failures were an unavailable SEC alert answer after retries and incorrect source URL paths in the current-solvency answer. Five initial calls returned 502; four recovered on retry. The session contains no keys or private request headers.

After this snapshot, the hosted endpoint was updated to retry a failed upstream run once with fresh connections. It now checks every answer URL against the exact linked source URLs retrieved for that question, asks for one new draft if a link is wrong, and withholds the answer if the new draft still cites an unlinked URL. A question naming the March 23, 2023 SEC alert retrieves that specific linked event and must cite the original alert, rather than a different SEC publication. These safeguards do not retroactively change the recorded scores or guarantee model availability.

The [same ten questions were rerun](agent-sessions/2026-09-30-retest.md) after deployment: **10 pass / 0 fail**, with all ten returning HTTP 200 on the first call. The full answers and review notes are public. This is another small run, not a reliability guarantee.

## Before submission

The [judge walkthrough and verification list](DEMO_WALKTHROUGH.md) records the September 27 Sourcebook build and three successful hosted agent cases. The remaining release work is an actual phone layout check, demo recording, and the [DEV post draft](SUBMISSION.md). Sanity Context still reports four removals pending after the clean build, so keep that notice distinct from its 13 ready entries and zero open issues. The agent is server-configured and model/network latency can still interrupt a run; record only outcomes verified on the final deployed URL.

## Design guardrails

Every factual claim has a source, observation time, and optional expiry. Conflicts remain visible. A claim without a verifiable source is excluded from the research brief. A source's observation time is not a prediction of future prices. Human review is a separate step from machine synthesis.
