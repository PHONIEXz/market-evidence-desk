const $ = (selector) => document.querySelector(selector);
const add = (parent, tag, text, className) => { const node = document.createElement(tag); node.textContent = text ?? ""; if (className) node.className = className; parent.append(node); return node; };
const clear = (node) => node.replaceChildren();
const date = (value) => new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
const published = (value) => new Date(value).toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"});
const safeDate = (value) => { const d = new Date(value); return Number.isFinite(d.getTime()) ? d : null; };
let graph; let mode = "live"; let briefText = ""; let requestNumber = 0;

function visible(selector, state) { const node = $(selector); if (node) node.hidden = !state; }

function render(eventId) {
  if (!graph?.events?.length) return;
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const event = graph.events.find((item) => item.id === eventId) || graph.events[0];
  const claims = graph.claims.filter((claim) => claim.eventId === event.id && sources.has(claim.sourceId));
  const asOf = safeDate($("#as-of").value) || new Date();
  $("#event-select").value = event.id;
  $("#event-title").textContent = event.title;
  $("#event-summary").textContent = event.summary || "No summary has been published for this question.";
  $("#observed").textContent = date(event.observedAt);
  $("#review").textContent = (event.review || "needs-human-review").replaceAll("-", " ").toUpperCase();
  $("#review-dot").className = `review-dot ${event.review || "needs-human-review"}`;
  $("#notice").textContent = graph.notice || "Claims remain drafts until reviewed by a human.";
  const eligible = claims.filter((claim) => { const source = sources.get(claim.sourceId); const observed = safeDate(claim.observedAt); const sourceDate = safeDate(source?.publishedAt); const expires = claim.expiresAt ? safeDate(claim.expiresAt) : null; return observed && sourceDate && observed <= asOf && sourceDate <= asOf && (!expires || expires > asOf); });
  const support = eligible.filter((claim) => claim.stance === "supports");
  const context = eligible.filter((claim) => claim.stance === "context");
  const conflict = eligible.filter((claim) => claim.stance === "conflicts");
  const total = Math.max(eligible.length, 1);
  $("#support-bar").style.width = `${support.length / total * 100}%`; $("#context-bar").style.width = `${context.length / total * 100}%`; $("#conflict-bar").style.width = `${conflict.length / total * 100}%`;
  $("#balance-text").textContent = `${support.length} support · ${context.length} context · ${conflict.length} conflict`; $("#count").textContent = `${claims.length} ${claims.length === 1 ? "claim" : "claims"}`; $("#question-claim-count").textContent = String(claims.length).padStart(2, "0");
  clear($("#claims"));
  for (const claim of claims) {
    const source = sources.get(claim.sourceId); const observed = safeDate(claim.observedAt); const sourceDate = safeDate(source?.publishedAt); const expires = claim.expiresAt ? safeDate(claim.expiresAt) : null;
    const row = add($("#claims"), "article", "", `evidence-row ${claim.stance}`); const head = add(row, "div", "", "evidence-row-head"); add(head, "span", claim.stance.toUpperCase(), `stance-pill ${claim.stance}`);
    if (observed > asOf || sourceDate > asOf) add(head, "span", "AFTER REVIEW DATE", "date-pill"); if (expires && expires <= asOf) add(head, "span", "EXPIRED", "date-pill"); add(head, "span", source?.kind?.toUpperCase() || "SOURCE", "source-kind"); add(row, "p", claim.text, "claim-text");
    const foot = add(row, "div", "", "evidence-row-foot"); const link = add(foot, "a", source?.title || "Unresolved source"); if (source?.url) { link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; } add(foot, "span", source?.publishedAt ? `Published ${published(source.publishedAt)} · Observed ${date(claim.observedAt)}` : "Publication date unverified");
  }
  if (!claims.length) add($("#claims"), "p", "No linked claims were returned for this question.", "empty-inline");
  clear($("#timeline"));
  for (const claim of [...claims].sort((a, b) => (safeDate(sources.get(a.sourceId)?.publishedAt)?.getTime() || 0) - (safeDate(sources.get(b.sourceId)?.publishedAt)?.getTime() || 0))) { const source = sources.get(claim.sourceId); const item = add($("#timeline"), "div", "", "timeline-item"); add(item, "span", source?.publishedAt ? published(source.publishedAt) : "DATE UNVERIFIED", "timeline-date"); add(item, "span", "", `timeline-marker ${claim.stance}`); const content = add(item, "div", "", "timeline-content"); add(content, "strong", source?.title || "Unresolved source"); add(content, "span", `${claim.stance.toUpperCase()} · Source record`, "timeline-label"); }
  if (!claims.length) add($("#timeline"), "p", "No dated source records are linked yet.", "empty-inline");
  $("#brief-intro").textContent = `${support.length} supporting, ${conflict.length} conflicting, and ${context.length} contextual claim(s) are eligible as of ${date(asOf)}. Historical publication dates show when the record was made; they do not turn it into current market news.`;
  clear($("#brief-points")); for (const claim of [...support, ...conflict, ...context]) add($("#brief-points"), "li", `${claim.stance.toUpperCase()}: ${claim.text} (${sources.get(claim.sourceId)?.title || "source unavailable"})`); if (!eligible.length) add($("#brief-points"), "li", "No eligible sourced claims for this review date.");
  briefText = [`DRAFT — ${mode === "demo" ? "FICTIONAL DEMO" : "SANITY RESEARCH"}`, event.title, $("#brief-intro").textContent, ...Array.from($("#brief-points").children, (li) => `• ${li.textContent}`), "HUMAN REVIEW REQUIRED"].join("\n");
}

