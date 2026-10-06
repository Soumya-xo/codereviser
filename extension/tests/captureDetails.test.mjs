import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCaptureOutcome, resolveCaptureDetails } from "../../src/utils/captureDetails.js";
import { getProblemMetadataFromUrl } from "../../src/utils/problemMetadata.js";
import { normalizeProblemUrl } from "../../src/utils/problemIdentity.js";

const TODAY = "2026-10-06";
const LEETCODE = "https://leetcode.com/problems/two-sum/";

function resolve(url, params = {}) {
  return resolveCaptureDetails(
    {
      title: "",
      platform: "",
      difficulty: "",
      topics: [],
      description: "",
      fromExtension: false,
      ...params
    },
    getProblemMetadataFromUrl(url),
    TODAY
  );
}

describe("extension-sourced capture (authoritative params)", () => {
  it("keeps an explicit Unknown difficulty even when the URL catalog says Easy", () => {
    const problem = resolve(LEETCODE, { fromExtension: true, difficulty: "Unknown", title: "Two Sum" });
    assert.equal(problem.difficulty, "Unknown");
  });

  it("maps an invalid difficulty value to Unknown, never to the catalog or Medium", () => {
    assert.equal(resolve(LEETCODE, { fromExtension: true, difficulty: "Expert" }).difficulty, "Unknown");
    assert.equal(resolve(LEETCODE, { fromExtension: true, difficulty: "" }).difficulty, "Unknown");
  });

  it("uses a valid extracted difficulty", () => {
    assert.equal(resolve(LEETCODE, { fromExtension: true, difficulty: "Hard" }).difficulty, "Hard");
  });

  it("uses the extracted title, platform, and topics", () => {
    const problem = resolve(LEETCODE, {
      fromExtension: true,
      title: "  Two   Sum ",
      platform: "LeetCode",
      topics: ["Array", "array", "Hash Table", ""]
    });
    assert.equal(problem.name, "Two Sum");
    assert.equal(problem.platform, "LeetCode");
    assert.equal(problem.topic, "Array, Hash Table");
  });

  it("falls back to the placeholder topic 'Other' when no topics were extracted", () => {
    assert.equal(resolve(LEETCODE, { fromExtension: true, topics: [] }).topic, "Other");
  });

  it("stores an empty description rather than the generic catalog placeholder", () => {
    assert.equal(resolve(LEETCODE, { fromExtension: true, description: "" }).description, "");
  });

  it("ignores an unsupported platform param and keeps the URL platform", () => {
    assert.equal(resolve(LEETCODE, { fromExtension: true, platform: "Evil" }).platform, "LeetCode");
  });

  it("caps the title at 200 and the description at 1000 characters", () => {
    const problem = resolve(LEETCODE, {
      fromExtension: true,
      title: "x".repeat(300),
      description: "word ".repeat(600)
    });
    assert.equal(problem.name.length, 200);
    assert.ok(problem.description.length <= 1000);
  });
});

describe("legacy capture params (preserved behavior)", () => {
  it("prefers a valid difficulty param over the catalog", () => {
    assert.equal(resolve(LEETCODE, { difficulty: "Hard" }).difficulty, "Hard");
  });

  it("falls back to the catalog difficulty for an invalid difficulty param", () => {
    assert.equal(resolve(LEETCODE, { difficulty: "Expert" }).difficulty, "Easy");
  });

  it("keeps the generic catalog description when no description param is sent", () => {
    assert.match(resolve(LEETCODE).description, /Find two numbers/);
  });
});

describe("generic metadata handling", () => {
  it("returns null when the URL is not recognised", () => {
    assert.equal(resolveCaptureDetails({ fromExtension: true }, null, TODAY), null);
  });

  it("replaces a generic catalog name with the page title when available", () => {
    const problem = resolveCaptureDetails(
      { title: "Actual Name", fromExtension: false },
      { ...getProblemMetadataFromUrl("https://www.codechef.com/problems/FLOW001"), name: "CodeChef Problem" },
      TODAY
    );
    assert.equal(problem.name, "Actual Name");
  });
});

describe("capture outcome decision and duplicate detection", () => {
  it("waits until the cloud state is ready", () => {
    assert.equal(decideCaptureOutcome({ ready: false, alreadyExists: false }), null);
  });

  it("reports duplicate when the URL already exists", () => {
    assert.equal(decideCaptureOutcome({ ready: true, alreadyExists: true }), "duplicate");
  });

  it("reports captured for a new URL", () => {
    assert.equal(decideCaptureOutcome({ ready: true, alreadyExists: false }), "captured");
  });
});

describe("duplicate identity uses the app's existing URL normalization", () => {
  it("treats trailing slashes, query strings, hashes, and host case as the same problem", () => {
    const key = normalizeProblemUrl(LEETCODE);
    assert.equal(normalizeProblemUrl("https://leetcode.com/problems/two-sum"), key);
    assert.equal(normalizeProblemUrl("https://leetcode.com/problems/two-sum?envType=study-plan#hints"), key);
    assert.equal(normalizeProblemUrl("https://LEETCODE.com/problems/two-sum/"), key);
  });

  it("keeps different problems distinct", () => {
    assert.notEqual(normalizeProblemUrl(LEETCODE), normalizeProblemUrl("https://leetcode.com/problems/add-two-numbers/"));
  });

  it("does not throw on malformed URLs", () => {
    assert.doesNotThrow(() => normalizeProblemUrl("not a url"));
    assert.doesNotThrow(() => normalizeProblemUrl(undefined));
  });
});
