import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

export const fetchResumes = createAsyncThunk(
  "resume/fetchResumes",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/resumes");
      return { resumes: data?.data ?? [], source: "api" };
    } catch {
      return { resumes: [], source: "mock" };
    }
  }
);

export const createResume = createAsyncThunk(
  "resume/createResume",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/resumes", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteResume = createAsyncThunk(
  "resume/deleteResume",
  async (resumeId, { rejectWithValue }) => {
    try {
      await apiClient.post(`/api/students/resumes/${resumeId}/delete`);
      return resumeId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const analyzeResumeAI = createAsyncThunk(
  "resume/analyzeResumeAI",
  async (resumeData, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/resumes/analyze", resumeData);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const resumeSlice = createSlice({
  name: "resume",
  initialState: {
    resumes: [],
    status: "idle",
    source: null,
    // AI analysis state
    analysis: null,
    analysisStatus: "idle",
    analysisError: null,
    // Legacy
    atsScore: 0,
    lastAnalyzedAt: null
  },
  reducers: {
    setResumeAnalysis(state, action) {
      state.atsScore = action.payload.atsScore;
      state.lastAnalyzedAt = new Date().toISOString();
    },
    clearAnalysis(state) {
      state.analysis = null;
      state.analysisStatus = "idle";
      state.analysisError = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchResumes.pending, (state) => { state.status = "loading"; })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.resumes = action.payload.resumes;
        state.source = action.payload.source;
      })
      .addCase(fetchResumes.rejected, (state) => {
        state.status = "succeeded";
        state.resumes = [];
      })
      .addCase(createResume.fulfilled, (state, action) => {
        if (action.payload) state.resumes.unshift(action.payload);
      })
      .addCase(deleteResume.fulfilled, (state, action) => {
        state.resumes = state.resumes.filter(r => r.id !== action.payload && r._id !== action.payload);
      })
      .addCase(analyzeResumeAI.pending, (state) => {
        state.analysisStatus = "loading";
        state.analysisError = null;
      })
      .addCase(analyzeResumeAI.fulfilled, (state, action) => {
        state.analysisStatus = "succeeded";
        state.analysis = action.payload;
        state.atsScore = action.payload?.score ?? state.atsScore;
        state.lastAnalyzedAt = new Date().toISOString();
      })
      .addCase(analyzeResumeAI.rejected, (state, action) => {
        state.analysisStatus = "failed";
        state.analysisError = action.payload;
      });
  }
});

export const { setResumeAnalysis, clearAnalysis } = resumeSlice.actions;
export default resumeSlice.reducer;
