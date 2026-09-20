import { isFirebaseConfigured } from "../services/firebase";
import { saveUserSettings } from "../services/firestore";

export function createGoalActions({ goals, cloudUser, updateCurrentUser, notify }) {
  function setGoals(updates) {
    const nextGoals = { ...goals, ...updates };

    if (isFirebaseConfigured && cloudUser) {
      saveUserSettings(cloudUser.uid, { goals: nextGoals }).catch(() => notify("Could not sync goals to the cloud.", "error"));
    } else {
      updateCurrentUser((user) => ({ ...user, goals: nextGoals }));
    }
    notify("Goals updated.");
  }

  return { setGoals };
}
