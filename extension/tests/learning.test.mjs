import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRevisionUpdate } from "../../src/context/appState.js";
import { detectPatterns, getProblemPatterns, normalizePatternNames, PATTERN_NAMES, patternLabel } from "../../src/utils/patternDetection.js";
import {
  buildRevisionTimeline,
  getConsistency,
  getDailyQueue,
  getProblemDetailModel,
  getWeakAreas,
  scoreWeakArea,
  topicLabels
} from "../../src/utils/learning.js";
import { needsReflection, RECALL_CHOICES } from "../../src/utils/revision.js";

const TODAY = "2026-10-06";

function problem(overrides = {}) {
  return {
    id: overrides.id || overrides.name || "p",
    name: "Sample Problem",
    platform: "LeetCode",
    difficulty: "Medium",
    topic: "",
    url: "https://leetcode.com/problems/sample/",
    description: "",
    notes: "",
    nextRevisionDate: "2026-12-01",
    revisionCount: 0,
    lastIntervalDays: null,
    easeFactor: 2.5,
    revisionNotes: { approach: "", mistake: "", keyInsight: "" },
    favorite: false,
    practiceLater: false,
    completed: false,
    archived: false,
    revisionHistory: [],
    ...overrides
  };
}

const rev = (date, rating, extra = {}) => ({ date, revisionNumber: 1, rating, approach: "", mistake: "", keyInsight: "", ...extra });

describe("pattern detection", () => {
  it("detects known patterns from topic tags and title cues", () => {
    assert.ok(detectPatterns({ name: "Two Sum", topic: "Hash Table" }).includes("Hash Map"));
    assert.ok(
      detectPatterns({ name: "Longest Substring Without Repeating Characters", topic: "String" }).includes("Sliding Window")
    );
    assert.ok(detectPatterns({ name: "Search in Rotated Sorted Array", topic: "Binary Search" }).includes("Binary Search"));
    assert.ok(detectPatterns({ name: "Valid Parentheses", topic: "Stack" }).includes("Stack"));
  });

  it("returns nothing for weak evidence instead of guessing", () => {
    assert.deepEqual(detectPatterns({ name: "Stack of Plates", topic: "" }), []);
    assert.deepEqual(detectPatterns({ name: "Reverse Degree of a String", topic: "String" }), []);
    assert.deepEqual(detectPatterns({ name: "Make It Work", topic: "Other" }), []);
  });

  it("caps detected patterns at three", () => {
    const found = detectPatterns({
      name: "Dynamic programming on a graph using BFS, DFS and heap with a stack",
      topic: "Graph, Heap / Priority Queue, Dynamic Programming, Backtracking"
    });
    assert.ok(found.length <= 3);
  });

  it("keeps every supported pattern name and reports Uncategorized for none", () => {
    assert.equal(PATTERN_NAMES.length, 21);
    assert.equal(patternLabel([]), "Uncategorized");
    assert.equal(patternLabel(["Stack", "Queue"]), "Stack · Queue");
  });

  it("gives manual patterns precedence over automatic detection, including an empty manual list", () => {
    const manual = problem({ name: "Two Sum", topic: "Hash Table", patternSource: "manual", patterns: ["Graph"] });
    const cleared = problem({ name: "Two Sum", topic: "Hash Table", patternSource: "manual", patterns: [] });
    assert.deepEqual(getProblemPatterns(manual), ["Graph"]);
    assert.deepEqual(getProblemPatterns(cleared), []);
  });

  it("never mutates a problem while detecting patterns", () => {
    const item = problem({ name: "Two Sum", topic: "Array, Hash Table" });
    const before = JSON.stringify(item);
    getProblemPatterns(item);
    getWeakAreas([item], TODAY);
    getDailyQueue([item], { today: TODAY });
    assert.equal(JSON.stringify(item), before);
  });

  it("preserves the topic string that extraction produced", () => {
    assert.deepEqual(topicLabels("Array, Hash Table"), ["Array", "Hash Table"]);
    assert.deepEqual(topicLabels(undefined), []);
  });

  it("normalises manual pattern input: drops unknown names, de-duplicates, caps at three", () => {
    assert.deepEqual(normalizePatternNames(["hash map", "BOGUS", "Stack", "stack"]), ["Hash Map", "Stack"]);
    assert.equal(normalizePatternNames("Stack, Queue, Tree, Graph").length, 3);
    assert.deepEqual(normalizePatternNames(null), []);
  });
});

