import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logoutLocal, logoutUser } from "../store/slices/authSlice";

const studentLinks = [
  { to: "/", label: "Dashboard" },
  { to: "/resume", label: "Resume Builder" },
  { to: "/skills", label: "Skill Tests" },
  { to: "/mock-interview", label: "Mock Interview" },
  { to: "/settings", label: "Settings" }
];

const adminLinks = [
  { to: "/admin", label: "Admin Analytics" },
  { to: "/settings", label: "Settings" }
];

function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const links = user?.role === "admin" ? adminLinks : studentLinks;

  async function handleLogout() {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch {
      dispatch(logoutLocal());
    }
    navigate("/login", { replace: true });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
            SO
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide text-gray-500 dark:text-gray-400">Campus Placement SaaS</p>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">Student OS</h1>
          </div>
        </Link>

        <nav aria-label="Primary navigation" className="flex items-center gap-2">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-md bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200 hover:text-gray-900 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
