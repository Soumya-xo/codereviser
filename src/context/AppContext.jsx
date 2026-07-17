import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { sampleProblems } from "../data/sampleProblems";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { formatDate } from "../utils/date";
import { buildScheduledHistory, getInitialRevisionDate, getNextRevisionDate } from "../utils/revision";

const AppContext = createContext(null);

const STORAGE_KEY = "coderevise-state-v3";
const USER_STORAGE_KEY = "coderevise-state-v2";
const LEGACY_STORAGE_KEY = "coderevise-state";
const DEFAULT_USER_ID = "";

const defaultUserState = {
  problems: sampleProblems,
  searchHistory: [],
  recentlyViewed: []
};

const blankUserState = {
  problems: [],
  searchHistory: [],
  recentlyViewed: []
};

const defaultState = {
  sessionUserId: DEFAULT_USER_ID,
  theme: "light",
  users: {}
};

function hashPassword(password) {
  let hash = 5381;
  for (let index = 0; index < password.length; index += 1) {
    hash = (hash * 33) ^ password.charCodeAt(index);
  }
  return String(hash >>> 0);
}

function normalizeUserId(userId) {
  return userId.trim().toLowerCase();
}

function withAccountFields(user, passwordHash = "") {
  return {
    ...blankUserState,
    ...user,
    passwordHash,
    createdAt: user?.createdAt || formatDate()
  };
}

function getInitialState() {
  try {
    const v2 = JSON.parse(localStorage.getItem(USER_STORAGE_KEY));
    if (v2?.users) {
      const userId = v2.activeUserId || "default";
      return {
        sessionUserId: userId,
        theme: v2.theme || "light",
        users: Object.fromEntries(
          Object.entries(v2.users).map(([id, user]) => [id, withAccountFields(user, user.passwordHash || "")])
        )
      };
    }

    const legacy = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY));
    if (legacy?.problems) {
      return {
        sessionUserId: "default",
        theme: legacy.theme || "light",
        users: {
          default: withAccountFields({
            problems: legacy.problems || [],
            searchHistory: legacy.searchHistory || [],
            recentlyViewed: legacy.recentlyViewed || []
          })
        }
      };
    }
  } catch {
    return defaultState;
  }

  return defaultState;
}

function makeProblem(input) {
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
    revisionStage: 0,
    favorite: Boolean(input.favorite),
    completed: false,
    archived: false,
    revisionHistory: buildScheduledHistory(dateSolved),
    createdAt: today,
    updatedAt: today
  };
}

