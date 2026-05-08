import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const mockStudents = [
  {
    _id: "S-1001",
    user: { fullName: "Aarav Sharma", email: "aarav@studentos.com" },
    gpa: 8.3,
    badges: ["React [Advanced]", "DSA [Intermediate]"],
    readinessScore: 82,
    academicInfo: { department: "Computer Science", graduationYear: 2025 },
    placementReadiness: { status: "ready", targetCTC: 1200000 },
    scores: { readinessScore: 82, dsaScore: 74, communicationScore: 80 }
  },
  {
    _id: "S-1002",
    user: { fullName: "Meera Iyer", email: "meera@studentos.com" },
    gpa: 7.8,
    badges: ["Python [Advanced]", "SQL [Intermediate]"],
    readinessScore: 76,
    academicInfo: { department: "Information Technology", graduationYear: 2025 },
    placementReadiness: { status: "in-progress", targetCTC: 900000 },
    scores: { readinessScore: 76, dsaScore: 65, communicationScore: 72 }
  },
  {
    _id: "S-1003",
    user: { fullName: "Rohan Gupta", email: "rohan@studentos.com" },
    gpa: 8.9,
    badges: ["Node.js [Advanced]", "System Design [Intermediate]"],
    readinessScore: 89,
    academicInfo: { department: "Computer Science", graduationYear: 2025 },
    placementReadiness: { status: "placed", targetCTC: 1800000 },
    scores: { readinessScore: 89, dsaScore: 88, communicationScore: 85 }
  },
  {
    _id: "S-1004",
    user: { fullName: "Diya Verma", email: "diya@studentos.com" },
    gpa: 7.2,
    badges: ["Frontend [Intermediate]"],
    readinessScore: 68,
    academicInfo: { department: "Electronics", graduationYear: 2026 },
    placementReadiness: { status: "not-ready", targetCTC: 700000 },
    scores: { readinessScore: 68, dsaScore: 55, communicationScore: 60 }
  },
  {
    _id: "S-1005",
    user: { fullName: "Karan Mehta", email: "karan@studentos.com" },
    gpa: 8.1,
    badges: ["Python [Advanced]", "DSA [Advanced]"],
    readinessScore: 85,
    academicInfo: { department: "Computer Science", graduationYear: 2025 },
    placementReadiness: { status: "ready", targetCTC: 1400000 },
    scores: { readinessScore: 85, dsaScore: 90, communicationScore: 78 }
  },
  {
    _id: "S-1006",
    user: { fullName: "Priya Nair", email: "priya@studentos.com" },
    gpa: 7.5,
    badges: ["SQL [Intermediate]"],
    readinessScore: 71,
    academicInfo: { department: "Information Technology", graduationYear: 2026 },
    placementReadiness: { status: "in-progress", targetCTC: 800000 },
    scores: { readinessScore: 71, dsaScore: 60, communicationScore: 68 }
  }
];

const mockCohortStats = [
  {
    _id: { department: "Computer Science", graduationYear: 2025 },
    totalStudents: 3,
    averageReadinessScore: 85.3,
    averageDSAScore: 84,
    placedCount: 1,
    readyCount: 2
  },
  {
    _id: { department: "Information Technology", graduationYear: 2025 },
    totalStudents: 1,
    averageReadinessScore: 76,
    averageDSAScore: 65,
    placedCount: 0,
    readyCount: 0
  },
  {
    _id: { department: "Information Technology", graduationYear: 2026 },
    totalStudents: 1,
    averageReadinessScore: 71,
    averageDSAScore: 60,
    placedCount: 0,
    readyCount: 0
  },
  {
    _id: { department: "Electronics", graduationYear: 2026 },
    totalStudents: 1,
    averageReadinessScore: 68,
    averageDSAScore: 55,
    placedCount: 0,
    readyCount: 0
  }
];

export const fetchAdminStudents = createAsyncThunk("admin/fetchAdminStudents", async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams();
    if (params.page) query.set("page", params.page);
    if (params.limit) query.set("limit", params.limit);
    if (params.department) query.set("department", params.department);
    if (params.graduationYear) query.set("graduationYear", params.graduationYear);
    if (params.status) query.set("status", params.status);
    const qs = query.toString();
    const data = await apiClient.get(`/api/admin/analytics/students${qs ? `?${qs}` : ""}`);
    const students = data?.data ?? data;
    if (!Array.isArray(students) || students.length === 0) {
      return { students: mockStudents, pagination: null, source: "mock" };
    }
    return { students, pagination: data?.pagination ?? null, source: "api" };
  } catch {
    return rejectWithValue({ students: mockStudents, pagination: null, source: "mock" });
  }
});

