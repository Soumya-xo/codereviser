import { addDays, formatDate } from "../utils/date";

const today = new Date();

export const sampleProblems = [
  {
    id: "sample-two-sum",
    name: "Two Sum",
    platform: "LeetCode",
    difficulty: "Easy",
    topic: "Hash Map",
    url: "https://leetcode.com/problems/two-sum/",
    notes: "Revisit complement lookup and edge cases with duplicate values.",
    dateSolved: formatDate(addDays(today, -4)),
    lastRevised: formatDate(addDays(today, -1)),
    nextRevisionDate: formatDate(today),
    revisionStage: 2,
    favorite: true,
    completed: false,
    archived: false,
    revisionHistory: [
      { date: formatDate(addDays(today, -1)), stage: 1 },
      { date: formatDate(today), stage: 2, scheduled: true }
    ],
    createdAt: formatDate(addDays(today, -4)),
    updatedAt: formatDate(addDays(today, -1))
  },
  {
    id: "sample-lis",
    name: "Longest Increasing Subsequence",
    platform: "LeetCode",
    difficulty: "Medium",
    topic: "Dynamic Programming",
    url: "https://leetcode.com/problems/longest-increasing-subsequence/",
    notes: "Compare O(n^2) DP with binary-search patience sorting approach.",
    dateSolved: formatDate(addDays(today, -16)),
    lastRevised: formatDate(addDays(today, -8)),
    nextRevisionDate: formatDate(addDays(today, 7)),
    revisionStage: 3,
    favorite: false,
    completed: false,
    archived: false,
    revisionHistory: [
      { date: formatDate(addDays(today, -15)), stage: 1 },
      { date: formatDate(addDays(today, -12)), stage: 2 },
      { date: formatDate(addDays(today, -8)), stage: 3 }
    ],
    createdAt: formatDate(addDays(today, -16)),
    updatedAt: formatDate(addDays(today, -8))
  },
  {
    id: "sample-dijkstra",
    name: "Network Delay Time",
    platform: "LeetCode",
    difficulty: "Medium",
    topic: "Graphs",
    url: "https://leetcode.com/problems/network-delay-time/",
    notes: "Practice heap implementation and unreachable node handling.",
    dateSolved: formatDate(addDays(today, -1)),
    lastRevised: "",
    nextRevisionDate: formatDate(today),
    revisionStage: 0,
    favorite: true,
    completed: false,
    archived: false,
    revisionHistory: [{ date: formatDate(today), stage: 1, scheduled: true }],
    createdAt: formatDate(addDays(today, -1)),
    updatedAt: formatDate(addDays(today, -1))
  },
  {
    id: "sample-trie",
    name: "Implement Trie",
    platform: "HackerRank",
    difficulty: "Hard",
    topic: "Strings",
    url: "https://www.hackerrank.com/",
    notes: "Focus on insert/search prefix paths and node memory shape.",
    dateSolved: formatDate(addDays(today, -35)),
    lastRevised: formatDate(addDays(today, -5)),
    nextRevisionDate: "",
    revisionStage: 5,
    favorite: false,
    completed: true,
    archived: false,
    revisionHistory: [
      { date: formatDate(addDays(today, -34)), stage: 1 },
      { date: formatDate(addDays(today, -31)), stage: 2 },
      { date: formatDate(addDays(today, -24)), stage: 3 },
      { date: formatDate(addDays(today, -9)), stage: 4 },
      { date: formatDate(addDays(today, -5)), stage: 5 }
    ],
    createdAt: formatDate(addDays(today, -35)),
    updatedAt: formatDate(addDays(today, -5))
  }
];
