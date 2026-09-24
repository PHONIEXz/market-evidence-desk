import {comparisonFromGraph} from "./comparison.js";

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
let comparisonMode = "scope";

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

function renderComparison() {
  const output = $("#comparison-output");
  clear(output);
  const comparing = comparisonMode === "scope";
  $("#comparison-scope").setAttribute("aria-pressed", String(comparing));
  $("#comparison-price").setAttribute("aria-pressed", String(!comparing));
  $("#comparison-question").textContent = comparing
    ? "What can a customer check in a proof-of-reserves snapshot, and what does that leave unverified?"
    : "What is Bitcoin's price right now, and should I buy it today?";
  $("#comparison-context").textContent = comparing
    ? "Checking a customer's inclusion and assessing an exchange's overall liabilities are different questions."
    : "A dated investor alert cannot supply a live market price or a trading decision.";
  $("#comparison-command").textContent = `python agent.py --case ${comparing ? "compare" : "price"}`;
  $("#comparison-label").textContent = comparing ? "PUBLISHED SANITY SOURCE TRAIL" : "EVIDENCE BOUNDARY";
  $("#comparison-copy-status").textContent = "";

  if (mode !== "live") {
    addText(output, "p", "Switch to Published data in the research desk to inspect real source records. The fictional demo has its own separate example.");
    return;
  }
  if (!graph) {
    addText(output, "p", "Waiting for the published Sanity graph. If it is unavailable, retry below.");
    return;
  }
  if (!comparing) {
    addText(output, "p", "This dated research graph has no live price feed or basis for a buy recommendation. The CLI agent's recorded test declined to provide either one.", "comparison-boundary");
    addText(output, "p", "The available source records are historical. Open the sourcebook below to check their dates before drawing any conclusion.", "comparison-aside");
    return;
  }
  const comparison = comparisonFromGraph(graph);
  if (!comparison) {
    addText(output, "p", "The published graph does not contain all three correctly linked sources for this comparison. Check the records in Sanity Studio before relying on the answer.");
    return;
  }
  addText(output, "p", comparison.event.summary || "Compare the linked, dated source claims below.", "comparison-summary");
  for (const {source, claim, label} of comparison.rows) {
    const row = addText(output, "article", "", "comparison-source");
    addText(row, "span", `${label} · ${publishedDate(source.publishedAt)} · ${claim.stance.toUpperCase()}`, "comparison-source-meta");
    addText(row, "p", claim.text);
    const link = addText(row, "a", `Read ${source.title} ↗`);
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }
  addText(output, "p", `${comparison.event.review === "approved" ? "Reviewed" : "Human review pending"}. These historical records do not establish current solvency.`, "comparison-aside");
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
  graph = null;
  renderComparison();
  $("#refresh").textContent = mode === "live" ? "Retry published data ↻" : "Retry fictional demo ↻";
  setVisible("#open-demo", mode === "live");
  $("#live-mode").classList.toggle("active", mode === "live");
  $("#demo-mode").classList.toggle("active", mode === "demo");
  $("#live-mode").setAttribute("aria-pressed", String(mode === "live"));
  $("#demo-mode").setAttribute("aria-pressed", String(mode === "demo"));
  $("#mode-badge").textContent = mode === "live" ? "PUBLISHED SANITY DATA" : "FICTIONAL DEMO";
  setVisible("#desk", false); setVisible("#sources", false); setVisible("#method", false); setVisible("#method-strip", false); setVisible("#empty", false); setVisible("#error", false); setVisible("#loading", true); setVisible("#graph-actions", true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(mode === "live" ? "/api/evidence" : "/data/demo.json", {signal: controller.signal});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const loaded = await response.json();
    if (request !== requestNumber) return;
    if (!Array.isArray(loaded.events) || !Array.isArray(loaded.sources) || !Array.isArray(loaded.claims)) throw new Error("Invalid graph");
    graph = loaded;
    renderComparison();
    $("#loading").hidden = true;
    if (!graph.events.length) { setVisible("#empty", true); return; }
    clear($("#event-select"));
    for (const event of graph.events) { const option = addText($("#event-select"), "option", event.title); option.value = event.id; }
    render(); setVisible("#desk", true); setVisible("#sources", true); setVisible("#method", true); setVisible("#method-strip", true); setVisible("#graph-actions", false);
  } catch (error) {
    if (request !== requestNumber) return;
    $("#loading").hidden = true; setVisible("#error", true); $("#error").textContent = mode === "live" ? "Published Sanity data did not load. Retry or open the fictional demo." : "Fictional demo did not load. Retry in a moment.";
    renderComparison();
  } finally {
    clearTimeout(timeout);
  }
}

