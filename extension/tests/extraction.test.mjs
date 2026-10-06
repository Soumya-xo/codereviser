import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import vm from "node:vm";

const SOURCE = readFileSync(new URL("../extraction.js", import.meta.url), "utf8");

// Fake element. `children` maps a substring of a selector to child element(s), so a
// test fixture only matches selectors that actually reference that substring.
function node(text, { innerText, children = {} } = {}) {
  return {
    textContent: text,
    innerText: innerText ?? text,
    querySelector(selector) {
      return childMatches(children, selector)[0] ?? null;
    },
    querySelectorAll(selector) {
      return childMatches(children, selector);
    }
  };
}

function childMatches(children, selector) {
  const hit = Object.entries(children).find(([needle]) => selector.includes(needle));
  if (!hit) return [];
  return Array.isArray(hit[1]) ? hit[1] : [hit[1]];
}

// Fake document. Fixture keys are substrings of the selectors that should match them.
// Every selector is recorded so tests can assert scope safety.
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

const el = (textContent) => node(textContent);

// Runs the real extension file in an isolated VM context and returns a JSON-cloned result.
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
  description_content: el("Given an array of integers, return indices of the two numbers.")
});

// HackerRank fixtures mirror the server markup observed on a real problem page:
// a sidebar of labelled .difficulty-block entries and a .challenge-body statement.
function hackerRankBlock(label, valueText) {
  return node("", {
    children: {
      "difficulty-label": el(label),
      "pull-right": el(valueText)
    }
  });
}

function hackerRankFixtures({ difficultyValue = "Easy", extraBlocks = [] } = {}) {
  const blocks = [...extraBlocks, hackerRankBlock("Difficulty", difficultyValue)];
  return {
    "challenge-page-label-wrapper h1": el("Solve Me First"),
    ".difficulty-block": blocks,
    "challenge-body": el("Complete the function to compute the sum of two integers.")
  };
}

// GFG fixtures are synthetic. They mirror the class structure found in GFG's own page
// bundle (header title h3, "Difficulty:" span in the header description, Topic Tags
// accordion section, problem_content statement). Hashed CSS-module suffixes are omitted
// because the extractor matches class prefixes.
const GFG_URL = "https://www.geeksforgeeks.org/problems/stock-buy-and-sell-max-one-transaction-allowed/1";

function gfgTagSection(title, links) {
  return node("", {
    children: {
      problems_tag_container: node(title),
      "/explore?category": links.filter((link) => link.href.includes("/explore?category")).map((link) => node(link.text)),
      "/explore?company": links.filter((link) => link.href.includes("/explore?company")).map((link) => node(link.text))
    }
  });
}

function gfgFixtures({ difficulty = null, topics = [], title = "Stock Buy and Sell – Max one Transaction Allowed" } = {}) {
  return {
    header_content__title: el(title),
    problems_header_description: difficulty ? [node(`Difficulty: ${difficulty}`)] : [],
    problems_accordion_tags__: topics.length
      ? [gfgTagSection("Topic Tags", topics.map((topic) => ({ href: `/explore?category[]=${topic}`, text: topic })))]
      : [],
    problems_problem_content: el("Given a string, compute its degree.")
  };
}

describe("LeetCode extraction (selectors unverified)", () => {
  for (const difficulty of ["Easy", "Medium", "Hard"]) {
    it(`reads ${difficulty} difficulty, title, topics and description`, () => {
      const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures(difficulty)) });
      assert.equal(result.status, "ok");
      assert.equal(result.platform, "LeetCode");
      assert.equal(result.title, "Two Sum");
      assert.equal(result.difficulty, difficulty);
      assert.deepEqual(result.topics, ["Array", "Hash Table"]);
      assert.equal(result.description, "Given an array of integers, return indices of the two numbers.");
    });
  }

  it("returns Unknown when the difficulty element is missing, never Medium", () => {
    const fixtures = leetcodeFixtures("Medium");
    delete fixtures["text-difficulty"];
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(fixtures) });
    assert.equal(result.difficulty, "Unknown");
  });

  it("returns Unknown for invalid difficulty text", () => {
    for (const text of ["Expert", "Med", "Medium difficulty", ""]) {
      const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures(text)) });
      assert.equal(result.difficulty, "Unknown", `expected Unknown for "${text}"`);
    }
  });

  it("accepts difficulty in any case and strips a 'Difficulty:' prefix", () => {
    const upper = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("EASY")) }).result;
    const labelled = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("Difficulty: Hard")) }).result;
    assert.equal(upper.difficulty, "Easy");
    assert.equal(labelled.difficulty, "Hard");
  });
});

