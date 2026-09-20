import {
  auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  isFirebaseConfigured,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateEmail,
  updatePassword
} from "../services/firebase";
import { saveUserSettings } from "../services/firestore";
import { hashPassword, normalizeUserId, withAccountFields, blankUserState } from "./appState";

export function createAccountActions({ state, setState, cloudUser, activeUserId, updateCurrentUser, notify }) {
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

  function setTheme(themeValue) {
    setState((current) => ({ ...current, theme: themeValue }));
    if (isFirebaseConfigured && cloudUser) {
      saveUserSettings(cloudUser.uid, { theme: themeValue }).catch(() => {});
    }
  }

  return { register, login, logout, changePassword, changeUserId, setTheme };
}
