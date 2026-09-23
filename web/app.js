"use strict";
const $ = (selector) => document.querySelector(selector);
const dateText = (value) => new Date(value).toLocaleString(undefined, {dateStyle: "medium", timeStyle: "short"});
const addText = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value;
  if (className) node.className = className;
  parent.append(node);
  return node;
};
let graph;
let briefText = "";

function render() {
  const event = graph.events[0];
  const sources = new Map(graph.sources.map((source) => [source.id, source]));
  const asOf = new Date($("#as-of").value);
  $("#event-title").textContent = event.title;
  $("#event-summary").textContent = event.summary;
  $("#observed").textContent = `Observed ${dateText(event.observedAt)}`;
  $("#review").textContent = event.review.replaceAll("-", " ").toUpperCase();
  $("#notice").textContent = graph.notice;
  const claims = graph.claims.filter((claim) => claim.eventId === event.id && sources.has(claim.sourceId));
  $("#count").textContent = `(${claims.length})`;
  $("#claims").replaceChildren();
  for (const claim of claims) {
    const source = sources.get(claim.sourceId);
    const stale = claim.expiresAt && new Date(claim.expiresAt) <= asOf;
    const container = addText($("#claims"), "div", "", "claim");
    addText(container, "span", claim.stance.toUpperCase(), `pill ${claim.stance}`);
    if (stale) addText(container, "span", "  STALE", "pill stale");
    addText(container, "p", claim.text);
    const link = addText(container, "a", source.title);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    addText(container, "small", ` · Published ${dateText(source.publishedAt)} · Observed ${dateText(claim.observedAt)}`);
  }
  const current = claims.filter((claim) => !claim.expiresAt || new Date(claim.expiresAt) > asOf);
  const supporting = current.filter((claim) => claim.stance === "supports");
  const conflicting = current.filter((claim) => claim.stance === "conflicts");
  $("#brief-intro").textContent = `${supporting.length} supporting and ${conflicting.length} conflicting current claim(s) as of ${dateText(asOf)}. This is a source ledger, not a trading signal.`;
  $("#brief-points").replaceChildren();
  for (const claim of [...supporting, ...conflicting]) {
    const source = sources.get(claim.sourceId);
    addText($("#brief-points"), "li", `${claim.stance.toUpperCase()}: ${claim.text} — ${source.title} (${source.url})`);
  }
  if (!supporting.length && !conflicting.length) addText($("#brief-points"), "li", "No current sourced claims. Wait for evidence before drawing a conclusion.");
  $("#brief-caution").textContent = conflicting.length ? "Claims disagree. Human review is required before using this brief." : "Human review is required before publishing this brief.";
  briefText = [graph.notice, event.title, $("#brief-intro").textContent, ...Array.from($("#brief-points").children, (li) => `• ${li.textContent}`), $("#brief-caution").textContent].join("\n");
}

async function init() {
  try {
    const response = await fetch("../data/demo.json");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    graph = await response.json();
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    $("#as-of").value = date.toISOString().slice(0, 16);
    $("#as-of").addEventListener("change", render);
    $("#copy").addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(briefText); $("#copy-state").textContent = "Copied"; }
      catch { $("#copy-state").textContent = "Clipboard blocked; select the text above."; }
    });
    render();
    $("#desk").hidden = false;
  } catch (error) {
    $("#error").hidden = false;
    $("#error").textContent = `Unable to load the demo data: ${error.message}. Start the local HTTP server from the project root.`;
  }
}
init();