describe("weak areas", () => {
  const slidingA = problem({
    id: "a",
    name: "A",
    topic: "String",
    patternSource: "manual",
    patterns: ["Sliding Window"],
    nextRevisionDate: "2026-10-01",
    revisionCount: 2,
    revisionHistory: [
      rev("2026-09-20", "forgot", { mistake: "shrink" }),
      rev("2026-09-25", "hard", { revisionNumber: 2, mistake: "off by one" })
    ]
  });
  const slidingB = problem({
    id: "b",
    name: "B",
    topic: "String",
    patternSource: "manual",
    patterns: ["Sliding Window"],
    nextRevisionDate: "2026-12-01",
    revisionCount: 1,
    revisionHistory: [rev("2026-09-30", "forgot")]
  });
  const graphFine = problem({
    id: "c",
    name: "C",
    topic: "Graph",
    patternSource: "manual",
    patterns: ["Graph"],
    revisionCount: 1,
    revisionHistory: [rev("2026-10-01", "easy")]
  });
  const untouched = problem({ id: "d", name: "D", topic: "Dynamic Programming", patternSource: "manual", patterns: ["Dynamic Programming"] });

  it("scores deterministically from recall, overdue, mistakes and volume", () => {
    assert.equal(
      scoreWeakArea({ problemCount: 2, ratedCount: 2, poorRecallCount: 2, overdueCount: 1, mistakeProblemCount: 1, repeatedMistakeCount: 1, revisionCount: 3 }),
      63
    );
    assert.equal(scoreWeakArea({ problemCount: 0, ratedCount: 0, poorRecallCount: 0, overdueCount: 0, mistakeProblemCount: 0, repeatedMistakeCount: 0, revisionCount: 0 }), 0);
  });

  it("orders areas by score and explains each with plain reasons", () => {
    const areas = getWeakAreas([slidingA, slidingB, graphFine, untouched], TODAY);
    assert.equal(areas[0].label, "Sliding Window");
    assert.equal(areas[0].score, 63);
    assert.equal(areas[0].severity, "high");
    assert.ok(areas[0].reasons.includes("Low recall across 2 problems"));
    assert.ok(areas[0].reasons.includes("1 overdue revision"));
    assert.ok(areas[0].reasons.includes("Repeated mistakes"));
    assert.deepEqual(areas[0].problemIds.sort(), ["a", "b"]);
  });

  it("drops areas with no real weakness, including unrevised areas alone", () => {
    const labels = getWeakAreas([graphFine, untouched], TODAY).map((area) => area.label);
    assert.deepEqual(labels, []);
  });

  it("handles missing data without throwing", () => {
    const bare = { id: "x", name: "Bare" };
    assert.deepEqual(getWeakAreas([bare, { ...bare, id: "y", topic: null, revisionHistory: null }], TODAY), []);
  });
});

