import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import studentReducer from "./slices/studentSlice";
import adminReducer from "./slices/adminSlice";
import resumeReducer from "./slices/resumeSlice";
import skillsReducer from "./slices/skillsSlice";
import settingsReducer from "./slices/settingsSlice";
import interviewReducer from "./slices/interviewSlice";
import gamificationReducer from "./slices/gamificationSlice";
import roadmapReducer from "./slices/roadmapSlice";
import notificationReducer from "./slices/notificationSlice";
import jobsReducer from "./slices/jobsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    student: studentReducer,
    admin: adminReducer,
    resume: resumeReducer,
    skills: skillsReducer,
    settings: settingsReducer,
    interview: interviewReducer,
    gamification: gamificationReducer,
    roadmap: roadmapReducer,
    notifications: notificationReducer,
    jobs: jobsReducer,
  }
});
