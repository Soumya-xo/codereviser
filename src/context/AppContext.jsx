import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { sampleProblems } from "../data/sampleProblems";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  auth,
  createUserWithEmailAndPassword,
  db,
  doc,
  EmailAuthProvider,
  getDoc,
  isFirebaseConfigured,
  onAuthStateChanged,
  onSnapshot,
  reauthenticateWithCredential,
  setDoc,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword
} from "../services/firebase";
import { formatDate } from "../utils/date";
import { dedupeProblemsByUrl, normalizeProblemUrl, upsertProblemByUrl } from "../utils/problemIdentity";
import { buildScheduledHistory, getInitialRevisionDate, getNextRevisionDate } from "../utils/revision";

const AppContext = createContext(null);

const STORAGE_KEY = "coderevise-state-v4";
const PREVIOUS_STORAGE_KEYS = ["coderevise-state-v3", "coderevise-state-v2", "coderevise-state"];
const DEFAULT_USER_ID = "";

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

function withAccountFields(user = blankUserState, passwordHash = "") {
  return {
    ...blankUserState,
    ...user,
    passwordHash: user.passwordHash || passwordHash,
    createdAt: user.createdAt || formatDate()
  };
}

function getInitialState() {
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
    practiceLater: false,
    completed: false,
    archived: false,
    revisionHistory: buildScheduledHistory(dateSolved),
    createdAt: today,
    updatedAt: today
  };
}

function toCloudUser(userState, theme) {
  return {
    problems: dedupeProblemsByUrl(userState.problems || []),
    searchHistory: userState.searchHistory || [],
    recentlyViewed: userState.recentlyViewed || [],
    theme: theme || "light",
    updatedAt: new Date().toISOString()
  };
}

function fromCloudUser(payload) {
  return {
    problems: dedupeProblemsByUrl(payload?.problems || []),
    searchHistory: payload?.searchHistory || [],
    recentlyViewed: payload?.recentlyViewed || []
  };
}

function userDocRef(uid) {
  return doc(db, "users", uid);
}

