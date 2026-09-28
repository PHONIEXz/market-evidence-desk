import {test} from "node:test";
import assert from "node:assert/strict";
import {dossierMarkdown} from "../web/dossier-export.js";

test("dossier export preserves dates, source URLs, IDs, and the review boundary", () => {
  const event = {id: "question-a", title: "What can a snapshot prove?", summary: "A dated question.", observedAt: "2023-03-24T00:00:00Z", review: "needs-human-review"};
  const sources = new Map([
    ["source-later", {id: "source-later", title: "Later advisory", url: "https://example.org/later", publishedAt: "2023-03-23T00:00:00Z", kind: "official"}],
    ["source-earlier", {id: "source-earlier", title: "Earlier guide", url: "https://example.org/earlier", publishedAt: "2022-11-28T00:00:00Z", kind: "commentary"}],
  ]);
  const claims = [
    {id: "claim-later", sourceId: "source-later", stance: "conflicts", text: "A snapshot has limits.", observedAt: "2023-03-24T00:00:00Z"},
    {id: "claim-earlier", sourceId: "source-earlier", stance: "context", text: "A customer checks inclusion.", observedAt: "2022-11-29T00:00:00Z"},
  ];
  const report = dossierMarkdown(event, claims, sources, "Cannot establish solvency today.");
  assert.ok(report.indexOf("Earlier guide") < report.indexOf("Later advisory"));
  for (const expected of ["question-a", "claim-earlier", "claim-later", "source-earlier", "source-later", "https://example.org/earlier", "https://example.org/later", "2022-11-28", "needs-human-review", "Cannot establish solvency today.", "Draft for human review"]) {
    assert.ok(report.includes(expected), `Missing ${expected}`);
  }
  assert.deepEqual(claims.map((claim) => claim.id), ["claim-later", "claim-earlier"], "export should not mutate the displayed graph");
});

test("dossier exports recorded source checks separately from linked paraphrases", () => {
  const event = {id: "question-a", title: "Review example", observedAt: "2026-09-28T00:00:00Z"};
  const sources = new Map([["source-a", {id: "source-a", title: "Original publication",
    url: "https://example.org/primary", publishedAt: "2025-01-01T00:00:00Z"}]]);
  const claims = [{id: "claim-a", sourceId: "source-a", stance: "supports", text: "A paraphrase.",
    observedAt: "2026-09-28T00:00:00Z", review: {excerpt: "An exact short passage.",
      locator: "Section 2", reviewer: "Example Editor", reviewedAt: "2026-09-28T10:00:00Z"}}];
  const report = dossierMarkdown(event, claims, sources);
  for (const expected of ["A paraphrase.", "Exact excerpt: “An exact short passage.”", "Section 2",
    "Example Editor", "check original publication"]) assert.ok(report.includes(expected));
});
