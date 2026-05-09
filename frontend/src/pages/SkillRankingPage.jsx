import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  LEVELS, BADGE_DEFINITIONS, getLevelForXp, getNextLevel,
  xpProgressInLevel, awardXp, recordActivity, XP_AWARDS,
} from "../store/slices/gamificationSlice";
import { TEST_CATALOG } from "../store/slices/skillsSlice";
import { apiClient } from "../services/apiClient";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";

// Mock leaderboard — in production this comes from /api/admin/leaderboard
const MOCK_LEADERBOARD = [
  { rank: 1,  name: "Rohan Gupta",   xp: 4850, level: 5, badges: 8,  readiness: 89, dept: "CS"  },
  { rank: 2,  name: "Karan Mehta",   xp: 4200, level: 5, badges: 7,  readiness: 85, dept: "CS"  },
  { rank: 3,  name: "Aarav Sharma",  xp: 3600, level: 4, badges: 6,  readiness: 82, dept: "CS"  },
  { rank: 4,  name: "Meera Iyer",    xp: 2900, level: 4, badges: 5,  readiness: 76, dept: "IT"  },
  { rank: 5,  name: "Priya Nair",    xp: 2100, level: 3, badges: 4,  readiness: 71, dept: "IT"  },
  { rank: 6,  name: "Diya Verma",    xp: 1400, level: 3, badges: 2,  readiness: 68, dept: "ECE" },
  { rank: 7,  name: "Arjun Singh",   xp: 900,  level: 2, badges: 2,  readiness: 62, dept: "CS"  },
  { rank: 8,  name: "Sneha Patel",   xp: 550,  level: 2, badges: 1,  readiness: 58, dept: "IT"  },
  { rank: 9,  name: "Vikram Rao",    xp: 300,  level: 1, badges: 1,  readiness: 52, dept: "ECE" },
  { rank: 10, name: "Ananya Bose",   xp: 150,  level: 1, badges: 0,  readiness: 45, dept: "CS"  },
];

const RANK_MEDALS = { 1: "🥇", 2: "🥈", 3: "🥉" };

