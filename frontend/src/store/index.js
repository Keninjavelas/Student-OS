import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import studentReducer from "./slices/studentSlice";
import adminReducer from "./slices/adminSlice";
import resumeReducer from "./slices/resumeSlice";
import skillsReducer from "./slices/skillsSlice";
import settingsReducer from "./slices/settingsSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    student: studentReducer,
    admin: adminReducer,
    resume: resumeReducer,
    skills: skillsReducer,
    settings: settingsReducer
  }
});
