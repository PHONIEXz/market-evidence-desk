// Editor-only shortcut from an unchecked claim to its Sanity Studio form.
// Visitors never see it. Turn it on once with ?editor=1 on any page (off with ?editor=0).
const STUDIO = "https://phoniex-market-evidence-desk.sanity.studio";

function editorMode() {
  try {
    const flag = new URLSearchParams(location.search).get("editor");
    if (flag === "1") localStorage.setItem("med-editor", "1");
    if (flag === "0") localStorage.removeItem("med-editor");
    return localStorage.getItem("med-editor") === "1";
  } catch { return new URLSearchParams(location.search).get("editor") === "1"; }
}

export function editorLink(parent, claim) {
  if (claim.review || !editorMode()) return;
  const link = document.createElement("a");
  link.className = "editor-review-link";
  link.textContent = "Review in Studio ↗";
  link.href = `${STUDIO}/intent/edit/id=${encodeURIComponent(claim.id)};type=evidenceClaim/`;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  parent.append(link);
}
