const EVENT_ID = "market-event-stablecoin-reserve-assurance-question-2025";

export function disagreementFromGraph(graph, asOf = new Date()) {
  if (!graph || !Number.isFinite(asOf.getTime())) return null;
  const event = graph.events.find((item) => item.id === EVENT_ID);
  if (!event || Date.parse(event.observedAt) > asOf.getTime()) return null;
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const linked = graph.claims.filter((claim) => {
    const source = sources.get(claim.sourceId);
    return claim.eventId === EVENT_ID && source &&
      Date.parse(claim.observedAt) <= asOf.getTime() &&
      Date.parse(source.publishedAt) <= asOf.getTime() &&
      (!claim.expiresAt || Date.parse(claim.expiresAt) > asOf.getTime());
  });
  const supporting = linked.find((claim) => claim.stance === "supports" &&
    claim.sourceId === "source-sec-staff-stablecoins-2025-04-04");
  const challenging = linked.find((claim) => claim.stance === "conflicts" &&
    claim.sourceId === "source-crenshaw-stablecoins-2025-04-04");
  if (!supporting || !challenging || supporting.sourceId === challenging.sourceId) return null;
  return {
    event,
    views: [
      {claim: supporting, source: sources.get(supporting.sourceId), label: "DIVISION STAFF DESCRIPTION"},
      {claim: challenging, source: sources.get(challenging.sourceId), label: "COMMISSIONER'S CHALLENGE"},
    ],
    context: linked.filter((claim) => claim.stance === "context").map((claim) => ({
      claim, source: sources.get(claim.sourceId),
    })),
  };
}
