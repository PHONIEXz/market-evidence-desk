# Judge walkthrough and final verification

This is the short demo path for the Sanity Challenge Path One. The DEV post draft is in [SUBMISSION.md](SUBMISSION.md). Do not record credentials, private Sourcebook access URLs, or secret values.

## Screen recording, about 90 seconds

1. **Home and atlas, 0:00–0:18.** Say: “Market Evidence Desk answers research questions from dated, published Sanity records. It does not show live prices or trading advice.” Open the evidence atlas, select a dossier and point to its linked source and review status.
2. **Compare, 0:18–0:35.** Show Kraken's company description next to PCAOB and SEC limits; switch to the 2025 SEC staff versus Commissioner disagreement. State that the positions remain attributed to their actual speakers.
3. **Sources, 0:35–0:50.** Open an FSB or FDIC publication and its linked claim; point out the publication date, scope note, and research question. The Sourcebook Knowledge Base also ingests the dataset; verify that its latest build includes these records before saying so on camera.
4. **Agent, 0:50–1:15.** Run the **dispute** case if hosted service is ready. Point out `groq_query`, `knowledge_base_read`, dated source URLs, and the human review label. The generated answer may take up to two minutes; recording can cut the wait without claiming it was instantaneous.
5. **Boundary, 1:15–1:30.** Show the **price** case declining unsupported live data, or the guided Data coverage panel if the hosted model is unavailable. End at the Method page's record → link → review → answer workflow.

## Release checks

- [ ] Check the mobile menu on an actual phone and confirm the fictional demo label. On 2026-09-25, the production Sources page displayed 21 distinct original-publication links from 22 Sanity source records, and the Atlas displayed 101 published questions. A narrow-header CSS fix was deployed for widths at or below 520px, but this browser cannot emulate a phone viewport, so the visual mobile check remains open.
- [x] On 2026-09-25, verified the dataset Sourcebook import is `complete`: 140 selected, 140 distilled, zero unsupported, zero errors. The selection is bounded to `source` and `evidenceClaim` with linked question fields projected onto claims. The public published query currently returns 134 source and claim records, so these counts describe different views and must not be treated as a one-to-one match.
- [x] On 2026-09-25, authenticated Sourcebook inspection showed 13 entries ready, including proof-of-reserves and stablecoin reserve coverage; Issues showed 0 pending, 1 previously resolved wording conflict, 0 dismissed. Reviewed both entries and rebuilt the stablecoin page with a persistent rule distinguishing SEC staff views, FSB recommendations, and BIS analysis; the resulting page was checked for accurate attribution. The 'sources changed' notice lists four removed standalone question records after the bounded query excluded `marketEvent`; linked question titles remain projected onto selected claims.
- [x] On 2026-09-24, run **compare**, **dispute**, and **price** against the feature preview at commit `9d97e61`. Each returned `groq_query` and `knowledge_base_read`; comparison linked Kraken, PCAOB, and SEC; disagreement linked the two dated SEC views; price declined live data and linked historical sources. Earlier timed-out runs show the hosted model can still be intermittent.
- [x] Built assets with `npm run web:build`; Node graph tests passed 6/6 and Python endpoint tests passed 3/3. Desktop browser pages and agent results rendered. The browser extension logged its own metadata errors; no app-script error was observed in the inspected logs.
- [x] The published dataset contains 101 research questions and 22 source records (21 distinct source URLs), as verified by an anonymous published query on 2026-09-25. The Sourcebook indexed count was verified separately; entry coverage and issue review remain outstanding.
- [x] On 2026-09-25, PR #1 was merged into `main` (`cf16782`); Vercel reported a successful production deployment. The public URL returned 200 for Home, Atlas, Sources, Compare, Agent, and `/api/evidence`. The evidence route returned 101 questions, 22 sources, and 112 claims. `/api/ask` reported ready, and all three hosted cases returned 200 with `groq_query` and `knowledge_base_read`; the price case refused unsupported live data. The DEV draft now links to production.
- [ ] Publish the DEV Path One post using the `#sanitychallenge` tag, project ID `cxjysvlq`, demo and code links. Confirm age and location eligibility under the official rules. Only one entry per path. Deadline: October 4, 2026, 11:59 PM PDT.

Official challenge: https://dev.to/challenges/sanity-2026-09-16
Contest rules: https://dev.to/page/sanity-challenge-v26-09-16-contest-rules
