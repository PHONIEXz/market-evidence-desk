const page = document.body.dataset.page || "home";

const mark = `<svg viewBox="0 0 48 48" focusable="false"><rect class="mark-frame" x="2" y="2" width="44" height="44" rx="13" fill="#10262f" stroke="#3d756d"/><circle class="mark-orbit" cx="24" cy="24" r="17" fill="none" stroke="#57998b" stroke-width="1"/><path class="mark-link" d="M13 32 24 15 35 29" fill="none" stroke="#83e5c5" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path class="mark-trace" d="M13 32 24 15 35 29" fill="none" stroke="#f0d398" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><circle class="mark-node mark-node-a" cx="13" cy="32" r="3" fill="#83e5c5"/><circle class="mark-node mark-node-b" cx="24" cy="15" r="3" fill="#f0d398"/><circle class="mark-node mark-node-c" cx="35" cy="29" r="3" fill="#83e5c5"/></svg>`;
const header = `<header class="site-header"><div class="header-inner"><a class="brand" href="/" aria-label="Market Evidence Desk home"><span class="brand-mark" aria-hidden="true">${mark}</span><span class="brand-copy"><strong class="brand-wordmark">MARKET EVIDENCE</strong><small>Research with receipts</small></span></a><nav class="top-nav" aria-label="Primary navigation"><a data-page="home" href="/">Home</a><a data-page="atlas" href="/web/atlas.html">Evidence atlas</a><a data-page="research" href="/web/research.html">Research desk</a><a data-page="compare" href="/web/compare.html">Compare</a><a data-page="sources" href="/web/sources.html">Sources</a><a data-page="agent" href="/web/agent.html">AI agent</a><a data-page="method" href="/web/method.html">Method</a></nav><button class="mobile-nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false">☰</button><div class="header-actions"><span class="live-dot" aria-hidden="true"></span><span>PUBLISHED EVIDENCE</span></div></div></header>`;
const footer = `<footer class="site-footer"><span>MARKET EVIDENCE DESK</span><span>Published evidence · Human review · No automated trading</span><a href="https://phoniex-market-evidence-desk.sanity.studio/" target="_blank" rel="noopener noreferrer">Edit in Sanity Studio ↗</a></footer>`;
document.querySelector("[data-site-header]")?.replaceWith(document.createRange().createContextualFragment(header));
document.querySelector("[data-site-footer]")?.replaceWith(document.createRange().createContextualFragment(footer));

for (const link of document.querySelectorAll(".top-nav a, .page-links a")) {
  const target = link.dataset.page;
  if (target === page) {
    link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
}

const year = document.querySelector("[data-current-year]");
if (year) year.textContent = String(new Date().getFullYear());

const menu = document.querySelector(".mobile-nav-toggle");
const nav = document.querySelector(".top-nav");
menu?.addEventListener("click", () => {
  const open = nav?.classList.toggle("is-open") ?? false;
  menu.setAttribute("aria-expanded", String(open));
});
