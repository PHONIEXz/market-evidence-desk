"use strict";

const $ = (selector) => document.querySelector(selector);
const dateText = (value) => new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
const publishedDate = (value) => new Date(value).toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"});
const addText = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value ?? "";
  if (className) node.className = className;
  parent.append(node);
  return node;
};
const clear = (node) => node.replaceChildren();
const safeDate = (value) => {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
};

let graph;
let mode = "live";
let briefText = "";
let sourceFilter = "";
let requestNumber = 0;

function setVisible(selector, visible) {
  $(selector).hidden = !visible;
}

function renderMetrics() {
  const reviews = graph.events.filter((event) => event.review !== "approved").length;
  $("#metric-events").textContent = graph.events.length;
  $("#metric-sources").textContent = graph.sources.length;
  $("#metric-claims").textContent = graph.claims.length;
  $("#metric-review").textContent = reviews;
}

function renderEvidence(event, claims, sources, asOf) {
  const eligible = claims.filter((claim) => {
    const source = sources.get(claim.sourceId);
    const observed = safeDate(claim.observedAt);
    const published = safeDate(source?.publishedAt);
    const expires = claim.expiresAt ? safeDate(claim.expiresAt) : null;
    return observed && published && observed <= asOf && published <= asOf && (!expires || expires > asOf);
  });
  const supporting = eligible.filter((claim) => claim.stance === "supports");
  const contextual = eligible.filter((claim) => claim.stance === "context");
  const conflicting = eligible.filter((claim) => claim.stance === "conflicts");
  const total = Math.max(eligible.length, 1);
  $("#support-bar").style.width = `${supporting.length / total * 100}%`;
  $("#context-bar").style.width = `${contextual.length / total * 100}%`;
  $("#conflict-bar").style.width = `${conflicting.length / total * 100}%`;
  $("#balance-text").textContent = `${supporting.length} support · ${contextual.length} context · ${conflicting.length} conflict`;
  $("#count").textContent = `${claims.length} ${claims.length === 1 ? "claim" : "claims"}`;
  $("#question-claim-count").textContent = String(claims.length).padStart(2, "0");
  clear($("#claims"));

  for (const claim of claims) {
    const source = sources.get(claim.sourceId);
    const observed = safeDate(claim.observedAt);
    const sourceDate = safeDate(source?.publishedAt);
    const expires = claim.expiresAt ? safeDate(claim.expiresAt) : null;
    const afterDate = observed > asOf || sourceDate > asOf;
    const expired = Boolean(expires && expires <= asOf);
    const row = addText($("#claims"), "article", "", `evidence-row ${claim.stance}`);
    const rowHead = addText(row, "div", "", "evidence-row-head");
    addText(rowHead, "span", claim.stance.toUpperCase(), `stance-pill ${claim.stance}`);
    if (afterDate) addText(rowHead, "span", "AFTER REVIEW DATE", "date-pill");
    if (expired) addText(rowHead, "span", "EXPIRED", "date-pill");
    addText(rowHead, "span", source?.kind?.toUpperCase() || "SOURCE", "source-kind");
    addText(row, "p", claim.text, "claim-text");
    const foot = addText(row, "div", "", "evidence-row-foot");
    const link = addText(foot, "a", source?.title || "Unresolved source");
    if (source?.url) { link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer"; }
    addText(foot, "span", source?.publishedAt ? `Published ${publishedDate(source.publishedAt)} · Observed ${dateText(claim.observedAt)}` : "Publication date unverified");
  }
  if (!claims.length) addText($("#claims"), "p", "No linked claims were returned for this question.", "empty-inline");
  return {eligible, supporting, contextual, conflicting};
}

function renderSources(eventClaims, sources) {
  const claimMap = new Map();
  for (const claim of eventClaims) {
    const list = claimMap.get(claim.sourceId) || [];
    list.push(claim);
    claimMap.set(claim.sourceId, list);
  }
  const term = sourceFilter.trim().toLowerCase();
  const visible = [...sources.values()].filter((source) => {
    if (!term) return true;
    return [source.title, source.url, source.kind].some((value) => String(value || "").toLowerCase().includes(term));
  });
  clear($("#source-cards"));
  for (const source of visible) {
    const linked = claimMap.get(source.id) || [];
    const card = addText($("#source-cards"), "article", "", "source-card");
    const top = addText(card, "div", "", "source-card-top");
    addText(top, "span", source.kind?.toUpperCase() || "SOURCE", "source-kind");
    addText(top, "span", source.publishedAt ? publishedDate(source.publishedAt) : "DATE UNVERIFIED", "source-date");
    const link = addText(card, "a", source.title || "Untitled source", "source-title");
    link.href = source.url; link.target = "_blank"; link.rel = "noopener noreferrer";
    addText(card, "p", source.url, "source-url");
    const bottom = addText(card, "div", "", "source-card-bottom");
    addText(bottom, "span", linked.length ? `${linked.length} linked ${linked.length === 1 ? "claim" : "claims"}` : "No claims linked");
    addText(bottom, "span", "Open source ↗", "open-source");
  }
  if (!visible.length) addText($("#source-cards"), "p", "No sources match this filter.", "empty-inline");
}

function renderTimeline(eventClaims, sources) {
  const items = eventClaims.flatMap((claim) => {
    const source = sources.get(claim.sourceId);
    return source ? [{claim, source, date: safeDate(source.publishedAt)}] : [];
  }).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0));
  clear($("#timeline"));
  for (const item of items) {
    const step = addText($("#timeline"), "div", "", "timeline-item");
    addText(step, "span", item.source.publishedAt ? publishedDate(item.source.publishedAt) : "DATE UNVERIFIED", "timeline-date");
    const marker = addText(step, "span", "", `timeline-marker ${item.claim.stance}`);
    marker.setAttribute("aria-hidden", "true");
    const content = addText(step, "div", "", "timeline-content");
    addText(content, "strong", item.source.title);
    addText(content, "span", `${item.claim.stance.toUpperCase()} · Source record`, "timeline-label");
  }
  if (!items.length) addText($("#timeline"), "p", "No dated source records are linked yet.", "empty-inline");
}

