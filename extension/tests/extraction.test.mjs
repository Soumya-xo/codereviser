import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../extraction.js", import.meta.url), "utf8");

// Fake document: each fixture key is a substring of the selector that should match it.
// Selectors are recorded so tests can assert the extractor never scrapes broadly.
function makeDocument(fixtures = {}, { title = "", throwOnQuery = false } = {}) {
  const selectorLog = [];
  const find = (selector) => {
    selectorLog.push(selector);
    if (throwOnQuery) throw new Error("query failed");
    const hit = Object.entries(fixtures).find(([needle]) => selector.includes(needle));
    return hit ? hit[1] : undefined;
  };
  return {
    title,
    selectorLog,
    querySelector(selector) {
      const value = find(selector);
      return Array.isArray(value) ? value[0] ?? null : value ?? null;
    },
    querySelectorAll(selector) {
      const value = find(selector);
      if (value == null) return [];
      return Array.isArray(value) ? value : [value];
    }
  };
}

const el = (textContent) => ({ textContent });

// Runs the real extension file in an isolated VM context and returns the JSON-cloned result.
function extract({ url, doc = makeDocument(), tabTitle = "" }) {
  const context = { document: doc, location: new URL(url) };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(SOURCE, context);
  const result = context.__codeReviseExtractMetadata(tabTitle);
  return { result: JSON.parse(JSON.stringify(result)), doc };
}

const LEETCODE_URL = "https://leetcode.com/problems/two-sum/";
const leetcodeFixtures = (difficulty) => ({
  "question-title": el("Two Sum"),
  "text-difficulty": el(difficulty),
  "/tag/": [el("Array"), el("Hash Table")],
  "description_content": el("Given an array of integers, return indices of the two numbers.")
});

describe("LeetCode extraction", () => {
  for (const difficulty of ["Easy", "Medium", "Hard"]) {
    it(`reads ${difficulty} difficulty from the pill, title, topics and description`, () => {
      const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures(difficulty)) });
      assert.equal(result.status, "ok");
      assert.equal(result.platform, "LeetCode");
      assert.equal(result.title, "Two Sum");
      assert.equal(result.difficulty, difficulty);
      assert.deepEqual(result.topics, ["Array", "Hash Table"]);
      assert.equal(result.description, "Given an array of integers, return indices of the two numbers.");
      assert.equal(result.url, LEETCODE_URL);
    });
  }

  it("returns Unknown when the difficulty element is missing, never Medium", () => {
    const fixtures = leetcodeFixtures("Medium");
    delete fixtures["text-difficulty"];
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(fixtures) });
    assert.equal(result.difficulty, "Unknown");
    assert.equal(result.title, "Two Sum");
  });

  it("returns Unknown for invalid difficulty text", () => {
    for (const text of ["Expert", "Med", "Medium difficulty", ""]) {
      const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures(text)) });
      assert.equal(result.difficulty, "Unknown", `expected Unknown for "${text}"`);
    }
  });

  it("accepts difficulty text in any case and strips a 'Difficulty:' prefix", () => {
    const upper = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("EASY")) }).result;
    const labelled = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("Difficulty: Hard")) }).result;
    assert.equal(upper.difficulty, "Easy");
    assert.equal(labelled.difficulty, "Hard");
  });
});

describe("title handling", () => {
  it("prefers the page title over the browser tab title", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument(leetcodeFixtures("Easy")),
      tabTitle: "Something else - LeetCode"
    });
    assert.equal(result.title, "Two Sum");
  });

  it("falls back to the tab title with site suffix and number prefix removed when the page has no title", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument({ "text-difficulty": el("Easy") }),
      tabTitle: "1. Two Sum - LeetCode"
    });
    assert.equal(result.title, "Two Sum");
  });

  it("returns null title when neither the page nor the tab provides one", () => {
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument({}), tabTitle: "" });
    assert.equal(result.status, "ok");
    assert.equal(result.title, null);
  });

  it("rejects an implausibly long title", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument({ "question-title": el("x".repeat(300)) }),
      tabTitle: ""
    });
    assert.equal(result.title, null);
  });
});

