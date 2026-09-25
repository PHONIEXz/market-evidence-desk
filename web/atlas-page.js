// An editorial map over the published graph. The graph supplies every factual claim.
const THEMES = [
  {name: "Reserve assurance", description: "A snapshot can answer a narrow question while leaving the broader balance sheet untested.", ids: ["market-event-sec-proof-of-reserves-question-2023", "market-event-proof-of-reserves-scope-question-2023", "market-event-stablecoin-reserve-assurance-question-2025"], limit: "A historical assessment cannot verify current asset availability, all liabilities or present solvency."},
  {name: "Customer protection", description: "Follow the difference between a consumer protection, a policy recommendation and an individual account's legal position.", ids: ["market-event-crypto-deposit-insurance-boundary-2026", "market-event-crypto-custody-and-conflicts-2026"], limit: "The records do not decide insurance eligibility or certify the custody practices of any named platform."},
  {name: "Redemption and global rules", description: "Read what international bodies recommend, then check what those documents do and do not establish locally.", ids: ["market-event-global-stablecoin-redemption-2026", "market-event-global-crypto-standards-implementation-2026"], limit: "Recommendations and dated analysis do not verify a token's redemption today or establish the current law in every jurisdiction."},
  {name: "EU consumer safeguards", description: "Compare dated warnings before and after MiCA and check the category of product and provider.", prefixes: ["market-event-eu-", "market-event-mica-"], limit: "These warnings cannot determine a particular customer's current legal rights or a provider's present authorisation."},
  {name: "DeFi and lending risks", description: "Read the dated joint EBA and ESMA analysis of DeFi, lending, borrowing and staking.", prefixes: ["market-event-defi-"], limit: "Market estimates and risk categories from 2025 do not describe a named protocol or today's market."},
  {name: "Fraud and impersonation", description: "Check how consumer authorities describe tactics without treating an individual account as proven fraudulent.", prefixes: ["market-event-fraud-", "market-event-group-"], limit: "A pattern in an investor alert cannot identify a particular sender, offer or group without independent checking."},
];

