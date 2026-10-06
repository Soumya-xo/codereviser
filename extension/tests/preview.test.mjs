import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCaptureParams,
  buildPreview,
  classifyDetection,
  describePreview,
  normalizeDescription,
  normalizeDifficultyChoice,
  normalizeTitleInput,
  normalizeTopicList,
  parseTopicsInput
} from "../lib/preview.js";

const LEETCODE = "https://leetcode.com/problems/two-sum/";

function details(overrides = {}) {
  return {
    status: "ok",
    platform: "LeetCode",
    url: LEETCODE,
    title: "Two Sum",
    titleSource: "page",
    difficulty: "Easy",
    difficultySupported: true,
    topics: ["Array", "Hash Table"],
    description: "Given an array of integers, return indices of the two numbers.",
    ...overrides
  };
}

describe("difficulty validation", () => {
  it("accepts Easy, Medium, Hard, and Unknown case-insensitively", () => {
    assert.equal(normalizeDifficultyChoice("easy"), "Easy");
    assert.equal(normalizeDifficultyChoice("MEDIUM"), "Medium");
    assert.equal(normalizeDifficultyChoice("Hard"), "Hard");
    assert.equal(normalizeDifficultyChoice("unknown"), "Unknown");
  });

  it("maps invalid, empty, or malformed values to Unknown, never Medium", () => {
    for (const value of ["Expert", "Med", "Medium difficulty", "", "   ", null, undefined, 42, {}]) {
      assert.equal(normalizeDifficultyChoice(value), "Unknown", `input ${JSON.stringify(value)}`);
    }
  });
});

describe("title and topic normalization", () => {
  it("trims and collapses whitespace in titles", () => {
    assert.equal(normalizeTitleInput("  Two   Sum \n"), "Two Sum");
  });

  it("rejects empty, non-string, and over-long titles", () => {
    assert.equal(normalizeTitleInput("   "), null);
    assert.equal(normalizeTitleInput(undefined), null);
    assert.equal(normalizeTitleInput(123), null);
    assert.equal(normalizeTitleInput("x".repeat(201)), null);
  });

  it("parses comma-separated topic input, trimming and deduplicating case-insensitively", () => {
    assert.deepEqual(parseTopicsInput(" Array, hash table ,array,  , ARRAY, Graph"), ["Array", "hash table", "Graph"]);
  });

  it("drops over-long topics and caps the list at 20", () => {
    const many = Array.from({ length: 30 }, (_, index) => `Topic ${index}`).join(", ");
    const parsed = parseTopicsInput(`${"t".repeat(61)}, ${many}`);
    assert.equal(parsed.length, 20);
    assert.equal(parsed[0], "Topic 0");
  });

  it("returns [] for malformed topic input", () => {
    assert.deepEqual(parseTopicsInput(undefined), []);
    assert.deepEqual(parseTopicsInput(["Array"]), []);
    assert.deepEqual(normalizeTopicList("Array"), []);
    assert.deepEqual(normalizeTopicList([null, 7, "Graph"]), ["Graph"]);
  });
});

describe("description normalization and preview", () => {
  it("collapses whitespace and returns null for empty text", () => {
    assert.equal(normalizeDescription("  a \n b  "), "a b");
    assert.equal(normalizeDescription("   "), null);
    assert.equal(normalizeDescription(undefined), null);
  });

  it("caps stored descriptions at 1000 characters", () => {
    assert.ok(normalizeDescription("word ".repeat(600)).length <= 1000);
  });

  it("truncates the displayed preview at 160 characters with an ellipsis", () => {
    const long = "word ".repeat(100).trim();
    const shown = describePreview(long);
    assert.ok(shown.endsWith("…"));
    assert.ok(shown.length <= 161);
    assert.equal(describePreview("Short text."), "Short text.");
    assert.equal(describePreview(null), "");
  });
});