describe("malformed and failing DOM", () => {
  it("tolerates non-string and missing textContent without throwing", () => {
    const doc = makeDocument({
      "question-title": { textContent: null },
      "text-difficulty": { textContent: 42 },
      "/tag/": [{}, { textContent: undefined }, el("Graph")],
      "description_content": {}
    });
    const { result } = extract({ url: LEETCODE_URL, doc, tabTitle: "Fallback - LeetCode" });
    assert.equal(result.status, "ok");
    assert.equal(result.title, "Fallback");
    assert.equal(result.difficulty, "Unknown");
    assert.deepEqual(result.topics, ["Graph"]);
    assert.equal(result.description, null);
  });

  it("degrades field by field when every DOM query throws, keeping the tab-title fallback", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument({}, { throwOnQuery: true }),
      tabTitle: "Two Sum - LeetCode"
    });
    assert.deepEqual(result, {
      status: "ok",
      platform: "LeetCode",
      url: LEETCODE_URL,
      title: "Two Sum",
      difficulty: "Unknown",
      topics: [],
      description: null
    });
  });

  it("does not throw when fixtures map to unexpected element shapes", () => {
    const doc = makeDocument({ "text-difficulty": null, "question-title": undefined });
    const { result } = extract({ url: LEETCODE_URL, doc, tabTitle: "Two Sum - LeetCode" });
    assert.equal(result.difficulty, "Unknown");
    assert.equal(result.title, "Two Sum");
  });
});

describe("unsupported pages", () => {
  const unsupportedUrls = [
    "https://example.com/problems/two-sum",
    "https://leetcode.com/",
    "https://leetcode.com/u/someone/",
    "https://notleetcode.com/problems/two-sum/",
    "https://leetcode.com.evil.test/problems/two-sum/",
    "https://www.hackerrank.com/dashboard"
  ];
  for (const url of unsupportedUrls) {
    it(`reports unsupported for ${url}`, () => {
      const { result } = extract({ url, doc: makeDocument(leetcodeFixtures("Easy")) });
      assert.deepEqual(result, { status: "unsupported" });
    });
  }
});

describe("topics", () => {
  it("deduplicates case-insensitively, trims, and drops empty or non-string values", () => {
    const doc = makeDocument({
      "/tag/": [el("  Array "), el("array"), el(""), el("Hash   Table"), el("hash table"), {}, el("Graph")]
    });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.deepEqual(result.topics, ["Array", "Hash Table", "Graph"]);
  });

  it("drops topics longer than 60 characters and caps the list at 20", () => {
    const many = Array.from({ length: 30 }, (_, index) => el(`Topic ${index}`));
    many.unshift(el("t".repeat(61)));
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument({ "/tag/": many }) });
    assert.equal(result.topics.length, 20);
    assert.ok(result.topics.every((topic) => topic.length <= 60));
    assert.equal(result.topics[0], "Topic 0");
  });

  it("returns an empty list when no topic elements exist", () => {
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument({}) });
    assert.deepEqual(result.topics, []);
  });
});

describe("description", () => {
  it("collapses whitespace and trims", () => {
    const doc = makeDocument({ "description_content": el("  Find\n\n  two   numbers.  ") });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.equal(result.description, "Find two numbers.");
  });

  it("caps long descriptions at 1000 characters", () => {
    const doc = makeDocument({ "description_content": el("word ".repeat(600)) });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.ok(result.description.length <= 1000);
    assert.ok(result.description.length > 900);
  });

  it("returns null for empty or whitespace-only descriptions", () => {
    const doc = makeDocument({ "description_content": el("   \n\t ") });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.equal(result.description, null);
  });
});

