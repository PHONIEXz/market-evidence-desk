"use strict";
const $ = (selector) => document.querySelector(selector);
const dateText = (value) => new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
const publishedDate = (value) => new Date(value).toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"});
const addText = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
};
let graph;
let mode = "live";
let briefText = "";
let requestNumber = 0;

function render() {
  const event = graph.events.find((item) => item.id === $("#event-select").value) || graph.events[0];
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const asOf = new Date($("#as-of").value);
  if (Number.isNaN(asOf.getTime())) return;
  $("#event-title").textContent = event.title;
  $("#event-summary").textContent = event.summary || "";
  $("#observed").textContent = `Observed ${dateText(event.observedAt)}`;
  $("#review").textContent = (event.review || "needs-human-review").replaceAll("-", " ").toUpperCase();
  $("#notice").textContent = graph.notice;
  const claims = graph.claims.filter((claim) => claim.eventId === event.id && sources.has(claim.sourceId));
  $("#count").textContent = `(${claims.length})`;
  $("#claims").replaceChildren();
  for (const claim of claims) {
    const source = sources.get(claim.sourceId);
    const stale = claim.expiresAt && new Date(claim.expiresAt) <= asOf;
    const future = new Date(claim.observedAt) > asOf || new Date(source.publishedAt) > asOf;
    const container = addText($("#claims"), "div", "", "claim");
    addText(container, "span", claim.stance.toUpperCase(), `pill ${claim.stance}`);
    if (stale) addText(container, "span", " EXPIRED", "pill stale");
    if (future) addText(container, "span", " AFTER REVIEW DATE", "pill stale");
    if (!claim.expiresAt) addText(container, "span", " NO EXPIRY SET", "pill stale");
    addText(container, "p", claim.text);
    const link = addText(container, "a", source.title);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    addText(container, "small", ` · Published ${publishedDate(source.publishedAt)} · Observed ${dateText(claim.observedAt)}`);
  }
  const eligible = claims.filter((claim) => {
    const source = sources.get(claim.sourceId);
    return new Date(claim.observedAt) <= asOf && new Date(source.publishedAt) <= asOf &&
      (!claim.expiresAt || new Date(claim.expiresAt) > asOf);
  });
  const supporting = eligible.filter((claim) => claim.stance === "supports");
  const conflicting = eligible.filter((claim) => claim.stance === "conflicts");
  $("#brief-intro").textContent = `${supporting.length} supporting and ${conflicting.length} conflicting sourced claim(s) eligible as of ${dateText(asOf)}. Source dates show when evidence was published; eligibility does not make historical material current news.`;
  $("#brief-points").replaceChildren();
  for (const claim of [...supporting, ...conflicting]) {
    const source = sources.get(claim.sourceId);
    addText($("#brief-points"), "li", `${claim.stance.toUpperCase()}: ${claim.text} — ${source.title}, published ${publishedDate(source.publishedAt)} (${source.url})`);
  }
  if (!supporting.length && !conflicting.length) addText($("#brief-points"), "li", "No eligible sourced claims for this review date.");
  $("#brief-caution").textContent = "DRAFT — Human review is required before sharing this brief. Conflicting evidence remains visible in the source ledger.";
  briefText = [`DRAFT — ${mode === "demo" ? "FICTIONAL DEMO" : "SANITY RESEARCH"}`, graph.notice, event.title, $("#brief-intro").textContent, ...Array.from($("#brief-points").children, (li) => `• ${li.textContent}`), $("#brief-caution").textContent].join("\n");
}

async function loadMode(nextMode) {
  const request = ++requestNumber;
  mode = nextMode;
  $("#live-mode").setAttribute("aria-pressed", String(mode === "live"));
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  $("#mode-badge").textContent = mode === "live" ? "PUBLISHED SANITY DATA" : "FICTIONAL DEMO";
  $("#desk").hidden = $("#empty").hidden = $("#error").hidden = true;
  $("#loading").hidden = false;
  $("#copy-state").textContent = "";
  try {
    const response = await fetch(mode === "live" ? "/api/graph" : "/data/demo.json", {cache: "no-store"});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const loaded = await response.json();
    if (request !== requestNumber) return;
    $("#loading").hidden = true;
    if (!Array.isArray(loaded.events) || !Array.isArray(loaded.sources) || !Array.isArray(loaded.claims)) throw new Error("Invalid graph");
    graph = loaded;
    if (!graph.events.length) {
      $("#empty").hidden = false;
      return;
    }
    $("#event-select").replaceChildren();
    for (const event of graph.events) {
      const option = addText($("#event-select"), "option", event.title);
      option.value = event.id;
    }
    render();
    $("#desk").hidden = false;
  } catch (error) {
    if (request !== requestNumber) return;
    $("#loading").hidden = true;
    $("#error").hidden = false;
    $("#error").textContent = mode === "live"
      ? `Published Sanity data could not be loaded (${error.message}). Check public dataset access, then retry or open the fictional demo.`
      : `Fictional demo could not be loaded (${error.message}). Start the local server from the project root.`;
  }
}

const date = new Date();
date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
$("#as-of").value = date.toISOString().slice(0, 16);
$("#as-of").addEventListener("change", () => { if (graph?.events.length) render(); });
$("#event-select").addEventListener("change", render);
$("#live-mode").addEventListener("click", () => loadMode("live"));
$("#demo-mode").addEventListener("click", () => loadMode("demo"));
$("#copy").addEventListener("click", async () => {
  try { await navigator.clipboard.writeText(briefText); $("#copy-state").textContent = "Draft copied"; }
  catch { $("#copy-state").textContent = "Clipboard blocked; select the text above."; }
});
loadMode("live");
