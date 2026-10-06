// Injected into the active tab by popup.js via chrome.scripting.executeScript.
// Runs in the page's DOM, reads only the specific nodes listed in EXTRACTORS, and
// returns a plain object. It never sends data anywhere; popup.js reads the result.
//
// Only the LeetCode difficulty selector was present in the committed design. Every other
// selector below was written without live access to the site and MUST be verified
// manually in a browser before it is relied on. A selector that matches nothing yields
// Unknown / [] / null, never a guessed value.

(function () {
  const DIFFICULTIES = ["Easy", "Medium", "Hard"];
  const MAX_TITLE_LENGTH = 200;
  const MAX_TOPIC_LENGTH = 60;
  const MAX_TOPICS = 20;
  const MAX_DESCRIPTION_LENGTH = 1000;

  const PLATFORMS = [
    { name: "LeetCode", hosts: ["leetcode.com"], path: /^\/problems\/[^/]+/ },
    { name: "GeeksForGeeks", hosts: ["geeksforgeeks.org"], path: /^\/problems\/[^/]+/ },
    {
      name: "Codeforces",
      hosts: ["codeforces.com"],
      path: /^\/(?:problemset\/problem|contest)\/\d+\/[^/]+|^\/gym\/\d+\/problem\/[^/]+/
    },
    { name: "CodeChef", hosts: ["codechef.com"], path: /^\/(?:practice\/[^/]+\/)?problems\/[^/]+/ },
    { name: "HackerRank", hosts: ["hackerrank.com"], path: /^\/(?:challenges|contests\/[^/]+\/challenges)\/[^/]+/ }
  ];

  // Empty arrays mean no reliable source exists for that field on that platform.
  const EXTRACTORS = {
    LeetCode: {
      title: ['[data-cy="question-title"]'],
      difficulty: ['[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'],
      topics: ['a[href^="/tag/"]'],
      description: ['[data-track-load="description_content"]']
    },
    GeeksForGeeks: {
      title: [".problems_header_description h3"],
      difficulty: [".problems_header_description .difficulty"],
      topics: [".problems_tag_container a"],
      description: [".problems_problem_content"]
    },
    Codeforces: {
      title: [".problem-statement .header .title"],
      difficulty: [],
      topics: [".tag-box"],
      description: []
    },
    CodeChef: {
      title: ["h1.problem-title"],
      difficulty: [],
      topics: [".problem-tags a"],
      description: ["#problem-statement"]
    },
    HackerRank: {
      title: [".challenge-page-label"],
      difficulty: [".challenge-difficulty"],
      topics: [".skills-list a"],
      description: [".challenge-body"]
    }
  };

  function cleanText(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  function textOf(element) {
    return element ? cleanText(element.textContent) : "";
  }

  function normalizeDifficulty(value) {
    const text = cleanText(value).replace(/^difficulty\s*:?\s*/i, "").toLowerCase();
    return DIFFICULTIES.find((difficulty) => difficulty.toLowerCase() === text) || null;
  }

  function normalizeTitle(value) {
    const text = cleanText(value).replace(/^\d+\.\s+/, "");
    return text && text.length <= MAX_TITLE_LENGTH ? text : null;
  }

  function titleFromTabTitle(value) {
    const withoutSiteName = cleanText(value).replace(
      /\s*[-|]\s*(LeetCode|GeeksforGeeks|Codeforces|CodeChef|HackerRank)\b.*$/i,
      ""
    );
    return normalizeTitle(withoutSiteName);
  }

  function normalizeTopics(values) {
    const seen = new Set();
    const topics = [];
    for (const value of values) {
      const topic = cleanText(value);
      const key = topic.toLowerCase();
      if (!topic || topic.length > MAX_TOPIC_LENGTH || seen.has(key)) continue;
      seen.add(key);
      topics.push(topic);
      if (topics.length === MAX_TOPICS) break;
    }
    return topics;
  }

  function normalizeDescription(value) {
    const text = cleanText(value);
    if (!text) return null;
    return text.length > MAX_DESCRIPTION_LENGTH ? text.slice(0, MAX_DESCRIPTION_LENGTH).trimEnd() : text;
  }

  function readFirst(doc, selectors, normalize) {
    for (const selector of selectors) {
      const value = normalize(textOf(doc.querySelector(selector)));
      if (value) return value;
    }
    return null;
  }

  function collectTopics(doc, selectors) {
    for (const selector of selectors) {
      const topics = normalizeTopics(Array.from(doc.querySelectorAll(selector), textOf));
      if (topics.length) return topics;
    }
    return [];
  }

  function safely(read, fallback) {
    try {
      return read();
    } catch {
      return fallback;
    }
  }

  function detectPlatform(hostname, pathname) {
    const host = String(hostname || "").toLowerCase();
    return (
      PLATFORMS.find(
        (platform) =>
          platform.hosts.some((domain) => host === domain || host.endsWith(`.${domain}`)) &&
          platform.path.test(pathname)
      ) || null
    );
  }

  function extractPage(doc, loc, tabTitle) {
    const platform = detectPlatform(loc.hostname, loc.pathname);
    if (!platform) return { status: "unsupported" };

    const selectors = EXTRACTORS[platform.name];
    return {
      status: "ok",
      platform: platform.name,
      url: loc.href,
      title: safely(() => readFirst(doc, selectors.title, normalizeTitle), null) || titleFromTabTitle(tabTitle),
      difficulty: safely(() => readFirst(doc, selectors.difficulty, normalizeDifficulty), null) || "Unknown",
      topics: safely(() => collectTopics(doc, selectors.topics), []),
      description: safely(() => readFirst(doc, selectors.description, normalizeDescription), null)
    };
  }

  window.__codeReviseExtractMetadata = function (tabTitle) {
    try {
      return extractPage(document, location, tabTitle);
    } catch {
      return null;
    }
  };
})();
