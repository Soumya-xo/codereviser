import { arrayUnion, isFirebaseConfigured } from "../services/firebase";
import {
  commitRevision,
  createProblemDoc,
  deleteProblemDoc,
  saveUserSettings,
  updateProblemDoc
} from "../services/firestore";
import { formatDate } from "../utils/date";
import { mergeProblemByUrl, normalizeProblemUrl, upsertProblemByUrl } from "../utils/problemIdentity";
import { buildScheduledHistory, getInitialRevisionDate, isValidRating } from "../utils/revision";
import { blankUserState, buildRevisionUpdate, isValidImportedProblem, makeProblem, withAccountFields } from "./appState";

export function createProblemActions({ problems, searchHistory, recentlyViewed, cloudUser, updateCurrentUser, notify }) {
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

  return {
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
    resetData,
    importData
  };
}