describe("daily queue", () => {
  const overdue = problem({ id: "overdue", name: "Overdue one", topic: "Stack", nextRevisionDate: "2026-10-03", revisionCount: 1 });
  const lowRecall = problem({
    id: "lowRecall",
    name: "Low recall one",
    topic: "Graph",
    nextRevisionDate: "2026-10-20",
    revisionCount: 2,
    revisionHistory: [rev("2026-10-01", "forgot")]
  });
  const weak = problem({
    id: "weak",
    name: "Weak area one",
    topic: "String",
    patternSource: "manual",
    patterns: ["Sliding Window"],
    nextRevisionDate: "2026-10-25",
    revisionCount: 1
  });
  const dueToday = problem({ id: "due", name: "Due today one", topic: "Tree", nextRevisionDate: TODAY });
  const future = problem({ id: "future", name: "Future one", topic: "Array", practiceLater: true, nextRevisionDate: "2026-12-01" });
  const quick = problem({
    id: "quick",
    name: "Quick win",
    topic: "Queue",
    nextRevisionDate: "2026-10-30",
    revisionCount: 1,
    lastRevised: "2026-10-04",
    revisionHistory: [rev("2026-10-04", "good")]
  });
  const weakAreas = [{ label: "Sliding Window", score: 72 }];
  const all = [future, quick, dueToday, weak, lowRecall, overdue];

  it("orders overdue, low recall, weak area, due today, future practice, then quick wins", () => {
    const ids = getDailyQueue(all, { today: TODAY, weakAreas }).map((item) => item.problem.id);
    assert.deepEqual(ids, ["overdue", "lowRecall", "weak", "due", "future", "quick"]);
  });

  it("explains each recommendation", () => {
    const items = getDailyQueue(all, { today: TODAY, weakAreas });
    assert.equal(items[0].reason, "Overdue · 3 days");
    assert.equal(items[1].reason, "Low recall · Forgot");
    assert.equal(items[2].reason, "Weak area: Sliding Window");
    assert.equal(items[3].reason, "Due today");
    assert.equal(items[4].reason, "Future practice");
    assert.equal(items[5].reason, "Quick review · recently learned");
  });

  it("is deterministic regardless of input order", () => {
    const forward = getDailyQueue(all, { today: TODAY, weakAreas }).map((item) => item.problem.id);
    const reversed = getDailyQueue([...all].reverse(), { today: TODAY, weakAreas }).map((item) => item.problem.id);
    assert.deepEqual(forward, reversed);
  });

  it("ranks the more overdue problem first within the overdue tier", () => {
    const older = problem({ id: "older", name: "Older", topic: "Stack", nextRevisionDate: "2026-09-20", revisionCount: 1 });
    const ids = getDailyQueue([overdue, older], { today: TODAY, weakAreas: [] }).map((item) => item.problem.id);
    assert.deepEqual(ids, ["older", "overdue"]);
  });

  it("respects capacity so future practice only fills remaining space", () => {
    const ids = getDailyQueue(all, { today: TODAY, weakAreas, capacity: 3 }).map((item) => item.problem.id);
    assert.deepEqual(ids, ["overdue", "lowRecall", "weak"]);
  });

  it("returns an empty queue for an empty planner", () => {
    assert.deepEqual(getDailyQueue([], { today: TODAY }), []);
  });
});

describe("consistency", () => {
  it("counts consecutive days as a streak", () => {
    const item = problem({ revisionHistory: [rev("2026-10-04", "good"), rev("2026-10-05", "good"), rev("2026-10-06", "good")] });
    const stats = getConsistency([item], TODAY);
    assert.equal(stats.currentStreak, 3);
    assert.equal(stats.longestStreak, 3);
  });

  it("breaks the streak on a missed day and does not fake a current streak", () => {
    const item = problem({ revisionHistory: [rev("2026-10-03", "good"), rev("2026-10-05", "good"), rev("2026-10-06", "good")] });
    const stats = getConsistency([item], TODAY);
    assert.equal(stats.currentStreak, 2);
    assert.equal(stats.longestStreak, 2);
    const stale = getConsistency([problem({ revisionHistory: [rev("2026-10-04", "good")] })], TODAY);
    assert.equal(stale.currentStreak, 0);
  });

  it("counts multiple revisions on one day once for the streak but in full for activity", () => {
    const item = problem({ revisionHistory: [rev(TODAY, "good"), rev(TODAY, "hard", { revisionNumber: 2 })] });
    const stats = getConsistency([item], TODAY);
    assert.equal(stats.currentStreak, 1);
    assert.equal(stats.weekly[6].count, 2);
    assert.equal(stats.weeklyTotal, 2);
  });

  it("ignores scheduled entries and never counts captures or views as activity", () => {
    const item = problem({ revisionHistory: [{ date: TODAY, scheduled: true }] });
    const stats = getConsistency([item], TODAY);
    assert.equal(stats.currentStreak, 0);
    assert.equal(stats.weeklyTotal, 0);
    assert.equal(stats.problemsCaptured, 1);
  });

  it("handles empty history safely", () => {
    const stats = getConsistency([], TODAY);
    assert.equal(stats.currentStreak, 0);
    assert.equal(stats.longestStreak, 0);
    assert.equal(stats.recallAccuracy, null);
    assert.equal(stats.heatmap.days.length, 84);
    assert.ok(stats.heatmap.leadingBlanks >= 0 && stats.heatmap.leadingBlanks <= 6);
  });

  it("reports recall accuracy from Good and Perfect ratings only", () => {
    const item = problem({ revisionHistory: [rev("2026-10-01", "forgot"), rev("2026-10-02", "good"), rev("2026-10-03", "easy"), rev("2026-10-04", "hard")] });
    assert.equal(getConsistency([item], TODAY).recallAccuracy, 50);
  });
});

