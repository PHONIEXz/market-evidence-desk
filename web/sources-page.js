const $ = (selector) => document.querySelector(selector);
const add = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value ?? "";
  if (className) node.className = className;
  parent.append(node);
  return node;
};
const published = (value) => new Date(value).toLocaleDateString(undefined, {
  dateStyle: "medium", timeZone: "UTC",
});
let graph;
let filter = "";

function render() {
  const sources = graph.sources;
  const groupsByUrl = new Map();
  for (const source of sources) {
    const group = groupsByUrl.get(source.url) || {source, ids: []};
    group.ids.push(source.id);
    groupsByUrl.set(source.url, group);
  }
  const groups = [...groupsByUrl.values()];
  const questions = new Map(graph.events.map((event) => [event.id, event]));
  const claims = new Map();
  for (const claim of graph.claims) {
    claims.set(claim.sourceId, [...(claims.get(claim.sourceId) || []), claim]);
  }
  const term = filter.trim().toLowerCase();
  const visible = groups.filter(({source, ids}) =>
    !term || [source.title, source.url, source.kind, source.notes,
      ...ids.flatMap((id) => (claims.get(id) || []).map((claim) => claim.text))].some((value) =>
      String(value || "").toLowerCase().includes(term)));
  $("#source-count").textContent = `${visible.length} of ${groups.length} original publications from ${sources.length} Sanity records`;
  $("#source-cards").replaceChildren();

  for (const {source, ids} of visible) {
    const card = add($("#source-cards"), "article", "", "source-card");
    card.setAttribute("role", "listitem");
    const top = add(card, "div", "", "source-card-top");
    add(top, "span", source.kind?.toUpperCase() || "SOURCE", "source-kind");
    add(top, "span", source.publishedAt ? published(source.publishedAt) : "DATE UNVERIFIED", "source-date");
    const title = add(card, "a", source.title || "Untitled source", "source-title");
    title.href = source.url;
    title.target = "_blank";
    title.rel = "noopener noreferrer";
    add(card, "p", source.url, "source-url");
    if (source.notes) add(card, "p", source.notes, "source-scope");
    const linked = ids.flatMap((id) => claims.get(id) || []);
    if (linked.length) {
      const list = add(card, "ul", "", "source-claim-list");
      for (const claim of linked) {
        const item = add(list, "li", `${claim.stance.toUpperCase()}: ${claim.text} · `);
        const question = questions.get(claim.eventId);
        if (question) {
          const link = add(item, "a", question.title);
          link.href = `/web/research.html?question=${encodeURIComponent(question.id)}`;
        }
      }
    }
    const bottom = add(card, "div", "", "source-card-bottom");
    add(bottom, "span", linked.length
      ? `${linked.length} linked ${linked.length === 1 ? "claim" : "claims"}`
      : "No claims linked");
    add(bottom, "span", "Open source ↗", "open-source");
  }
  if (!visible.length) add($("#source-cards"), "p", "No sources match this filter.", "page-empty");

  const timeline = $("#timeline");
  timeline.replaceChildren();
  for (const {source, ids} of [...groups].sort((a, b) =>
    Date.parse(a.source.publishedAt) - Date.parse(b.source.publishedAt))) {
    const item = add(timeline, "div", "", "timeline-item");
    add(item, "span", source.publishedAt ? published(source.publishedAt) : "DATE UNVERIFIED", "timeline-date");
    add(item, "span", "", "timeline-marker supports");
    const content = add(item, "div", "", "timeline-content");
    add(content, "strong", source.title || "Untitled source");
    const count = ids.reduce((total, id) => total + (claims.get(id)?.length || 0), 0);
    add(content, "span", `${source.kind?.toUpperCase() || "SOURCE"} · ${count} linked ${count === 1 ? "claim" : "claims"}`, "timeline-label");
  }
}

$("#source-search").addEventListener("input", (event) => {
  filter = event.target.value;
  render();
});
try {
  const response = await fetch("/api/evidence", {signal: AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error("Published data unavailable");
  graph = await response.json();
  if (!Array.isArray(graph.events) || !Array.isArray(graph.sources) || !Array.isArray(graph.claims)) {
    throw new Error("Invalid published graph");
  }
  render();
} catch {
  $("#source-count").textContent = "Published source data did not load.";
  add($("#source-cards"), "p", "Retry the page after the published graph is available.", "page-empty");
}