const $ = (selector) => document.querySelector(selector);
const make = (parent, tag, content, className) => { const node = document.createElement(tag); node.textContent = content ?? ""; if (className) node.className = className; parent.append(node); return node; };
const date = (value) => { const parsed = new Date(value); return Number.isFinite(parsed.getTime()) ? parsed.toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"}) : "Date unverified"; };
const themeFor = (id) => THEMES.find((theme) => theme.ids?.includes(id) || theme.prefixes?.some((prefix) => id.startsWith(prefix)));
const sourceMap = new Map();
let graph;
let limit = 24;

function linked(event) {
  return graph.claims.filter((claim) => claim.eventId === event.id && sourceMap.has(claim.sourceId));
}

function renderDossier(event) {
  const theme = themeFor(event.id);
  const claims = linked(event).sort((a, b) => Date.parse(sourceMap.get(a.sourceId).publishedAt) - Date.parse(sourceMap.get(b.sourceId).publishedAt));
  const origins = [...new Map(claims.map((claim) => [sourceMap.get(claim.sourceId).url, sourceMap.get(claim.sourceId)])).values()];
  $("#dossier-category").textContent = theme?.name.toUpperCase() || "OTHER PUBLISHED QUESTION";
  $("#dossier-title").textContent = event.title;
  $("#dossier-summary").textContent = event.summary || "No question summary has been published.";
  $("#dossier-review").textContent = `Review: ${(event.review || "needs-human-review").replaceAll("-", " ")}`;
  $("#dossier-observed").textContent = `Recorded ${date(event.observedAt)}`;
  $("#dossier-count").textContent = `${claims.length} linked ${claims.length === 1 ? "claim" : "claims"}`;
  $("#dossier-claims").replaceChildren();
  for (const claim of claims) {
    const source = sourceMap.get(claim.sourceId);
    const row = make($("#dossier-claims"), "article", "", `dossier-claim ${claim.stance}`);
    make(row, "span", claim.stance.toUpperCase(), `stance-pill ${claim.stance}`);
    make(row, "p", claim.text);
    const link = make(row, "a", `${source.title} · ${date(source.publishedAt)} ↗`);
    link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
  }
  if (!claims.length) make($("#dossier-claims"), "p", "No linked claims are currently published for this question.", "page-empty");
  $("#dossier-sources").replaceChildren();
  for (const source of origins) {
    const row = make($("#dossier-sources"), "article", "", "dossier-source");
    const link = make(row, "a", `${source.title} ↗`);
    link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
    make(row, "span", `${date(source.publishedAt)} · ${source.kind || "source"}`);
    if (source.notes) make(row, "p", source.notes);
  }
  if (!origins.length) make($("#dossier-sources"), "p", "No original publications linked yet.");
  $("#dossier-limit").textContent = theme?.limit || "This record cannot establish the present status of an asset or platform.";
  $("#dossier-ledger").href = `/web/research.html?question=${encodeURIComponent(event.id)}`;
  $("#atlas-dossier").hidden = false;
  for (const button of document.querySelectorAll(".atlas-question")) button.setAttribute("aria-pressed", String(button.dataset.question === event.id));
  const url = new URL(location.href); url.searchParams.set("question", event.id); history.replaceState(null, "", url);
}

function renderQuestions() {
  const term = $("#atlas-search").value.trim().toLowerCase();
  const visible = graph.events.filter((event) => {
    if (!term) return true;
    return [event.title, event.summary, themeFor(event.id)?.name, ...linked(event).flatMap((claim) => [claim.text, sourceMap.get(claim.sourceId)?.title])]
      .some((value) => String(value || "").toLowerCase().includes(term));
  });
  const requested = new URLSearchParams(location.search).get("question");
  const requestedIndex = visible.findIndex((event) => event.id === requested);
  if (requestedIndex >= limit) limit = Math.ceil((requestedIndex + 1) / 24) * 24;
  $("#atlas-count").textContent = `Showing ${Math.min(limit, visible.length)} of ${visible.length} matching questions · ${graph.events.length} published in total`;
  $("#atlas-no-results").hidden = visible.length > 0;
  $("#atlas-more").hidden = visible.length <= limit;
  $("#atlas-groups").replaceChildren();
  const shown = visible.slice(0, limit);
  for (const theme of [...THEMES, {name: "Other published questions", description: "Questions added in Sanity also appear here."}]) {
    const events = shown.filter((event) => (themeFor(event.id)?.name || "Other published questions") === theme.name);
    if (!events.length) continue;
    const group = make($("#atlas-groups"), "section", "", "atlas-group");
    const heading = make(group, "div", "", "atlas-group-heading");
    make(heading, "h3", theme.name);
    make(heading, "p", theme.description);
    const cards = make(group, "div", "", "atlas-cards");
    for (const event of events) {
      const button = make(cards, "button", "", "atlas-question");
      button.type = "button"; button.dataset.question = event.id;
      button.setAttribute("aria-pressed", String(event.id === new URLSearchParams(location.search).get("question")));
      const count = linked(event).length;
      make(button, "span", `${count} linked ${count === 1 ? "claim" : "claims"} · ${date(event.observedAt)}`, "atlas-card-meta");
      make(button, "strong", event.title);
      make(button, "span", event.summary || "Open the linked claims and sources.", "atlas-card-summary");
      make(button, "span", "Read dossier ↗", "atlas-card-action");
      button.addEventListener("click", () => { renderDossier(event); $("#atlas-dossier").scrollIntoView({behavior: "smooth", block: "start"}); });
    }
  }
  const selected = visible.find((event) => event.id === requested);
  if (!visible.length) $("#atlas-dossier").hidden = true;
  else if (!selected || $("#atlas-dossier").hidden) renderDossier(selected || visible[0]);
}

$("#atlas-search").addEventListener("input", () => { limit = 24; renderQuestions(); });
$("#atlas-more").addEventListener("click", () => { limit += 24; renderQuestions(); });
try {
  const response = await fetch("/api/evidence", {signal: AbortSignal.timeout(8000)});
  if (!response.ok) throw new Error("Published graph unavailable");
  graph = await response.json();
  if (![graph.events, graph.sources, graph.claims].every(Array.isArray)) throw new Error("Invalid graph");
  for (const source of graph.sources) sourceMap.set(source.id, source);
  $("#atlas-status").hidden = graph.events.length > 0;
  $("#atlas-content").hidden = !graph.events.length;
  renderQuestions();
  if (!graph.events.length) $("#atlas-status").textContent = "No published research questions are available yet.";
} catch {
  $("#atlas-status").textContent = "Published evidence is unavailable right now. Retry this page or open the research desk's fictional demo.";
}
