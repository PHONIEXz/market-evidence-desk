const date = (value) => {
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "Date unverified";
};

export function dossierMarkdown(event, claims, sourceMap, scopeLimit = "") {
  const ordered = [...claims].sort((a, b) =>
    Date.parse(sourceMap.get(a.sourceId)?.publishedAt) - Date.parse(sourceMap.get(b.sourceId)?.publishedAt));
  const sources = [...new Map(ordered.map((claim) => {
    const source = sourceMap.get(claim.sourceId);
    return [source.id, source];
  })).values()];
  const lines = [
    `# ${event.title}`,
    "",
    "> Research dossier from published Sanity records. Draft for human review. This is historical evidence, not current market data or investment advice.",
    "",
    event.summary || "No question summary is published.",
    "",
    `- Question record ID: ${event.id}`,
    `- Question review status: ${event.review || "needs-human-review"} (this does not verify each claim or an AI answer)`,
    `- Question observed: ${date(event.observedAt)}`,
    `- Exported: ${new Date().toISOString()}`,
    "",
    "## Dated claims",
    "",
  ];
  if (!ordered.length) lines.push("No linked claims are published for this question.", "");
  for (const claim of ordered) {
    const source = sourceMap.get(claim.sourceId);
    lines.push(
      `### ${date(source.publishedAt)} · ${source.title}`,
      "",
      `${claim.stance.toUpperCase()} · ${claim.text}`,
      "",
      `Claim record ID: ${claim.id}  `,
      `Source record ID: ${source.id}  `,
      `Claim observed: ${date(claim.observedAt)}  `,
      `Original URL: ${source.url}`,
      "",
    );
  }
  lines.push("## Bibliography", "");
  for (const source of sources) lines.push(
    `- ${source.title}. Published ${date(source.publishedAt)}. Type: ${source.kind || "unclassified"}. Sanity ID: ${source.id}. ${source.url}`,
  );
  lines.push("", "## Limits", "", scopeLimit || "Check the original publications before relying on these linked claims.", "");
  return lines.join("\n");
}
