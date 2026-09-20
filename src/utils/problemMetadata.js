const leetcodeCatalog = {
  "two-sum": {
    name: "Two Sum",
    difficulty: "Easy",
    topic: "Hash Map",
    description: "Find two numbers whose sum equals the target using previously seen values."
  },
  "add-two-numbers": {
    name: "Add Two Numbers",
    difficulty: "Medium",
    topic: "Linked List",
    description: "Add two numbers represented by reversed linked lists and return the result as a linked list."
  },
  "longest-substring-without-repeating-characters": {
    name: "Longest Substring Without Repeating Characters",
    difficulty: "Medium",
    topic: "Sliding Window",
    description: "Find the length of the longest substring that contains no repeated characters."
  },
  "median-of-two-sorted-arrays": {
    name: "Median of Two Sorted Arrays",
    difficulty: "Hard",
    topic: "Binary Search",
    description: "Find the median value across two sorted arrays without fully merging them."
  }
};

const geeksForGeeksCatalog = {
  "missing-number-in-array1416": {
    name: "Missing Number in Array",
    difficulty: "Easy",
    topic: "Arrays",
    description: "Find the missing number from an array containing numbers from 1 to n."
  }
};

function titleFromSlug(slug) {
  return slug
    .replace(/\d+$/, "")
    .replace(/_/g, "-")
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function titleFromCode(code) {
  return code
    .replace(/[-_]/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getLeetCodeSlug(url) {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return match?.[1] || "";
}

function getGeeksForGeeksSlug(url) {
  const match = url.match(/geeksforgeeks\.org\/problems\/([^/?#]+)/i);
  return match?.[1] || "";
}

function getHackerRankSlug(url) {
  const match = url.match(/hackerrank\.com\/(?:challenges|contests\/[^/]+\/challenges)\/([^/?#]+)/i);
  return match?.[1] || "";
}

function getCodeChefProblemCode(url) {
  const match = url.match(/codechef\.com\/(?:problems|practice\/[^/]+\/problems)\/([^/?#]+)/i);
  return match?.[1] || "";
}

function getCodeforcesProblemLabel(url) {
  const contestMatch = url.match(/codeforces\.com\/(?:contest|problemset\/problem)\/(\d+)\/([^/?#]+)/i);
  if (contestMatch) return `${contestMatch[1]}${contestMatch[2].toUpperCase()}`;

  const gymMatch = url.match(/codeforces\.com\/gym\/(\d+)\/problem\/([^/?#]+)/i);
  if (gymMatch) return `${gymMatch[1]}${gymMatch[2].toUpperCase()}`;

  return "";
}

function metadata(platform, url, name, overrides = {}) {
  return {
    platform,
    url,
    name,
    // Only the small hardcoded catalogs above have a verified difficulty. Everything
    // else is genuinely unknown - never guess Easy/Medium/Hard for it.
    difficulty: overrides.difficulty || "Unknown",
    topic: overrides.topic || "Other",
    description: overrides.description || `Practice and revise ${name}.`
  };
}

export function getProblemMetadataFromUrl(rawUrl) {
  const url = rawUrl.trim();
  if (!url) return null;

  const leetcodeSlug = getLeetCodeSlug(url);
  if (leetcodeSlug) {
    const knownProblem = leetcodeCatalog[leetcodeSlug];
    return metadata("LeetCode", url, knownProblem?.name || titleFromSlug(leetcodeSlug), knownProblem);
  }

  const geeksForGeeksSlug = getGeeksForGeeksSlug(url);
  if (geeksForGeeksSlug) {
    const knownProblem = geeksForGeeksCatalog[geeksForGeeksSlug];
    return metadata("GeeksForGeeks", url, knownProblem?.name || titleFromSlug(geeksForGeeksSlug), knownProblem);
  }

  const hackerRankSlug = getHackerRankSlug(url);
  if (hackerRankSlug) {
    return metadata("HackerRank", url, titleFromSlug(hackerRankSlug), {
      topic: "Problem Solving",
      description: `Practice the HackerRank challenge ${titleFromSlug(hackerRankSlug)}.`
    });
  }

  const codeChefCode = getCodeChefProblemCode(url);
  if (codeChefCode) {
    return metadata("CodeChef", url, titleFromCode(codeChefCode), {
      topic: "Competitive Programming",
      description: `Practice the CodeChef problem ${codeChefCode.toUpperCase()}.`
    });
  }

  const codeforcesLabel = getCodeforcesProblemLabel(url);
  if (codeforcesLabel) {
    return metadata("Codeforces", url, `Codeforces ${codeforcesLabel}`, {
      topic: "Competitive Programming",
      description: `Practice Codeforces problem ${codeforcesLabel}.`
    });
  }

  if (/codeforces\.com/i.test(url)) return metadata("Codeforces", url, "Codeforces Problem");
  if (/codechef\.com/i.test(url)) return metadata("CodeChef", url, "CodeChef Problem");
  if (/geeksforgeeks\.org/i.test(url)) return metadata("GeeksForGeeks", url, "GeeksForGeeks Problem");
  if (/hackerrank\.com/i.test(url)) return metadata("HackerRank", url, "HackerRank Challenge");

  return metadata("Other", url, "Coding Problem");
}
