import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { useSelector } from "react-redux";
import Navbar from "../components/Navbar";

function MainLayout() {
  const { theme } = useSelector((state) => state.settings);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
