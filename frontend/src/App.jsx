import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useDispatch } from "react-redux";
import MainLayout from "./layouts/MainLayout";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import PublicOnlyRoute from "./components/auth/PublicOnlyRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import RouteSkeleton from "./components/ui/RouteSkeleton";
import { fetchCurrentUser, logoutLocal } from "./store/slices/authSlice";

// Student pages
const StudentDashboard  = lazy(() => import("./pages/StudentDashboard"));
const ResumeBuilder     = lazy(() => import("./pages/ResumeBuilder"));
const SkillVerification = lazy(() => import("./pages/SkillVerification"));
const MockInterview     = lazy(() => import("./pages/MockInterview"));
const RoadmapPage       = lazy(() => import("./pages/RoadmapPage"));
const SkillRankingPage  = lazy(() => import("./pages/SkillRankingPage"));
const JobBoardPage      = lazy(() => import("./pages/JobBoardPage"));
const SettingsPage      = lazy(() => import("./pages/SettingsPage"));

// Admin pages
const AdminDashboard    = lazy(() => import("./pages/AdminDashboard"));
const CohortStatsPage   = lazy(() => import("./pages/admin/CohortStatsPage"));
const SkillGapPage      = lazy(() => import("./pages/admin/SkillGapPage"));
const UserManagementPage = lazy(() => import("./pages/admin/UserManagementPage"));

// Auth pages
const LoginPage    = lazy(() => import("./pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("./pages/auth/RegisterPage"));

function App() {
  const dispatch = useDispatch();

  useEffect(() => { dispatch(fetchCurrentUser()); }, [dispatch]);

  useEffect(() => {
    function handleAuthExpired() { dispatch(logoutLocal()); }
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [dispatch]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<RouteSkeleton />}>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />

            {/* Protected — shared layout */}
            <Route element={<MainLayout />}>
              {/* Student */}
              <Route path="/"              element={<ProtectedRoute allowedRoles={["student"]}><StudentDashboard /></ProtectedRoute>} />
              <Route path="/resume"        element={<ProtectedRoute allowedRoles={["student"]}><ResumeBuilder /></ProtectedRoute>} />
              <Route path="/skills"        element={<ProtectedRoute allowedRoles={["student"]}><SkillVerification /></ProtectedRoute>} />
              <Route path="/mock-interview" element={<ProtectedRoute allowedRoles={["student"]}><MockInterview /></ProtectedRoute>} />
              <Route path="/roadmap"       element={<ProtectedRoute allowedRoles={["student"]}><RoadmapPage /></ProtectedRoute>} />
              <Route path="/ranking"       element={<ProtectedRoute allowedRoles={["student"]}><SkillRankingPage /></ProtectedRoute>} />
              <Route path="/jobs"          element={<ProtectedRoute allowedRoles={["student"]}><JobBoardPage /></ProtectedRoute>} />

              {/* Admin */}
              <Route path="/admin"              element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/cohorts"      element={<ProtectedRoute allowedRoles={["admin"]}><CohortStatsPage /></ProtectedRoute>} />
              <Route path="/admin/skill-gaps"   element={<ProtectedRoute allowedRoles={["admin"]}><SkillGapPage /></ProtectedRoute>} />
              <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={["admin"]}><UserManagementPage /></ProtectedRoute>} />

              {/* Shared */}
              <Route path="/settings" element={<ProtectedRoute allowedRoles={["student", "admin"]}><SettingsPage /></ProtectedRoute>} />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
