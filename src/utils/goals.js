import { getActiveProblems, realRevisionEntries } from "./analytics";
import { addDays, formatDate } from "./date";

export const DEFAULT_GOALS = {
  dailySolve: 3,
  dailyRevise: 2,
  weeklySolve: 15,
  weeklyRevise: 10
};

export function getWeekRange(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  start.setDate(referenceDate.getDate() - referenceDate.getDay());
  const end = addDays(start, 6);
  return { start: formatDate(start), end: formatDate(end) };
}

function inRange(dateValue, start, end) {
  return Boolean(dateValue) && dateValue >= start && dateValue <= end;
}

export function countProblemsSolved(problems, start, end) {
  return getActiveProblems(problems).filter((problem) => inRange(problem.dateSolved, start, end)).length;
}

export function countRevisionsCompleted(problems, start, end) {
  return getActiveProblems(problems).reduce(
    (sum, problem) => sum + realRevisionEntries(problem).filter((entry) => inRange(entry.date, start, end)).length,
    0
  );
}

function buildMetric(completed, target) {
  const safeTarget = Math.max(0, target || 0);
  const safeCompleted = Math.max(0, completed || 0);
  return {
    target: safeTarget,
    completed: safeCompleted,
    remaining: Math.max(0, safeTarget - safeCompleted),
    percentage: safeTarget > 0 ? Math.min(100, Math.round((safeCompleted / safeTarget) * 100)) : 0
  };
}

export function getDailyProgress(problems, goals, referenceDate = new Date()) {
  const today = formatDate(referenceDate);
  return {
    solve: buildMetric(countProblemsSolved(problems, today, today), goals.dailySolve),
    revise: buildMetric(countRevisionsCompleted(problems, today, today), goals.dailyRevise)
  };
}

export function getWeeklyProgress(problems, goals, referenceDate = new Date()) {
  const { start, end } = getWeekRange(referenceDate);
  return {
    solve: buildMetric(countProblemsSolved(problems, start, end), goals.weeklySolve),
    revise: buildMetric(countRevisionsCompleted(problems, start, end), goals.weeklyRevise)
  };
}
