import assert from "node:assert/strict";
import {test} from "node:test";
import {reviewSummary} from "../web/review-summary.js";

test("review summary distinguishes question approval from linked claim checks", () => {
  const event = {review: "approved"};
  assert.equal(reviewSummary(event, [{review: {reviewer: "Paul Ayoade"}}, {review: {reviewer: "Paul Ayoade"}}]),
    "Question approved · 2/2 claims source checked");
  assert.equal(reviewSummary(event, [{review: {reviewer: "Paul Ayoade"}}, {review: null}]),
    "Question approved · 1/2 claims await source check");
  assert.equal(reviewSummary({review: "needs-human-review"}, []),
    "Question awaiting human review · no linked claims");
});
