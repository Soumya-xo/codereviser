// Injected into the active tab's page via chrome.scripting.executeScript when the
// user clicks "Capture current page" (popup.js). Runs in the PAGE's own DOM context -
// it only reads the page, it never sends anything anywhere on its own. popup.js later
// invokes window.__codeReviseExtractMetadata() with a second, separate
// executeScript call and reads its return value.
//
// Kept deliberately separate from popup.js: this file is the only place that knows
// about page/DOM structure; popup.js only knows how to call it and stays UI-only.

(function () {
  const DIFFICULTIES = ["Easy", "Medium", "Hard"];

  function detectPlatform() {
    const host = location.hostname;
    if (host.includes("leetcode.com")) return "leetcode";
    if (host.includes("geeksforgeeks.org")) return "geeksforgeeks";
    if (host.includes("codeforces.com")) return "codeforces";
    if (host.includes("codechef.com")) return "codechef";
    if (host.includes("hackerrank.com")) return "hackerrank";
    return null;
  }

  function extractLeetCode() {
    // LeetCode's difficulty pill has, across several UI rewrites, kept a stable
    // class-name *fragment* ("text-difficulty-easy" / "-medium" / "-hard") even as the
    // hashed utility classes around it change between deploys. This targets only that
    // fragment - never the editor's language picker, the tag list, company tags, the
    // difficulty filter dropdown, or "Similar Questions" cards, none of which use this
    // class pattern. The matched text is also required to be exactly "Easy", "Medium",
    // or "Hard" before it's trusted, so an unrelated element that merely shares part of
    // the class name can never produce a wrong difficulty.
    //
    // This selector could NOT be verified against a live LeetCode page during
    // development (no network access to leetcode.com was available in that
    // environment). If LeetCode's markup no longer matches, this safely finds nothing
    // and difficulty stays "Unknown" - it never guesses.
    let difficulty = "Unknown";
    const pill = document.querySelector(
      '[class*="text-difficulty-easy"], [class*="text-difficulty-medium"], [class*="text-difficulty-hard"]'
    );
    if (pill) {
      const text = pill.textContent.trim();
      if (DIFFICULTIES.includes(text)) difficulty = text;
    }

    const titleMatch = document.title.match(/^(\d+)\.\s*(.+?)\s*-\s*LeetCode/);
    const slugMatch = location.pathname.match(/\/problems\/([^/]+)/);

    return {
      platform: "LeetCode",
      slug: slugMatch ? slugMatch[1] : "",
      name: titleMatch ? `${titleMatch[1]}. ${titleMatch[2]}` : document.title.replace(/\s*-\s*LeetCode\s*$/, ""),
      difficulty,
      // Topic tags are frequently hidden behind a "show topics" / premium-only
      // control on LeetCode, so they are not reliably present in the DOM at capture
      // time. Left empty rather than guessed; the existing "Other" topic fallback
      // in problemMetadata.js already covers this case unchanged.
      topics: [],
      url: location.href
    };
  }

  // GeeksForGeeks, Codeforces, CodeChef, and HackerRank extraction was not
  // implemented in this pass: their current DOM structure could not be verified
  // against a live page either, and the task explicitly prioritized LeetCode.
  // Returning null for them means the existing URL-based problemMetadata.js guess
  // (name/topic from the URL slug, difficulty "Unknown") continues to apply exactly
  // as it did before this change - nothing about their capture behavior changes.
  function extractUnsupported() {
    return null;
  }

  window.__codeReviseExtractMetadata = function () {
    try {
      const platform = detectPlatform();
      if (platform === "leetcode") return extractLeetCode();
      return extractUnsupported();
    } catch {
      return null;
    }
  };
})();
