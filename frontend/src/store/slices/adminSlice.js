import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const mockStudents = [
  {
    _id: "S-1001",
    user: { fullName: "Aarav Sharma", email: "aarav@studentos.com" },
    gpa: 8.3,
    badges: ["React [Advanced]", "DSA [Intermediate]"],
    readinessScore: 82
  },
  {
    _id: "S-1002",
    user: { fullName: "Meera Iyer", email: "meera@studentos.com" },
    gpa: 7.8,
    badges: ["Python [Advanced]", "SQL [Intermediate]"],
    readinessScore: 76
  },
  {
    _id: "S-1003",
    user: { fullName: "Rohan Gupta", email: "rohan@studentos.com" },
    gpa: 8.9,
    badges: ["Node.js [Advanced]", "System Design [Intermediate]"],
    readinessScore: 89
  },
  {
    _id: "S-1004",
    user: { fullName: "Diya Verma", email: "diya@studentos.com" },
    gpa: 7.2,
    badges: ["Frontend [Intermediate]"],
    readinessScore: 68
  }
];

export const fetchAdminStudents = createAsyncThunk("admin/fetchAdminStudents", async (_, { rejectWithValue }) => {
  try {
    const students = await apiClient.get("/api/admin/students");
    if (!Array.isArray(students) || students.length === 0) {
      return { students: mockStudents, source: "mock" };
    }
    return { students, source: "api" };
  } catch {
    return rejectWithValue({ students: mockStudents, source: "mock" });
  }
});

const adminSlice = createSlice({
  name: "admin",
  initialState: {
    students: [],
    status: "idle",
    source: null,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminStudents.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchAdminStudents.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.students = action.payload.students;
        state.source = action.payload.source;
      })
      .addCase(fetchAdminStudents.rejected, (state, action) => {
        state.status = "succeeded";
        state.students = action.payload?.students || mockStudents;
        state.source = action.payload?.source || "mock";
        state.error = "Backend unavailable. Showing fallback analytics.";
      });
  }
});

export default adminSlice.reducer;
