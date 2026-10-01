// Question approval and editor checks on linked claims are separate decisions.
export function reviewSummary(event, claims) {
  const question = event.review === "approved" ? "Question approved" :
    event.review === "rejected" ? "Question rejected" : "Question awaiting human review";
  if (!claims.length) return `${question} · no linked claims`;
  const unchecked = claims.filter((claim) => !claim.review).length;
  return `${question} · ${unchecked
    ? `${unchecked}/${claims.length} claims await source check`
    : `${claims.length}/${claims.length} claims source checked`}`;
}
