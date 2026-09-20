import { addDays, formatDate } from "./date";

export const RATINGS = ["forgot", "hard", "good", "easy"];

export const RATING_LABELS = {
  forgot: "Forgot",
  hard: "Hard",
  good: "Good",
  easy: "Easy"
};

export const RATING_INTERVAL_DAYS = {
  forgot: 1,
  hard: 2,
  good: 5,
  easy: 10
};

export const MASTERY_REVISION_COUNT = 5;
export const DEFAULT_EASE_FACTOR = 2.5;
export const MIN_EASE_FACTOR = 1.3;

const EASE_DELTA = { forgot: -0.3, hard: -0.15, good: 0, easy: 0.15 };

export function isValidRating(rating) {
  return RATINGS.includes(rating);
}

export function getInitialRevisionDate(dateSolved) {
  return formatDate(addDays(dateSolved || formatDate(), 1));
}

export function getNextEaseFactor(previousEaseFactor, rating) {
  const base = previousEaseFactor ?? DEFAULT_EASE_FACTOR;
  const next = Math.round((base + (EASE_DELTA[rating] ?? 0)) * 100) / 100;
  return Math.max(MIN_EASE_FACTOR, next);
}

// First revision (no previousIntervalDays yet) always uses the base interval for the
// chosen rating, so this stays identical to Phase 1's behavior. From the second
// revision onward, Good/Easy grow the interval by the ease factor (real spaced
// repetition) instead of jumping back to the same flat number every time, and
// Forgot always resets to the shortest interval and lowers the ease factor.
export function getAdaptiveIntervalDays({ previousIntervalDays, easeFactor, rating }) {
  const baseInterval = RATING_INTERVAL_DAYS[rating] ?? RATING_INTERVAL_DAYS.good;
  if (rating === "forgot" || !previousIntervalDays) return baseInterval;

  const nextEase = getNextEaseFactor(easeFactor, rating);
  const multiplier = rating === "easy" ? nextEase * 1.3 : nextEase;
  return Math.max(baseInterval, Math.round(previousIntervalDays * multiplier));
}

export function getNextRevisionDate(reviewDate, intervalDays) {
  return formatDate(addDays(reviewDate || formatDate(), intervalDays));
}

export function buildScheduledHistory(dateSolved) {
  return [{ date: getInitialRevisionDate(dateSolved), scheduled: true }];
}

export function buildRevisionRecord({
  rating,
  previousIntervalDays,
  nextIntervalDays,
  reviewedAt,
  revisionNumber,
  approach,
  mistake,
  keyInsight
}) {
  return {
    reviewedAt,
    rating,
    previousIntervalDays: previousIntervalDays ?? null,
    nextIntervalDays,
    revisionNumber,
    approach: approach?.trim() || "",
    mistake: mistake?.trim() || "",
    keyInsight: keyInsight?.trim() || ""
  };
}
