import { Download, KeyRound, LogOut, Moon, RotateCcw, Sun, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../context/AppContext";

export default function Settings() {
  const {
    activeUserId,
    problems,
    searchHistory,
    recentlyViewed,
    theme,
    setTheme,
    resetData,
    importData,
    logout,
    changePassword,
    changeUserId
  } = useApp();
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [nextUserId, setNextUserId] = useState(activeUserId);
  const [renamePassword, setRenamePassword] = useState("");
  const fileInput = useRef(null);

  function exportJson() {
    const payload = JSON.stringify({ problems, searchHistory, recentlyViewed, theme }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "coderevise-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePasswordChange(event) {
    event.preventDefault();
    if (changePassword(currentPassword, nextPassword)) {
      setCurrentPassword("");
      setNextPassword("");
    }
  }

  function handleUserIdChange(event) {
    event.preventDefault();
    if (changeUserId(nextUserId, renamePassword)) {
      setRenamePassword("");
    }
  }

  async function handleImport(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      importData(JSON.parse(text));
    } catch {
      importData({});
    } finally {
      event.target.value = "";
    }
  }

  return (
    <div className="pageStack">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>Choose a theme, protect your data, or start fresh.</p>
        </div>
      </div>

      <div className="settingsGrid">
        <section className="card settingsCard">
          <span className="eyebrow">Account</span>
          <h2>{activeUserId}</h2>
          <p>This account has its own problems, revision queue, calendar, and analytics on this device.</p>
          <button className="button secondary" type="button" onClick={logout}>
            <LogOut size={16} /> Logout
          </button>
        </section>

        <section className="card settingsCard">
          <span className="eyebrow">Profile</span>
          <h2>Change user ID</h2>
          <form className="passwordForm" onSubmit={handleUserIdChange}>
            <input value={nextUserId} onChange={(event) => setNextUserId(event.target.value)} placeholder="New user ID" />
            <input
              value={renamePassword}
              onChange={(event) => setRenamePassword(event.target.value)}
              placeholder="Current password"
              type="password"
              required
            />
            <button className="button primary" type="submit">
              Update user ID
            </button>
          </form>
        </section>

        <section className="card settingsCard">
          <span className="eyebrow">Security</span>
          <h2>Password</h2>
          <form className="passwordForm" onSubmit={handlePasswordChange}>
            <input
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              placeholder="Current password"
              type="password"
            />
            <input
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              placeholder="New password"
              type="password"
              required
            />
            <button className="button primary" type="submit">
              <KeyRound size={16} /> Update password
            </button>
          </form>
        </section>

        <section className="card settingsCard">
          <span className="eyebrow">Appearance</span>
          <h2>Theme</h2>
          <div className="segmented">
            <button className={theme === "light" ? "selected" : ""} type="button" onClick={() => setTheme("light")}>
              <Sun size={17} /> Light
            </button>
            <button className={theme === "dark" ? "selected" : ""} type="button" onClick={() => setTheme("dark")}>
              <Moon size={17} /> Dark
            </button>
          </div>
        </section>

        <section className="card settingsCard">
          <span className="eyebrow">Data</span>
          <h2>Backup and restore</h2>
          <div className="actionStack">
            <button className="button secondary" type="button" onClick={exportJson}>
              <Download size={16} /> Export JSON
            </button>
            <button className="button secondary" type="button" onClick={() => fileInput.current.click()}>
              <Upload size={16} /> Import JSON
            </button>
            <input ref={fileInput} className="hiddenInput" type="file" accept="application/json" onChange={handleImport} />
          </div>
        </section>

        <section className="card settingsCard dangerZone">
          <span className="eyebrow">Reset</span>
          <h2>Reset data</h2>
          <p>This clears only the current user&apos;s problems, revisions, search history, and recent activity.</p>
          <button className="button danger" type="button" onClick={() => window.confirm("Reset current user data?") && resetData()}>
            <RotateCcw size={16} /> Reset Data
          </button>
        </section>
      </div>
    </div>
  );
}
