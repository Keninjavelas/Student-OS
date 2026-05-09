import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { apiClient } from "../../services/apiClient";

// ─── XP table ────────────────────────────────────────────────────────────────
// Every meaningful action awards XP. Levels gate titles and perks.
export const XP_AWARDS = {
  SKILL_ADDED:          50,
  SKILL_TEST_PASSED:   200,
  SKILL_TEST_FAILED:    25,
  RESUME_CREATED:      100,
  RESUME_ANALYZED:      75,
  INTERVIEW_COMPLETED: 150,
  INTERVIEW_SCORE_75:  100,   // bonus when score ≥ 75
  INTERVIEW_SCORE_90:  200,   // bonus when score ≥ 90
  PROFILE_COMPLETED:   200,
  ROADMAP_MILESTONE:   250,
  DAILY_LOGIN:          20,
  STREAK_7_DAYS:       300,
  STREAK_30_DAYS:     1000,
};

export const LEVELS = [
  { level: 1,  title: "Newcomer",       minXp: 0,     color: "text-gray-500",   bg: "bg-gray-100"   },
  { level: 2,  title: "Explorer",       minXp: 200,   color: "text-blue-600",   bg: "bg-blue-50"    },
  { level: 3,  title: "Learner",        minXp: 500,   color: "text-indigo-600", bg: "bg-indigo-50"  },
  { level: 4,  title: "Practitioner",   minXp: 1000,  color: "text-violet-600", bg: "bg-violet-50"  },
  { level: 5,  title: "Skilled",        minXp: 2000,  color: "text-amber-600",  bg: "bg-amber-50"   },
  { level: 6,  title: "Proficient",     minXp: 3500,  color: "text-orange-600", bg: "bg-orange-50"  },
  { level: 7,  title: "Expert",         minXp: 5500,  color: "text-emerald-600",bg: "bg-emerald-50" },
  { level: 8,  title: "Master",         minXp: 8000,  color: "text-teal-600",   bg: "bg-teal-50"    },
  { level: 9,  title: "Elite",          minXp: 11000, color: "text-rose-600",   bg: "bg-rose-50"    },
  { level: 10, title: "Placement Ready",minXp: 15000, color: "text-yellow-600", bg: "bg-yellow-50"  },
];

export const BADGE_DEFINITIONS = [
  { id: "first_skill",      name: "First Step",        icon: "🌱", desc: "Added your first skill",                  xp: 50  },
  { id: "skill_5",          name: "Skill Builder",     icon: "🔧", desc: "Added 5 technical skills",               xp: 100 },
  { id: "skill_10",         name: "Polyglot",          icon: "🌐", desc: "Added 10 technical skills",              xp: 200 },
  { id: "first_test",       name: "Test Taker",        icon: "📝", desc: "Completed your first skill test",        xp: 75  },
  { id: "test_pass",        name: "Certified",         icon: "🏅", desc: "Passed a skill assessment",              xp: 200 },
  { id: "test_3",           name: "Triple Certified",  icon: "🥉", desc: "Passed 3 skill assessments",             xp: 400 },
  { id: "first_resume",     name: "Resume Ready",      icon: "📄", desc: "Created your first resume",              xp: 100 },
  { id: "resume_score_75",  name: "Strong Resume",     icon: "⭐", desc: "Achieved resume AI score ≥ 75",          xp: 200 },
  { id: "first_interview",  name: "Interviewer",       icon: "🎤", desc: "Completed your first mock interview",    xp: 150 },
  { id: "interview_75",     name: "Sharp Communicator",icon: "💬", desc: "Scored ≥ 75 in a mock interview",        xp: 300 },
  { id: "interview_5",      name: "Interview Pro",     icon: "🎯", desc: "Completed 5 mock interviews",            xp: 500 },
  { id: "streak_7",         name: "Week Warrior",      icon: "🔥", desc: "7-day activity streak",                  xp: 300 },
  { id: "streak_30",        name: "Consistency King",  icon: "👑", desc: "30-day activity streak",                 xp: 1000},
  { id: "readiness_80",     name: "Placement Ready",   icon: "🚀", desc: "Achieved readiness score ≥ 80",          xp: 500 },
  { id: "roadmap_complete", name: "Roadmap Finisher",  icon: "🗺️", desc: "Completed all roadmap phases",           xp: 1000},
  { id: "level_5",          name: "Skilled",           icon: "⚡", desc: "Reached Level 5",                        xp: 0   },
  { id: "level_10",         name: "Elite",             icon: "💎", desc: "Reached Level 10",                       xp: 0   },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function getLevelForXp(xp) {
  let current = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
    else break;
  }
  return current;
}

export function getNextLevel(xp) {
  const idx = LEVELS.findIndex(l => xp < l.minXp);
  return idx === -1 ? null : LEVELS[idx];
}

export function xpToNextLevel(xp) {
  const next = getNextLevel(xp);
  if (!next) return 0;
  const current = getLevelForXp(xp);
  return next.minXp - current.minXp;
}

