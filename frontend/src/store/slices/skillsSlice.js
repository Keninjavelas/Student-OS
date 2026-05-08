import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

// Static test catalog — not from backend, these are the available assessments
export const TEST_CATALOG = [
  {
    id: "dsa",
    title: "Data Structures & Algorithms",
    skillName: "Data Structures",
    difficulty: "Intermediate",
    duration: 45,
    totalQuestions: 25,
    passingScore: 70,
    topics: ["Arrays", "Trees", "Graphs", "Dynamic Programming", "Sorting"]
  },
  {
    id: "frontend",
    title: "Frontend Development",
    skillName: "Frontend Development",
    difficulty: "Advanced",
    duration: 60,
    totalQuestions: 30,
    passingScore: 70,
    topics: ["React", "CSS", "JavaScript", "Performance", "Accessibility"]
  },
  {
    id: "backend",
    title: "Backend APIs",
    skillName: "Backend Development",
    difficulty: "Intermediate",
    duration: 50,
    totalQuestions: 28,
    passingScore: 70,
    topics: ["REST", "Auth", "Databases", "Caching", "Error Handling"]
  },
  {
    id: "sql",
    title: "SQL & Databases",
    skillName: "SQL",
    difficulty: "Beginner",
    duration: 30,
    totalQuestions: 20,
    passingScore: 65,
    topics: ["SELECT", "JOINs", "Indexes", "Aggregations", "Transactions"]
  },
  {
    id: "system-design",
    title: "System Design",
    skillName: "System Design",
    difficulty: "Advanced",
    duration: 60,
    totalQuestions: 20,
    passingScore: 65,
    topics: ["Scalability", "Load Balancing", "Caching", "Databases", "Microservices"]
  },
  {
    id: "python",
    title: "Python Programming",
    skillName: "Python",
    difficulty: "Intermediate",
    duration: 40,
    totalQuestions: 25,
    passingScore: 70,
    topics: ["OOP", "Decorators", "Generators", "Libraries", "Testing"]
  }
];

