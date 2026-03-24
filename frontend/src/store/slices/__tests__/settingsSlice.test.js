import settingsReducer, { resetSettings, updateSetting } from "../settingsSlice";

describe("settingsSlice", () => {
  it("updates a single setting value", () => {
    const initialState = {
      theme: "light",
      emailNotifications: true,
      weeklyDigest: true,
      showReadinessInsights: true,
      compactTableMode: false
    };

    const nextState = settingsReducer(initialState, updateSetting({ key: "theme", value: "dark" }));
    expect(nextState.theme).toBe("dark");
    expect(nextState.weeklyDigest).toBe(true);
  });

  it("resets settings to defaults", () => {
    const modified = {
      theme: "dark",
      emailNotifications: false,
      weeklyDigest: false,
      showReadinessInsights: false,
      compactTableMode: true
    };
    const nextState = settingsReducer(modified, resetSettings());
    expect(nextState.theme).toBe("light");
    expect(nextState.emailNotifications).toBe(true);
    expect(nextState.compactTableMode).toBe(false);
  });
});
