import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

// Mock company/job data — replaced by real API when backend is wired
const MOCK_JOBS = [
  {
    _id: "J-001", company: "Google", logo: "G", logoColor: "bg-blue-500",
    role: "Software Engineer (L3)", ctc: "3200000", location: "Bangalore / Remote",
    requiredSkills: ["Data Structures & Algorithms", "System Design", "Python", "Go"],
    minReadiness: 80, openings: 5, deadline: "2026-08-15",
    description: "Build and scale Google's core infrastructure. Strong DSA and system design required.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-002", company: "Microsoft", logo: "M", logoColor: "bg-green-600",
    role: "Frontend Engineer", ctc: "2800000", location: "Hyderabad",
    requiredSkills: ["React", "TypeScript", "CSS/Tailwind", "Testing"],
    minReadiness: 75, openings: 8, deadline: "2026-08-20",
    description: "Join the Azure Portal team building world-class web experiences.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-003", company: "Flipkart", logo: "F", logoColor: "bg-yellow-500",
    role: "Backend Engineer", ctc: "2200000", location: "Bangalore",
    requiredSkills: ["Node.js", "SQL", "System Design", "Docker"],
    minReadiness: 70, openings: 12, deadline: "2026-09-01",
    description: "Scale Flipkart's commerce platform to handle millions of transactions.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-004", company: "Razorpay", logo: "R", logoColor: "bg-indigo-600",
    role: "Full Stack Developer", ctc: "1800000", location: "Bangalore / Remote",
    requiredSkills: ["React", "Node.js", "PostgreSQL", "REST APIs"],
    minReadiness: 65, openings: 6, deadline: "2026-09-10",
    description: "Build payment infrastructure used by 8M+ businesses across India.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-005", company: "Swiggy", logo: "S", logoColor: "bg-orange-500",
    role: "Data Engineer", ctc: "1600000", location: "Bangalore",
    requiredSkills: ["Python", "SQL", "Spark", "Data Visualization"],
    minReadiness: 60, openings: 4, deadline: "2026-09-15",
    description: "Build data pipelines that power Swiggy's real-time analytics.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-006", company: "Zepto", logo: "Z", logoColor: "bg-purple-600",
    role: "Mobile Developer (React Native)", ctc: "1400000", location: "Mumbai",
    requiredSkills: ["React Native", "JavaScript", "REST APIs", "Git"],
    minReadiness: 60, openings: 3, deadline: "2026-09-20",
    description: "Build the Zepto app used by millions for 10-minute grocery delivery.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-007", company: "CRED", logo: "C", logoColor: "bg-gray-800",
    role: "DevOps Engineer", ctc: "2000000", location: "Bangalore",
    requiredSkills: ["Docker", "Kubernetes", "CI/CD", "AWS/GCP/Azure"],
    minReadiness: 72, openings: 2, deadline: "2026-08-30",
    description: "Own CRED's cloud infrastructure and deployment pipelines.",
    type: "full-time", status: "open",
  },
  {
    _id: "J-008", company: "Meesho", logo: "M", logoColor: "bg-pink-500",
    role: "ML Engineer", ctc: "2400000", location: "Bangalore / Remote",
    requiredSkills: ["Python", "Machine Learning", "SQL", "Data Structures & Algorithms"],
    minReadiness: 75, openings: 3, deadline: "2026-09-05",
    description: "Build recommendation and ranking models for 140M+ users.",
    type: "full-time", status: "open",
  },
];

export const fetchJobs = createAsyncThunk("jobs/fetchJobs", async (_, { rejectWithValue }) => {
  try {
    const data = await apiClient.get("/api/jobs");
    const jobs = data?.data ?? data;
    if (!Array.isArray(jobs) || jobs.length === 0) return { jobs: MOCK_JOBS, source: "mock" };
    return { jobs, source: "api" };
  } catch {
    return { jobs: MOCK_JOBS, source: "mock" };
  }
});

export const applyToJob = createAsyncThunk("jobs/apply", async ({ jobId, coverNote }, { rejectWithValue }) => {
  try {
    const data = await apiClient.post(`/api/jobs/${jobId}/apply`, { coverNote });
    return { jobId, application: data?.data ?? { jobId, status: "applied", appliedAt: new Date().toISOString() } };
  } catch {
    // Optimistic local apply
    return { jobId, application: { jobId, status: "applied", appliedAt: new Date().toISOString() } };
  }
});

export const saveJob = createAsyncThunk("jobs/save", async (jobId, { rejectWithValue }) => {
  try {
    await apiClient.post(`/api/jobs/${jobId}/save`);
  } catch {}
  return jobId;
});

const jobsSlice = createSlice({
  name: "jobs",
  initialState: {
    jobs: [],
    applications: {},   // { [jobId]: { status, appliedAt } }
    savedJobs: [],
    status: "idle",
    source: null,
    filter: { role: "", minCTC: 0, skills: [], minReadiness: 0 },
  },
  reducers: {
    setFilter(state, action) {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter(state) {
      state.filter = { role: "", minCTC: 0, skills: [], minReadiness: 0 };
    },
    unsaveJob(state, action) {
      state.savedJobs = state.savedJobs.filter(id => id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchJobs.pending, (state) => { state.status = "loading"; })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.jobs = action.payload.jobs;
        state.source = action.payload.source;
      })
      .addCase(fetchJobs.rejected, (state) => {
        state.status = "succeeded";
        state.jobs = MOCK_JOBS;
        state.source = "mock";
      })
      .addCase(applyToJob.fulfilled, (state, action) => {
        state.applications[action.payload.jobId] = action.payload.application;
      })
      .addCase(saveJob.fulfilled, (state, action) => {
        if (!state.savedJobs.includes(action.payload)) state.savedJobs.push(action.payload);
      });
  },
});

export const { setFilter, clearFilter, unsaveJob } = jobsSlice.actions;
export default jobsSlice.reducer;
