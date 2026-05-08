import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

const mockInterviews = [
  {
    _id: "iv-001",
    title: "Frontend Technical Round",
    type: "technical",
    difficulty: "medium",
    status: "completed",
    scheduledAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 3 + 3600000).toISOString(),
    questions: [
      { questionText: "Explain the virtual DOM and reconciliation in React.", questionType: "technical" },
      { questionText: "How would you optimize a slow React component?", questionType: "technical" },
      { questionText: "Describe a challenging project you built.", questionType: "behavioral" }
    ],
    responses: [],
    feedback: {
      overallScore: 78,
      communicationScore: 82,
      technicalScore: 74,
      analyticalScore: 70,
      timeManagement: "Good",
      strengths: ["Clear communication", "Good React knowledge"],
      areasForImprovement: ["Deepen system design understanding"],
      detailedFeedback: "Strong frontend fundamentals with room to grow in architecture."
    }
  }
];

export const fetchInterviews = createAsyncThunk(
  "interview/fetchInterviews",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/mock-interviews");
      const interviews = data?.data ?? data;
      return { interviews: Array.isArray(interviews) ? interviews : mockInterviews, source: "api" };
    } catch {
      return { interviews: mockInterviews, source: "mock" };
    }
  }
);

export const createInterview = createAsyncThunk(
  "interview/createInterview",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/mock-interviews", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const startInterview = createAsyncThunk(
  "interview/startInterview",
  async (interviewId, { rejectWithValue }) => {
    try {
      const data = await apiClient.post(`/api/students/mock-interviews/${interviewId}/start`);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const submitInterview = createAsyncThunk(
  "interview/submitInterview",
  async ({ interviewId, responses }, { rejectWithValue }) => {
    try {
      const data = await apiClient.post(`/api/students/mock-interviews/${interviewId}/submit`, { responses });
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchInterviewFeedback = createAsyncThunk(
  "interview/fetchInterviewFeedback",
  async ({ interviewId, type, questions, responses, timeTaken }, { rejectWithValue }) => {
    try {
      const data = await apiClient.post(`/api/students/mock-interviews/${interviewId}/ai-feedback`, {
        type,
        questions,
        responses,
        timeTaken
      });
      return { interviewId, feedback: data?.data ?? data };
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const interviewSlice = createSlice({
  name: "interview",
  initialState: {
    interviews: [],
    activeInterview: null,
    status: "idle",
    submitStatus: "idle",
    feedbackStatus: "idle",
    source: null,
    error: null
  },
  reducers: {
    setActiveInterview(state, action) {
      state.activeInterview = action.payload;
    },
    clearActiveInterview(state) {
      state.activeInterview = null;
      state.submitStatus = "idle";
      state.feedbackStatus = "idle";
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchInterviews.pending, (state) => { state.status = "loading"; })
      .addCase(fetchInterviews.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.interviews = action.payload.interviews;
        state.source = action.payload.source;
      })
      .addCase(fetchInterviews.rejected, (state) => {
        state.status = "succeeded";
        state.interviews = mockInterviews;
        state.source = "mock";
      })
      .addCase(createInterview.fulfilled, (state, action) => {
        if (action.payload) state.interviews.unshift(action.payload);
      })
      .addCase(startInterview.fulfilled, (state, action) => {
        if (action.payload) {
          const idx = state.interviews.findIndex(i => i._id === action.payload._id);
          if (idx !== -1) state.interviews[idx] = action.payload;
          state.activeInterview = action.payload;
        }
      })
      .addCase(submitInterview.pending, (state) => { state.submitStatus = "loading"; })
      .addCase(submitInterview.fulfilled, (state, action) => {
        state.submitStatus = "succeeded";
        if (action.payload) {
          const idx = state.interviews.findIndex(i => i._id === action.payload._id);
          if (idx !== -1) state.interviews[idx] = action.payload;
          state.activeInterview = action.payload;
        }
      })
      .addCase(submitInterview.rejected, (state, action) => {
        state.submitStatus = "failed";
        state.error = action.payload;
      })
      .addCase(fetchInterviewFeedback.pending, (state) => { state.feedbackStatus = "loading"; })
      .addCase(fetchInterviewFeedback.fulfilled, (state, action) => {
        state.feedbackStatus = "succeeded";
        const { interviewId, feedback } = action.payload;
        const idx = state.interviews.findIndex(i => i._id === interviewId);
        if (idx !== -1) state.interviews[idx].feedback = feedback;
        if (state.activeInterview?._id === interviewId) {
          state.activeInterview.feedback = feedback;
        }
      })
      .addCase(fetchInterviewFeedback.rejected, (state, action) => {
        state.feedbackStatus = "failed";
        state.error = action.payload;
      });
  }
});

export const { setActiveInterview, clearActiveInterview } = interviewSlice.actions;
export default interviewSlice.reducer;
