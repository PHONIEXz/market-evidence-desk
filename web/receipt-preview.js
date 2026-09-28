// The claim is a paraphrase. Only a separately recorded source check contains a quotation.
const add = (parent, tag, value, className) => {
  const node = document.createElement(tag);
  node.textContent = value ?? "";
  if (className) node.className = className;
  parent.append(node);
  return node;
};

export function receiptPreview(parent, claim, source) {
  const receipt = add(parent, "span", "", "receipt-preview");
  const trigger = add(receipt, "button", "View receipt", "receipt-trigger");
  trigger.type = "button";
  trigger.setAttribute("aria-expanded", "false");
  const card = add(receipt, "div", "", "receipt-card");
  add(card, "strong", claim.review ? "Source receipt" : "Source record");
  if (claim.review) {
    add(card, "span", "Excerpt checked against the original publication. The claim above is a paraphrase.");
    add(card, "blockquote", `“${claim.review.excerpt}”`);
    add(card, "span", `Location: ${claim.review.locator}`);
    add(card, "span", `Recorded by ${claim.review.reviewer} · ${new Date(claim.review.reviewedAt).toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"})}`);
  } else {
    add(card, "span", "No editor source check recorded for this claim.");
  }
  add(card, "span", `${source.title} · ${new Date(source.publishedAt).toLocaleDateString(undefined, {dateStyle: "medium", timeZone: "UTC"})}`);
  add(card, "code", `Claim ID: ${claim.id}`);
  add(card, "code", `Source ID: ${source.id}`);
  const link = add(card, "a", "Read the original publication ↗");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  trigger.addEventListener("click", () => {
    receipt.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(receipt.classList.contains("is-open")));
  });
  receipt.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      receipt.classList.remove("is-open");
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  });
  return receipt;
}