function XpBar({ xp }) {
  const level = getLevelForXp(xp);
  const next = getNextLevel(xp);
  const pct = xpProgressInLevel(xp);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className={`font-semibold ${level.color}`}>{level.title} (Lv.{level.level})</span>
        {next && <span className="text-gray-400">{xp.toLocaleString()} / {next.minXp.toLocaleString()} XP</span>}
        {!next && <span className="text-yellow-600 font-semibold">MAX LEVEL</span>}
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function BadgeGrid({ earnedIds }) {
  const earned = BADGE_DEFINITIONS.filter(b => earnedIds.includes(b.id));
  const locked = BADGE_DEFINITIONS.filter(b => !earnedIds.includes(b.id));
  return (
    <div className="space-y-4">
      {earned.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Earned ({earned.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {earned.map(b => (
              <div key={b.id} className="flex flex-col items-center rounded-xl bg-white p-3 text-center shadow-sm ring-1 ring-indigo-100 dark:bg-gray-900 dark:ring-indigo-900">
                <span className="text-3xl">{b.icon}</span>
                <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-gray-100">{b.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{b.desc}</p>
                {b.xp > 0 && <p className="mt-1 text-xs font-bold text-indigo-600">+{b.xp} XP</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      {locked.length > 0 && (
        <div>
          <p className="mb-3 text-sm font-semibold text-gray-500">Locked ({locked.length})</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {locked.map(b => (
              <div key={b.id} className="flex flex-col items-center rounded-xl bg-gray-50 p-3 text-center ring-1 ring-gray-100 dark:bg-gray-800 dark:ring-gray-700 opacity-50">
                <span className="text-3xl grayscale">{b.icon}</span>
                <p className="mt-1 text-xs font-semibold text-gray-500">{b.name}</p>
                <p className="mt-0.5 text-xs text-gray-400">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SkillRankingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { xp, earnedBadgeIds, activityLog, streak, newBadges } = useSelector(s => s.gamification);
  const { testResults } = useSelector(s => s.skills);
  const { profile } = useSelector(s => s.student);
  const { user } = useSelector(s => s.auth);
  const [tab, setTab] = useState("profile"); // profile | badges | leaderboard | activity

  const level = getLevelForXp(xp);
  const next = getNextLevel(xp);
  const pct = xpProgressInLevel(xp);

  // Record daily login
  useEffect(() => {
    dispatch(recordActivity());
  }, [dispatch]);

  // Fetch live leaderboard
  const [liveLeaderboard, setLiveLeaderboard] = useState([]);
  const [lbStatus, setLbStatus] = useState("idle");
  useEffect(() => {
    if (tab === "leaderboard") {
      setLbStatus("loading");
      apiClient.get("/api/admin/leaderboard?limit=20")
        .then(data => { setLiveLeaderboard(data?.data ?? []); setLbStatus("succeeded"); })
        .catch(() => { setLiveLeaderboard(MOCK_LEADERBOARD); setLbStatus("mock"); });
    }
  }, [tab]);

  // Build skill ranking from test results
  const skillRanking = useMemo(() => {
    return TEST_CATALOG.map(test => {
      const result = testResults[test.id];
      return {
        ...test,
        score: result?.score ?? null,
        isPassed: result?.isPassed ?? false,
        attempts: result ? 1 : 0,
        rank: result?.isPassed ? (result.score >= 90 ? "S" : result.score >= 80 ? "A" : result.score >= 70 ? "B" : "C") : null,
      };
    }).sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
  }, [testResults]);

  const passedCount = skillRanking.filter(s => s.isPassed).length;
  const avgScore = skillRanking.filter(s => s.score !== null).length > 0
    ? Math.round(skillRanking.filter(s => s.score !== null).reduce((s, t) => s + t.score, 0) / skillRanking.filter(s => s.score !== null).length)
    : 0;

  const RANK_COLORS = { S: "bg-yellow-100 text-yellow-700 ring-yellow-300", A: "bg-emerald-100 text-emerald-700 ring-emerald-300", B: "bg-indigo-100 text-indigo-700 ring-indigo-300", C: "bg-gray-100 text-gray-600 ring-gray-200" };

  return (
    <section className="space-y-6">
      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar / level badge */}
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-2xl font-bold text-white ${level.level >= 8 ? "bg-gradient-to-br from-yellow-400 to-orange-500" : level.level >= 5 ? "bg-gradient-to-br from-indigo-500 to-violet-600" : "bg-gradient-to-br from-blue-400 to-indigo-500"}`}>
              {level.level}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {profile?.user?.fullName ?? user?.firstName ?? "Student"}
              </h2>
              <p className={`text-sm font-semibold ${level.color}`}>{level.title}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                <span className="text-xs text-gray-500">{xp.toLocaleString()} XP total</span>
                {streak > 0 && <span className="text-xs font-semibold text-orange-500">🔥 {streak}-day streak</span>}
                <span className="text-xs text-gray-500">{earnedBadgeIds.length} badges</span>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-64">
            <XpBar xp={xp} />
            {next && (
              <p className="mt-1 text-xs text-gray-400 text-right">
                {(next.minXp - xp).toLocaleString()} XP to {next.title}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "profile", label: "Skill Profile" },
          { id: "badges", label: `Badges (${earnedBadgeIds.length})` },
          { id: "leaderboard", label: "Leaderboard" },
          { id: "activity", label: "Activity Log" },
        ].map(t => (
          <button key={t.id} type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === t.id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── SKILL PROFILE ── */}
      {tab === "profile" && (
        <>
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4">
            {[
              { label: "Total XP", value: xp.toLocaleString(), color: "text-indigo-600" },
              { label: "Level", value: `${level.level} — ${level.title}`, color: level.color },
              { label: "Tests Passed", value: `${passedCount}/${TEST_CATALOG.length}`, color: "text-emerald-600" },
              { label: "Avg Test Score", value: avgScore > 0 ? `${avgScore}%` : "—", color: "text-amber-600" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                <p className="text-xs text-gray-500">{label}</p>
                <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Skill ranking table */}
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Skill Rankings</h3>
              <Button variant="secondary" onClick={() => navigate("/skills")}>Take Tests</Button>
            </div>
            <div className="space-y-2">
              {skillRanking.map((skill, i) => (
                <div key={skill.id} className="flex items-center gap-3 rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800">
                  <span className="w-5 text-center text-sm font-bold text-gray-400">#{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{skill.title}</p>
                      <span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${skill.difficulty === "Advanced" ? "bg-red-100 text-red-700" : skill.difficulty === "Intermediate" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                        {skill.difficulty}
                      </span>
                    </div>
                    {skill.score !== null ? (
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className={`h-1.5 rounded-full ${skill.isPassed ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${skill.score}%` }} />
                      </div>
                    ) : (
                      <p className="mt-1 text-xs text-gray-400">Not attempted</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {skill.score !== null && (
                      <span className="text-sm font-bold text-gray-700 dark:text-gray-300">{skill.score}%</span>
                    )}
                    {skill.rank ? (
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-1 ${RANK_COLORS[skill.rank]}`}>
                        {skill.rank}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
              <p className="text-xs text-gray-500">Rank guide: <span className="font-semibold text-yellow-600">S ≥90%</span> · <span className="font-semibold text-emerald-600">A ≥80%</span> · <span className="font-semibold text-indigo-600">B ≥70%</span> · <span className="font-semibold text-gray-500">C pass</span></p>
            </div>
          </Card>

          {/* Level roadmap */}
          <Card>
            <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Level Progression</h3>
            <div className="space-y-2">
              {LEVELS.map(lvl => {
                const isCurrentLevel = lvl.level === level.level;
                const isUnlocked = xp >= lvl.minXp;
                return (
                  <div key={lvl.level} className={`flex items-center gap-3 rounded-lg px-3 py-2 ${isCurrentLevel ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/30 dark:ring-indigo-800" : ""}`}>
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isUnlocked ? lvl.bg : "bg-gray-100 dark:bg-gray-800"} ${isUnlocked ? lvl.color : "text-gray-400"}`}>
                      {lvl.level}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold ${isUnlocked ? "text-gray-900 dark:text-gray-100" : "text-gray-400"}`}>{lvl.title}</p>
                      <p className="text-xs text-gray-400">{lvl.minXp.toLocaleString()} XP required</p>
                    </div>
                    {isCurrentLevel && <Badge tone="indigo">Current</Badge>}
                    {isUnlocked && !isCurrentLevel && <span className="text-emerald-500 text-sm">✓</span>}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}

      {/* ── BADGES ── */}
      {tab === "badges" && (
        <Card>
          <BadgeGrid earnedIds={earnedBadgeIds} />
        </Card>
      )}

      {/* ── LEADERBOARD ── */}
      {tab === "leaderboard" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Campus Leaderboard</h3>
            {lbStatus === "mock" && <Badge tone="amber">Sample data</Badge>}
            {lbStatus === "succeeded" && <Badge tone="emerald">Live data</Badge>}
          </div>
          {lbStatus === "loading" ? (
            <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}</div>
          ) : (
            <div className="space-y-2">
              {(liveLeaderboard.length > 0 ? liveLeaderboard : MOCK_LEADERBOARD).map(entry => {
                const entryLevel = getLevelForXp(entry.xp ?? 0);
                const isMe = entry.name === (profile?.user?.fullName ?? `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim());
                return (
                  <div key={entry.rank} className={`flex items-center gap-3 rounded-lg px-4 py-3 ${isMe ? "bg-indigo-50 ring-1 ring-indigo-200 dark:bg-indigo-950/30" : "border border-gray-100 dark:border-gray-800"}`}>
                    <span className="w-8 text-center text-lg">
                      {RANK_MEDALS[entry.rank] ?? <span className="text-sm font-bold text-gray-400">#{entry.rank}</span>}
                    </span>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{entry.name}</p>
                        {isMe && <Badge tone="indigo">You</Badge>}
                        <span className="text-xs text-gray-400">{entry.dept}</span>
                      </div>
                      <p className={`text-xs font-semibold ${entryLevel.color}`}>{entryLevel.title} · Lv.{entryLevel.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-indigo-600">{(entry.xp ?? 0).toLocaleString()} XP</p>
                      <p className="text-xs text-gray-400">{entry.badges} badges · {entry.readiness} readiness</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── ACTIVITY LOG ── */}
      {tab === "activity" && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">XP Activity Log</h3>
          {activityLog.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-gray-400">No activity yet. Complete actions to earn XP.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activityLog.map(entry => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-2.5 dark:border-gray-800">
                  <div>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{entry.reason}</p>
                    <p className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleString()}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">+{entry.xp} XP</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </section>
  );
}

export default SkillRankingPage;
