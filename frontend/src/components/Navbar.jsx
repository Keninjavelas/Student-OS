import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutLocal, logoutUser } from "../store/slices/authSlice";
import NotificationBell from "./ui/NotificationBell";

const studentLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/resume", label: "Resume" },
  { to: "/skills", label: "Skills & Tests" },
  { to: "/mock-interview", label: "Interviews" },
  { to: "/roadmap", label: "AI Roadmap" },
  { to: "/ranking", label: "Rankings" },
  { to: "/jobs", label: "Jobs" },
  { to: "/settings", label: "Settings" },
];

const adminLinks = [
  { to: "/admin", label: "Analytics" },
  { to: "/admin/cohorts", label: "Cohorts" },
  { to: "/admin/skill-gaps", label: "Skill Gaps" },
  { to: "/admin/users", label: "Users" },
  { to: "/settings", label: "Settings" },
];

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(s => s.auth);
  const { xp } = useSelector(s => s.gamification);
  const links = user?.role === "admin" ? adminLinks : studentLinks;
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    try { await dispatch(logoutUser()).unwrap(); } catch { dispatch(logoutLocal()); }
    navigate("/login", { replace: true });
  }

  const activeClass = "bg-indigo-600 text-white shadow-sm";
  const inactiveClass = "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100";

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">SO</div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold tracking-wide text-gray-400">Campus Placement</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-tight">Student OS</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav aria-label="Primary navigation" className="hidden lg:flex items-center gap-1">
          {links.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/" || link.to === "/admin"}
              className={({ isActive }) => `rounded-md px-2.5 py-1.5 text-sm font-medium transition ${isActive ? activeClass : inactiveClass}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* XP chip — student only */}
          {user?.role === "student" && (
            <Link to="/ranking" className="hidden sm:flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300">
              ⚡ {xp.toLocaleString()} XP
            </Link>
          )}

          {/* Notification bell */}
          <NotificationBell />

          {/* Logout — desktop */}
          <button
            type="button"
            onClick={handleLogout}
            className="hidden lg:block rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Logout
          </button>

          {/* Hamburger — mobile */}
          <button
            type="button"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="lg:hidden rounded-md p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {menuOpen ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pb-4 pt-2 dark:border-gray-800 dark:bg-gray-900">
          <nav className="flex flex-col gap-1">
            {links.map(link => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/" || link.to === "/admin"}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium transition ${isActive ? activeClass : inactiveClass}`}
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="mt-2 rounded-md bg-gray-100 px-3 py-2 text-left text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            >
              Logout
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}

export default Navbar;
