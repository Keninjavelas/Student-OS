import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const mockProfile = {
  user: { _id: "demo-student-1", fullName: "Aarav Sharma", email: "aarav.sharma@studentos.com", role: "student" },
  readinessScore: 84,
  badges: ["React [Advanced]", "Python [Intermediate]", "SQL [Intermediate]"],
  dsaScore: 120
};

export const fetchStudentProfile = createAsyncThunk(
  "student/fetchStudentProfile",
  async (studentUserId, { rejectWithValue }) => {
    try {
      let userId = studentUserId;
      if (!userId) {
        const students = await apiClient.get("/api/admin/students");
        userId = students?.[0]?.user?._id;
      }
      if (!userId) {
        return { profile: mockProfile, source: "mock" };
      }
      const profile = await apiClient.get(`/api/students/profile/${userId}`);
      return { profile, source: "api" };
    } catch {
      return rejectWithValue({ profile: mockProfile, source: "mock" });
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
      });
  }
});

export default studentSlice.reducer;
