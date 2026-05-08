import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const mockProfile = {
  user: { _id: "demo-student-1", fullName: "Aarav Sharma", email: "aarav.sharma@studentos.com", role: "student" },
  readinessScore: 84,
  badges: ["React [Advanced]", "Python [Intermediate]", "SQL [Intermediate]"],
  dsaScore: 120,
  scores: { readinessScore: 84, dsaScore: 120, communicationScore: 76, overallScore: 80 },
  academicInfo: { department: "Computer Science", graduationYear: 2026, gpa: 8.5 },
  placementReadiness: { status: "ready", targetCTC: 1200000, preferredRoles: ["Frontend Developer"], preferredLocations: ["Bangalore"] },
  skillInventory: { technical: [], soft: [] },
  resumes: [],
  mockInterviews: []
};

export const fetchStudentProfile = createAsyncThunk(
  "student/fetchStudentProfile",
  async (studentUserId, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/profile");
      const profile = data?.data ?? data;
      return { profile, source: "api" };
    } catch {
      return rejectWithValue({ profile: mockProfile, source: "mock" });
    }
  }
);

export const updateStudentProfile = createAsyncThunk(
  "student/updateStudentProfile",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/profile/update", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const studentSlice = createSlice({
  name: "student",
  initialState: {
    profile: null,
    status: "idle",
    source: null,
    error: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStudentProfile.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchStudentProfile.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload.profile;
        state.source = action.payload.source;
      })
      .addCase(fetchStudentProfile.rejected, (state, action) => {
        state.status = "succeeded";
        state.profile = action.payload?.profile || mockProfile;
        state.source = action.payload?.source || "mock";
        state.error = "Backend unavailable. Showing fallback profile.";
      })
      .addCase(updateStudentProfile.fulfilled, (state, action) => {
        if (action.payload) state.profile = action.payload;
      });
  }
});

export default studentSlice.reducer;
