import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { resetSettings, updateSetting } from "../store/slices/settingsSlice";
import { pushNotification } from "../store/slices/notificationSlice";
import { apiClient } from "../services/apiClient";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

function SettingsPage() {
  const dispatch = useDispatch();
  const settings = useSelector(s => s.settings);
  const user = useSelector(s => s.auth.user);
  const { xp, earnedBadgeIds, streak } = useSelector(s => s.gamification);

  const [showResetModal, setShowResetModal] = useState(false);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [activeTab, setActiveTab] = useState("preferences"); // preferences | security | account

  // Password change state
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwStatus, setPwStatus] = useState("idle"); // idle | loading | success | error
  const [pwError, setPwError] = useState("");

  const roleLabel = user?.role === "admin" ? "Administrator" : user?.role === "mentor" ? "Mentor" : "Student";

  function showToast(msg, tone = "success") {
    setToast(msg); setToastTone(tone);
    setTimeout(() => setToast(""), 3000);
  }

  function handleReset() {
    dispatch(resetSettings());
    setShowResetModal(false);
    showToast("Settings reset to defaults.");
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwError("");
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    setPwStatus("loading");
    try {
      await apiClient.post("/api/auth/change-password", {
        currentPassword: pwForm.currentPassword,
        newPassword: pwForm.newPassword,
        confirmPassword: pwForm.confirmPassword,
      });
      setPwStatus("success");
      setPwForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Password changed successfully.");
      dispatch(pushNotification({ type: "success", title: "Password changed", message: "Your password has been updated." }));
    } catch (err) {
      setPwStatus("error");
      setPwError(err.message || "Failed to change password. Check your current password.");
    }
  }

  const TABS = [
    { id: "preferences", label: "Preferences" },
    { id: "security", label: "Security" },
    { id: "account", label: "Account Info" },
  ];

  return (
    <section className="space-y-6">
      <Toast message={toast} tone={toastTone} />

      <Card>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Manage your {roleLabel.toLowerCase()} account preferences and security.
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setActiveTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === t.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── PREFERENCES ── */}
      {activeTab === "preferences" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h3>
            <div className="mt-4 space-y-3">
              <Toggle id="emailNotifications" label="Email notifications"
                checked={settings.emailNotifications}
                onChange={v => dispatch(updateSetting({ key: "emailNotifications", value: v }))} />
              <Toggle id="weeklyDigest" label="Weekly placement digest"
                checked={settings.weeklyDigest}
                onChange={v => dispatch(updateSetting({ key: "weeklyDigest", value: v }))} />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Dashboard</h3>
            <div className="mt-4 space-y-3">
              <Toggle id="showReadinessInsights" label="Show readiness insights"
                checked={settings.showReadinessInsights}
                onChange={v => dispatch(updateSetting({ key: "showReadinessInsights", value: v }))} />
              <Toggle id="compactTableMode" label="Compact admin table layout"
                checked={settings.compactTableMode}
                onChange={v => dispatch(updateSetting({ key: "compactTableMode", value: v }))} />
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Appearance</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {["light", "dark"].map(theme => (
                <Button key={theme} variant={settings.theme === theme ? "primary" : "secondary"}
                  onClick={() => dispatch(updateSetting({ key: "theme", value: theme }))}>
                  {theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Button>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Reset</h3>
            <p className="mt-2 text-sm text-gray-500">Restore all preferences to their default values.</p>
            <Button variant="danger" className="mt-4" onClick={() => setShowResetModal(true)}>
              Reset to Defaults
            </Button>
          </Card>
        </div>
      )}

      {/* ── SECURITY ── */}
      {activeTab === "security" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
              {[
                ["currentPassword", "Current Password"],
                ["newPassword", "New Password"],
                ["confirmPassword", "Confirm New Password"],
              ].map(([field, label]) => (
                <label key={field} className="block">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                  <input
                    type="password"
                    value={pwForm[field]}
                    onChange={e => setPwForm(f => ({ ...f, [field]: e.target.value }))}
                    required
                    minLength={field !== "currentPassword" ? 8 : 1}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                </label>
              ))}
              {pwError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
                  {pwError}
                </div>
              )}
              {pwStatus === "success" && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  Password changed successfully.
                </div>
              )}
              <Button type="submit" disabled={pwStatus === "loading"} className="w-full">
                {pwStatus === "loading" ? "Changing..." : "Change Password"}
              </Button>
            </form>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Two-Factor Authentication</h3>
            <p className="mt-2 text-sm text-gray-500">
              Add an extra layer of security to your account with TOTP-based 2FA.
            </p>
            <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">Coming Soon</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                2FA setup will be available in the next release.
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Active Sessions</h3>
            <p className="mt-2 text-sm text-gray-500">
              You are currently logged in. Logging out invalidates your session token.
            </p>
            <div className="mt-3 rounded-lg border border-gray-100 p-3 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Current Session</p>
              <p className="text-xs text-gray-400 mt-0.5">Browser · {new Date().toLocaleDateString()}</p>
            </div>
          </Card>
        </div>
      )}

      {/* ── ACCOUNT INFO ── */}
      {activeTab === "account" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</h3>
            <div className="mt-4 space-y-3">
              {[
                ["Name", `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "—"],
                ["Email", user?.email ?? "—"],
                ["Role", roleLabel],
                ["Email Verified", user?.isEmailVerified ? "Yes ✓" : "No ✗"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2 dark:border-gray-800">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          {user?.role === "student" && (
            <Card>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Gamification Stats</h3>
              <div className="mt-4 space-y-3">
                {[
                  ["Total XP", `${xp.toLocaleString()} XP`],
                  ["Badges Earned", earnedBadgeIds.length],
                  ["Current Streak", `${streak} day${streak !== 1 ? "s" : ""}`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-gray-50 pb-2 dark:border-gray-800">
                    <span className="text-sm text-gray-500">{label}</span>
                    <span className="text-sm font-bold text-indigo-600">{value}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Data & Privacy</h3>
            <p className="mt-2 text-sm text-gray-500">
              Your data is stored securely and never shared without consent.
            </p>
            <div className="mt-4 space-y-2">
              <Button variant="secondary" className="w-full" onClick={() => showToast("Data export coming soon.")}>
                Export My Data
              </Button>
              <Button variant="danger" className="w-full" onClick={() => showToast("Account deletion requires admin approval.", "error")}>
                Delete Account
              </Button>
            </div>
          </Card>
        </div>
      )}

      <Modal isOpen={showResetModal} title="Reset settings" onClose={() => setShowResetModal(false)}>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This will restore all preference values to their defaults. Continue?
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setShowResetModal(false)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={handleReset} className="flex-1">Confirm Reset</Button>
        </div>
      </Modal>
    </section>
  );
}

export default SettingsPage;
