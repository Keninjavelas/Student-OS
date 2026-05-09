import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

export const fetchRoadmap = createAsyncThunk(
  "roadmap/fetch",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/ai/roadmap", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchSkillRecommendations = createAsyncThunk(
  "roadmap/fetchSkillRecs",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/ai/recommend-skills", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const fetchPlacementPrediction = createAsyncThunk(
  "roadmap/fetchPlacement",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/ai/predict-placement", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const roadmapSlice = createSlice({
  name: "roadmap",
  initialState: {
    roadmap: null,
    roadmapStatus: "idle",
    roadmapError: null,
    skillRecs: null,
    skillRecsStatus: "idle",
    placement: null,
    placementStatus: "idle",
    targetRole: "",
  },
  reducers: {
    setTargetRole(state, action) {
      state.targetRole = action.payload;
    },
    clearRoadmap(state) {
      state.roadmap = null;
      state.roadmapStatus = "idle";
      state.roadmapError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoadmap.pending, (state) => {
        state.roadmapStatus = "loading";
        state.roadmapError = null;
      })
      .addCase(fetchRoadmap.fulfilled, (state, action) => {
        state.roadmapStatus = "succeeded";
        state.roadmap = action.payload;
        if (action.payload?.target_role) state.targetRole = action.payload.target_role;
      })
      .addCase(fetchRoadmap.rejected, (state, action) => {
        state.roadmapStatus = "failed";
        state.roadmapError = action.payload;
      })
      .addCase(fetchSkillRecommendations.pending, (state) => { state.skillRecsStatus = "loading"; })
      .addCase(fetchSkillRecommendations.fulfilled, (state, action) => {
        state.skillRecsStatus = "succeeded";
        state.skillRecs = action.payload;
      })
      .addCase(fetchSkillRecommendations.rejected, (state) => { state.skillRecsStatus = "failed"; })
      .addCase(fetchPlacementPrediction.pending, (state) => { state.placementStatus = "loading"; })
      .addCase(fetchPlacementPrediction.fulfilled, (state, action) => {
        state.placementStatus = "succeeded";
        state.placement = action.payload;
      })
      .addCase(fetchPlacementPrediction.rejected, (state) => { state.placementStatus = "failed"; });
  },
});

export const { setTargetRole, clearRoadmap } = roadmapSlice.actions;
export default roadmapSlice.reducer;