describe("title resolution", () => {
  it("prefers the page title over the browser tab title", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument(leetcodeFixtures("Easy")),
      tabTitle: "Something else - LeetCode"
    });
    assert.equal(result.title, "Two Sum");
  });

  it("falls back to the tab title with site suffix and number prefix removed", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument({ "text-difficulty": el("Easy") }),
      tabTitle: "1. Two Sum - LeetCode"
    });
    assert.equal(result.title, "Two Sum");
  });

  it("falls back to the URL slug when neither the page nor the tab gives a usable title", () => {
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument({}), tabTitle: "" });
    assert.equal(result.title, "Two Sum");
  });

  it("rejects an implausibly long page title and uses the slug instead", () => {
    const { result } = extract({
      url: LEETCODE_URL,
      doc: makeDocument({ "question-title": el("x".repeat(300)) }),
      tabTitle: ""
    });
    assert.equal(result.title, "Two Sum");
  });

  it("rejects generic page titles such as 'Practice'", () => {
    const { result } = extract({
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      doc: makeDocument({ header_content__title: el("Practice") }),
      tabTitle: ""
    });
    assert.equal(result.title, "Reverse Degree Of A String");
  });

  it("does not turn a generic GFG tab title 'Practice | GeeksforGeeks' into the problem title", () => {
    const { result } = extract({
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      doc: makeDocument({}),
      tabTitle: "Practice | GeeksforGeeks | A computer science portal for geeks"
    });
    assert.equal(result.title, "Reverse Degree Of A String");
  });

  it("strips the CodeChef 'Practice Coding Problem' suffix from the tab title", () => {
    const { result } = extract({
      url: "https://www.codechef.com/problems/FLOW001",
      doc: makeDocument({}),
      tabTitle: "Add Two Numbers Practice Coding Problem"
    });
    assert.equal(result.title, "Add Two Numbers");
  });

  it("returns null title for CodeChef and Codeforces when no title source exists", () => {
    const codechef = extract({ url: "https://www.codechef.com/problems/FLOW001", doc: makeDocument({}), tabTitle: "" });
    const codeforces = extract({
      url: "https://codeforces.com/problemset/problem/4/A",
      doc: makeDocument({}),
      tabTitle: ""
    });
    assert.equal(codechef.result.title, null);
    assert.equal(codeforces.result.title, null);
  });
});

describe("malformed and failing DOM", () => {
  it("tolerates non-string and missing text without throwing", () => {
    const doc = makeDocument({
      "question-title": { textContent: null },
      "text-difficulty": { textContent: 42 },
      "/tag/": [{}, { textContent: undefined }, el("Graph")],
      description_content: {}
    });
    const { result } = extract({ url: LEETCODE_URL, doc, tabTitle: "Fallback - LeetCode" });
    assert.equal(result.status, "ok");
    assert.equal(result.title, "Fallback");
    assert.equal(result.difficulty, "Unknown");
    assert.deepEqual(result.topics, ["Graph"]);
    assert.equal(result.description, null);
  });

  it("degrades field by field when every DOM query throws", () => {
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
      titleSource: "tab",
      difficulty: "Unknown",
      difficultySupported: true,
      topics: [],
      description: null
    });
  });

  it("reports titleSource as page, tab, slug, or null", () => {
    const page = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("Easy")), tabTitle: "x" }).result;
    const tab = extract({ url: LEETCODE_URL, doc: makeDocument({}), tabTitle: "Other - LeetCode" }).result;
    const slug = extract({ url: LEETCODE_URL, doc: makeDocument({}), tabTitle: "" }).result;
    const none = extract({ url: "https://codeforces.com/problemset/problem/4/A", doc: makeDocument({}), tabTitle: "" }).result;
    assert.equal(page.titleSource, "page");
    assert.equal(tab.titleSource, "tab");
    assert.equal(slug.titleSource, "slug");
    assert.equal(none.titleSource, null);
  });

  it("reports difficultySupported false for platforms that do not expose Easy/Medium/Hard", () => {
    const codeforces = extract({ url: "https://codeforces.com/problemset/problem/4/A", doc: makeDocument({}) }).result;
    const codechef = extract({ url: "https://www.codechef.com/problems/FLOW001", doc: makeDocument({}) }).result;
    const hackerrank = extract({ url: "https://www.hackerrank.com/challenges/x/problem", doc: makeDocument({}) }).result;
    assert.equal(codeforces.difficultySupported, false);
    assert.equal(codechef.difficultySupported, false);
    assert.equal(hackerrank.difficultySupported, true);
  });

  it("does not throw when fixtures map to unexpected shapes", () => {
    const doc = makeDocument({ "text-difficulty": null, "question-title": undefined });
    const { result } = extract({ url: LEETCODE_URL, doc, tabTitle: "Two Sum - LeetCode" });
    assert.equal(result.difficulty, "Unknown");
    assert.equal(result.title, "Two Sum");
  });

  it("returns Unknown for HackerRank when the sidebar blocks are malformed", () => {
    const doc = makeDocument({
      ".difficulty-block": [{}, { querySelector: () => null }, null]
    });
    const { result } = extract({ url: "https://www.hackerrank.com/challenges/solve-me-first/problem", doc });
    assert.equal(result.status, "ok");
    assert.equal(result.difficulty, "Unknown");
  });
});

