// Public, read-only Sanity graph for a hosted research desk.
const QUERY = `{
  "events": *[_type == "marketEvent"] | order(observedAt desc)[0...100]{
    "id": _id, title, summary, observedAt, review
  },
  "sources": *[_type == "source"][0...200]{
    "id": _id, title, url, publishedAt, kind, notes
  },
  "claims": *[_type == "evidenceClaim"][0...300]{
    "id": _id, "eventId": event._ref, "sourceId": source._ref,
    text, stance, observedAt, expiresAt
  }
}`;

const textField = (value) => typeof value === "string" && value.trim().length > 0;
const timestamp = (value) => typeof value === "string" &&
  /(?:Z|[+-]\d{2}:\d{2})$/i.test(value) && Number.isFinite(Date.parse(value));
const pick = (item, fields) => Object.fromEntries(fields.map((field) => [field, item[field] ?? null]));

export function normalizeGraph(result) {
  if (!result || !["events", "sources", "claims"].every((key) => Array.isArray(result[key]))) {
    throw new Error("Unexpected Sanity response");
  }

  const events = result.events.filter((item) => item && textField(item.id) &&
    textField(item.title) && timestamp(item.observedAt)).map((item) =>
    pick(item, ["id", "title", "summary", "observedAt", "review"]));
  const sources = result.sources.filter((item) => {
    if (!item || !["id", "title", "url"].every((key) => textField(item[key])) || !timestamp(item.publishedAt)) return false;
    try {
      const url = new URL(item.url);
      return url.protocol === "https:" && Boolean(url.hostname) && !url.username && !url.password;
    } catch { return false; }
  }).map((item) => pick(item, ["id", "title", "url", "publishedAt", "kind", "notes"]));
  const eventIds = new Set(events.map((item) => item.id));
  const sourceById = new Map(sources.map((item) => [item.id, item]));
  const claims = result.claims.filter((item) => {
    if (!item || !["id", "eventId", "sourceId", "text"].every((key) => textField(item[key])) ||
        !eventIds.has(item.eventId) || !sourceById.has(item.sourceId) ||
        !["supports", "conflicts", "context"].includes(item.stance) || !timestamp(item.observedAt)) return false;
    const observed = Date.parse(item.observedAt);
    return observed >= Date.parse(sourceById.get(item.sourceId).publishedAt) &&
      (item.expiresAt == null || (timestamp(item.expiresAt) && Date.parse(item.expiresAt) > observed));
  }).map((item) => pick(item, ["id", "eventId", "sourceId", "text", "stance", "observedAt", "expiresAt"]));

  return {
    notice: "Published Sanity content. Historical evidence is not current market news or a trading signal. Review every source before sharing.",
    events, sources, claims,
  };
}

export default async function handler(request, response) {
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  response.setHeader("X-Content-Type-Options", "nosniff");
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    response.status(405).json({error: "Method not allowed"});
    return;
  }
  try {
    const url = new URL("https://cxjysvlq.api.sanity.io/v2025-08-15/data/query/production");
    url.searchParams.set("query", QUERY);
    url.searchParams.set("perspective", "published");
    const upstream = await fetch(url, {
      headers: {Accept: "application/json"}, signal: AbortSignal.timeout(10000),
    });
    if (!upstream.ok) throw new Error(`Sanity returned HTTP ${upstream.status}`);
    const graph = normalizeGraph((await upstream.json()).result);
    response.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    response.status(200).json(graph);
  } catch (error) {
    console.error("Published Sanity read failed:", error);
    response.status(502).json({error: "Published Sanity data is unavailable. Try again later."});
  }
}