describe("platform dispatch and per-platform fixtures (selectors UNVERIFIED, require manual browser check)", () => {
  const cases = [
    {
      platform: "LeetCode",
      url: LEETCODE_URL,
      fixtures: leetcodeFixtures("Hard"),
      expect: { title: "Two Sum", difficulty: "Hard", topics: ["Array", "Hash Table"] }
    },
    {
      platform: "GeeksForGeeks",
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      fixtures: {
        ".problems_header_description h3": el("Reverse Degree of a String"),
        ".problems_header_description .difficulty": el("Easy"),
        ".problems_tag_container a": [el("Strings"), el("Basic")],
        ".problems_problem_content": el("Given a string, compute its degree.")
      },
      expect: {
        title: "Reverse Degree of a String",
        difficulty: "Easy",
        topics: ["Strings", "Basic"],
        description: "Given a string, compute its degree."
      }
    },
    {
      platform: "Codeforces",
      url: "https://codeforces.com/problemset/problem/4/A",
      fixtures: {
        ".problem-statement .header .title": el("A. Watermelon"),
        ".tag-box": [el("implementation"), el("math")],
        "difficulty": el("Easy")
      },
      expect: { title: "A. Watermelon", difficulty: "Unknown", topics: ["implementation", "math"] }
    },
    {
      platform: "CodeChef",
      url: "https://www.codechef.com/problems/FLOW001",
      fixtures: {
        "h1.problem-title": el("Add Two Numbers"),
        ".problem-tags a": [el("easy-math")],
        "#problem-statement": el("Add two integers.")
      },
      expect: {
        title: "Add Two Numbers",
        difficulty: "Unknown",
        topics: ["easy-math"],
        description: "Add two integers."
      }
    },
    {
      platform: "HackerRank",
      url: "https://www.hackerrank.com/challenges/solve-me-first/problem",
      fixtures: {
        ".challenge-page-label": el("Solve Me First"),
        ".challenge-difficulty": el("Easy"),
        ".skills-list a": [el("Algorithms")],
        ".challenge-body": el("Complete the function solveMeFirst.")
      },
      expect: {
        title: "Solve Me First",
        difficulty: "Easy",
        topics: ["Algorithms"],
        description: "Complete the function solveMeFirst."
      }
    }
  ];

  for (const testCase of cases) {
    it(`${testCase.platform}: dispatches and extracts fields`, () => {
      const { result, doc } = extract({ url: testCase.url, doc: makeDocument(testCase.fixtures) });
      assert.equal(result.status, "ok");
      assert.equal(result.platform, testCase.platform);
      assert.equal(result.title, testCase.expect.title);
      assert.equal(result.difficulty, testCase.expect.difficulty);
      assert.deepEqual(result.topics, testCase.expect.topics);
      if ("description" in testCase.expect) assert.equal(result.description, testCase.expect.description);
      assert.ok(doc.selectorLog.length > 0);
    });
  }

  it("Codeforces and CodeChef never read difficulty, even if an unrelated 'Easy' element exists", () => {
    for (const url of [
      "https://codeforces.com/problemset/problem/4/A",
      "https://www.codechef.com/problems/FLOW001"
    ]) {
      const { result } = extract({ url, doc: makeDocument({ difficulty: el("Easy") }) });
      assert.equal(result.difficulty, "Unknown", url);
    }
  });

  it("Codeforces accepts gym and contest problem URLs", () => {
    assert.equal(extract({ url: "https://codeforces.com/contest/1/A", doc: makeDocument({}) }).result.platform, "Codeforces");
    assert.equal(
      extract({ url: "https://codeforces.com/gym/100/problem/B", doc: makeDocument({}) }).result.platform,
      "Codeforces"
    );
  });

  it("CodeChef accepts practice-section problem URLs", () => {
    const { result } = extract({
      url: "https://www.codechef.com/practice/easy/problems/FLOW001",
      doc: makeDocument({})
    });
    assert.equal(result.platform, "CodeChef");
  });
});

describe("DOM scope safety", () => {
  const allFixtures = [
    { url: LEETCODE_URL, fixtures: leetcodeFixtures("Easy") },
    { url: "https://www.geeksforgeeks.org/problems/x/1", fixtures: {} },
    { url: "https://codeforces.com/problemset/problem/4/A", fixtures: {} },
    { url: "https://www.codechef.com/problems/X", fixtures: {} },
    { url: "https://www.hackerrank.com/challenges/x/problem", fixtures: {} }
  ];

  for (const { url, fixtures } of allFixtures) {
    it(`${url} queries only class-, id-, or attribute-scoped selectors`, () => {
      const { doc } = extract({ url, doc: makeDocument(fixtures), tabTitle: "x" });
      for (const selector of doc.selectorLog) {
        assert.match(selector, /[.#[]/, `unscoped selector: "${selector}"`);
        assert.doesNotMatch(selector, /(^|[\s>+~,])\*(\s|$)/, `wildcard selector: "${selector}"`);
      }
    });
  }
});