describe("unsupported pages and host spoofing", () => {
  const unsupportedUrls = [
    "https://example.com/problems/two-sum",
    "https://leetcode.com/",
    "https://leetcode.com/u/someone/",
    "https://notleetcode.com/problems/two-sum/",
    "https://leetcode.com.evil.test/problems/two-sum/",
    "https://hackerrank.com.evil.test/challenges/solve-me-first/problem",
    "https://www.hackerrank.com/dashboard",
    "https://geeksforgeeks.org.attacker.example/problems/x/1"
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

  it("HackerRank returns no topics, since its server markup exposes none", () => {
    const { result } = extract({
      url: "https://www.hackerrank.com/challenges/solve-me-first/problem",
      doc: makeDocument(hackerRankFixtures())
    });
    assert.deepEqual(result.topics, []);
  });
});

describe("description", () => {
  it("collapses whitespace and trims", () => {
    const doc = makeDocument({ description_content: el("  Find\n\n  two   numbers.  ") });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.equal(result.description, "Find two numbers.");
  });

  it("prefers innerText so <style> and <script> content is excluded", () => {
    const styled = node("body { color: red } Find two numbers.", {
      innerText: "Find two numbers."
    });
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument({ description_content: styled }) });
    assert.equal(result.description, "Find two numbers.");
  });

  it("caps long descriptions at 1000 characters", () => {
    const doc = makeDocument({ description_content: el("word ".repeat(600)) });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.ok(result.description.length <= 1000);
    assert.ok(result.description.length > 900);
  });

  it("returns null for empty or whitespace-only descriptions", () => {
    const doc = makeDocument({ description_content: el("   \n\t ") });
    const { result } = extract({ url: LEETCODE_URL, doc });
    assert.equal(result.description, null);
  });
});

describe("HackerRank (title, difficulty, description verified against server markup)", () => {
  const url = "https://www.hackerrank.com/challenges/solve-me-first/problem";

  it("reads the title from the page label, not the tab title", () => {
    const { result } = extract({ url, doc: makeDocument(hackerRankFixtures()), tabTitle: "Other - HackerRank" });
    assert.equal(result.title, "Solve Me First");
  });

  it("reads Easy from the block labelled Difficulty", () => {
    const { result } = extract({ url, doc: makeDocument(hackerRankFixtures({ difficultyValue: "Easy" })) });
    assert.equal(result.difficulty, "Easy");
  });

  it("reads Medium and Hard from the Difficulty block", () => {
    for (const value of ["Medium", "Hard"]) {
      const { result } = extract({ url, doc: makeDocument(hackerRankFixtures({ difficultyValue: value })) });
      assert.equal(result.difficulty, value);
    }
  });

  it("ignores a non-difficulty block that happens to contain Easy or Hard text", () => {
    const decoy = hackerRankBlock("Max Score", "Hard");
    const { result } = extract({
      url,
      doc: makeDocument(hackerRankFixtures({ difficultyValue: "Medium", extraBlocks: [decoy] }))
    });
    assert.equal(result.difficulty, "Medium");
  });

  it("returns Unknown when no block is labelled Difficulty", () => {
    const decoy = hackerRankBlock("Max Score", "Easy");
    const doc = makeDocument({
      "challenge-page-label-wrapper h1": el("Solve Me First"),
      ".difficulty-block": [decoy]
    });
    const { result } = extract({ url, doc });
    assert.equal(result.difficulty, "Unknown");
  });

  it("returns Unknown for an invalid difficulty value in the Difficulty block", () => {
    const { result } = extract({ url, doc: makeDocument(hackerRankFixtures({ difficultyValue: "Expert" })) });
    assert.equal(result.difficulty, "Unknown");
  });

  it("reads the statement from the challenge body", () => {
    const { result } = extract({ url, doc: makeDocument(hackerRankFixtures()) });
    assert.equal(result.description, "Complete the function to compute the sum of two integers.");
  });

  it("accepts the contest-scoped challenge URL form", () => {
    const { result } = extract({
      url: "https://www.hackerrank.com/contests/some-contest/challenges/solve-me-first",
      doc: makeDocument(hackerRankFixtures())
    });
    assert.equal(result.platform, "HackerRank");
    assert.equal(result.title, "Solve Me First");
  });
});

