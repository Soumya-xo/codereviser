// Injected into the active tab by popup.js via chrome.scripting.executeScript.
// Runs in the page's DOM, reads only the specific nodes listed in EXTRACTORS, and
// returns a plain object. It never sends data anywhere; popup.js reads the result.
//
// Verification status of each selector:
// - HackerRank title, difficulty, description: matched against the server-rendered markup
//   of a real problem page. Not yet checked in a live browser DOM.
// - GeeksForGeeks: matched against class names and structure in the site's own page
//   bundle and CSS (source-level evidence). Not yet checked in a live browser DOM.
// - LeetCode, Codeforces: unverified. Their pages could not be reached from the audit
//   environment. A selector that matches nothing yields Unknown / [] / null.
// - CodeChef: no selectors. Its problem data is not in the static HTML or the bundle
//   inspected, so the page <title> is used. The site describes problem difficulty as a
//   numeric rating, not Easy/Medium/Hard, so difficulty is always Unknown.

(function () {
  const DIFFICULTIES = ["Easy", "Medium", "Hard"];
  const MAX_TITLE_LENGTH = 200;
  const MAX_TOPIC_LENGTH = 60;
  const MAX_TOPICS = 20;
  const MAX_DESCRIPTION_LENGTH = 1000;
  const GENERIC_TITLES = new Set([
    "practice",
    "problem",
    "problems",
    "coding problem",
    "practice coding problem",
    "leetcode",
    "geeksforgeeks",
    "codeforces",
    "codechef",
    "hackerrank"
  ]);

  const PLATFORMS = [
    {
      name: "LeetCode",
      hosts: ["leetcode.com"],
      path: /^\/problems\/([^/]+)/,
      slugTitle: true
    },
    {
      name: "GeeksForGeeks",
      hosts: ["geeksforgeeks.org"],
      path: /^\/problems\/([^/]+)/,
      slugTitle: true
    },
    {
      name: "Codeforces",
      hosts: ["codeforces.com"],
      path: /^\/(?:problemset\/problem|contest)\/\d+\/[^/]+|^\/gym\/\d+\/problem\/[^/]+/,
      slugTitle: false
    },
    {
      name: "CodeChef",
      hosts: ["codechef.com"],
      path: /^\/(?:practice\/[^/]+\/)?problems\/[^/]+/,
      slugTitle: false
    },
    {
      name: "HackerRank",
      hosts: ["hackerrank.com"],
      path: /^\/(?:challenges|contests\/[^/]+\/challenges)\/([^/]+)/,
      slugTitle: true
    }
  ];

  const EXTRACTORS = {
    LeetCode: {
      title: ['[data-cy="question-title"]'],
      difficulty: ['[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'],
      topics: ['a[href^="/tag/"]'],
      description: ['[data-track-load="description_content"]']
    },
    GeeksForGeeks: {
      title: ['[class*="problems_header_content__title"] h3'],
      difficulty: [],
      labelledDifficulty: {
        selector: '[class*="problems_header_description"] span',
        label: "Difficulty"
      },
      topicSections: {
        section: '[class*="problems_accordion_tags__"]',
        title: '[class*="problems_tag_container"] strong',
        titleText: "Topic Tags",
        items: 'a[href*="/explore?category"]'
      },
      topics: [],
      description: ['[class*="problems_problem_content"]']
    },
    Codeforces: {
      title: [".problem-statement .header .title"],
      difficulty: [],
      topics: [".tag-box"],
      description: []
    },
    CodeChef: {
      title: [],
      difficulty: [],
      topics: [],
      description: []
    },
    HackerRank: {
      title: [".challenge-page-label-wrapper h1"],
      difficulty: [],
      labeledDifficulty: {
        block: ".difficulty-block",
        label: ".difficulty-label",
        labelText: "Difficulty",
        value: "p.pull-right"
      },
      topics: [],
      description: [".challenge-body"]
    }
  };

  function cleanText(value) {
    return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
  }

  // innerText skips <style>/<script> content and hidden UI, unlike textContent.
  function textOf(element) {
    if (!element) return "";
    const raw = typeof element.innerText === "string" ? element.innerText : element.textContent;
    return cleanText(raw);
  }

  function normalizeDifficulty(value) {
    const text = cleanText(value).replace(/^difficulty\s*:?\s*/i, "").toLowerCase();
    return DIFFICULTIES.find((difficulty) => difficulty.toLowerCase() === text) || null;
  }

  function normalizeTitle(value) {
    const text = cleanText(value).replace(/^\d+\.\s+/, "");
    if (!text || text.length > MAX_TITLE_LENGTH || GENERIC_TITLES.has(text.toLowerCase())) return null;
    return text;
  }

  function titleFromTabTitle(value) {
    const withoutSiteName = cleanText(value)
      .replace(/\s*\|\s*Practice\b.*$/i, "")
      .replace(/\s*[-|]\s*(LeetCode|GeeksforGeeks|Codeforces|CodeChef|HackerRank)\b.*$/i, "")
      .replace(/\s+Practice Coding Problem$/i, "");
    return normalizeTitle(withoutSiteName);
  }

  function titleFromSlug(slug) {
    let decoded = "";
    try {
      decoded = decodeURIComponent(slug || "");
    } catch {
      return null;
    }
    const words = decoded.split("-").filter(Boolean);
    if (!words.length) return null;
    return normalizeTitle(words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" "));
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

  function readLabeledDifficulty(doc, rule) {
    for (const block of Array.from(doc.querySelectorAll(rule.block))) {
      const label = textOf(block.querySelector(rule.label));
      if (label.toLowerCase() !== rule.labelText.toLowerCase()) continue;
      const value = normalizeDifficulty(textOf(block.querySelector(rule.value)));
      if (value) return value;
    }
    return null;
  }

  function readLabelledDifficulty(doc, rule) {
    const prefix = new RegExp(`^${rule.label}\\s*:`, "i");
    for (const element of Array.from(doc.querySelectorAll(rule.selector))) {
      const text = textOf(element);
      if (!prefix.test(text)) continue;
      const value = normalizeDifficulty(text);
      if (value) return value;
    }
    return null;
  }

  function hasDifficultySource(config) {
    return Boolean(config.difficulty.length || config.labeledDifficulty || config.labelledDifficulty);
  }

  function readDifficulty(doc, config) {
    if (config.labeledDifficulty) {
      const labeled = readLabeledDifficulty(doc, config.labeledDifficulty);
      if (labeled) return labeled;
    }
    if (config.labelledDifficulty) {
      const labelled = readLabelledDifficulty(doc, config.labelledDifficulty);
      if (labelled) return labelled;
    }
    return readFirst(doc, config.difficulty, normalizeDifficulty);
  }

  function readTopicSections(doc, rule) {
    for (const section of Array.from(doc.querySelectorAll(rule.section))) {
      if (textOf(section.querySelector(rule.title)).toLowerCase() !== rule.titleText.toLowerCase()) continue;
      const topics = normalizeTopics(Array.from(section.querySelectorAll(rule.items), textOf));
      if (topics.length) return topics;
    }
    return [];
  }

  function collectTopics(doc, config) {
    if (config.topicSections) {
      const sectionTopics = readTopicSections(doc, config.topicSections);
      if (sectionTopics.length) return sectionTopics;
    }
    for (const selector of config.topics) {
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

  function matchPlatform(hostname, pathname) {
    const host = String(hostname || "").toLowerCase();
    for (const platform of PLATFORMS) {
      const hostMatches = platform.hosts.some((domain) => host === domain || host.endsWith(`.${domain}`));
      const pathMatch = hostMatches ? platform.path.exec(pathname) : null;
      if (pathMatch) return { platform, slug: pathMatch[1] || "" };
    }
    return null;
  }

  function extractPage(doc, loc, tabTitle) {
    const match = matchPlatform(loc.hostname, loc.pathname);
    if (!match) return { status: "unsupported" };

    const { platform, slug } = match;
    const config = EXTRACTORS[platform.name];
    const pageTitle = safely(() => readFirst(doc, config.title, normalizeTitle), null);
    const tabTitleCandidate = titleFromTabTitle(tabTitle);
    const slugCandidate = platform.slugTitle ? titleFromSlug(slug) : null;
    const title = pageTitle || tabTitleCandidate || slugCandidate;
    const titleSource = pageTitle ? "page" : tabTitleCandidate ? "tab" : slugCandidate ? "slug" : null;

    return {
      status: "ok",
      platform: platform.name,
      url: loc.href,
      title,
      titleSource,
      difficulty: safely(() => readDifficulty(doc, config), null) || "Unknown",
      difficultySupported: hasDifficultySource(config),
      topics: safely(() => collectTopics(doc, config), []),
      description: safely(() => readFirst(doc, config.description, normalizeDescription), null)
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
