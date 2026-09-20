import { daysBetween, formatDate, isPastOrToday } from "./date";
import { RATING_LABELS } from "./revision";

export const RATING_QUALITY = { forgot: 0, hard: 1, good: 2, easy: 3 };

export const PROBLEM_STATUS = {
  ARCHIVED: "archived",
  MASTERED: "mastered",
  PRACTICE: "practice",
  LEARNING: "learning",
  REVIEWING: "reviewing"
};

export const STATUS_LABELS = {
  [PROBLEM_STATUS.ARCHIVED]: "Archived",
  [PROBLEM_STATUS.MASTERED]: "Mastered",
  [PROBLEM_STATUS.PRACTICE]: "Future practice",
  [PROBLEM_STATUS.LEARNING]: "Learning",
  [PROBLEM_STATUS.REVIEWING]: "Reviewing"
};

export function getProblemStatus(problem) {
  if (problem.archived) return PROBLEM_STATUS.ARCHIVED;
  if (problem.completed) return PROBLEM_STATUS.MASTERED;
  if (problem.practiceLater) return PROBLEM_STATUS.PRACTICE;
  if (!problem.revisionCount) return PROBLEM_STATUS.LEARNING;
  return PROBLEM_STATUS.REVIEWING;
}

export function getStatusDistribution(problems) {
  return problems.reduce((acc, problem) => {
    const label = STATUS_LABELS[getProblemStatus(problem)];
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
}

export function realRevisionEntries(problem) {
  return (problem.revisionHistory || []).filter((entry) => !entry.scheduled && !entry.practice);
}

export function getRatingDistribution(problems) {
  const counts = {};
  problems.forEach((problem) => {
    realRevisionEntries(problem).forEach((entry) => {
      const label = entry.rating ? RATING_LABELS[entry.rating] || "Legacy" : "Unrated";
      counts[label] = (counts[label] || 0) + 1;
    });
  });
  return counts;
}

export function getTopicPerformance(problems) {
  const active = getActiveProblems(problems);
  const byTopic = {};

  active.forEach((problem) => {
    const topic = problem.topic || "Uncategorized";
    if (!byTopic[topic]) {
      byTopic[topic] = { topic, problemCount: 0, revisionCount: 0, qualitySum: 0, qualityCount: 0 };
    }
    byTopic[topic].problemCount += 1;

    realRevisionEntries(problem).forEach((entry) => {
      byTopic[topic].revisionCount += 1;
      if (entry.rating && RATING_QUALITY[entry.rating] !== undefined) {
        byTopic[topic].qualitySum += RATING_QUALITY[entry.rating];
        byTopic[topic].qualityCount += 1;
      }
    });
  });

  return Object.values(byTopic)
    .map((row) => ({
      ...row,
      averageQuality: row.qualityCount ? row.qualitySum / row.qualityCount : null
    }))
    .sort((a, b) => {
      if (a.averageQuality === null) return -1;
      if (b.averageQuality === null) return 1;
      return a.averageQuality - b.averageQuality;
    });
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "Uncategorized";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function getActiveProblems(problems) {
  return problems.filter((problem) => !problem.archived);
}

export function getDueProblems(problems) {
  return getActiveProblems(problems).filter(
    (problem) => !problem.practiceLater && !problem.completed && isPastOrToday(problem.nextRevisionDate)
  );
}

export function getCompletionRate(problems) {
  const active = getActiveProblems(problems);
  if (!active.length) return 0;
  return Math.round((active.filter((problem) => problem.completed).length / active.length) * 100);
}

export function getRevisionCount(problems) {
  return problems.reduce((sum, problem) => {
    return sum + (problem.revisionHistory || []).filter((entry) => !entry.scheduled).length;
  }, 0);
}

export function getWeakestTopic(problems) {
  const active = getActiveProblems(problems);
  const dueByTopic = getDueProblems(active).reduce((acc, problem) => {
    acc[problem.topic] = (acc[problem.topic] || 0) + 1;
    return acc;
  }, {});
  const fallback = countBy(active.filter((problem) => problem.difficulty === "Hard"), "topic");
  const source = Object.keys(dueByTopic).length ? dueByTopic : fallback;
  return Object.entries(source).sort((a, b) => b[1] - a[1])[0]?.[0] || "No weak topic yet";
}

export function getMostPracticedTopic(problems) {
  const totals = {};
  getActiveProblems(problems).forEach((problem) => {
    const topic = problem.topic || "Uncategorized";
    const activityCount = (problem.revisionHistory || []).filter((entry) => !entry.scheduled).length;
    totals[topic] = (totals[topic] || 0) + activityCount;
  });

  const top = Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  return top && top[1] > 0 ? top[0] : "No practice data yet";
}

export function calculateStreak(problems) {
  const revisionDates = new Set();
  problems.forEach((problem) => {
    (problem.revisionHistory || []).forEach((entry) => {
      if (!entry.scheduled) revisionDates.add(entry.date);
    });
  });

  let current = 0;
  let cursor = formatDate();
  while (revisionDates.has(cursor)) {
    current += 1;
    const [year, month, day] = cursor.split("-").map(Number);
    cursor = formatDate(new Date(year, month - 1, day - 1));
  }

  const sorted = [...revisionDates].sort();
  let best = 0;
  let run = 0;
  let previous = null;
  sorted.forEach((date) => {
    run = previous && daysBetween(previous, date) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
    previous = date;
  });

  return { current, best };
}
