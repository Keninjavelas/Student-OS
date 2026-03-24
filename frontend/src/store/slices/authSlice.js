import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const AUTH_STORAGE_KEY = "student-os-auth";

const mockAccounts = [
  {
    email: "student@studentos.com",
    password: "student123",
    user: { id: "demo-student-1", fullName: "Demo Student", role: "student" }
  },
  {
    email: "admin@studentos.com",
    password: "admin123",
    user: { id: "demo-admin-1", fullName: "Demo Admin", role: "admin" }
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
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}

function clearPersistedAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}

export const loginUser = createAsyncThunk("auth/loginUser", async ({ email, password }, { rejectWithValue }) => {
  try {
    const data = await apiClient.post("/api/auth/login", { email, password });
    return {
      user: data.user,
      token: data.token || "live-session-token",
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
      token: "mock-session-token",
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
        token: data.token || "live-session-token",
        source: "api"
      };
    } catch {
      if (password.length < 6) {
        return rejectWithValue("Password must be at least 6 characters.");
      }
      return {
        user: {
          id: `mock-${Date.now()}`,
          fullName,
          email,
          role
        },
        token: "mock-session-token",
        source: "mock"
      };
    }
  }
);

const persisted = readPersistedAuth();

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: persisted?.user || null,
    token: persisted?.token || null,
    isAuthenticated: Boolean(persisted?.token),
    source: persisted?.source || null,
    status: "idle",
    error: null
  },
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
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
        state.token = action.payload.token;
        state.source = action.payload.source;
        state.isAuthenticated = true;
        persistAuth({
          user: action.payload.user,
          token: action.payload.token,
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
        state.token = action.payload.token;
        state.source = action.payload.source;
        state.isAuthenticated = true;
        persistAuth({
          user: action.payload.user,
          token: action.payload.token,
          source: action.payload.source
        });
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload || action.error.message || "Registration failed";
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
