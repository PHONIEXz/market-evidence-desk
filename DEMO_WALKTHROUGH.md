# Judge walkthrough and final verification

This is the short demo path for the Sanity Challenge Path One. The DEV post draft is in [SUBMISSION.md](SUBMISSION.md). Do not record credentials, private Sourcebook access URLs, or secret values.

## Screen recording, about 90 seconds

1. **Home, 0:00–0:10.** Say: “Market Evidence Desk answers research questions from dated, published Sanity records. It does not show live prices or trading advice.” Show the three agent cases.
2. **Compare, 0:10–0:30.** Show Kraken's company description next to PCAOB and SEC limits; switch to the 2025 SEC staff versus Commissioner disagreement. State that the positions remain attributed to their actual speakers.
3. **Sources, 0:30–0:45.** Open one original publication and its linked claim; point out the date and the link back to the research question. The Sourcebook Knowledge Base also ingests these records.
4. **Agent, 0:45–1:15.** Run the **dispute** case if hosted service is ready. Point out `groq_query`, `knowledge_base_read`, dated source URLs, and the human review label. The generated answer may take up to two minutes; recording can cut the wait without claiming it was instantaneous.
5. **Boundary, 1:15–1:30.** Show the **price** case declining unsupported live data, or the guided Data coverage panel if the hosted model is unavailable. End at the Method page's record → link → review → answer workflow.

## Release checks

- [ ] Open the feature preview and confirm every page and mobile menu work, including source links and the fictional demo label.
- [ ] Check that the Sourcebook is Ready, the new stablecoin and reserve entries appear, and Issues do not present an unresolved material conflict as settled fact.
- [ ] Run **compare**, **dispute**, and **price** against the *hosted* agent; confirm both Sanity tool names and cited original URLs. An earlier local CLI pass alone is not a hosted pass.
- [ ] Check browser console errors and the built assets. Run `npm run web:build`, `node --test tests/test_web_graph.mjs`, and `python3 -m unittest discover -s tests -v`.
- [ ] Publish or promote the tested build to the URL used in the DEV post, if changing from feature preview. Recheck the ready state on that URL.
- [ ] Publish the DEV Path One post using the `#sanitychallenge` tag, project ID `cxjysvlq`, demo and code links. Confirm age and location eligibility under the official rules. Only one entry per path. Deadline: October 4, 2026, 11:59 PM PDT.

Official challenge: https://dev.to/challenges/sanity-2026-09-16
Contest rules: https://dev.to/page/sanity-challenge-v26-09-16-contest-rules
