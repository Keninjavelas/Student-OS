import { createSlice } from "@reduxjs/toolkit";

const SETTINGS_STORAGE_KEY = "student-os-settings";

const defaultSettings = {
  theme: "light",
  emailNotifications: true,
  weeklyDigest: true,
  showReadinessInsights: true,
  compactTableMode: false
};

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function persistSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    ...readSettings()
  },
  reducers: {
    updateSetting(state, action) {
      const { key, value } = action.payload;
      state[key] = value;
      persistSettings(state);
    },
    resetSettings(state) {
      Object.assign(state, defaultSettings);
      persistSettings(defaultSettings);
    }
  }
});

export const { updateSetting, resetSettings } = settingsSlice.actions;
export default settingsSlice.reducer;