describe("platform dispatch and fixtures for the remaining platforms (selectors UNVERIFIED)", () => {
  it("LeetCode dispatches and extracts fields", () => {
    const { result } = extract({ url: LEETCODE_URL, doc: makeDocument(leetcodeFixtures("Hard")) });
    assert.equal(result.platform, "LeetCode");
    assert.equal(result.difficulty, "Hard");
  });

  it("GeeksForGeeks dispatches and extracts fields from its verified structure", () => {
    const { result } = extract({
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      doc: makeDocument(gfgFixtures({ difficulty: "Easy", topics: ["Strings", "Basic"], title: "Reverse Degree of a String" }))
    });
    assert.equal(result.platform, "GeeksForGeeks");
    assert.equal(result.title, "Reverse Degree of a String");
    assert.equal(result.difficulty, "Easy");
    assert.deepEqual(result.topics, ["Strings", "Basic"]);
    assert.equal(result.description, "Given a string, compute its degree.");
  });

  it("GeeksForGeeks yields Unknown difficulty and slug title when nothing matches", () => {
    const { result } = extract({
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      doc: makeDocument({})
    });
    assert.equal(result.difficulty, "Unknown");
    assert.equal(result.title, "Reverse Degree Of A String");
  });

  it("GeeksForGeeks reads Easy, Medium, and Hard from the 'Difficulty:' span", () => {
    for (const difficulty of ["Easy", "Medium", "Hard"]) {
      const { result } = extract({
        url: GFG_URL,
        doc: makeDocument(gfgFixtures({ difficulty }))
      });
      assert.equal(result.difficulty, difficulty);
    }
  });

  it("GeeksForGeeks ignores non-difficulty spans such as Accuracy", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument({
        ...gfgFixtures({ difficulty: null }),
        problems_header_description: [node("Accuracy: 52%"), node("Submissions: 1200")]
      })
    });
    assert.equal(result.difficulty, "Unknown");
  });

  it("GeeksForGeeks returns Unknown for an invalid difficulty value", () => {
    const { result } = extract({ url: GFG_URL, doc: makeDocument(gfgFixtures({ difficulty: "Expert" })) });
    assert.equal(result.difficulty, "Unknown");
  });

  it("GeeksForGeeks never infers difficulty from the problem name", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument(gfgFixtures({ difficulty: null, title: "Easy Hard Medium Problem" }))
    });
    assert.equal(result.difficulty, "Unknown");
    assert.equal(result.title, "Easy Hard Medium Problem");
  });

  it("GeeksForGeeks reads topics only from the 'Topic Tags' section, not Company Tags", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument({
        ...gfgFixtures({ difficulty: "Easy", topics: [] }),
        "problems_accordion_tags__": [
          gfgTagSection("Company Tags", [{ href: "/explore?company[]=Amazon", text: "Amazon" }]),
          gfgTagSection("Topic Tags", [
            { href: "/explore?category[]=Arrays", text: "Arrays" },
            { href: "/explore?category[]=Greedy", text: "Greedy" }
          ])
        ]
      })
    });
    assert.deepEqual(result.topics, ["Arrays", "Greedy"]);
  });

  it("GeeksForGeeks returns no topics when no Topic Tags section exists", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument({
        ...gfgFixtures({ difficulty: "Easy", topics: [] }),
        "problems_accordion_tags__": [
          gfgTagSection("Company Tags", [{ href: "/explore?company[]=Amazon", text: "Amazon" }])
        ]
      })
    });
    assert.deepEqual(result.topics, []);
  });

  it("GeeksForGeeks strips the '| Practice | GeeksforGeeks' suffix from the tab title", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument({}),
      tabTitle: "Stock Buy and Sell – Max one Transaction Allowed | Practice | GeeksforGeeks | A computer science portal for geeks"
    });
    assert.equal(result.title, "Stock Buy and Sell – Max one Transaction Allowed");
  });

  it("GeeksForGeeks prefers the h3 problem title over the tab title", () => {
    const { result } = extract({
      url: GFG_URL,
      doc: makeDocument(gfgFixtures({ difficulty: "Easy", title: "Stock Buy and Sell – Max one Transaction Allowed" })),
      tabTitle: "Something | Practice | GeeksforGeeks"
    });
    assert.equal(result.title, "Stock Buy and Sell – Max one Transaction Allowed");
  });

  it("Codeforces dispatches, reads tags, and never reads difficulty", () => {
    const { result } = extract({
      url: "https://codeforces.com/problemset/problem/4/A",
      doc: makeDocument({
        ".problem-statement .header .title": el("A. Watermelon"),
        ".tag-box": [el("implementation"), el("math")],
        difficulty: el("Easy")
      })
    });
    assert.equal(result.platform, "Codeforces");
    assert.equal(result.title, "A. Watermelon");
    assert.equal(result.difficulty, "Unknown");
    assert.deepEqual(result.topics, ["implementation", "math"]);
    assert.equal(result.description, null);
  });

  it("CodeChef takes its title from the page title and has no verified topic or description source", () => {
    const { result } = extract({
      url: "https://www.codechef.com/problems/FLOW001",
      doc: makeDocument({
        "h1.problem-title": el("Something Else"),
        ".problem-tags a": [el("easy-math")],
        "#problem-statement": el("Add two integers.")
      }),
      tabTitle: "Add Two Numbers Practice Coding Problem"
    });
    assert.equal(result.platform, "CodeChef");
    assert.equal(result.title, "Add Two Numbers");
    assert.equal(result.difficulty, "Unknown");
    assert.deepEqual(result.topics, []);
    assert.equal(result.description, null);
  });

  it("CodeChef never maps a 'Easy' label to difficulty, since its difficulty is a numeric rating", () => {
    const { result } = extract({
      url: "https://www.codechef.com/problems/FLOW001",
      doc: makeDocument({ difficulty: el("Easy"), rating: el("1600") }),
      tabTitle: "Add Two Numbers Practice Coding Problem"
    });
    assert.equal(result.difficulty, "Unknown");
  });

  it("CodeChef and Codeforces accept their documented URL forms", () => {
    assert.equal(
      extract({ url: "https://www.codechef.com/practice/easy/problems/FLOW001", doc: makeDocument({}) }).result.platform,
      "CodeChef"
    );
    assert.equal(extract({ url: "https://codeforces.com/contest/1/A", doc: makeDocument({}) }).result.platform, "Codeforces");
    assert.equal(
      extract({ url: "https://codeforces.com/gym/100/problem/B", doc: makeDocument({}) }).result.platform,
      "Codeforces"
    );
  });
});