export function AppProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, getInitialState);
  const [cloudUser, setCloudUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [cloudReady, setCloudReady] = useState(!isFirebaseConfigured);
  const [toast, setToast] = useState(null);
  const skipNextCloudSave = useRef(false);

  const theme = state.theme || "light";
  const activeUserId = isFirebaseConfigured ? cloudUser?.email || "" : state.sessionUserId || DEFAULT_USER_ID;
  const activeStorageKey = isFirebaseConfigured ? cloudUser?.uid : activeUserId;
  const isAuthenticated = isFirebaseConfigured
    ? Boolean(cloudUser)
    : Boolean(activeUserId && state.users?.[activeUserId]);
  const currentUser = activeStorageKey ? state.users?.[activeStorageKey] || blankUserState : blankUserState;
  const problems = currentUser.problems || [];
  const searchHistory = currentUser.searchHistory || [];
  const recentlyViewed = currentUser.recentlyViewed || [];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      setAuthLoading(false);
      if (!user) {
        setCloudReady(true);
        setState((current) => ({ ...current, sessionUserId: "" }));
      }
    });
  }, [setState]);

  useEffect(() => {
    if (!isFirebaseConfigured || !cloudUser) return undefined;

    setCloudReady(false);
    return onSnapshot(
      userDocRef(cloudUser.uid),
      async (snapshot) => {
        if (!snapshot.exists()) {
          const previousLocalUser = state.users[state.sessionUserId] || blankUserState;
          await setDoc(userDocRef(cloudUser.uid), toCloudUser(previousLocalUser, theme));
          return;
        }

        const data = snapshot.data();
        skipNextCloudSave.current = true;
        setState((current) => ({
          ...current,
          sessionUserId: cloudUser.uid,
          theme: data.theme || current.theme || "light",
          users: {
            ...current.users,
            [cloudUser.uid]: fromCloudUser(data)
          }
        }));
        setCloudReady(true);
      },
      () => {
        setCloudReady(true);
        notify("Cloud sync connection failed. Local cached data is still available.", "error");
      }
    );
  }, [cloudUser, setState]);

  useEffect(() => {
    if (!isFirebaseConfigured || !cloudUser || !cloudReady) return;
    if (skipNextCloudSave.current) {
      skipNextCloudSave.current = false;
      return;
    }
    console.info("[CodeRevise sync] Writing user document to Firestore", {
      uid: cloudUser.uid,
      problemCount: dedupeProblemsByUrl(currentUser.problems || []).length
    });
    setDoc(userDocRef(cloudUser.uid), toCloudUser(currentUser, theme), { merge: true }).catch(() => {
      notify("Could not sync latest changes to cloud.", "error");
    });
  }, [cloudUser, cloudReady, currentUser, theme]);

  function notify(message, type = "success") {
    setToast({ id: crypto.randomUUID(), message, type });
  }

  function updateCurrentUser(updater) {
    setState((current) => {
      const userKey = isFirebaseConfigured ? cloudUser?.uid : current.sessionUserId;
      if (!userKey) return current;
      const userState = current.users?.[userKey] || blankUserState;
      return {
        ...current,
        users: {
          ...current.users,
          [userKey]: updater(userState)
        }
      };
    });
  }

  function addProblem(input) {
    const problem = makeProblem(input);
    console.info("[CodeRevise addProblem] Creating scheduled problem", {
      name: problem.name,
      url: problem.url
    });
    updateCurrentUser((user) => ({ ...user, problems: [problem, ...user.problems] }));
    notify("Problem added to your revision plan.");
  }

  function captureProblem(input) {
    const problem = makeProblem(input);
    const baseProblems = currentUser.problems || [];
    const result = upsertProblemByUrl(baseProblems, problem);
    const nextUserState = { ...currentUser, problems: result.problems };
    const existedBefore = baseProblems.some(
      (existingProblem) => normalizeProblemUrl(existingProblem.url) === normalizeProblemUrl(problem.url)
    );

    console.info("[CodeRevise captureProblem] Save requested", {
      name: problem.name,
      url: problem.url,
      normalizedUrl: normalizeProblemUrl(problem.url),
      existedBefore,
      currentProblemCount: baseProblems.length
    });

    updateCurrentUser((user) => {
      const latestResult = upsertProblemByUrl(user.problems || [], problem);
      console.info("[CodeRevise captureProblem] Upsert completed", {
        url: problem.url,
        didCreate: latestResult.didCreate,
        problemCount: latestResult.problems.length
      });
      return { ...user, problems: latestResult.problems };
    });

    if (isFirebaseConfigured && cloudUser) {
      console.info("[CodeRevise captureProblem] Writing captured problem to Firestore immediately", {
        uid: cloudUser.uid,
        url: problem.url,
        didCreate: result.didCreate,
        problemCount: result.problems.length
      });
      setDoc(userDocRef(cloudUser.uid), toCloudUser(nextUserState, theme), { merge: true }).catch(() => {
        notify("Problem was saved locally, but cloud sync failed.", "error");
      });
    }

    notify(existedBefore ? "Problem already existed. Details refreshed." : "Problem captured to your planner.");
    return { created: !existedBefore };
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

  function togglePracticeLater(id) {
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) =>
        problem.id === id ? { ...problem, practiceLater: !problem.practiceLater, updatedAt: formatDate() } : problem
      )
    }));
    notify("Future practice list updated.");
  }

  function markPracticeDone(id) {
    const today = formatDate();
    updateCurrentUser((user) => ({
      ...user,
      problems: user.problems.map((problem) =>
        problem.id === id
          ? {
              ...problem,
              lastRevised: today,
              revisionHistory: [...(problem.revisionHistory || []), { date: today, stage: "practice" }],
              updatedAt: today
            }
          : problem
      )
    }));
    notify("Practice logged without changing the revision date.");
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
    updateCurrentUser((user) => ({
      ...user,
      problems: payload.problems,
      searchHistory: payload.searchHistory || [],
      recentlyViewed: payload.recentlyViewed || []
    }));
    notify("Data imported successfully.");
    return true;
  }

  async function register(userId, password) {
    const cleaned = normalizeUserId(userId);
    if (!cleaned || !password) {
      notify("Enter both email/user ID and password.", "error");
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        const credential = await createUserWithEmailAndPassword(auth, cleaned, password);
        await setDoc(userDocRef(credential.user.uid), toCloudUser(blankUserState, theme));
        notify(`Cloud account created for "${cleaned}".`);
        return true;
      } catch (error) {
        notify(error.message || "Could not create cloud account.", "error");
        return false;
      }
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
    notify(`Local account created for "${cleaned}".`);
    return true;
  }

  async function login(userId, password) {
    const cleaned = normalizeUserId(userId);
    if (isFirebaseConfigured) {
      try {
        await signInWithEmailAndPassword(auth, cleaned, password);
        notify(`Logged in as "${cleaned}".`);
        return true;
      } catch (error) {
        notify(error.message || "Could not login.", "error");
        return false;
      }
    }

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

  async function logout() {
    if (isFirebaseConfigured) {
      await signOut(auth);
    }
    setState((current) => ({ ...current, sessionUserId: "" }));
    notify("Logged out.");
  }

  async function changePassword(currentPassword, nextPassword) {
    if (!nextPassword) {
      notify("Enter a new password.", "error");
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        const credential = EmailAuthProvider.credential(cloudUser.email, currentPassword);
        await reauthenticateWithCredential(cloudUser, credential);
        await updatePassword(cloudUser, nextPassword);
        notify("Cloud password updated.");
        return true;
      } catch (error) {
        notify(error.message || "Could not update password.", "error");
        return false;
      }
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

  async function changeUserId(nextUserId, password) {
    const cleaned = normalizeUserId(nextUserId);
    if (!cleaned) {
      notify("Enter a new email/user ID.", "error");
      return false;
    }

    if (isFirebaseConfigured) {
      try {
        const credential = EmailAuthProvider.credential(cloudUser.email, password);
        await reauthenticateWithCredential(cloudUser, credential);
        await updateEmail(cloudUser, cleaned);
        notify(`Email changed to "${cleaned}".`);
        return true;
      } catch (error) {
        notify(error.message || "Could not update email.", "error");
        return false;
      }
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
      authLoading,
      cloudEnabled: isFirebaseConfigured,
      cloudReady,
      isAuthenticated,
      problems,
      searchHistory,
      recentlyViewed,
      theme,
      toast,
      setToast,
      addProblem,
      captureProblem,
      updateProblem,
      deleteProblem,
      toggleFavorite,
      toggleArchive,
      togglePracticeLater,
      markPracticeDone,
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
    [
      state.users,
      activeUserId,
      authLoading,
      cloudReady,
      isAuthenticated,
      problems,
      searchHistory,
      recentlyViewed,
      theme,
      toast
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
