// Read-only guide to the published Sanity graph. This does not call an AI model.
export const COMPARISON_EVENT = "market-event-proof-of-reserves-scope-question-2023";

const EXPECTED = [
  {id: "source-kraken-proof-of-reserves-guide-2022-11-28", label: "Company account", stance: "context"},
  {id: "source-pcaob-investor-advisory-2023-03-08", label: "Investor Advocate advisory", stance: "supports"},
  {id: "source-sec-investor-alert-2023-03-23", label: "Investor alert", stance: "supports"},
];

export function comparisonFromGraph(graph, asOf = new Date()) {
  const event = graph.events.find((item) => item.id === COMPARISON_EVENT);
  if (!event) return null;
  const cutoff = asOf.getTime();
  const sources = new Map(graph.sources.map((item) => [item.id, item]));
  const claims = graph.claims.filter((item) => item.eventId === event.id);
  const rows = EXPECTED.map(({id, label, stance}) => {
    const source = sources.get(id);
    const claim = claims.find((item) => item.sourceId === id && item.stance === stance &&
      Date.parse(item.observedAt) <= cutoff &&
      (!item.expiresAt || Date.parse(item.expiresAt) > cutoff));
    if (source && Date.parse(source.publishedAt) > cutoff) return null;
    return source && claim ? {source, claim, label} : null;
  });
  // A partial comparison could give a misleading impression of corroboration.
  return rows.every(Boolean) ? {event, rows} : null;
}
