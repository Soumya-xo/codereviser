import { AlertTriangle, AtSign, Check, Database, Download, KeyRound, LogOut, Moon, Palette, RotateCcw, ShieldCheck, Sun, Upload, User } from "lucide-react";
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

  async function handlePasswordChange(event) {
    event.preventDefault();
    if (await changePassword(currentPassword, nextPassword)) {
      setCurrentPassword("");
      setNextPassword("");
    }
  }

  async function handleUserIdChange(event) {
    event.preventDefault();
    if (await changeUserId(nextUserId, renamePassword)) {
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
    <div className="pageStack settingsPage">
      <div className="pageHeader">
        <div>
          <span className="eyebrow">Preferences</span>
          <h1>Settings</h1>
          <p>Manage your CodeRevise workspace and preferences.</p>
        </div>
      </div>

      <section className="card settingsPanel">
        <div className="settingsSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon" aria-hidden="true">
              <User size={16} />
            </span>
            <div>
              <h2>Account</h2>
              <p>Your signed-in CodeRevise account. Its problems, revisions, and analytics are kept separate.</p>
            </div>
          </div>
          <div className="settingsSectionBody settingsAccountRow">
            <div className="settingsField">
              <span className="settingsFieldLabel">Signed in as</span>
              <span className="settingsValue readOnly">
                {activeUserId}
                <span className="readOnlyTag">Read-only</span>
              </span>
            </div>
            <button className="button secondary" type="button" onClick={logout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        <div className="settingsSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon" aria-hidden="true">
              <AtSign size={16} />
            </span>
            <div>
              <h2>Profile</h2>
              <p>Change the email or user ID you sign in with.</p>
            </div>
          </div>
          <form className="settingsSectionBody passwordForm settingsGridForm" onSubmit={handleUserIdChange}>
            <label className="settingsField">
              <span className="settingsFieldLabel">New email or user ID</span>
              <input value={nextUserId} onChange={(event) => setNextUserId(event.target.value)} placeholder="New email or user ID" />
            </label>
            <label className="settingsField">
              <span className="settingsFieldLabel">Current password</span>
              <input
                value={renamePassword}
                onChange={(event) => setRenamePassword(event.target.value)}
                placeholder="Current password"
                type="password"
                required
              />
            </label>
            <button className="button primary settingsSubmit" type="submit">
              Update user ID
            </button>
          </form>
        </div>

        <div className="settingsSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon" aria-hidden="true">
              <ShieldCheck size={16} />
            </span>
            <div>
              <h2>Security</h2>
              <p>Update your password to keep this account protected.</p>
            </div>
          </div>
          <form className="settingsSectionBody passwordForm settingsGridForm" onSubmit={handlePasswordChange}>
            <label className="settingsField">
              <span className="settingsFieldLabel">Current password</span>
              <input
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                placeholder="Current password"
                type="password"
              />
            </label>
            <label className="settingsField">
              <span className="settingsFieldLabel">New password</span>
              <input
                value={nextPassword}
                onChange={(event) => setNextPassword(event.target.value)}
                placeholder="New password"
                type="password"
                required
              />
            </label>
            <button className="button primary settingsSubmit" type="submit">
              <KeyRound size={16} /> Update password
            </button>
          </form>
        </div>

        <div className="settingsSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon" aria-hidden="true">
              <Palette size={16} />
            </span>
            <div>
              <h2>Appearance</h2>
              <p>Choose how CodeRevise looks.</p>
            </div>
          </div>
          <div className="settingsSectionBody">
            <div className="segmented themeSegmented" role="group" aria-label="Theme">
              <button
                className={theme === "light" ? "selected" : ""}
                type="button"
                onClick={() => setTheme("light")}
                aria-pressed={theme === "light"}
              >
                <Sun size={17} /> Light
                {theme === "light" && <Check size={14} className="selectedCheck" aria-hidden="true" />}
              </button>
              <button
                className={theme === "dark" ? "selected" : ""}
                type="button"
                onClick={() => setTheme("dark")}
                aria-pressed={theme === "dark"}
              >
                <Moon size={17} /> Dark
                {theme === "dark" && <Check size={14} className="selectedCheck" aria-hidden="true" />}
              </button>
            </div>
          </div>
        </div>

        <div className="settingsSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon" aria-hidden="true">
              <Database size={16} />
            </span>
            <div>
              <h2>Data</h2>
              <p>Back up your planner or restore it from a previous export.</p>
            </div>
          </div>
          <div className="settingsSectionBody settingsActionList">
            <div className="settingsActionRow">
              <div>
                <strong>Export JSON</strong>
                <p>Download a copy of your problems, search history, and recent activity.</p>
              </div>
              <button className="button secondary" type="button" onClick={exportJson}>
                <Download size={16} /> Export JSON
              </button>
            </div>
            <div className="settingsActionRow">
              <div>
                <strong>Import JSON</strong>
                <p>Restore your planner from a CodeRevise JSON export.</p>
              </div>
              <button className="button secondary" type="button" onClick={() => fileInput.current.click()}>
                <Upload size={16} /> Import JSON
              </button>
            </div>
            <input ref={fileInput} className="hiddenInput" type="file" accept="application/json" onChange={handleImport} />
          </div>
        </div>

        <div className="settingsSection dangerSection">
          <div className="settingsSectionHead">
            <span className="settingsIcon dangerIconBadge" aria-hidden="true">
              <AlertTriangle size={16} />
            </span>
            <div>
              <h2>Danger zone</h2>
              <p>Clears only this user&apos;s problems, revisions, search history, and recent activity. This cannot be undone.</p>
            </div>
          </div>
          <div className="settingsSectionBody">
            <button className="button danger" type="button" onClick={() => window.confirm("Reset current user data?") && resetData()}>
              <RotateCcw size={16} /> Reset data
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