// Generate deterministic questions per test
function generateQuestions(testId, count) {
  const banks = {
    dsa: [
      { q: "What is the time complexity of binary search?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], answer: 1 },
      { q: "Which data structure uses LIFO ordering?", options: ["Queue", "Stack", "Heap", "Tree"], answer: 1 },
      { q: "What is the worst-case time complexity of quicksort?", options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"], answer: 2 },
      { q: "Which traversal visits root first?", options: ["Inorder", "Postorder", "Preorder", "Level-order"], answer: 2 },
      { q: "What is a hash collision?", options: ["Two keys map to same bucket", "Hash function fails", "Key not found", "Overflow error"], answer: 0 },
      { q: "Dijkstra's algorithm finds?", options: ["Minimum spanning tree", "Shortest path", "Topological sort", "Cycle detection"], answer: 1 },
      { q: "Dynamic programming solves problems by?", options: ["Greedy choices", "Memoization/tabulation", "Divide and conquer only", "Backtracking"], answer: 1 },
      { q: "A balanced BST has height?", options: ["O(n)", "O(log n)", "O(n²)", "O(1)"], answer: 1 },
      { q: "BFS uses which data structure?", options: ["Stack", "Queue", "Heap", "Array"], answer: 1 },
      { q: "Merge sort is?", options: ["In-place, stable", "Not in-place, stable", "In-place, unstable", "Not in-place, unstable"], answer: 1 }
    ],
    frontend: [
      { q: "React's virtual DOM purpose is?", options: ["Direct DOM manipulation", "Batch DOM updates efficiently", "Replace CSS", "Handle routing"], answer: 1 },
      { q: "useState returns?", options: ["Value only", "Setter only", "[value, setter]", "Object with value"], answer: 2 },
      { q: "useEffect with [] runs?", options: ["Every render", "Once on mount", "On unmount only", "Never"], answer: 1 },
      { q: "CSS flexbox default flex-direction is?", options: ["column", "row", "row-reverse", "column-reverse"], answer: 1 },
      { q: "Event bubbling means?", options: ["Event goes child to parent", "Event goes parent to child", "Event is cancelled", "Event loops"], answer: 0 },
      { q: "React key prop is used for?", options: ["Styling", "Reconciliation", "Event handling", "State"], answer: 1 },
      { q: "Lazy loading in React uses?", options: ["React.memo", "React.lazy + Suspense", "useCallback", "useMemo"], answer: 1 },
      { q: "CSS Grid vs Flexbox: Grid is?", options: ["1D layout", "2D layout", "Same as flexbox", "For animations"], answer: 1 },
      { q: "ARIA attributes are for?", options: ["Performance", "Accessibility", "SEO only", "Styling"], answer: 1 },
      { q: "Controlled component means?", options: ["DOM controls value", "React state controls value", "No state needed", "Ref controls value"], answer: 1 }
    ],
    backend: [
      { q: "REST PUT vs PATCH?", options: ["Same thing", "PUT replaces, PATCH updates partially", "PATCH replaces, PUT updates", "Both delete"], answer: 1 },
      { q: "JWT stands for?", options: ["Java Web Token", "JSON Web Token", "JavaScript Web Transfer", "JSON Web Transfer"], answer: 1 },
      { q: "HTTP 401 means?", options: ["Not found", "Unauthorized", "Forbidden", "Server error"], answer: 1 },
      { q: "Idempotent HTTP method?", options: ["POST", "GET", "PATCH", "DELETE"], answer: 1 },
      { q: "Rate limiting prevents?", options: ["SQL injection", "API abuse/DDoS", "XSS attacks", "CSRF"], answer: 1 },
      { q: "Connection pooling helps with?", options: ["Security", "DB connection overhead", "Caching", "Routing"], answer: 1 },
      { q: "Middleware in Express runs?", options: ["After response", "Before route handler", "Only on errors", "On startup"], answer: 1 },
      { q: "CORS is configured on?", options: ["Client", "Server", "Database", "Browser only"], answer: 1 },
      { q: "bcrypt is used for?", options: ["Encryption", "Password hashing", "Token signing", "Compression"], answer: 1 },
      { q: "HTTP 429 means?", options: ["Not found", "Too many requests", "Unauthorized", "Bad gateway"], answer: 1 }
    ],
    sql: [
      { q: "SELECT DISTINCT removes?", options: ["NULL values", "Duplicate rows", "Empty strings", "Indexes"], answer: 1 },
      { q: "INNER JOIN returns?", options: ["All rows from left", "Matching rows from both", "All rows from right", "All rows from both"], answer: 1 },
      { q: "GROUP BY is used with?", options: ["WHERE", "ORDER BY", "Aggregate functions", "DISTINCT"], answer: 2 },
      { q: "Primary key constraint ensures?", options: ["Uniqueness only", "Not null only", "Uniqueness + not null", "Foreign key"], answer: 2 },
      { q: "Index improves?", options: ["Write speed", "Read/query speed", "Storage", "Security"], answer: 1 },
      { q: "HAVING filters?", options: ["Rows before grouping", "Groups after aggregation", "Columns", "Joins"], answer: 1 },
      { q: "NULL = NULL evaluates to?", options: ["TRUE", "FALSE", "NULL", "Error"], answer: 2 },
      { q: "Transaction ACID: A stands for?", options: ["Availability", "Atomicity", "Authorization", "Aggregation"], answer: 1 }
    ],
    "system-design": [
      { q: "Horizontal scaling means?", options: ["Bigger server", "More servers", "More RAM", "Faster CPU"], answer: 1 },
      { q: "CDN is used for?", options: ["Database queries", "Static asset delivery", "Authentication", "Logging"], answer: 1 },
      { q: "CAP theorem: you can have at most?", options: ["All 3", "2 of 3", "1 of 3", "None"], answer: 1 },
      { q: "Load balancer distributes?", options: ["Database writes", "Incoming traffic", "Cache invalidation", "Logs"], answer: 1 },
      { q: "Message queue helps with?", options: ["Synchronous calls", "Async decoupling", "Database joins", "CSS"], answer: 1 },
      { q: "Sharding splits?", options: ["Application code", "Database horizontally", "Network traffic", "Cache"], answer: 1 },
      { q: "Circuit breaker pattern prevents?", options: ["Memory leaks", "Cascading failures", "SQL injection", "Race conditions"], answer: 1 },
      { q: "Eventual consistency means?", options: ["Immediate sync", "Data syncs over time", "No consistency", "Strong consistency"], answer: 1 }
    ],
    python: [
      { q: "Python list comprehension [x*2 for x in range(3)] gives?", options: ["[0,2,4]", "[1,2,3]", "[2,4,6]", "[0,1,2]"], answer: 0 },
      { q: "A Python decorator is?", options: ["A class", "A function wrapping another function", "A module", "A type hint"], answer: 1 },
      { q: "yield keyword creates?", options: ["A list", "A generator", "A coroutine", "A class"], answer: 1 },
      { q: "__init__ is called?", options: ["On class definition", "On instance creation", "On deletion", "On import"], answer: 1 },
      { q: "GIL in Python prevents?", options: ["Memory leaks", "True thread parallelism", "Import errors", "Recursion"], answer: 1 },
      { q: "dict.get(key, default) returns?", options: ["Raises KeyError", "None always", "default if key missing", "Empty string"], answer: 2 },
      { q: "with statement is used for?", options: ["Loops", "Context management", "Imports", "Decorators"], answer: 1 },
      { q: "isinstance(x, int) checks?", options: ["Value of x", "If x is int type", "If x is truthy", "If x is defined"], answer: 1 }
    ]
  };

  const bank = banks[testId] || banks.dsa;
  const questions = [];
  for (let i = 0; i < Math.min(count, bank.length); i++) {
    questions.push({ ...bank[i % bank.length], id: `${testId}-q${i}` });
  }
  return questions;
}

export const fetchSkillTests = createAsyncThunk(
  "skills/fetchSkillTests",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/skill-tests");
      return { tests: data?.data ?? [], source: "api" };
    } catch {
      return { tests: [], source: "mock" };
    }
  }
);

