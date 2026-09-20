import { createContext, useContext, useEffect, useMemo } from "react";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { isFirebaseConfigured } from "../services/firebase";
import { blankUserState, DEFAULT_USER_ID, getInitialState, STORAGE_KEY } from "./appState";
import { createAccountActions } from "./useAccountActions";
import { useCloudSync } from "./useCloudSync";
import { createProblemActions } from "./useProblemActions";
import { useToast } from "./useToast";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useLocalStorage(STORAGE_KEY, getInitialState);
  const { toast, setToast, notify } = useToast();
  const { cloudUser, cloudProblems, cloudSettings, authLoading, cloudReady } = useCloudSync(notify);

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

  const problemActions = createProblemActions({ problems, searchHistory, recentlyViewed, cloudUser, updateCurrentUser, notify });
  const accountActions = createAccountActions({ state, setState, cloudUser, activeUserId, updateCurrentUser, notify });

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
      ...problemActions,
      ...accountActions
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
