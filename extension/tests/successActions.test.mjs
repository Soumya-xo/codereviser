import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAddToFuturePractice, problemFocusPath } from "../../src/utils/captureDetails.js";

describe("Open Problem target", () => {
  it("points to the existing problems list focused on the saved problem id", () => {
    assert.equal(problemFocusPath("abc-123"), "/problems?focus=abc-123");
  });

  it("encodes ids so they cannot inject extra query parameters", () => {
    assert.equal(problemFocusPath("a&b=c"), "/problems?focus=a%26b%3Dc");
  });

  it("falls back to the plain problems list when no id is available", () => {
    assert.equal(problemFocusPath(undefined), "/problems");
    assert.equal(problemFocusPath(""), "/problems");
  });
});

describe("Add to Future Practice guard", () => {
  it("allows adding a saved problem that is not yet in Future Practice", () => {
    assert.equal(canAddToFuturePractice({ problem: { id: "1", practiceLater: false }, pending: false }), true);
  });

  it("does not add a problem that is already in Future Practice", () => {
    assert.equal(canAddToFuturePractice({ problem: { id: "1", practiceLater: true }, pending: false }), false);
  });

  it("blocks repeated clicks once an add has been triggered", () => {
    assert.equal(canAddToFuturePractice({ problem: { id: "1", practiceLater: false }, pending: true }), false);
  });

  it("blocks the action when the problem has not appeared in the list yet", () => {
    assert.equal(canAddToFuturePractice({ problem: undefined, pending: false }), false);
    assert.equal(canAddToFuturePractice({ problem: null, pending: false }), false);
  });
});
