import { formatDate } from "../utils/date";
import {
  buildRevisionRecord,
  buildScheduledHistory,
  DEFAULT_EASE_FACTOR,
  getAdaptiveIntervalDays,
  getInitialRevisionDate,
  getNextEaseFactor,
  getNextRevisionDate,
  MASTERY_REVISION_COUNT
} from "../utils/revision";

export const STORAGE_KEY = "coderevise-state-v4";
export const PREVIOUS_STORAGE_KEYS = ["coderevise-state-v3", "coderevise-state-v2", "coderevise-state"];
export const DEFAULT_USER_ID = "";

export const blankUserState = {
  problems: [],
  searchHistory: [],
  recentlyViewed: []
};

export const blankRevisionNotes = { approach: "", mistake: "", keyInsight: "" };

export const defaultState = {
  sessionUserId: DEFAULT_USER_ID,
  theme: "light",
  users: {}
};

export function hashPassword(password) {
  let hash = 5381;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 33) ^ password.charCodeAt(index);
  }
  return String(hash >>> 0);
}

export function normalizeUserId(userId) {
  return userId.trim().toLowerCase();
}

export function isValidImportedProblem(problem) {
  return Boolean(
    problem &&
      typeof problem.name === "string" &&
      problem.name.trim() &&
      typeof problem.topic === "string" &&
      problem.topic.trim()
  );
}

export function withAccountFields(user = blankUserState, passwordHash = "") {
  return {
    ...blankUserState,
    ...user,
    passwordHash: user.passwordHash || passwordHash,
    createdAt: user.createdAt || formatDate()
  };
}

export function getInitialState() {
  for (const key of PREVIOUS_STORAGE_KEYS) {
    try {
      const stored = JSON.parse(localStorage.getItem(key));
      if (stored?.users) {
        const sessionUserId = stored.sessionUserId || stored.activeUserId || "";
        return {
          sessionUserId,
          theme: stored.theme || "light",
          users: Object.fromEntries(
            Object.entries(stored.users).map(([id, user]) => [id, withAccountFields(user, user.passwordHash || "")])
          )
        };
      }
      if (stored?.problems) {
        return {
          sessionUserId: "default",
          theme: stored.theme || "light",
          users: {
            default: withAccountFields({
              problems: stored.problems || [],
              searchHistory: stored.searchHistory || [],
              recentlyViewed: stored.recentlyViewed || []
            })
          }
        };
      }
    } catch {
      continue;
    }
  }

  return defaultState;
}

export function makeProblem(input) {
  const today = formatDate();
  const dateSolved = input.dateSolved || today;
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    platform: input.platform,
    difficulty: input.difficulty,
    topic: input.topic.trim(),
    url: input.url.trim(),
    description: input.description?.trim() || "",
    notes: input.notes.trim(),
    dateSolved,
    lastRevised: "",
    nextRevisionDate: getInitialRevisionDate(dateSolved),
    revisionCount: 0,
    lastIntervalDays: null,
    easeFactor: DEFAULT_EASE_FACTOR,
    revisionNotes: { ...blankRevisionNotes },
    favorite: Boolean(input.favorite),
    practiceLater: false,
    completed: false,
    archived: false,
    revisionHistory: buildScheduledHistory(dateSolved),
    createdAt: today,
    updatedAt: today
  };
}

export function buildRevisionUpdate(problem, { rating, approach, mistake, keyInsight }) {
  const today = formatDate();
  const revisionNumber = (problem.revisionCount || 0) + 1;
  const previousIntervalDays = problem.lastIntervalDays ?? null;
  const nextIntervalDays = getAdaptiveIntervalDays({
    previousIntervalDays,
    easeFactor: problem.easeFactor ?? null,
    rating
  });
  const nextEaseFactor = getNextEaseFactor(problem.easeFactor, rating);
  const record = buildRevisionRecord({
    rating,
    previousIntervalDays,
    nextIntervalDays,
    reviewedAt: today,
    revisionNumber,
    approach,
    mistake,
    keyInsight
  });
  const revisionNotes = { approach: record.approach, mistake: record.mistake, keyInsight: record.keyInsight };
  const problemFields = {
    lastRevised: today,
    nextRevisionDate: getNextRevisionDate(today, nextIntervalDays),
    revisionCount: revisionNumber,
    lastIntervalDays: nextIntervalDays,
    easeFactor: nextEaseFactor,
    completed: revisionNumber >= MASTERY_REVISION_COUNT,
    revisionNotes,
    updatedAt: today
  };
  return { record, problemFields };
}
