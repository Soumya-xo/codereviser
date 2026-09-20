import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import {
  arrayUnion,
  auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  isFirebaseConfigured,
  onAuthStateChanged,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword
} from "../services/firebase";
import {
  commitRevision,
  createProblemDoc,
  deleteProblemDoc,
  migrateLegacyUserDocIfNeeded,
  saveUserSettings,
  subscribeToProblems,
  subscribeToUserSettings,
  updateProblemDoc
} from "../services/firestore";
import { formatDate } from "../utils/date";
import { dedupeProblemsByUrl, mergeProblemByUrl, normalizeProblemUrl, upsertProblemByUrl } from "../utils/problemIdentity";
import {
  buildRevisionRecord,
  buildScheduledHistory,
  DEFAULT_EASE_FACTOR,
  getAdaptiveIntervalDays,
  getInitialRevisionDate,
  getNextEaseFactor,
  getNextRevisionDate,
  isValidRating,
  MASTERY_REVISION_COUNT
} from "../utils/revision";

const AppContext = createContext(null);

const STORAGE_KEY = "coderevise-state-v4";
const PREVIOUS_STORAGE_KEYS = ["coderevise-state-v3", "coderevise-state-v2", "coderevise-state"];
const DEFAULT_USER_ID = "";

const blankUserState = {
  problems: [],
  searchHistory: [],
  recentlyViewed: []
};

const blankRevisionNotes = { approach: "", mistake: "", keyInsight: "" };

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