describe("buildPreview statuses", () => {
  it("marks page-sourced fields as detected", () => {
    const preview = buildPreview(details());
    assert.deepEqual(preview.status, { title: "detected", difficulty: "detected", topics: "detected", description: "detected" });
    assert.equal(preview.title, "Two Sum");
    assert.equal(preview.difficulty, "Easy");
    assert.deepEqual(preview.topics, ["Array", "Hash Table"]);
  });

  it("marks a tab- or slug-sourced title as fallback", () => {
    assert.equal(buildPreview(details({ titleSource: "tab" })).status.title, "fallback");
    assert.equal(buildPreview(details({ titleSource: "slug" })).status.title, "fallback");
  });

  it("shows Unknown as unavailable when the platform exposes difficulty but the page does not", () => {
    const preview = buildPreview(details({ difficulty: "Unknown", difficultySupported: true }));
    assert.equal(preview.difficulty, "Unknown");
    assert.equal(preview.status.difficulty, "unavailable");
  });

  it("marks difficulty as not-on-platform for sites without Easy/Medium/Hard, and never infers it", () => {
    const preview = buildPreview(
      details({ platform: "Codeforces", url: "https://codeforces.com/problemset/problem/4/A", difficulty: "Unknown", difficultySupported: false })
    );
    assert.equal(preview.difficulty, "Unknown");
    assert.equal(preview.status.difficulty, "not-on-platform");
  });

  it("marks empty topics and description as unavailable", () => {
    const preview = buildPreview(details({ topics: [], description: null }));
    assert.equal(preview.status.topics, "unavailable");
    assert.equal(preview.status.description, "unavailable");
    assert.deepEqual(preview.topics, []);
    assert.equal(preview.description, null);
  });

  it("tolerates malformed metadata without throwing", () => {
    const preview = buildPreview(
      details({ title: "   ", titleSource: null, topics: "Array", description: 99, difficulty: { value: "Easy" } })
    );
    assert.equal(preview.title, null);
    assert.equal(preview.status.title, "unavailable");
    assert.deepEqual(preview.topics, []);
    assert.equal(preview.description, null);
    assert.equal(preview.difficulty, "Unknown");
  });
});

describe("classifyDetection (popup states)", () => {
  it("returns preview for a supported page with a usable title", () => {
    const outcome = classifyDetection(details(), LEETCODE);
    assert.equal(outcome.kind, "preview");
    assert.equal(outcome.preview.title, "Two Sum");
  });

  it("returns unsupported for an unsupported-status result", () => {
    assert.deepEqual(classifyDetection({ status: "unsupported" }, "https://example.com/"), { kind: "unsupported" });
  });

  it("returns unsupported when injection fails on a non-web page such as chrome://", () => {
    assert.deepEqual(classifyDetection(null, "chrome://extensions/"), { kind: "unsupported" });
  });

  it("returns failed when injection fails on a web page", () => {
    assert.deepEqual(classifyDetection(null, LEETCODE), { kind: "failed" });
  });

  it("returns failed when no usable title exists", () => {
    assert.deepEqual(classifyDetection(details({ title: null, titleSource: null }), LEETCODE), { kind: "failed" });
  });

  it("returns failed for a platform name outside the supported list", () => {
    assert.deepEqual(classifyDetection(details({ platform: "Evil" }), LEETCODE), { kind: "failed" });
  });
});

describe("buildCaptureParams", () => {
  it("sends every field, including an explicit Unknown difficulty, and marks the source as the extension", () => {
    const preview = buildPreview(details({ difficulty: "Unknown", difficultySupported: true }));
    const params = Object.fromEntries(buildCaptureParams(preview, LEETCODE).filter(([key]) => key !== "topic"));
    assert.equal(params.url, LEETCODE);
    assert.equal(params.title, "Two Sum");
    assert.equal(params.platform, "LeetCode");
    assert.equal(params.difficulty, "Unknown");
    assert.equal(params.source, "extension");
  });

  it("repeats topic params and omits description when absent", () => {
    const preview = buildPreview(details({ description: null }));
    const pairs = buildCaptureParams(preview, LEETCODE);
    assert.deepEqual(
      pairs.filter(([key]) => key === "topic"),
      [
        ["topic", "Array"],
        ["topic", "Hash Table"]
      ]
    );
    assert.equal(pairs.some(([key]) => key === "description"), false);
  });

  it("includes description when present", () => {
    const pairs = buildCaptureParams(buildPreview(details()), LEETCODE);
    assert.ok(pairs.some(([key, value]) => key === "description" && value.startsWith("Given an array")));
  });
});
