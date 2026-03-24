import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const AUTH_STORAGE_KEY = "student-os-auth";

const mockAccounts = [
  {
    email: "student@studentos.com",
    password: "student123",
    user: { _id: "demo-student-1", fullName: "Demo Student", role: "student" }
  },
  {
    email: "admin@studentos.com",
    password: "admin123",
    user: { _id: "demo-admin-1", fullName: "Demo Admin", role: "admin" }
  }
];

function readPersistedAuth() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistAuth(payload) {
  apiClient.setStoredAuth(payload);
}

function clearPersistedAuth() {
  apiClient.clearStoredAuth();
}

export const loginUser = createAsyncThunk("auth/loginUser", async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await apiClient.post("/api/auth/login", { email, password });
    return {
      user: data.user,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      source: "api"
    };
  } catch {
    const matched = mockAccounts.find(
      (account) => account.email.toLowerCase() === email.toLowerCase() && account.password === password
    );
    if (!matched) {
      return rejectWithValue("Invalid credentials. Try student@studentos.com or admin@studentos.com.");
    }
    return {
      user: matched.user,
      accessToken: "mock-session-token",
      refreshToken: "mock-refresh-token",
      source: "mock"
    };
  }
});

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async ({ fullName, email, password, role }, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/auth/register", { fullName, email, password, role });
      return {
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        source: "api"
      };
    } catch {
      if (password.length < 6) {
        return rejectWithValue("Password must be at least 6 characters.");
      }
      return {
        user: {
          _id: `mock-${Date.now()}`,
          fullName,
          email,
          role
        },
        accessToken: "mock-session-token",
        refreshToken: "mock-refresh-token",
        source: "mock"
      };
    }
  }
);

export const fetchCurrentUser = createAsyncThunk("auth/fetchCurrentUser", async (_, { rejectWithValue }) => {
  try {
    const data = await apiClient.get("/api/auth/me");
    return { user: data.user };
  } catch (error) {
    return rejectWithValue(error.message || "Session expired");
  }
});

export const logoutUser = createAsyncThunk("auth/logoutUser", async (_, { getState }) => {
  const source = getState().auth.source;
  if (source === "api") {
    await apiClient.post("/api/auth/logout");
  }
});

const persisted = readPersistedAuth();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: persisted?.user || null,
    accessToken: persisted?.accessToken || null,
    refreshToken: persisted?.refreshToken || null,
    isAuthenticated: Boolean(persisted?.accessToken),
    source: persisted?.source || null,
    status: "idle",
    error: null
  },
  reducers: {
    logoutLocal(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.source = null;
      state.status = "idle";
      state.error = null;
      clearPersistedAuth();
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.source = action.payload.source;
        state.isAuthenticated = true;
        persistAuth({
          user: action.payload.user,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          source: action.payload.source
        });
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message || "Login failed";
      })
      .addCase(registerUser.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.user = action.payload.user;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.source = action.payload.source;
        state.isAuthenticated = true;
        persistAuth({
          user: action.payload.user,
          accessToken: action.payload.accessToken,
          refreshToken: action.payload.refreshToken,
          source: action.payload.source
        });
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message || "Registration failed";
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.source = null;
        clearPersistedAuth();
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null;
        state.refreshToken = null;
        state.isAuthenticated = false;
        state.source = null;
        state.status = "idle";
        state.error = null;
        clearPersistedAuth();
      });
  }
});

export const { logoutLocal } = authSlice.actions;
export default authSlice.reducer;
