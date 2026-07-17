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

function titleFromSlug(slug) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getLeetCodeSlug(url) {
  const match = url.match(/leetcode\.com\/problems\/([^/?#]+)/i);
  return match?.[1] || "";
}

export function getProblemMetadataFromUrl(rawUrl) {
  const url = rawUrl.trim();
  if (!url) return null;

  const leetcodeSlug = getLeetCodeSlug(url);
  if (leetcodeSlug) {
    const knownProblem = leetcodeCatalog[leetcodeSlug];
    return {
      platform: "LeetCode",
      url,
      name: knownProblem?.name || titleFromSlug(leetcodeSlug),
      difficulty: knownProblem?.difficulty || "Medium",
      topic: knownProblem?.topic || "Other",
      description: knownProblem?.description || `Practice and revise ${titleFromSlug(leetcodeSlug)}.`
    };
  }

  if (/codeforces\.com/i.test(url)) return { platform: "Codeforces", url };
  if (/codechef\.com/i.test(url)) return { platform: "CodeChef", url };
  if (/geeksforgeeks\.org/i.test(url)) return { platform: "GeeksForGeeks", url };
  if (/hackerrank\.com/i.test(url)) return { platform: "HackerRank", url };

  return { platform: "Other", url };
}
