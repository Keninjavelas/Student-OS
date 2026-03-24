import { createSlice } from "@reduxjs/toolkit";

const resumeSlice = createSlice({
  name: "resume",
  initialState: {
    atsScore: 78,
    lastAnalyzedAt: null
  },
  reducers: {
    setResumeAnalysis(state, action) {
      state.atsScore = action.payload.atsScore;
      state.lastAnalyzedAt = new Date().toISOString();
    }
  }
});

export const { setResumeAnalysis } = resumeSlice.actions;
export default resumeSlice.reducer;
