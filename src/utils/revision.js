import { addDays, formatDate } from "./date";

export const revisionIntervals = [1, 3, 7, 15, 30];

export function getInitialRevisionDate(dateSolved) {
  return formatDate(addDays(dateSolved || formatDate(), revisionIntervals[0]));
}

export function getNextRevisionDate(lastDate, completedStage) {
  if (completedStage >= revisionIntervals.length) return "";
  return formatDate(addDays(lastDate || formatDate(), revisionIntervals[completedStage]));
}

export function buildScheduledHistory(dateSolved) {
  return [{ date: getInitialRevisionDate(dateSolved), stage: 1, scheduled: true }];
}