async function load(nextMode = mode) {
  const request = ++requestNumber;
  mode = nextMode;
  graph = null;
  for (const selector of ["#desk", "#method", "#method-strip", "#error", "#empty"]) visible(selector, false);
  visible("#loading", true);
  $("#refresh").textContent = mode === "live" ? "Retry published data ↻" : "Retry fictional demo ↻";
  $("#live-mode").classList.toggle("active", mode === "live");
  $("#demo-mode").classList.toggle("active", mode === "demo");
  $("#live-mode").setAttribute("aria-pressed", String(mode === "live"));
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  try {
    const response = await fetch(mode === "live" ? "/api/evidence" : "/data/demo.json", {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const loaded = await response.json();
    if (request !== requestNumber) return;
    if (!Array.isArray(loaded.events) || !Array.isArray(loaded.sources) || !Array.isArray(loaded.claims)) throw new Error("Invalid graph");
    graph = loaded;
    $("#event-select").replaceChildren(...graph.events.map((event) => {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = event.title;
      return option;
    }));
    visible("#loading", false);
    if (!graph.events.length) { visible("#empty", true); return; }
    const linkedQuestion = mode === "live" ? new URLSearchParams(location.search).get("question") : null;
    render(graph.events.some((event) => event.id === linkedQuestion) ? linkedQuestion : graph.events[0].id);
    for (const selector of ["#desk", "#method", "#method-strip"]) visible(selector, true);
  } catch {
    if (request !== requestNumber) return;
    visible("#loading", false);
    visible("#error", true);
    $("#error").textContent = mode === "live"
      ? "Published Sanity data did not load. Retry or open the fictional demo."
      : "Fictional demo did not load. Retry in a moment.";
  }
}

const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); $("#as-of").value = now.toISOString().slice(0, 16);
$("#event-select").addEventListener("change", (event) => render(event.target.value)); $("#as-of").addEventListener("change", () => render($("#event-select").value)); $("#live-mode").addEventListener("click", () => load("live")); $("#demo-mode").addEventListener("click", () => load("demo")); $("#refresh").addEventListener("click", () => load(mode)); $("#open-demo").addEventListener("click", () => load("demo")); $("#copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(briefText); $("#copy-state").textContent = "Draft copied"; } catch { $("#copy-state").textContent = "Clipboard blocked; select the text above."; } });
load();
