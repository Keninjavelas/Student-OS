import authReducer, { logout } from "../authSlice";

describe("authSlice", () => {
  it("clears auth state on logout", () => {
    const initialState = {
      user: { id: "1", role: "student" },
      token: "abc",
      isAuthenticated: true,
      source: "mock",
      status: "succeeded",
      error: null
    };

    const nextState = authReducer(initialState, logout());
    expect(nextState.user).toBeNull();
    expect(nextState.token).toBeNull();
    expect(nextState.isAuthenticated).toBe(false);
  });
});