export function xpProgressInLevel(xp) {
  const next = getNextLevel(xp);
  if (!next) return 100;
  const current = getLevelForXp(xp);
  const earned = xp - current.minXp;
  const needed = next.minXp - current.minXp;
  return Math.round((earned / needed) * 100);
}

// ─── Thunks ──────────────────────────────────────────────────────────────────
export const fetchGamification = createAsyncThunk(
  "gamification/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const data = await apiClient.get("/api/students/gamification");
      return data?.data ?? data;
    } catch {
      return rejectWithValue(null); // use local state
    }
  }
);

export const syncGamification = createAsyncThunk(
  "gamification/sync",
  async (payload, { rejectWithValue }) => {
    try {
      await apiClient.post("/api/students/gamification/sync", payload);
    } catch {
      // silent — local state is source of truth
    }
  }
);

// ─── Persisted local state ────────────────────────────────────────────────────
const STORAGE_KEY = "student-os-gamification";

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      xp: state.xp,
      earnedBadgeIds: state.earnedBadgeIds,
      activityLog: state.activityLog.slice(-50), // keep last 50
      streak: state.streak,
      lastActiveDate: state.lastActiveDate,
      completedMilestones: state.completedMilestones,
    }));
  } catch {}
}

const persisted = loadState();

const initialState = {
  xp: persisted?.xp ?? 0,
  earnedBadgeIds: persisted?.earnedBadgeIds ?? [],
  activityLog: persisted?.activityLog ?? [],
  streak: persisted?.streak ?? 0,
  lastActiveDate: persisted?.lastActiveDate ?? null,
  completedMilestones: persisted?.completedMilestones ?? [],
  // leaderboard
  leaderboard: [],
  leaderboardStatus: "idle",
  // newly earned (for toast notifications)
  newBadges: [],
  newXp: 0,
};

// ─── Slice ────────────────────────────────────────────────────────────────────
const gamificationSlice = createSlice({
  name: "gamification",
  initialState,
  reducers: {
    awardXp(state, action) {
      const { amount, reason, badgeCheck } = action.payload;
      state.xp += amount;
      state.newXp = amount;
      state.activityLog.unshift({
        id: Date.now(),
        xp: amount,
        reason,
        timestamp: new Date().toISOString(),
      });

      // Check badge unlocks
      if (badgeCheck) {
        const toCheck = Array.isArray(badgeCheck) ? badgeCheck : [badgeCheck];
        for (const badgeId of toCheck) {
          if (!state.earnedBadgeIds.includes(badgeId)) {
            const def = BADGE_DEFINITIONS.find(b => b.id === badgeId);
            if (def) {
              state.earnedBadgeIds.push(badgeId);
              state.newBadges.push(def);
              if (def.xp > 0) state.xp += def.xp;
            }
          }
        }
      }

      // Level badge checks
      const level = getLevelForXp(state.xp);
      if (level.level >= 5 && !state.earnedBadgeIds.includes("level_5")) {
        state.earnedBadgeIds.push("level_5");
        state.newBadges.push(BADGE_DEFINITIONS.find(b => b.id === "level_5"));
      }
      if (level.level >= 10 && !state.earnedBadgeIds.includes("level_10")) {
        state.earnedBadgeIds.push("level_10");
        state.newBadges.push(BADGE_DEFINITIONS.find(b => b.id === "level_10"));
      }

      saveState(state);
    },

    recordActivity(state, action) {
      const today = new Date().toDateString();
      if (state.lastActiveDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        state.streak = state.lastActiveDate === yesterday ? state.streak + 1 : 1;
        state.lastActiveDate = today;
        // streak badges
        if (state.streak >= 7 && !state.earnedBadgeIds.includes("streak_7")) {
          state.earnedBadgeIds.push("streak_7");
          const def = BADGE_DEFINITIONS.find(b => b.id === "streak_7");
          state.newBadges.push(def);
          state.xp += def.xp;
        }
        if (state.streak >= 30 && !state.earnedBadgeIds.includes("streak_30")) {
          state.earnedBadgeIds.push("streak_30");
          const def = BADGE_DEFINITIONS.find(b => b.id === "streak_30");
          state.newBadges.push(def);
          state.xp += def.xp;
        }
        saveState(state);
      }
    },

    completeMilestone(state, action) {
      const milestoneId = action.payload;
      if (!state.completedMilestones.includes(milestoneId)) {
        state.completedMilestones.push(milestoneId);
        saveState(state);
      }
    },

    clearNewNotifications(state) {
      state.newBadges = [];
      state.newXp = 0;
    },

    setLeaderboard(state, action) {
      state.leaderboard = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGamification.fulfilled, (state, action) => {
        if (action.payload) {
          // Merge server state — server wins on XP if higher
          if (action.payload.xp > state.xp) state.xp = action.payload.xp;
          const serverBadges = action.payload.earnedBadgeIds ?? [];
          for (const id of serverBadges) {
            if (!state.earnedBadgeIds.includes(id)) state.earnedBadgeIds.push(id);
          }
          saveState(state);
        }
      });
  },
});

export const {
  awardXp,
  recordActivity,
  completeMilestone,
  clearNewNotifications,
  setLeaderboard,
} = gamificationSlice.actions;

export default gamificationSlice.reducer;
