# Judge walkthrough and final verification

This is the short demo path for the Sanity Challenge Path One. The DEV post draft is in [SUBMISSION.md](SUBMISSION.md). Do not record credentials, private Sourcebook access URLs, or secret values.

## Screen recording, about 90 seconds

1. **Home, 0:00–0:10.** Say: “Market Evidence Desk answers research questions from dated, published Sanity records. It does not show live prices or trading advice.” Show the three agent cases.
2. **Compare, 0:10–0:30.** Show Kraken's company description next to PCAOB and SEC limits; switch to the 2025 SEC staff versus Commissioner disagreement. State that the positions remain attributed to their actual speakers.
3. **Sources, 0:30–0:45.** Open an FSB or FDIC publication and its linked claim; point out the publication date, scope note, and research question. The Sourcebook Knowledge Base also ingests the dataset; verify that its latest build includes these records before saying so on camera.
4. **Agent, 0:45–1:15.** Run the **dispute** case if hosted service is ready. Point out `groq_query`, `knowledge_base_read`, dated source URLs, and the human review label. The generated answer may take up to two minutes; recording can cut the wait without claiming it was instantaneous.
5. **Boundary, 1:15–1:30.** Show the **price** case declining unsupported live data, or the guided Data coverage panel if the hosted model is unavailable. End at the Method page's record → link → review → answer workflow.

## Release checks

- [ ] Confirm mobile menu, source links, and fictional demo label. Desktop Sources and Research pages visibly render the larger reading scale on the feature preview; the browser tool hit an automatic usage limit before further mobile checks.
- [ ] Check that the Sourcebook is Ready, the new stablecoin and reserve entries appear, and Issues do not present an unresolved material conflict as settled fact.
- [x] On 2026-09-24, run **compare**, **dispute**, and **price** against the feature preview at commit `9d97e61`. Each returned `groq_query` and `knowledge_base_read`; comparison linked Kraken, PCAOB, and SEC; disagreement linked the two dated SEC views; price declined live data and linked historical sources. Earlier timed-out runs show the hosted model can still be intermittent.
- [x] Built assets with `npm run web:build`; Node graph tests passed 6/6 and Python endpoint tests passed 3/3. Desktop browser pages and agent results rendered. The browser extension logged its own metadata errors; no app-script error was observed in the inspected logs.
- [x] The public preview displays seven research questions and eleven distinct publications after the protection bundle was imported. Sourcebook rebuild and issue review remain unverified.
- [ ] Publish or promote the tested build to the URL used in the DEV post, if changing from feature preview. Recheck the ready state on that URL.
- [ ] Publish the DEV Path One post using the `#sanitychallenge` tag, project ID `cxjysvlq`, demo and code links. Confirm age and location eligibility under the official rules. Only one entry per path. Deadline: October 4, 2026, 11:59 PM PDT.

Official challenge: https://dev.to/challenges/sanity-2026-09-16
Contest rules: https://dev.to/page/sanity-challenge-v26-09-16-contest-rules