export const submitSkillTest = createAsyncThunk(
  "skills/submitSkillTest",
  async ({ testId, skillName, answers, questions, timeTaken }, { rejectWithValue }) => {
    const catalog = TEST_CATALOG.find(t => t.id === testId);
    const correct = answers.filter((a, i) => a === questions[i].answer).length;
    const score = Math.round((correct / questions.length) * 100);
    const isPassed = score >= (catalog?.passingScore ?? 70);

    try {
      await apiClient.post("/api/students/skill-tests", {
        skillName,
        testType: "quiz",
        score,
        percentageScore: score,
        isPassed,
        totalQuestions: questions.length,
        correctAnswers: correct,
        duration: Math.round(timeTaken / 60)
      });
    } catch {
      // store result locally even if backend fails
    }

    return { testId, score, correct, total: questions.length, isPassed, timeTaken };
  }
);

export const fetchProfileSkills = createAsyncThunk(
  "skills/fetchProfileSkills",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/skills");
      return data?.data ?? data;
    } catch {
      return { technical: [], soft: [] };
    }
  }
);

export const addProfileSkill = createAsyncThunk(
  "skills/addProfileSkill",
  async (payload, { rejectWithValue }) => {
    try {
      const data = await apiClient.post("/api/students/skills", payload);
      return data?.data ?? data;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

export const deleteProfileSkill = createAsyncThunk(
  "skills/deleteProfileSkill",
  async (skillId, { rejectWithValue }) => {
    try {
      await apiClient.post(`/api/students/skills/${skillId}/delete`);
      return skillId;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

const skillsSlice = createSlice({
  name: "skills",
  initialState: {
    // Profile skills (from backend)
    technical: [],
    soft: [],
    profileStatus: "idle",

    // Test results (local + backend)
    testResults: {},   // { [testId]: { score, isPassed, correct, total, completedAt } }
    activeTest: null,  // { testId, questions, answers, startTime }
    testStatus: "idle",

    // Legacy (kept for compat)
    tests: [
      { id: "dsa", attempts: 2 },
      { id: "frontend", attempts: 1 },
      { id: "backend", attempts: 0 },
      { id: "sql", attempts: 3 }
    ]
  },
  reducers: {
    startTest(state, action) {
      const { testId, questionCount } = action.payload;
      state.activeTest = {
        testId,
        questions: generateQuestions(testId, questionCount),
        answers: new Array(questionCount).fill(null),
        startTime: Date.now(),
        currentQuestion: 0
      };
      state.testStatus = "in-progress";
    },
    answerQuestion(state, action) {
      const { index, answer } = action.payload;
      if (state.activeTest) {
        state.activeTest.answers[index] = answer;
      }
    },
    nextQuestion(state) {
      if (state.activeTest && state.activeTest.currentQuestion < state.activeTest.questions.length - 1) {
        state.activeTest.currentQuestion += 1;
      }
    },
    prevQuestion(state) {
      if (state.activeTest && state.activeTest.currentQuestion > 0) {
        state.activeTest.currentQuestion -= 1;
      }
    },
    clearActiveTest(state) {
      state.activeTest = null;
      state.testStatus = "idle";
    },
    incrementAttempt(state, action) {
      state.tests = state.tests.map(t =>
        t.id === action.payload ? { ...t, attempts: t.attempts + 1 } : t
      );
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfileSkills.fulfilled, (state, action) => {
        state.technical = action.payload?.technical ?? [];
        state.soft = action.payload?.soft ?? [];
        state.profileStatus = "succeeded";
      })
      .addCase(addProfileSkill.fulfilled, (state, action) => {
        if (action.payload) state.technical.push(action.payload);
      })
      .addCase(deleteProfileSkill.fulfilled, (state, action) => {
        state.technical = state.technical.filter(s => s._id !== action.payload);
      })
      .addCase(submitSkillTest.pending, (state) => { state.testStatus = "submitting"; })
      .addCase(submitSkillTest.fulfilled, (state, action) => {
        const { testId, score, correct, total, isPassed, timeTaken } = action.payload;
        state.testResults[testId] = { score, correct, total, isPassed, timeTaken, completedAt: new Date().toISOString() };
        state.activeTest = null;
        state.testStatus = "completed";
        // update legacy attempts
        state.tests = state.tests.map(t =>
          t.id === testId ? { ...t, attempts: (t.attempts || 0) + 1 } : t
        );
      })
      .addCase(submitSkillTest.rejected, (state) => { state.testStatus = "failed"; });
  }
});

export const { startTest, answerQuestion, nextQuestion, prevQuestion, clearActiveTest, incrementAttempt } = skillsSlice.actions;
export default skillsSlice.reducer;
