import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Code2,
  LayoutDashboard,
  ListTodo,
  Menu,
  Settings,
  LogOut,
  X
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useApp } from "../context/AppContext";
import brandStyles from "./BrandMark.module.css";
import Toast from "./Toast";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/problems", label: "Problems", icon: ListTodo },
  { to: "/today", label: "Today", icon: CheckCircle2 },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/settings", label: "Settings", icon: Settings }
];

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { activeUserId, problems, logout } = useApp();
  const activeCount = problems.filter((problem) => !problem.archived).length;

  return (
    <div className="appShell">
      <aside className={`sidebar ${open ? "sidebarOpen" : ""}`}>
        <div className="brand">
          <span className={`brandIcon ${brandStyles.mark}`}>
            <Code2 size={22} />
          </span>
          <div>
            <strong>CodeRevise</strong>
            <small>Coding Revision Planner</small>
          </div>
        </div>

        <nav className="navList" aria-label="Primary navigation">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `navItem ${isActive ? "active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebarPanel">
          <span className="eyebrow">Library</span>
          <strong>{activeCount} active problems</strong>
          <p>Keep the queue warm with small, regular revision wins.</p>
        </div>
      </aside>

      <div className="mainArea">
        <header className="topbar">
          <button className="iconButton mobileOnly" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={20} />
          </button>
          <div className="topbarTitle">CodeRevise</div>
          <div className="topbarActions">
            <div className="userBadge">User: {activeUserId}</div>
            <button className="iconButton" type="button" onClick={logout} aria-label="Logout" title="Logout">
              <LogOut size={17} />
            </button>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>

      {open && <button className="scrim" aria-label="Close menu" onClick={() => setOpen(false)} />}
      {open && (
        <button className="floatingClose" aria-label="Close menu" onClick={() => setOpen(false)}>
          <X size={20} />
        </button>
      )}
      <Toast />
    </div>
  );
}