const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); $("#as-of").value = now.toISOString().slice(0, 16);
$("#as-of").addEventListener("change", () => { if (graph) render(); });
$("#event-select").addEventListener("change", render);
$("#source-search").addEventListener("input", (event) => { sourceFilter = event.target.value; if (graph) render(); });
$("#live-mode").addEventListener("click", () => loadMode("live"));
$("#demo-mode").addEventListener("click", () => loadMode("demo"));
$("#refresh").addEventListener("click", () => loadMode(mode));
$("#open-demo").addEventListener("click", () => loadMode("demo"));
$("#comparison-scope").addEventListener("click", () => { comparisonMode = "scope"; renderComparison(); });
$("#comparison-price").addEventListener("click", () => { comparisonMode = "price"; renderComparison(); });
$("#comparison-copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("#comparison-command").textContent);
    $("#comparison-copy-status").textContent = "Command copied";
  } catch {
    $("#comparison-copy-status").textContent = "Clipboard unavailable. Select the command to copy it.";
  }
});
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
let agentReady = false;
let agentBusy = false;

async function checkAgent() {
  try {
    const response = await fetch("/api/ask", {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error("Status unavailable");
    const status = await response.json();
    agentReady = status.ready === true;
    $("#agent-status").textContent = agentReady
      ? "Ready. This is a real Sanity Context agent run and may take up to a minute."
      : "The hosted agent is awaiting server configuration. You can inspect the published evidence above or run the agent locally.";
  } catch {
    $("#agent-status").textContent = "The hosted agent is unavailable right now. You can run the agent locally.";
  }
  $("#agent-run").disabled = !agentReady;
  $("#comparison-run-online").disabled = !agentReady;
}

async function runAgent() {
  if (!agentReady || agentBusy) return;
  agentBusy = true;
  $("#agent-run").disabled = true;
  $("#comparison-run-online").disabled = true;
  $("#agent-case").disabled = true;
  $("#agent-result").hidden = true;
  $("#agent-status").textContent = "Reading published Sanity sources and the Sourcebook…";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 65000);
  try {
    const response = await fetch("/api/ask", {
      method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({case: $("#agent-case").value}), signal: controller.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The research run failed. Try again later.");
    if (typeof result.answer !== "string" || !Array.isArray(result.tools)) throw new Error("The agent returned an incomplete answer.");
    // Keep untrusted model output as text while removing common Markdown markers.
    $("#agent-answer-text").textContent = result.answer
      .replace(/^#{1,6}\s+/gm, "")
      .replace(/\*\*([^*\n]+)\*\*/g, "$1")
      .replace(/(^|\n)[ \t]*-[ \t]+/g, "$1• ");
    const tools = $("#agent-tools"); clear(tools);
    for (const name of result.tools) if (typeof name === "string") addText(tools, "span", name);
    const sources = $("#agent-sources"); clear(sources);
    const cited = (graph?.sources || []).filter((source) => result.answer.includes(source.url));
    if (cited.length) addText(sources, "span", "SOURCE LINKS IN THE ANSWER", "example-label");
    for (const source of cited) {
      const link = addText(sources, "a", `${source.title} ↗`);
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
    $("#agent-result").hidden = false;
    $("#agent-status").textContent = "Run finished. Check the linked original sources and review the draft answer.";
  } catch (error) {
    $("#agent-status").textContent = error.name === "AbortError"
      ? "The run took too long. Try again later."
      : error.message || "The agent is unavailable. Try again later.";
  } finally {
    clearTimeout(timeout);
    agentBusy = false;
    $("#agent-run").disabled = !agentReady;
    $("#comparison-run-online").disabled = !agentReady;
    $("#agent-case").disabled = false;
  }
}

$("#agent-run").addEventListener("click", runAgent);
$("#comparison-run-online").addEventListener("click", () => {
  $("#agent-case").value = comparisonMode === "scope" ? "compare" : "price";
  $("#agent-demo").scrollIntoView({behavior: "smooth", block: "start"});
  runAgent();
});
checkAgent();
loadMode("live");
