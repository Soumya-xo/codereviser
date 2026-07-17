import { Code2, LogIn, UserPlus } from "lucide-react";
import { useState } from "react";
import { useApp } from "../context/AppContext";
import Toast from "../components/Toast";

export default function Login() {
  const { login, register } = useApp();
  const [mode, setMode] = useState("login");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    const success = mode === "login" ? login(userId, password) : register(userId, password);
    if (success) {
      setUserId("");
      setPassword("");
    }
  }

  return (
    <main className="authShell">
      <section className="authCard card">
        <div className="authBrand">
          <span className="brandIcon">
            <Code2 size={22} />
          </span>
          <div>
            <strong>CodeRevise</strong>
            <p>Coding Revision Planner</p>
          </div>
        </div>

        <div>
          <span className="eyebrow">Account</span>
          <h1>{mode === "login" ? "Login to your planner" : "Create your planner"}</h1>
          <p className="muted">Your problems and revision history stay separate for each user ID on this device.</p>
        </div>

        <div className="segmented authTabs">
          <button className={mode === "login" ? "selected" : ""} type="button" onClick={() => setMode("login")}>
            <LogIn size={17} /> Login
          </button>
          <button className={mode === "register" ? "selected" : ""} type="button" onClick={() => setMode("register")}>
            <UserPlus size={17} /> Register
          </button>
        </div>

        <form className="authForm" onSubmit={handleSubmit}>
          <label>
            User ID
            <input value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="your-user-id" required />
          </label>
          <label>
            Password
            <input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              type="password"
              required={mode === "register"}
            />
          </label>
          <button className="button primary" type="submit">
            {mode === "login" ? <LogIn size={16} /> : <UserPlus size={16} />}
            {mode === "login" ? "Login" : "Create account"}
          </button>
        </form>

        <p className="authNote">
          This is local-device account separation using Local Storage, not internet/server authentication.
        </p>
      </section>
      <Toast />
    </main>
  );
}
