import { createSlice } from "@reduxjs/toolkit";

const initialTests = [
  { id: "dsa", attempts: 2 },
  { id: "frontend", attempts: 1 },
  { id: "backend", attempts: 0 },
  { id: "sql", attempts: 3 }
];

const skillsSlice = createSlice({
  name: "skills",
  initialState: {
    tests: initialTests
  },
  reducers: {
    incrementAttempt(state, action) {
      state.tests = state.tests.map((test) =>
        test.id === action.payload ? { ...test, attempts: test.attempts + 1 } : test
      );
    }
  }
});

export const { incrementAttempt } = skillsSlice.actions;
export default skillsSlice.reducer;
