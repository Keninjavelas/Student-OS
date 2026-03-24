import { useSelector, useDispatch } from "react-redux";
import { useState } from "react";
import { resetSettings, updateSetting } from "../store/slices/settingsSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Toggle from "../components/ui/Toggle";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

function SettingsPage() {
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const user = useSelector((state) => state.auth.user);
  const [showResetModal, setShowResetModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const roleLabel = user?.role === "admin" ? "Administrator" : "Student";

  function handleReset() {
    dispatch(resetSettings());
    setShowResetModal(false);
    setToastMessage("Settings reset to defaults.");
    setTimeout(() => setToastMessage(""), 2500);
  }

  return (
    <section className="space-y-6">
      <Toast message={toastMessage} />
      <Card>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Manage account preferences, notifications, and dashboard behavior for your {roleLabel.toLowerCase()} view.
        </p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          <div className="mt-4 space-y-3">
            <Toggle
              id="emailNotifications"
              label="Email notifications"
              checked={settings.emailNotifications}
              onChange={(value) => dispatch(updateSetting({ key: "emailNotifications", value }))}
            />
            <Toggle
              id="weeklyDigest"
              label="Weekly placement digest"
              checked={settings.weeklyDigest}
              onChange={(value) => dispatch(updateSetting({ key: "weeklyDigest", value }))}
            />
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-semibold text-gray-900">Dashboard Preferences</h3>
          <div className="mt-4 space-y-3">
            <Toggle
              id="showReadinessInsights"
              label="Show readiness insights"
              checked={settings.showReadinessInsights}
              onChange={(value) => dispatch(updateSetting({ key: "showReadinessInsights", value }))}
            />
            <Toggle
              id="compactTableMode"
              label="Use compact admin table layout"
              checked={settings.compactTableMode}
              onChange={(value) => dispatch(updateSetting({ key: "compactTableMode", value }))}
            />
          </div>
        </Card>
      </div>

      <Card>
        <h3 className="text-lg font-semibold text-gray-900">Appearance</h3>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant={settings.theme === "light" ? "primary" : "secondary"}
            onClick={() => dispatch(updateSetting({ key: "theme", value: "light" }))}
          >
            Light
          </Button>
          <Button
            variant={settings.theme === "dark" ? "primary" : "secondary"}
            onClick={() => dispatch(updateSetting({ key: "theme", value: "dark" }))}
          >
            Dark
          </Button>
          <Button variant="danger" onClick={() => setShowResetModal(true)}>
            Reset to Defaults
          </Button>
        </div>
      </Card>
      <Modal isOpen={showResetModal} title="Reset settings" onClose={() => setShowResetModal(false)}>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          This will restore all preference values to their defaults. Continue?
        </p>
        <div className="mt-4 flex gap-2">
          <Button variant="secondary" onClick={() => setShowResetModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleReset}>
            Confirm Reset
          </Button>
        </div>
      </Modal>
    </section>
  );
}

export default SettingsPage;
