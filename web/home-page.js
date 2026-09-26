// Curated entry points; titles, claims and dates always come from the published graph.
const featured = [
  {id: "market-event-sec-proof-of-reserves-question-2023", label: "RESERVE ASSURANCE"},
  {id: "market-event-stablecoin-reserve-assurance-question-2025", label: "CONFLICTING VIEWS"},
  {id: "market-event-crypto-deposit-insurance-boundary-2026", label: "CUSTOMER PROTECTION"},
];

const container = document.querySelector("#featured-questions");
const node = (parent, tag, value, className) => {
  const element = document.createElement(tag);
  element.textContent = value;
  if (className) element.className = className;
  parent.append(element);
  return element;
};
const formatDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"})
    : "Date unverified";
};

try {
  const response = await fetch("/api/evidence", {signal: AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error("Graph unavailable");
  const graph = await response.json();
  if (![graph.events, graph.sources, graph.claims].every(Array.isArray)) throw new Error("Invalid graph");
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const cards = featured.map((item) => ({...item, event: graph.events.find((event) => event.id === item.id)}))
    .filter((item) => item.event);
  if (!cards.length) throw new Error("No featured questions published");
  container.replaceChildren();

  for (const [index, {event, label}] of cards.entries()) {
    const claims = graph.claims.filter((claim) => claim.eventId === event.id && sources.has(claim.sourceId));
    const originals = [...new Map(claims.map((claim) => [claim.sourceId, sources.get(claim.sourceId)])).values()];
    const card = node(container, "a", "", "featured-card");
    card.href = `/web/atlas.html?question=${encodeURIComponent(event.id)}`;
    const top = node(card, "span", "", "featured-card-top");
    node(top, "span", `${String(index + 1).padStart(2, "0")} / ${label}`);
    node(top, "span", "↗", "featured-arrow");
    node(card, "strong", event.title, "featured-card-title");
    node(card, "span", event.summary || "Open the linked claims and sources.", "featured-card-summary");
    const footer = node(card, "span", "", "featured-card-footer");
    node(footer, "span", `${claims.length} ${claims.length === 1 ? "claim" : "claims"} · ${originals.length} ${originals.length === 1 ? "source" : "sources"}`);
    node(footer, "span", `Recorded ${formatDate(event.observedAt)}`);
    node(card, "span", `Review: ${(event.review || "needs-human-review").replaceAll("-", " ")}`, "featured-review");
  }
} catch {
  container.replaceChildren();
  const message = node(container, "p", "Published questions could not load here. Open the atlas to retry the live graph.", "featured-state");
  const link = node(message, "a", "Explore the evidence atlas ↗");
  link.href = "/web/atlas.html";
}