export const fetchCohortStats = createAsyncThunk("admin/fetchCohortStats", async (_, { rejectWithValue }) => {
  try {
    const data = await apiClient.get("/api/admin/analytics/cohort-stats");
    const stats = data?.data ?? data;
    if (!Array.isArray(stats) || stats.length === 0) {
      return { stats: mockCohortStats, source: "mock" };
    }
    return { stats, source: "api" };
  } catch {
    return rejectWithValue({ stats: mockCohortStats, source: "mock" });
  }
});

export const fetchPlacementReadiness = createAsyncThunk("admin/fetchPlacementReadiness", async (_, { rejectWithValue }) => {
  try {
    const data = await apiClient.get("/api/admin/analytics/placement-readiness");
    const trends = data?.data ?? data;
    return { trends: Array.isArray(trends) ? trends : [], source: "api" };
  } catch {
    return rejectWithValue({
      trends: [
        { _id: "placed", count: 1, averageScore: 89, averageCTC: 1800000 },
        { _id: "ready", count: 2, averageScore: 83.5, averageCTC: 1300000 },
        { _id: "in-progress", count: 2, averageScore: 73.5, averageCTC: 850000 },
        { _id: "not-ready", count: 1, averageScore: 68, averageCTC: 700000 }
      ],
      source: "mock"
    });
  }
});

export const fetchAdminUsers = createAsyncThunk("admin/fetchAdminUsers", async (_, { rejectWithValue }) => {
  try {
    const data = await apiClient.get("/api/admin/users");
    return { users: data?.data ?? [], source: "api" };
  } catch {
    return rejectWithValue({
      users: [
        { _id: "U-001", firstName: "Demo", lastName: "Student", email: "student@studentos.com", role: "student", isActive: true, isEmailVerified: true, createdAt: new Date().toISOString() },
        { _id: "U-002", firstName: "Demo", lastName: "Admin", email: "admin@studentos.com", role: "admin", isActive: true, isEmailVerified: true, createdAt: new Date().toISOString() }
      ],
      source: "mock"
    });
  }
});

export const updateUserRole = createAsyncThunk("admin/updateUserRole", async ({ userId, role }, { rejectWithValue }) => {
  try {
    const data = await apiClient.post(`/api/admin/users/${userId}/role`, { role });
    return data?.data ?? { _id: userId, role };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

export const toggleUserActive = createAsyncThunk("admin/toggleUserActive", async ({ userId, isActive }, { rejectWithValue }) => {
  try {
    const data = await apiClient.post(`/api/admin/users/${userId}/status`, { isActive });
    return data?.data ?? { _id: userId, isActive };
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    students: [],
    pagination: null,
    cohortStats: [],
    placementTrends: [],
    users: [],
    status: "idle",
    cohortStatus: "idle",
    placementStatus: "idle",
    usersStatus: "idle",
    source: null,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStudents.pending, (state) => { state.status = "loading"; state.error = null; })
      .addCase(fetchAdminStudents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.students = action.payload.students;
        state.pagination = action.payload.pagination;
        state.source = action.payload.source;
      })
      .addCase(fetchAdminStudents.rejected, (state, action) => {
        state.status = "succeeded";
        state.students = action.payload?.students || mockStudents;
        state.pagination = null;
        state.source = action.payload?.source || "mock";
        state.error = "Backend unavailable. Showing fallback analytics.";
      })
      .addCase(fetchCohortStats.pending, (state) => { state.cohortStatus = "loading"; })
      .addCase(fetchCohortStats.fulfilled, (state, action) => {
        state.cohortStatus = "succeeded";
        state.cohortStats = action.payload.stats;
      })
      .addCase(fetchCohortStats.rejected, (state, action) => {
        state.cohortStatus = "succeeded";
        state.cohortStats = action.payload?.stats || mockCohortStats;
      })
      .addCase(fetchPlacementReadiness.pending, (state) => { state.placementStatus = "loading"; })
      .addCase(fetchPlacementReadiness.fulfilled, (state, action) => {
        state.placementStatus = "succeeded";
        state.placementTrends = action.payload.trends;
      })
      .addCase(fetchPlacementReadiness.rejected, (state, action) => {
        state.placementStatus = "succeeded";
        state.placementTrends = action.payload?.trends || [];
      })
      .addCase(fetchAdminUsers.pending, (state) => { state.usersStatus = "loading"; })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.usersStatus = "succeeded";
        state.users = action.payload.users;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.usersStatus = "succeeded";
        state.users = action.payload?.users || [];
      })
      .addCase(updateUserRole.fulfilled, (state, action) => {
        const idx = state.users.findIndex(u => u._id === action.payload._id);
        if (idx !== -1) state.users[idx] = { ...state.users[idx], ...action.payload };
      })
      .addCase(toggleUserActive.fulfilled, (state, action) => {
        const idx = state.users.findIndex(u => u._id === action.payload._id);
        if (idx !== -1) state.users[idx] = { ...state.users[idx], ...action.payload };
      });
  }
});

export default adminSlice.reducer;
