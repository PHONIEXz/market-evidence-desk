---
title: Market Evidence Desk: an AI researcher that shows its receipts
published: true
tags: devchallenge, sanitychallenge, sanity, ai
---

*This is a submission for the [Sanity Challenge, Path One: Ship an Agent That Queries Real Content](https://dev.to/challenges/sanity-2026-09-16).*

## What I Built

Market Evidence Desk is a public research desk for crypto investor protection questions. It links original publications to dated claims about proof of reserves, custody, deposit insurance, stablecoin redemption, and the gap between international recommendations and local implementation. An exchange may say customers can check inclusion in a reserve snapshot, while accounting and regulatory sources explain why that snapshot cannot establish full liabilities or solvency. SEC staff and a Commissioner also take different positions on what reserve reports demonstrate. Flattening those positions into a single confident answer would lose the point.

The site lets a visitor inspect published source records, follow each claim to its question and original URL, compare dated views, and ask a scoped AI agent. The published Sanity graph contains 101 research questions linked to 22 source records (21 distinct source URLs); the evidence atlas shows them in manageable batches. New source scope notes make clear whether a document is investor education, analysis, or a recommendation to regulators. The agent returns a draft with source links and the names of the Sanity Context tools it used. It declines live Bitcoin prices and buy/sell requests because the Sourcebook does not contain current market feeds. Research drafts remain subject to human review.

## Demo

- [Open Market Evidence Desk](https://market-evidence-desk.vercel.app/)
- [Browse question dossiers and original publications](https://market-evidence-desk.vercel.app/web/atlas.html)
- [Compare the linked evidence](https://market-evidence-desk.vercel.app/web/compare.html)
- [Inspect original sources and claims](https://market-evidence-desk.vercel.app/web/sources.html)
- [Ask the Sanity Context agent](https://market-evidence-desk.vercel.app/web/agent.html?case=dispute)

Judges can test the public app without signing in: start on the home page, open **Show the disagreement**, press **Ask the sources**, then compare the cited answer with the original sources and the guided comparison. On the Research desk, switch to the question about worldwide protections: the 2023 international recommendations and the 2025 implementation review are linked as different kinds of evidence. Try the **live-price boundary** case as a negative test. On September 29, 2026, all three hosted cases (compare, dispute, price) returned cited answers using `groq_query` and `knowledge_base_read` on the public production URL. The agent can take up to two minutes; if the hosted service is temporarily unavailable, the guided comparison and source graph still work, and the local agent can be run with private credentials using the README. The **Fictional demo** on the Research desk is explicitly separate from published records.

## Code

[GitHub repository, production branch](https://github.com/PHONIEXz/market-evidence-desk/tree/main) · [Architecture and setup](https://github.com/PHONIEXz/market-evidence-desk/blob/main/README.md) · [Scope and limitations](https://github.com/PHONIEXz/market-evidence-desk/blob/main/PROJECT_SCOPE.md)

## How I Used Sanity

The `production` dataset models `source`, `marketEvent` (the research question), and `evidenceClaim` as separate linked documents. Each claim points to a source and a question, with a stance such as **supports**, **context**, or **conflicts**, a date, and review state. The public pages query published records and show each position with its origin, date, and unresolved limits. This structure makes it possible to follow opposing positions and avoid treating a company's description of its own process as independent assurance.

Review status is shown honestly: 1 of the 112 claims carries an editor source check with the exact excerpt and locator, and the rest are labeled as awaiting review. Adding more checks is a Studio task, and the desk never presents an unchecked claim as verified.

## Sanity Project Details

- Project ID: `cxjysvlq`
- Dataset: `production`
- [Public Sanity dataset query](https://cxjysvlq.api.sanity.io/v2025-08-15/data/query/production?query=*%5B_type%20in%20%5B%22source%22%2C%22marketEvent%22%2C%22evidenceClaim%22%5D%5D%5B0...20%5D%7B_id%2C_type%2Ctitle%7D)
- [Hosted Sanity Studio](https://phoniex-market-evidence-desk.sanity.studio/)
- Sourcebook Knowledge Base ID: `kbu9WNgZ9ocF`

## What I Learned

Structured content matters most where sources disagree or cover different scopes. Dates, authors, stances, and source references let the interface show what each source can establish. Sanity Context gives the agent a way to read both records and the Sourcebook, while the human review state reminds readers that a generated explanation is a draft. The useful boundary is as visible as the answer: historical evidence cannot provide a current price or investment recommendation.

