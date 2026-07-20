import { daysBetween, formatDate, isPastOrToday } from "./date";

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
  problems.forEach((problem) => {
    totals[problem.topic] = (totals[problem.topic] || 0) + (problem.revisionHistory?.length || 0);
  });
  return Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0] || "Start revising";
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