export function AppProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, getInitialState);
  const [toast, setToast] = useState(null);

  const theme = state.theme || "light";
  const activeUserId = state.sessionUserId || DEFAULT_USER_ID;
  const isAuthenticated = Boolean(activeUserId && state.users?.[activeUserId]);
  const currentUser = state.users?.[activeUserId] || blankUserState;
  const problems = currentUser.problems || [];
  const searchHistory = currentUser.searchHistory || [];
  const recentlyViewed = currentUser.recentlyViewed || [];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  function notify(message, type = "success") {
    setToast({ id: crypto.randomUUID(), message, type });
  }

  function updateCurrentUser(updater) {
    setState((current) => {
      const userId = current.sessionUserId;
      if (!userId) return current;
      const userState = current.users?.[userId] || blankUserState;
      return {
        ...current,
        users: {
          ...current.users,
          [userId]: updater(userState)
        }
      };
    });
  }

  function addProblem(input) {
    const problem = makeProblem(input);
    updateCurrentUser((user) => ({ ...user, problems: [problem, ...user.problems] }));
    notify("Problem added to your revision plan.");
  }

  function updateProblem(id, updates) {
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) => {
        if (problem.id !== id) return problem;
        const dateSolvedChanged = updates.dateSolved && updates.dateSolved !== problem.dateSolved;
        const nextRevisionDate = dateSolvedChanged
          ? getInitialRevisionDate(updates.dateSolved)
          : updates.nextRevisionDate ?? problem.nextRevisionDate;

        return {
          ...problem,
          ...updates,
          nextRevisionDate,
          revisionHistory: dateSolvedChanged ? buildScheduledHistory(updates.dateSolved) : problem.revisionHistory,
          updatedAt: formatDate()
        };
      })
    }));
    notify("Problem updated.");
  }

  function deleteProblem(id) {
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.filter((problem) => problem.id !== id),
      recentlyViewed: user.recentlyViewed.filter((item) => item !== id)
    }));
    notify("Problem deleted.", "warning");
  }

  function toggleFavorite(id) {
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) =>
        problem.id === id ? { ...problem, favorite: !problem.favorite, updatedAt: formatDate() } : problem
      )
    }));
  }

  function toggleArchive(id) {
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) =>
        problem.id === id ? { ...problem, archived: !problem.archived, updatedAt: formatDate() } : problem
      )
    }));
    notify("Archive status updated.");
  }

  function completeRevision(id) {
    const today = formatDate();
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) => {
        if (problem.id !== id) return problem;
        const nextStage = Math.min(problem.revisionStage + 1, 5);
        const nextRevisionDate = getNextRevisionDate(today, nextStage);
        const completed = nextStage >= 5;

        return {
          ...problem,
          lastRevised: today,
          nextRevisionDate,
          revisionStage: nextStage,
          completed,
          revisionHistory: [
            ...(problem.revisionHistory || []).filter(
              (entry) => !(entry.scheduled && entry.stage === nextStage && entry.date === today)
            ),
            { date: today, stage: nextStage },
            ...(nextRevisionDate ? [{ date: nextRevisionDate, stage: nextStage + 1, scheduled: true }] : [])
          ],
          updatedAt: today
        };
      })
    }));
    notify("Revision completed. Next date calculated.");
  }

  function addSearchTerm(term) {
    const cleaned = term.trim();
    if (!cleaned) return;
    updateCurrentUser((user) => ({
      ...user,
      searchHistory: [cleaned, ...user.searchHistory.filter((item) => item !== cleaned)].slice(0, 6)
    }));
  }

  function markRecentlyViewed(id) {
    updateCurrentUser((user) => ({
      ...user,
      recentlyViewed: [id, ...user.recentlyViewed.filter((item) => item !== id)].slice(0, 5)
    }));
  }

  function setTheme(themeValue) {
    setState((current) => ({ ...current, theme: themeValue }));
  }

  function resetData() {
    updateCurrentUser((user) => withAccountFields(blankUserState, user.passwordHash));
    notify("Current user data reset.", "warning");
  }

  function importData(payload) {
    if (!payload?.problems || !Array.isArray(payload.problems)) {
      notify("Import failed. JSON must include a problems array.", "error");
      return false;
    }
    updateCurrentUser(() => ({
      problems: payload.problems,
      searchHistory: payload.searchHistory || [],
      recentlyViewed: payload.recentlyViewed || []
    }));
    notify("Data imported successfully.");
    return true;
  }

  function register(userId, password) {
    const cleaned = normalizeUserId(userId);
    if (!cleaned || !password) {
      notify("Enter both user ID and password.", "error");
      return false;
    }
    if (state.users?.[cleaned]) {
      notify("This user ID already exists. Login instead.", "error");
      return false;
    }

    setState((current) => ({
      ...current,
      sessionUserId: cleaned,
      users: {
        ...current.users,
        [cleaned]: withAccountFields(blankUserState, hashPassword(password))
      }
    }));
    notify(`Account created for "${cleaned}".`);
    return true;
  }

  function login(userId, password) {
    const cleaned = normalizeUserId(userId);
    const user = state.users?.[cleaned];
    if (!user) {
      notify("User ID not found. Create an account first.", "error");
      return false;
    }
    if (user.passwordHash && user.passwordHash !== hashPassword(password)) {
      notify("Wrong password.", "error");
      return false;
    }

    setState((current) => ({ ...current, sessionUserId: cleaned }));
    notify(`Logged in as "${cleaned}".`);
    return true;
  }

  function logout() {
    setState((current) => ({ ...current, sessionUserId: "" }));
    notify("Logged out.");
  }

  function changePassword(currentPassword, nextPassword) {
    if (!activeUserId || !nextPassword) {
      notify("Enter a new password.", "error");
      return false;
    }
    const user = state.users?.[activeUserId];
    if (user?.passwordHash && user.passwordHash !== hashPassword(currentPassword)) {
      notify("Current password is incorrect.", "error");
      return false;
    }

    updateCurrentUser((currentUserState) => ({
      ...currentUserState,
      passwordHash: hashPassword(nextPassword)
    }));
    notify("Password updated.");
    return true;
  }

  function changeUserId(nextUserId, password) {
    const cleaned = normalizeUserId(nextUserId);
    if (!activeUserId || !cleaned) {
      notify("Enter a new user ID.", "error");
      return false;
    }
    if (cleaned === activeUserId) {
      notify("This is already your current user ID.", "error");
      return false;
    }
    if (state.users?.[cleaned]) {
      notify("That user ID is already taken.", "error");
      return false;
    }

    const user = state.users?.[activeUserId];
    if (user?.passwordHash && user.passwordHash !== hashPassword(password)) {
      notify("Password is incorrect.", "error");
      return false;
    }

    setState((current) => {
      const { [activeUserId]: currentUserData, ...remainingUsers } = current.users || {};
      return {
        ...current,
        sessionUserId: cleaned,
        users: {
          ...remainingUsers,
          [cleaned]: currentUserData
        }
      };
    });
    notify(`User ID changed to "${cleaned}".`);
    return true;
  }

  const value = useMemo(
    () => ({
      users: state.users || {},
      activeUserId,
      isAuthenticated,
      problems,
      searchHistory,
      recentlyViewed,
      theme,
      toast,
      setToast,
      addProblem,
      updateProblem,
      deleteProblem,
      toggleFavorite,
      toggleArchive,
      completeRevision,
      addSearchTerm,
      markRecentlyViewed,
      setTheme,
      resetData,
      importData,
      register,
      login,
      logout,
      changePassword,
      changeUserId
    }),
    [state.users, activeUserId, isAuthenticated, problems, searchHistory, recentlyViewed, theme, toast]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