describe("unrelated Easy/Medium/Hard text", () => {
  it("is ignored by Codeforces and CodeChef", () => {
    for (const url of ["https://codeforces.com/problemset/problem/4/A", "https://www.codechef.com/problems/FLOW001"]) {
      const { result } = extract({ url, doc: makeDocument({ difficulty: el("Easy"), "pill-hard": el("Hard") }) });
      assert.equal(result.difficulty, "Unknown", url);
    }
  });

  it("is ignored by GeeksForGeeks when it sits outside the difficulty selector", () => {
    const { result } = extract({
      url: "https://www.geeksforgeeks.org/problems/reverse-degree-of-a-string/1",
      doc: makeDocument({ "unrelated-badge": el("Hard") })
    });
    assert.equal(result.difficulty, "Unknown");
  });
});

describe("DOM scope safety", () => {
  const cases = [
    { url: LEETCODE_URL, fixtures: leetcodeFixtures("Easy") },
    { url: "https://www.geeksforgeeks.org/problems/x/1", fixtures: {} },
    { url: "https://codeforces.com/problemset/problem/4/A", fixtures: {} },
    { url: "https://www.codechef.com/problems/X", fixtures: {} },
    { url: "https://www.hackerrank.com/challenges/x/problem", fixtures: hackerRankFixtures() }
  ];

  for (const { url, fixtures } of cases) {
    it(`${url} queries only class-, id-, or attribute-scoped selectors`, () => {
      const { doc } = extract({ url, doc: makeDocument(fixtures), tabTitle: "x" });
      for (const selector of doc.selectorLog) {
        assert.match(selector, /[.#[]/, `unscoped selector: "${selector}"`);
        assert.doesNotMatch(selector, /(^|[\s>+~,])\*(\s|$)/, `wildcard selector: "${selector}"`);
      }
    });
  }
});
