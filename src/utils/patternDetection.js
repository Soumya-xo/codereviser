export const PATTERN_NAMES = [
  "Hash Map",
  "Two Pointers",
  "Sliding Window",
  "Binary Search",
  "Stack",
  "Queue",
  "Linked List",
  "Tree",
  "Graph",
  "BFS",
  "DFS",
  "Heap / Priority Queue",
  "Greedy",
  "Dynamic Programming",
  "Backtracking",
  "Prefix Sum",
  "Sorting",
  "Intervals",
  "Bit Manipulation",
  "Union Find",
  "Monotonic Stack"
];

export const UNCATEGORIZED = "Uncategorized";

const MIN_SCORE = 2;
const TOPIC_WEIGHT = 2;
const MAX_PATTERNS = 3;

const TOPIC_TO_PATTERNS = {
  "hash table": ["Hash Map"],
  "linked list": ["Linked List"],
  stack: ["Stack"],
  queue: ["Queue"],
  tree: ["Tree"],
  "binary search tree": ["Tree"],
  graph: ["Graph"],
  "heap / priority queue": ["Heap / Priority Queue"],
  greedy: ["Greedy"],
  "dynamic programming": ["Dynamic Programming"],
  backtracking: ["Backtracking"],
  sorting: ["Sorting"],
  intervals: ["Intervals"],
  "bit manipulation": ["Bit Manipulation"],
  "binary search": ["Binary Search"]
};

const CUES = {
  "Hash Map": [/\bhash\s?(map|table)\b/i, /\bfrequency\b/i, /\bcomplement\b/i, /\btwo sum\b/i, /\banagram\b/i],
  "Two Pointers": [/\btwo pointers?\b/i, /\bpalindrome\b/i, /\b3sum\b/i, /\bleft and right\b/i],
  "Sliding Window": [/\bsliding window\b/i, /\blongest (sub)?(string|array)\b/i, /\bat most k\b/i, /\bwithout repeating\b/i],
  "Binary Search": [/\bbinary search\b/i, /\brotated sorted\b/i, /\bsearch in (a )?sorted\b/i, /\blog\s?n\b/i],
  Stack: [/\bstack\b/i, /\bparenthes[ei]s\b/i, /\bLIFO\b/],
  Queue: [/\bqueue\b/i, /\blevel order\b/i, /\bFIFO\b/],
  "Linked List": [/\blinked[- ]?list\b/i, /\bListNode\b/],
  Tree: [/\btrees?\b/i, /\bbst\b/i, /\bsubtree\b/i, /\broot\b/i],
  Graph: [/\bgraphs?\b/i, /\bvertices\b/i, /\bedges?\b/i, /\bislands?\b/i, /\bcourse schedule\b/i],
  BFS: [/\bbfs\b/i, /\bbreadth[- ]first\b/i, /\blevel order\b/i, /\bminimum (steps|moves)\b/i],
  DFS: [/\bdfs\b/i, /\bdepth[- ]first\b/i, /\bconnected components?\b/i, /\bpath sum\b/i, /\bmax(imum)? depth\b/i],
  "Heap / Priority Queue": [/\bheap\b/i, /\bpriority queue\b/i, /\btop k\b/i, /\bkth (largest|smallest)\b/i, /\bmerge k\b/i],
  Greedy: [/\bgreedy\b/i, /\bjump game\b/i, /\bgas station\b/i, /\binterval scheduling\b/i],
  "Dynamic Programming": [
    /\bdynamic programming\b/i,
    /\bdp\b/i,
    /\bmemoi[sz]ation\b/i,
    /\bcoin change\b/i,
    /\bknapsack\b/i,
    /\bedit distance\b/i,
    /\bnumber of ways\b/i
  ],
  Backtracking: [/\bbacktrack/i, /\bpermutations?\b/i, /\bcombinations?\b/i, /\bsubsets?\b/i, /\bn-?queens\b/i, /\bword search\b/i],
  "Prefix Sum": [/\bprefix sums?\b/i, /\bsubarray sum\b/i, /\brange sums?\b/i, /\bcumulative sum\b/i, /\bpivot index\b/i],
  Sorting: [/\bsort(ed|ing)?\b/i, /\bmerge sort\b/i, /\bquick ?sort\b/i, /\bquickselect\b/i],
  Intervals: [/\bintervals?\b/i, /\bmeeting rooms?\b/i, /\boverlapp(ing|ed)\b/i, /\binsert interval\b/i],
  "Bit Manipulation": [/\bbitwise\b/i, /\bbit manipulation\b/i, /\bxor\b/i, /\bsingle number\b/i, /\bpower of two\b/i],
  "Union Find": [/\bunion[- ]?find\b/i, /\bdisjoint[- ]set\b/i, /\bredundant connection\b/i, /\bDSU\b/],
  "Monotonic Stack": [/\bmonotonic stack\b/i, /\bnext greater\b/i, /\bnext smaller\b/i, /\bdaily temperatures\b/i, /\blargest rectangle\b/i]
};

function splitTopics(topic) {
  return typeof topic === "string" ? topic.split(",").map((part) => part.trim().toLowerCase()).filter(Boolean) : [];
}

const PATTERN_KEYS = new Map(PATTERN_NAMES.map((name) => [name.toLowerCase(), name]));

export function normalizePatternNames(values) {
  const list = Array.isArray(values) ? values : typeof values === "string" ? values.split(",") : [];
  const seen = new Set();
  const result = [];
  for (const value of list) {
    const name = PATTERN_KEYS.get(String(value ?? "").trim().toLowerCase());
    if (!name || seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result.slice(0, MAX_PATTERNS);
}

// Scores each pattern from topic tags (strong) and title/description cues (weak). A pattern
// is only reported when its combined evidence reaches MIN_SCORE, so a single vague word
// never produces a pattern.
export function detectPatterns({ name = "", description = "", topic = "" } = {}) {
  const text = `${name} ${description}`;
  const scores = new Map();
  const add = (pattern, points) => scores.set(pattern, (scores.get(pattern) || 0) + points);

  for (const topicLabel of splitTopics(topic)) {
    for (const pattern of TOPIC_TO_PATTERNS[topicLabel] || []) add(pattern, TOPIC_WEIGHT);
  }
  for (const [pattern, cues] of Object.entries(CUES)) {
    for (const cue of cues) {
      if (cue.test(text)) add(pattern, 1);
    }
  }

  return [...scores.entries()]
    .filter(([, score]) => score >= MIN_SCORE)
    .sort((a, b) => b[1] - a[1] || PATTERN_NAMES.indexOf(a[0]) - PATTERN_NAMES.indexOf(b[0]))
    .slice(0, MAX_PATTERNS)
    .map(([pattern]) => pattern);
}

// Manual patterns (patternSource "manual") always win, including an intentionally empty list.
// Automatic detection only runs when the user has not set patterns by hand.
export function getProblemPatterns(problem) {
  if (problem?.patternSource === "manual") return normalizePatternNames(problem.patterns);
  return detectPatterns({ name: problem?.name, description: problem?.description, topic: problem?.topic });
}

export function patternLabel(patterns) {
  return patterns.length ? patterns.join(" · ") : UNCATEGORIZED;
}
