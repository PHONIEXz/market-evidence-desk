import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import handler, {normalizeGraph} from "../api/graph.js";
import evidenceHandler from "../api/evidence.js";
import {comparisonFromGraph} from "../web/comparison.js";

const root = JSON.parse(readFileSync(new URL("../sanity/seed/sec-investor-alert.json", import.meta.url)));
const additional = JSON.parse(readFileSync(new URL("../sanity/seed/proof-of-reserves-scope.json", import.meta.url)));
const docs = [...root, ...additional];
const graph = {
  events: docs.filter((d) => d._type === "marketEvent").map((d) => ({...d, id: d._id})),
  sources: docs.filter((d) => d._type === "source").map((d) => ({...d, id: d._id})),
  claims: docs.filter((d) => d._type === "evidenceClaim").map((d) => ({
    ...d, id: d._id, eventId: d.event._ref, sourceId: d.source._ref,
  })),
};

test("published comparison keeps all linked and contextual claims", () => {
  const result = normalizeGraph(graph);
  assert.equal(result.events.length, 2);
  assert.equal(result.sources.length, 3);
  assert.equal(result.claims.length, 4);
  assert.equal(result.claims.filter((claim) => claim.stance === "context").length, 1);
});

test("guided comparison requires all three distinct dated linked claims", () => {
  const ready = comparisonFromGraph(normalizeGraph(graph), new Date("2026-09-24T00:00:00Z"));
  assert.equal(ready.rows.length, 3);
  assert.equal(new Set(ready.rows.map(({source}) => source.url)).size, 3);
  assert.deepEqual(ready.rows.map(({claim}) => claim.stance), ["context", "supports", "supports"]);
  const missing = normalizeGraph({...graph, claims: graph.claims.filter((item) =>
    item.sourceId !== "source-kraken-proof-of-reserves-guide-2022-11-28")});
  assert.equal(comparisonFromGraph(missing), null);
  const earlier = new Date("2023-04-01T00:00:00Z");
  assert.equal(comparisonFromGraph(normalizeGraph(graph), earlier), null);
});

test("the hosted page provides every required element before app.js runs", () => {
  const html = readFileSync(new URL("../web/index.html", import.meta.url), "utf8");
  const script = readFileSync(new URL("../web/app.js", import.meta.url), "utf8");
  const ids = new Set([...html.matchAll(/\bid="([\w-]+)"/g)].map((match) => match[1]));
  const selectors = [...script.matchAll(/\$\("#([\w-]+)"\)/g)].map((match) => match[1]);
  for (const id of selectors) assert.ok(ids.has(id), `Missing #${id} in web/index.html`);
  assert.ok(html.includes('src="/web/app.js" type="module"'));
  assert.equal(evidenceHandler, handler);
});

test("unverifiable claims are removed before reaching a hosted browser", () => {
  const result = normalizeGraph({
    ...graph,
    sources: [...graph.sources, {...graph.sources[0], id: "unsafe", url: "javascript:alert(1)"}],
    claims: [
      ...graph.claims,
      {...graph.claims[0], id: "unsafe-source", sourceId: "unsafe"},
      {...graph.claims[0], id: "missing-event", eventId: "missing"},
      {...graph.claims[0], id: "before-source", observedAt: "2020-01-01T00:00:00Z"},
    ],
  });
  assert.equal(result.sources.length, 3);
  assert.equal(result.claims.length, 4);
});

test("hosted graph route returns published data without credentials", async () => {
  const originalFetch = globalThis.fetch;
  let body;
  const response = {
    headers: {}, statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url.hostname, "cxjysvlq.api.sanity.io");
    assert.equal(url.searchParams.get("perspective"), "published");
    assert.equal(options.headers.Authorization, undefined);
    return {ok: true, json: async () => ({result: graph})};
  };
  try {
    await handler({method: "GET"}, response);
    assert.equal(response.statusCode, 200);
    assert.equal(body.claims.length, 4);
    assert.equal(body.events.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
