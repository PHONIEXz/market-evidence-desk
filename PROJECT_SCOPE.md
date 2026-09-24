# Market Evidence Desk: Project Scope and Finish Checklist

Last reviewed: 2026-09-24

This document is the scope lock for the project. New work should map to this
document. Anything outside the scope belongs in the parking lot until the
contest submission is finished.

## North-star outcome

Market Evidence Desk is a public, source-grounded research desk for crypto
evidence. A visitor asks a focused question, the system retrieves published
Sanity records and Knowledge Base entries, and the agent returns a concise
answer with traceable sources, dates, uncertainty, and visible disagreement.

It is a research and evidence product, not a live trading terminal.

## Core user flow

1. The visitor opens the public research desk.
2. They inspect the published evidence graph and source links.
3. They choose a guided comparison or submit a scoped research question.
4. The server calls Sanity Context and the configured model.
5. The response is rendered with source links, dates, tool transparency, and a
   clear explanation when the requested information is outside the Sourcebook.

## Scope guardrails

- Use published Sanity sources, events, claims, and Sourcebook entries.
- Keep every factual answer tied to a source URL and publication/observation
  date where available.
- Keep conflicting claims visible; do not silently blend them into one fact.
- Keep human review separate from machine synthesis.
- Reject unrelated questions, prompt injection, long prompts, and arbitrary
  case IDs.
- Do not claim that a historical source is current news.
- Do not put Sanity tokens or model keys in browser code or the repository.

## Explicitly out of scope for the contest build

- Live Bitcoin, crypto, forex, stock, or commodity prices.
- Real-time market feeds or price alerts.
- Buy/sell recommendations, price predictions, or financial advice.
- Wallet connections, private keys, orders, payments, or trading execution.
- A general-purpose web-search chatbot.
- Unreviewed automatic publishing of research briefs.
- New product areas such as accounts, billing, social posting, or unrelated
  dashboards.

Live-data integration can be reconsidered after the contest as a separate,
clearly labelled product layer. It must not be mixed into the evidence desk
without a new scope decision.

## Completed foundation

- Sanity project `cxjysvlq`, `production` dataset, deployed schema, and hosted
  Studio.
- Public root-level seed records for sources, market events, and evidence
  claims.
- SEC proof-of-reserves material plus PCAOB and Kraken context.
- Stablecoin reserve-backing disagreement material, including both dated
  perspectives.
- Sourcebook Knowledge Base `kbu9WNgZ9ocF`, rebuilt successfully. The current
  outline visibly includes stablecoin regulation and proof-of-reserves topics.
- Context MCP endpoint and the Python research agent.
- Gemini configuration with fallback handling and OpenAI-compatible fallback.
- Required retrieval checks for `groq_query` and `knowledge_base_read`.
- Scoped question validation and prompt-injection protections.
- Public web desk with comparison, disagreement, source graph, loading, retry,
  and fictional-demo fallback states.
- Concise AI answer style: direct answer first, short bullets, source section,
  no invented URLs/dates, and explicit limits.
- Vercel web deployment and local tests/builds passing during the last verified
  milestone.

## Remaining work, in order

### 1. Final Sourcebook review

- Open the rebuilt Sourcebook Entries and inspect the stablecoin and
  proof-of-reserves entries.
- Check Issues and Instructions for unresolved or misleading conflicts.
- Confirm the dataset source includes `source`, `marketEvent`, and
  `evidenceClaim` documents.
- Confirm the entries cite distinct SEC, PCAOB, Kraken, SEC staff, and
  Commissioner sources where applicable.
- Leave questionable claims in human review rather than approving them blindly.

### 2. End-to-end agent verification

Run and record these three tests:

1. Proof-of-reserves limits: returns the SEC date, URL, and limitations.
2. Stablecoin disagreement: names both dated perspectives and explains the
   disagreement without declaring one automatically correct.
3. Live-price request: clearly says current price data is outside the
   Sourcebook and does not invent a price or recommendation.

For each test, confirm that the expected Sanity tools run and that the answer
contains only source-backed links.

### 3. Scope-facing web polish

- Rename the price-oriented tab to **Data coverage** or **Sourcebook limits**.
- Add a visible notice that the desk uses published evidence, not live market
  feeds.
- Show source publication dates and, where useful, Sourcebook last-built time.
- Keep the animated logo, title motion, opening text, and disagreement view.
- Recheck mobile layout, loading states, retry behavior, and empty states.

### 4. Hosted endpoint and deployment verification

- Confirm Vercel Preview has `AGENT_DEMO_ENABLED=1` only when intentionally
  testing the hosted agent.
- Confirm the organization Context Viewer token and model key remain server
  side.
- Confirm the hosted endpoint reports ready and uses the intended Knowledge
  Base, not an unintended raw-dataset-only path.
- Run the three tests above against the deployed preview.
- Promote to Production only after the preview passes.

### 5. Quality and safety pass

- Run the Python unit tests.
- Run the browser graph tests.
- Run the public web build.
- Check every visible source link and date.
- Verify fictional examples are labelled as fictional.
- Verify no secret, token, private URL, or unsupported live claim appears in
  the UI, logs, README, or demo recording.

### 6. Contest submission package

- Freeze the final scope and commit the final code.
- Update README with the final architecture, setup, limitations, and demo
  steps.
- Prepare a short demo showing source graph, comparison, disagreement, agent
  tools, citations, and the live-data boundary.
- Record the public website, Studio/Sourcebook evidence, repository URL, and
  Sanity project ID.
- Prepare the DEV post using `#sanitychallenge` and describe Context MCP
  honestly.
- Recheck the official contest deadline and eligibility rules immediately
  before submitting; the repository currently records October 4, 2026,
  11:59 PM PDT.

## Definition of done

- [ ] Sourcebook status is ready and its rebuilt entries contain the new
      stablecoin and proof-of-reserves material.
- [ ] No important unresolved issue is being presented as settled fact.
- [x] All three hosted agent cases returned source-backed answers and both Sanity tool receipts on the 2026-09-24 feature preview.
- [x] The website clearly states that live prices are out of scope.
- [x] Preview deployment works with model and Sanity credentials on the server side.
- [x] Python and Node tests, public web build, and desktop browser smoke checks pass.
- [ ] README, demo recording, and contest submission text are complete.
- [ ] No new feature is added unless it directly improves this checklist.

The hosted model had intermittent timeouts during verification. The final
single-pass agent build completed `compare`, `dispute`, and `price` once each;
that is a successful snapshot, not a guarantee of future model availability.
Sourcebook Issues and the mobile layout still require a final human check.

## Change-control rule

Before accepting a new feature, ask: **Does this improve source-grounded
research, evidence comparison, disagreement handling, citation quality,
human review, contest demonstration, or reliability?** If the answer is no,
write it in a post-contest ideas list instead of building it now.