function isValidImportedProblem(problem) {
  return Boolean(
    problem &&
      typeof problem.name === "string" &&
      problem.name.trim() &&
      typeof problem.topic === "string" &&
      problem.topic.trim()
  );
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

function buildRevisionUpdate(problem, { rating, approach, mistake, keyInsight }) {
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

export function AppProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, getInitialState);
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudProblems, setCloudProblems] = useState([]);
  const [cloudSettings, setCloudSettings] = useState({ searchHistory: [], recentlyViewed: [], theme: null });
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [cloudReady, setCloudReady] = useState(!isFirebaseConfigured);
  const [toast, setToast] = useState(null);
  const migrationRanForUid = useRef(null);

  const activeUserId = isFirebaseConfigured ? cloudUser?.email || "" : state.sessionUserId || DEFAULT_USER_ID;
  const isAuthenticated = isFirebaseConfigured
    ? Boolean(cloudUser)
    : Boolean(activeUserId && state.users?.[activeUserId]);
  const currentUser = !isFirebaseConfigured && activeUserId ? state.users?.[activeUserId] || blankUserState : blankUserState;

  const problems = isFirebaseConfigured ? cloudProblems : currentUser.problems || [];
  const searchHistory = isFirebaseConfigured ? cloudSettings.searchHistory || [] : currentUser.searchHistory || [];
  const recentlyViewed = isFirebaseConfigured ? cloudSettings.recentlyViewed || [] : currentUser.recentlyViewed || [];
  const theme = (isFirebaseConfigured ? cloudSettings.theme : state.theme) || state.theme || "light";

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
        setCloudProblems([]);
        setCloudSettings({ searchHistory: [], recentlyViewed: [], theme: null });
      }
    });
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !cloudUser) return undefined;

    setCloudReady(false);
    let settingsReady = false;
    let problemsReady = false;
    const markReadyIfLoaded = () => {
      if (settingsReady && problemsReady) setCloudReady(true);
    };

    async function bootstrap() {
      if (migrationRanForUid.current !== cloudUser.uid) {
        migrationRanForUid.current = cloudUser.uid;
        try {
          await migrateLegacyUserDocIfNeeded(cloudUser.uid);
        } catch {
          notify("Could not check for legacy data migration.", "error");
        }
      }
    }
    bootstrap();

    const unsubscribeSettings = subscribeToUserSettings(
      cloudUser.uid,
      (snapshot) => {
        const data = snapshot.exists() ? snapshot.data() : {};
        setCloudSettings({
          searchHistory: data.searchHistory || [],
          recentlyViewed: data.recentlyViewed || [],
          theme: data.theme || null
        });
        settingsReady = true;
        markReadyIfLoaded();
      },
      () => {
        settingsReady = true;
        markReadyIfLoaded();
        notify("Cloud settings sync failed. Local cached data is still available.", "error");
      }
    );

    const unsubscribeProblems = subscribeToProblems(
      cloudUser.uid,
      (nextProblems) => {
        setCloudProblems(dedupeProblemsByUrl(nextProblems));
        problemsReady = true;
        markReadyIfLoaded();
      },
      () => {
        problemsReady = true;
        markReadyIfLoaded();
        notify("Cloud sync connection failed. Local cached data is still available.", "error");
      }
    );

    return () => {
      unsubscribeSettings();
      unsubscribeProblems();
    };
  }, [cloudUser]);

  function notify(message, type = "success") {
    setToast({ id: crypto.randomUUID(), message, type });
  }

  function updateCurrentUser(updater) {
    setState((current) => {
      const userKey = current.sessionUserId;
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
    if (isFirebaseConfigured && cloudUser) {
      createProblemDoc(cloudUser.uid, problem).catch(() => notify("Could not save the problem to the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({ ...user, problems: [problem, ...user.problems] }));
    }
    notify("Problem added to your revision plan.");
  }

  function captureProblem(input) {
    const problem = makeProblem(input);
    const normalizedIncomingUrl = normalizeProblemUrl(problem.url);
    const existing = problems.find((item) => normalizeProblemUrl(item.url) === normalizedIncomingUrl);

    if (isFirebaseConfigured && cloudUser) {
      if (existing) {
        const merged = mergeProblemByUrl(existing, problem);
        updateProblemDoc(cloudUser.uid, existing.id, merged).catch(() =>
          notify("Problem was found, but cloud sync failed.", "error")
        );
      } else {
        createProblemDoc(cloudUser.uid, problem).catch(() =>
          notify("Problem was captured, but cloud sync failed.", "error")
        );
      }
    } else {
      updateCurrentUser((user) => {
        const result = upsertProblemByUrl(user.problems || [], problem);
        return { ...user, problems: result.problems };
      });
    }

    notify(existing ? "Problem already existed. Details refreshed." : "Problem captured to your planner.");
    return { created: !existing };
  }

  function updateProblem(id, updates) {
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    const dateSolvedChanged = updates.dateSolved && updates.dateSolved !== problem.dateSolved;
    const nextRevisionDate = dateSolvedChanged
      ? getInitialRevisionDate(updates.dateSolved)
      : (updates.nextRevisionDate ?? problem.nextRevisionDate);
    const fields = {
      ...updates,
      nextRevisionDate,
      revisionHistory: dateSolvedChanged ? buildScheduledHistory(updates.dateSolved) : problem.revisionHistory,
      updatedAt: formatDate()
    };

    if (isFirebaseConfigured && cloudUser) {
      updateProblemDoc(cloudUser.uid, id, fields).catch(() => notify("Could not update the problem in the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: user.problems.map((item) => (item.id === id ? { ...item, ...fields } : item))
      }));
    }
    notify("Problem updated.");
  }

  function deleteProblem(id) {
    if (isFirebaseConfigured && cloudUser) {
      deleteProblemDoc(cloudUser.uid, id).catch(() => notify("Could not delete the problem from the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: user.problems.filter((problem) => problem.id !== id),
        recentlyViewed: user.recentlyViewed.filter((item) => item !== id)
      }));
    }
    notify("Problem deleted.", "warning");
  }

  function patchProblem(id, fields) {
    if (isFirebaseConfigured && cloudUser) {
      updateProblemDoc(cloudUser.uid, id, fields).catch(() => notify("Could not sync this change to the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: user.problems.map((problem) => (problem.id === id ? { ...problem, ...fields } : problem))
      }));
    }
  }

  function toggleFavorite(id) {
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    patchProblem(id, { favorite: !problem.favorite, updatedAt: formatDate() });
  }

  function toggleArchive(id) {
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    patchProblem(id, { archived: !problem.archived, updatedAt: formatDate() });
    notify("Archive status updated.");
  }

  function togglePracticeLater(id) {
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    patchProblem(id, { practiceLater: !problem.practiceLater, updatedAt: formatDate() });
    notify("Future practice list updated.");
  }

  function markPracticeDone(id) {
    const today = formatDate();
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;

    if (isFirebaseConfigured && cloudUser) {
      updateProblemDoc(cloudUser.uid, id, {
        lastRevised: today,
        updatedAt: today,
        revisionHistory: arrayUnion({ date: today, scheduled: false, practice: true })
      }).catch(() => notify("Could not sync this practice session to the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: user.problems.map((item) =>
          item.id === id
            ? {
                ...item,
                lastRevised: today,
                revisionHistory: [...(item.revisionHistory || []), { date: today, practice: true }],
                updatedAt: today
              }
            : item
        )
      }));
    }
    notify("Practice logged without changing the revision date.");
  }

  function completeRevision(id, { rating, approach = "", mistake = "", keyInsight = "" } = {}) {
    if (!isValidRating(rating)) {
      notify("Choose a recall rating to complete the revision.", "error");
      return;
    }
    const problem = problems.find((item) => item.id === id);
    if (!problem) return;
    const { record, problemFields } = buildRevisionUpdate(problem, { rating, approach, mistake, keyInsight });

    if (isFirebaseConfigured && cloudUser) {
      commitRevision(
        cloudUser.uid,
        id,
        { ...problemFields, revisionHistory: arrayUnion({ date: record.reviewedAt, revisionNumber: record.revisionNumber }) },
        record
      ).catch(() => notify("Could not sync this revision to the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: user.problems.map((item) =>
          item.id === id
            ? {
                ...item,
                ...problemFields,
                revisionHistory: [
                  ...(item.revisionHistory || []),
                  {
                    date: record.reviewedAt,
                    revisionNumber: record.revisionNumber,
                    rating: record.rating,
                    approach: record.approach,
                    mistake: record.mistake,
                    keyInsight: record.keyInsight
                  }
                ]
              }
            : item
        )
      }));
    }
    notify(problemFields.completed ? "Revision completed. Problem mastered!" : "Revision completed. Next date calculated.");
  }

  function addSearchTerm(term) {
    const cleaned = term.trim();
    if (!cleaned) return;
    const nextHistory = [cleaned, ...searchHistory.filter((item) => item !== cleaned)].slice(0, 6);

    if (isFirebaseConfigured && cloudUser) {
      saveUserSettings(cloudUser.uid, { searchHistory: nextHistory }).catch(() => {});
    } else {
      updateCurrentUser((user) => ({ ...user, searchHistory: nextHistory }));
    }
  }

  function markRecentlyViewed(id) {
    const nextRecent = [id, ...recentlyViewed.filter((item) => item !== id)].slice(0, 5);

    if (isFirebaseConfigured && cloudUser) {
      saveUserSettings(cloudUser.uid, { recentlyViewed: nextRecent }).catch(() => {});
    } else {
      updateCurrentUser((user) => ({ ...user, recentlyViewed: nextRecent }));
    }
  }

  function setTheme(themeValue) {
    setState((current) => ({ ...current, theme: themeValue }));
    if (isFirebaseConfigured && cloudUser) {
      saveUserSettings(cloudUser.uid, { theme: themeValue }).catch(() => {});
    }
  }

  function resetData() {
    if (isFirebaseConfigured && cloudUser) {
      Promise.all(problems.map((problem) => deleteProblemDoc(cloudUser.uid, problem.id))).catch(() =>
        notify("Could not reset all cloud data.", "error")
      );
      saveUserSettings(cloudUser.uid, { searchHistory: [], recentlyViewed: [] }).catch(() => {});
    } else {
      updateCurrentUser((user) => withAccountFields(blankUserState, user.passwordHash));
    }
    notify("Current user data reset.", "warning");
  }

  function importData(payload) {
    if (!payload?.problems || !Array.isArray(payload.problems)) {
      notify("Import failed. JSON must include a problems array.", "error");
      return false;
    }

    const validProblems = payload.problems.filter(isValidImportedProblem);
    const skipped = payload.problems.length - validProblems.length;
    if (!validProblems.length) {
      notify("Import failed. No valid problems found in the file.", "error");
      return false;
    }

    if (isFirebaseConfigured && cloudUser) {
      Promise.all(
        validProblems.map((problem) =>
          createProblemDoc(cloudUser.uid, { ...problem, id: problem.id || crypto.randomUUID() })
        )
      ).catch(() => notify("Could not import all problems to the cloud.", "error"));
      saveUserSettings(cloudUser.uid, {
        searchHistory: payload.searchHistory || [],
        recentlyViewed: payload.recentlyViewed || []
      }).catch(() => {});
    } else {
      updateCurrentUser((user) => ({
        ...user,
        problems: validProblems,
        searchHistory: payload.searchHistory || [],
        recentlyViewed: payload.recentlyViewed || []
      }));
    }
    notify(
      skipped
        ? `Imported ${validProblems.length} problems. Skipped ${skipped} invalid ${skipped === 1 ? "entry" : "entries"}.`
        : "Data imported successfully."
    );
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
        await createUserWithEmailAndPassword(auth, cleaned, password);
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
