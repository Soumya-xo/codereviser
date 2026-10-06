import { calculateStreak, getActiveProblems, getDueProblems, getProblemStatus, realRevisionEntries, RATING_QUALITY, STATUS_LABELS } from "./analytics.js";
import { formatDate } from "./date.js";
import { getProblemPatterns, UNCATEGORIZED } from "./patternDetection.js";
import { DEFAULT_EASE_FACTOR, RECALL_CHOICES } from "./revision.js";

export const WEAK_AREA_THRESHOLD = 20;
export const QUEUE_TIERS = {
  overdue: 1,
  lowRecall: 2,
  weakArea: 3,
  dueToday: 4,
  futurePractice: 5,
  quickReview: 6
};

const EXCLUDED_AREAS = new Set([UNCATEGORIZED, "Other"]);
const POOR_RECALL = new Set(["forgot", "hard"]);
const GOOD_RECALL = new Set(["good", "easy"]);
const QUICK_REVIEW_DAYS = 7;

function parseDay(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dayDiff(later, earlier) {
  return Math.round((parseDay(later) - parseDay(earlier)) / 86400000);
}

function shiftDay(value, days) {
  const date = parseDay(value);
  return formatDate(new Date(date.getFullYear(), date.getMonth(), date.getDate() + days));
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function topicLabels(topic) {
  if (typeof topic !== "string") return [];
  return [...new Set(topic.split(",").map((part) => part.trim()).filter(Boolean))];
}

export function getLastRating(problem) {
  const rated = realRevisionEntries(problem).filter((entry) => RATING_QUALITY[entry.rating] !== undefined);
  return rated.length ? rated[rated.length - 1].rating : null;
}

export function recallLabel(rating) {
  return RECALL_CHOICES.find((choice) => choice.value === rating)?.label ?? rating ?? "";
}

function mistakeCount(problem) {
  return realRevisionEntries(problem).filter((entry) => typeof entry.mistake === "string" && entry.mistake.trim()).length;
}

function areaLabels(problem) {
  const patterns = getProblemPatterns(problem);
  const labels = patterns.length ? patterns : topicLabels(problem.topic);
  return labels.filter((label) => !EXCLUDED_AREAS.has(label));
}

// Deterministic weakness score, 0-100. Each component is a fraction of the area's
// problems, so an area is never penalised for simply having more problems.
export function scoreWeakArea({ problemCount, ratedCount, poorRecallCount, overdueCount, mistakeProblemCount, repeatedMistakeCount, revisionCount }) {
  if (!problemCount) return 0;
  const recall = ratedCount ? poorRecallCount / ratedCount : 0;
  const overdue = overdueCount / problemCount;
  const mistakes = (mistakeProblemCount + repeatedMistakeCount) / (2 * problemCount);
  const notRevisedYet = revisionCount === 0 ? 1 : 0;
  const raw = 40 * recall + 25 * overdue + 20 * mistakes + 15 * notRevisedYet;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

function severityFor(score) {
  if (score >= 60) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function getWeakAreas(problems, today = formatDate()) {
  const areas = new Map();

  for (const problem of getActiveProblems(problems)) {
    for (const label of areaLabels(problem)) {
      if (!areas.has(label)) {
        areas.set(label, {
          label,
          problemIds: [],
          problemCount: 0,
          ratedCount: 0,
          poorRecallCount: 0,
          overdueCount: 0,
          mistakeProblemCount: 0,
          repeatedMistakeCount: 0,
          revisionCount: 0
        });
      }
      const area = areas.get(label);
      const lastRating = getLastRating(problem);
      const mistakes = mistakeCount(problem);
      area.problemIds.push(problem.id);
      area.problemCount += 1;
      if (lastRating) {
        area.ratedCount += 1;
        if (POOR_RECALL.has(lastRating)) area.poorRecallCount += 1;
      }
      if (problem.nextRevisionDate && !problem.completed && !problem.practiceLater && problem.nextRevisionDate < today) {
        area.overdueCount += 1;
      }
      if (mistakes > 0) area.mistakeProblemCount += 1;
      if (mistakes > 1) area.repeatedMistakeCount += 1;
      area.revisionCount += realRevisionEntries(problem).length;
    }
  }

  return [...areas.values()]
    .map((area) => {
      const score = scoreWeakArea(area);
      const reasons = [];
      if (area.poorRecallCount) reasons.push(`Low recall across ${plural(area.poorRecallCount, "problem")}`);
      if (area.overdueCount) reasons.push(plural(area.overdueCount, "overdue revision"));
      if (area.repeatedMistakeCount) reasons.push("Repeated mistakes");
      else if (area.mistakeProblemCount) reasons.push("Mistakes recorded");
      if (area.revisionCount === 0) reasons.push("Not revised yet");
      return { ...area, score, severity: severityFor(score), reasons };
    })
    .filter((area) => area.score >= WEAK_AREA_THRESHOLD)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
}

function classifyQueueItem(problem, { today, dueIds, weakScores }) {
  const labels = areaLabels(problem);
  const lastRating = getLastRating(problem);
  const isDue = dueIds.has(problem.id);
  const detail = labels.join(" · ");

  if (isDue && problem.nextRevisionDate < today) {
    const days = dayDiff(today, problem.nextRevisionDate);
    return { tier: QUEUE_TIERS.overdue, reason: `Overdue · ${plural(days, "day")}`, detail, weight: days };
  }
  if (lastRating && POOR_RECALL.has(lastRating) && !problem.completed) {
    return { tier: QUEUE_TIERS.lowRecall, reason: `Low recall · ${recallLabel(lastRating)}`, detail, weight: 0 };
  }
  const weakHits = labels.filter((label) => weakScores.has(label)).map((label) => weakScores.get(label));
  if (weakHits.length && Math.max(...weakHits) >= 40) {
    const topLabel = labels.find((label) => weakScores.get(label) === Math.max(...weakHits));
    return { tier: QUEUE_TIERS.weakArea, reason: `Weak area: ${topLabel}`, detail, weight: Math.max(...weakHits) };
  }
  if (isDue) {
    return { tier: QUEUE_TIERS.dueToday, reason: "Due today", detail, weight: 0 };
  }
  if (problem.practiceLater && !problem.completed) {
    return { tier: QUEUE_TIERS.futurePractice, reason: "Future practice", detail, weight: 0 };
  }
  if (lastRating && GOOD_RECALL.has(lastRating) && problem.lastRevised && dayDiff(today, problem.lastRevised) <= QUICK_REVIEW_DAYS) {
    return { tier: QUEUE_TIERS.quickReview, reason: "Quick review · recently learned", detail, weight: 0 };
  }
  return null;
}

function compareQueueItems(a, b) {
  return (
    a.tier - b.tier ||
    b.weight - a.weight ||
    (a.problem.nextRevisionDate || "9999-99-99").localeCompare(b.problem.nextRevisionDate || "9999-99-99") ||
    a.problem.name.localeCompare(b.problem.name) ||
    a.problem.id.localeCompare(b.problem.id)
  );
}

export function getDailyQueue(problems, { today = formatDate(), weakAreas = getWeakAreas(problems, today), capacity = 10 } = {}) {
  const dueIds = new Set(getDueProblems(problems).map((problem) => problem.id));
  const weakScores = new Map(weakAreas.map((area) => [area.label, area.score]));
  return getActiveProblems(problems)
    .map((problem) => {
      const classified = classifyQueueItem(problem, { today, dueIds, weakScores });
      return classified ? { problem, ...classified } : null;
    })
    .filter(Boolean)
    .sort(compareQueueItems)
    .slice(0, capacity);
}

export function getActivityCounts(problems) {
  const counts = new Map();
  problems.forEach((problem) => {
    (problem.revisionHistory || []).forEach((entry) => {
      if (!entry || entry.scheduled || typeof entry.date !== "string") return;
      counts.set(entry.date, (counts.get(entry.date) || 0) + 1);
    });
  });
  return counts;
}

function heatLevel(count) {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function getConsistency(problems, today = formatDate()) {
  const counts = getActivityCounts(problems);
  const streak = calculateStreak(problems, today);

  const rated = problems.flatMap((problem) => realRevisionEntries(problem)).filter((entry) => RATING_QUALITY[entry.rating] !== undefined);
  const goodOrBetter = rated.filter((entry) => GOOD_RECALL.has(entry.rating)).length;

  const weekly = Array.from({ length: 7 }, (_, index) => {
    const date = shiftDay(today, index - 6);
    return { date, count: counts.get(date) || 0 };
  });

  const heatmapDays = Array.from({ length: 84 }, (_, index) => {
    const date = shiftDay(today, index - 83);
    const count = counts.get(date) || 0;
    return { date, count, level: heatLevel(count) };
  });
  const leadingBlanks = parseDay(heatmapDays[0].date).getDay();

  return {
    currentStreak: streak.current,
    longestStreak: streak.best,
    problemsRevised: problems.filter((problem) => realRevisionEntries(problem).length > 0).length,
    problemsCaptured: problems.length,
    recallAccuracy: rated.length ? Math.round((goodOrBetter / rated.length) * 100) : null,
    weekly,
    weeklyTotal: weekly.reduce((sum, day) => sum + day.count, 0),
    heatmap: { leadingBlanks, days: heatmapDays }
  };
}

export function buildRevisionTimeline(problem) {
  return (problem.revisionHistory || [])
    .map((entry, index) => {
      if (!entry || typeof entry.date !== "string") return null;
      const kind = entry.scheduled ? "scheduled" : entry.practice ? "practice" : "revision";
      const rating = typeof entry.rating === "string" ? entry.rating : null;
      const ratingText = RATING_QUALITY[rating] !== undefined ? recallLabel(rating) : rating ? "Recorded" : null;
      return {
        key: `${entry.date}-${index}`,
        date: entry.date,
        index,
        kind,
        kindLabel: { scheduled: "Scheduled", practice: "Practice", revision: "Revision" }[kind],
        ratingText,
        intervalDays: Number.isFinite(entry.nextIntervalDays) ? entry.nextIntervalDays : null,
        mistake: typeof entry.mistake === "string" ? entry.mistake : "",
        keyInsight: typeof entry.keyInsight === "string" ? entry.keyInsight : ""
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || a.index - b.index);
}

export function getProblemDetailModel(problem, today = formatDate()) {
  const status = getProblemStatus(problem);
  const nextReview = typeof problem.nextRevisionDate === "string" ? problem.nextRevisionDate : "";
  return {
    name: problem.name || "Untitled problem",
    difficulty: problem.difficulty || "Unknown",
    platform: problem.platform || "",
    url: problem.url || "",
    status,
    statusLabel: STATUS_LABELS[status],
    favorite: Boolean(problem.favorite),
    archived: Boolean(problem.archived),
    practiceLater: Boolean(problem.practiceLater),
    topics: topicLabels(problem.topic),
    patterns: getProblemPatterns(problem),
    nextReview,
    overdue: Boolean(nextReview) && !problem.completed && nextReview < today,
    revisionCount: problem.revisionCount || 0,
    easeFactor: problem.easeFactor ?? DEFAULT_EASE_FACTOR,
    lastIntervalDays: problem.lastIntervalDays ?? null,
    lastRevised: problem.lastRevised || "",
    latestRating: getLastRating(problem),
    notes: problem.notes || "",
    approach: problem.revisionNotes?.approach || "",
    mistake: problem.revisionNotes?.mistake || "",
    keyInsight: problem.revisionNotes?.keyInsight || "",
    timeline: buildRevisionTimeline(problem)
  };
}

export function getPatternDistribution(problems) {
  const counts = {};
  getActiveProblems(problems).forEach((problem) => {
    const patterns = getProblemPatterns(problem);
    const labels = patterns.length ? patterns : [UNCATEGORIZED];
    labels.forEach((label) => {
      counts[label] = (counts[label] || 0) + 1;
    });
  });
  return counts;
}
