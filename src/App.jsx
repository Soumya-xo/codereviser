import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { useApp } from "./context/AppContext";
import Analytics from "./pages/Analytics";
import Calendar from "./pages/Calendar";
import Dashboard from "./pages/Dashboard";
import FuturePractice from "./pages/FuturePractice";
import Login from "./pages/Login";
import Problems from "./pages/Problems";
import Settings from "./pages/Settings";
import Today from "./pages/Today";

export default function App() {
  const { authLoading, isAuthenticated } = useApp();

  if (authLoading) {
    return (
      <main className="authShell">
        <section className="authCard card">
          <span className="eyebrow">CodeRevise</span>
          <h1>Loading your account</h1>
          <p className="muted">Checking cloud authentication...</p>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) return <Login />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/problems" element={<Problems />} />
        <Route path="/today" element={<Today />} />
        <Route path="/future" element={<FuturePractice />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