describe("revision timeline and problem detail model", () => {
  it("builds a chronological timeline and tolerates malformed entries", () => {
    const item = problem({
      revisionHistory: [
        rev("2026-10-06", "good", { nextIntervalDays: 10, revisionNumber: 2 }),
        { date: "2026-10-01", scheduled: true },
        { date: "2026-10-03", practice: true },
        { date: "2026-10-02", rating: "legacy" },
        {},
        null
      ]
    });
    const timeline = buildRevisionTimeline(item);
    assert.deepEqual(
      timeline.map((entry) => [entry.date, entry.kindLabel, entry.ratingText]),
      [
        ["2026-10-01", "Scheduled", null],
        ["2026-10-02", "Revision", "Recorded"],
        ["2026-10-03", "Practice", null],
        ["2026-10-06", "Revision", "Good"]
      ]
    );
    assert.equal(timeline[3].intervalDays, 10);
  });

  it("renders a problem with only the required fields", () => {
    const model = getProblemDetailModel({ id: "min", name: "Minimal" }, TODAY);
    assert.equal(model.name, "Minimal");
    assert.equal(model.difficulty, "Unknown");
    assert.deepEqual(model.topics, []);
    assert.deepEqual(model.patterns, []);
    assert.equal(model.nextReview, "");
    assert.equal(model.overdue, false);
    assert.equal(model.easeFactor, 2.5);
    assert.equal(model.statusLabel, "Learning");
    assert.equal(model.mistake, "");
    assert.deepEqual(model.timeline, []);
  });

  it("flags overdue reviews and exposes recorded notes", () => {
    const item = problem({
      nextRevisionDate: "2026-10-01",
      revisionCount: 1,
      revisionNotes: { approach: "Two passes", mistake: "Forgot the shrink step", keyInsight: "Move left when invalid" }
    });
    const model = getProblemDetailModel(item, TODAY);
    assert.equal(model.overdue, true);
    assert.equal(model.mistake, "Forgot the shrink step");
    assert.equal(model.keyInsight, "Move left when invalid");
  });
});

describe("revision rating mapping and persistence", () => {
  it("maps Forgot, Partial, Good and Perfect to the existing stored ratings", () => {
    assert.deepEqual(
      RECALL_CHOICES.map((choice) => [choice.value, choice.label]),
      [
        ["forgot", "Forgot"],
        ["hard", "Partial"],
        ["good", "Good"],
        ["easy", "Perfect"]
      ]
    );
  });

  it("asks for reflection only after Forgot or Partial", () => {
    assert.equal(needsReflection("forgot"), true);
    assert.equal(needsReflection("hard"), true);
    assert.equal(needsReflection("good"), false);
    assert.equal(needsReflection("easy"), false);
  });

  it("keeps the existing interval schedule for each recall choice on a first revision", () => {
    const fresh = problem({ lastIntervalDays: null });
    const days = Object.fromEntries(
      ["forgot", "hard", "good", "easy"].map((rating) => [rating, buildRevisionUpdate(fresh, { rating }).record.nextIntervalDays])
    );
    assert.deepEqual(days, { forgot: 1, hard: 2, good: 5, easy: 10 });
  });

  it("persists trimmed mistake and insight into the existing notes structure", () => {
    const { record, problemFields } = buildRevisionUpdate(problem(), {
      rating: "forgot",
      mistake: "  Forgot when to shrink the left side  ",
      keyInsight: " Shrink when the window is invalid "
    });
    assert.equal(record.mistake, "Forgot when to shrink the left side");
    assert.equal(record.keyInsight, "Shrink when the window is invalid");
    assert.equal(problemFields.revisionNotes.mistake, "Forgot when to shrink the left side");
    assert.equal(problemFields.revisionNotes.keyInsight, "Shrink when the window is invalid");
  });
});
