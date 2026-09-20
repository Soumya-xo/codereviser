import { useEffect, useRef, useState } from "react";
import { auth, isFirebaseConfigured, onAuthStateChanged } from "../services/firebase";
import { migrateLegacyUserDocIfNeeded, subscribeToProblems, subscribeToUserSettings } from "../services/firestore";
import { dedupeProblemsByUrl } from "../utils/problemIdentity";

export function useCloudSync(notify) {
  const [cloudUser, setCloudUser] = useState(null);
  const [cloudProblems, setCloudProblems] = useState([]);
  const [cloudSettings, setCloudSettings] = useState({ searchHistory: [], recentlyViewed: [], theme: null, goals: null });
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured);
  const [cloudReady, setCloudReady] = useState(!isFirebaseConfigured);
  const migrationRanForUid = useRef(null);

  useEffect(() => {
    if (!isFirebaseConfigured) return undefined;

    return onAuthStateChanged(auth, (user) => {
      setCloudUser(user);
      setAuthLoading(false);
      if (!user) {
        setCloudReady(true);
        setCloudProblems([]);
        setCloudSettings({ searchHistory: [], recentlyViewed: [], theme: null, goals: null });
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
          theme: data.theme || null,
          goals: data.goals || null
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

  return { cloudUser, cloudProblems, cloudSettings, authLoading, cloudReady };
}
