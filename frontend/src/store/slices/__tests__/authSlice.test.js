import authReducer, { logoutLocal } from "../authSlice";

describe("authSlice", () => {
  it("clears auth state on logout", () => {
    const initialState = {
      user: { id: "1", role: "student" },
      accessToken: "abc",
      refreshToken: "xyz",
      isAuthenticated: true,
      source: "mock",
      status: "succeeded",
      error: null
    };

    const nextState = authReducer(initialState, logoutLocal());
    expect(nextState.user).toBeNull();
    expect(nextState.accessToken).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
  });
});