function renderBrief(event, eligible, supporting, contextual, conflicting, sources, asOf) {
  $("#brief-intro").textContent = `${supporting.length} supporting, ${conflicting.length} conflicting, and ${contextual.length} contextual claim(s) are eligible as of ${dateText(asOf)}. Historical publication dates show when the record was made; they do not turn it into current market news.`;
  clear($("#brief-points"));
  for (const claim of [...supporting, ...conflicting, ...contextual]) {
    const source = sources.get(claim.sourceId);
    addText($("#brief-points"), "li", `${claim.stance.toUpperCase()}: ${claim.text} (${source?.title || "source unavailable"})`);
  }
  if (!eligible.length) addText($("#brief-points"), "li", "No eligible sourced claims for this review date.");
  briefText = [`DRAFT — ${mode === "demo" ? "FICTIONAL DEMO" : "SANITY RESEARCH"}`, event.title, $("#brief-intro").textContent, ...Array.from($("#brief-points").children, (li) => `• ${li.textContent}`), "HUMAN REVIEW REQUIRED"].join("\n");
}

function render() {
  if (!graph?.events?.length) return;
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const event = graph.events.find((item) => item.id === $("#event-select").value) || graph.events[0];
  const claims = graph.claims.filter((claim) => claim.eventId === event.id && sources.has(claim.sourceId));
  const inputDate = safeDate($("#as-of").value);
  const asOf = inputDate || new Date();
  $("#event-select").value = event.id;
  $("#event-title").textContent = event.title;
  $("#event-summary").textContent = event.summary || "No summary has been published for this question.";
  $("#observed").textContent = dateText(event.observedAt);
  $("#review").textContent = (event.review || "needs-human-review").replaceAll("-", " ").toUpperCase();
  $("#review-dot").className = `review-dot ${event.review || "needs-human-review"}`;
  $("#notice").textContent = graph.notice;
  const result = renderEvidence(event, claims, sources, asOf);
  renderSources(claims, sources);
  renderTimeline(claims, sources);
  renderBrief(event, result.eligible, result.supporting, result.contextual, result.conflicting, sources, asOf);
  renderMetrics();
}

async function loadMode(nextMode) {
  const request = ++requestNumber;
  mode = nextMode;
  $("#live-mode").classList.toggle("active", mode === "live");
  $("#demo-mode").classList.toggle("active", mode === "demo");
  $("#live-mode").setAttribute("aria-pressed", String(mode === "live"));
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  $("#mode-badge").textContent = mode === "live" ? "PUBLISHED SANITY DATA" : "FICTIONAL DEMO";
  setVisible("#desk", false); setVisible("#sources", false); setVisible("#method", false); setVisible("#method-strip", false); setVisible("#empty", false); setVisible("#error", false); setVisible("#loading", true);
  try {
    const response = await fetch(mode === "live" ? "/api/graph" : "/data/demo.json", {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const loaded = await response.json();
    if (request !== requestNumber) return;
    if (!Array.isArray(loaded.events) || !Array.isArray(loaded.sources) || !Array.isArray(loaded.claims)) throw new Error("Invalid graph");
    graph = loaded;
    $("#loading").hidden = true;
    if (!graph.events.length) { setVisible("#empty", true); return; }
    clear($("#event-select"));
    for (const event of graph.events) { const option = addText($("#event-select"), "option", event.title); option.value = event.id; }
    render(); setVisible("#desk", true); setVisible("#sources", true); setVisible("#method", true); setVisible("#method-strip", true);
  } catch (error) {
    if (request !== requestNumber) return;
    $("#loading").hidden = true; setVisible("#error", true); $("#error").textContent = mode === "live" ? `Published Sanity data could not be loaded (${error.message}). Retry or open the fictional demo.` : `Fictional demo could not be loaded (${error.message}).`;
  }
}

const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); $("#as-of").value = now.toISOString().slice(0, 16);
$("#as-of").addEventListener("change", () => { if (graph) render(); });
$("#event-select").addEventListener("change", render);
$("#source-search").addEventListener("input", (event) => { sourceFilter = event.target.value; if (graph) render(); });
$("#live-mode").addEventListener("click", () => loadMode("live"));
$("#demo-mode").addEventListener("click", () => loadMode("demo"));
$("#refresh").addEventListener("click", () => loadMode(mode));
$("#jump-to-desk").addEventListener("click", () => $("#desk").scrollIntoView({behavior: "smooth", block: "start"}));
const titleReplay = $("#hero-title-replay");
titleReplay.addEventListener("click", () => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  titleReplay.classList.remove("is-unraveling");
  void titleReplay.offsetWidth;
  titleReplay.classList.add("is-unraveling");
});
titleReplay.querySelectorAll(".title-line")[1].addEventListener("animationend", (event) => {
  if (event.animationName === "unravel-receipt") titleReplay.classList.remove("is-unraveling");
});
$("#copy").addEventListener("click", async () => { try { await navigator.clipboard.writeText(briefText); $("#copy-state").textContent = "Draft copied"; } catch { $("#copy-state").textContent = "Clipboard blocked; select the text above."; } });
loadMode("live");
