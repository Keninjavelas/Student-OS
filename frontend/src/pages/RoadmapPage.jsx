import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  fetchRoadmap,
  fetchSkillRecommendations,
  fetchPlacementPrediction,
  setTargetRole,
  clearRoadmap,
} from "../store/slices/roadmapSlice";
import { completeMilestone, awardXp, XP_AWARDS } from "../store/slices/gamificationSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Toast from "../components/ui/Toast";

const ROLE_OPTIONS = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Data Engineer",
  "DevOps Engineer",
  "Mobile Developer",
  "Machine Learning Engineer",
];

const PHASE_COLORS = {
  completed: { ring: "ring-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  active:    { ring: "ring-indigo-400",  bg: "bg-indigo-50 dark:bg-indigo-950/30",   dot: "bg-indigo-500",  text: "text-indigo-700 dark:text-indigo-300"  },
  upcoming:  { ring: "ring-gray-200",    bg: "bg-gray-50 dark:bg-gray-800/50",        dot: "bg-gray-300",    text: "text-gray-500 dark:text-gray-400"      },
};

const PRIORITY_COLORS = { high: "emerald", medium: "amber", low: "slate" };

function ProbabilityGauge({ probability }) {
  const pct = Math.round(probability * 100);
  const color = pct >= 75 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  const r = 52, stroke = 10, nr = r - stroke / 2;
  const circ = nr * 2 * Math.PI;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={r * 2} width={r * 2} className="-rotate-90">
        <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke} r={nr} cx={r} cy={r} />
        <circle stroke={color} fill="transparent" strokeLinecap="round" strokeWidth={stroke}
          strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: offset }} r={nr} cx={r} cy={r} />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{pct}%</p>
        <p className="text-xs text-gray-500">chance</p>
      </div>
    </div>
  );
}

function PhaseCard({ phase, index, completedMilestones, onCompleteMilestone }) {
  const colors = PHASE_COLORS[phase.status] ?? PHASE_COLORS.upcoming;
  const [expanded, setExpanded] = useState(phase.status === "active");

  return (
    <div className={`rounded-xl ring-2 ${colors.ring} ${colors.bg} p-5 transition-all`}>
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-1 h-3 w-3 shrink-0 rounded-full ${colors.dot}`} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Phase {index + 1}</span>
              <span className={`text-xs font-semibold uppercase tracking-wide ${colors.text}`}>
                {phase.status === "completed" ? "✓ Done" : phase.status === "active" ? "In Progress" : "Upcoming"}
              </span>
            </div>
            <h3 className="mt-0.5 text-base font-semibold text-gray-900 dark:text-gray-100">{phase.title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{phase.description}</p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-gray-400">Weeks {phase.start_week}–{phase.end_week}</p>
          <p className="text-xs text-gray-400">{phase.duration_weeks}w</p>
          <span className="text-sm text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 border-t border-gray-200/60 pt-4 dark:border-gray-700/40">
          {/* Skills */}
          {phase.skills?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Skills to Learn</p>
              <div className="flex flex-wrap gap-1.5">
                {phase.skills.map(s => (
                  <span key={s} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Milestones */}
          {phase.milestones?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Milestones</p>
              <div className="space-y-2">
                {phase.milestones.map(m => {
                  const done = completedMilestones.includes(m.id);
                  return (
                    <div key={m.id} className={`flex items-center justify-between rounded-lg px-3 py-2 ${done ? "bg-emerald-100/60 dark:bg-emerald-900/20" : "bg-white/70 dark:bg-gray-800/60"}`}>
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${done ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                          {done ? "✓ " : ""}{m.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-indigo-600">+{m.xp} XP</span>
                        {!done && phase.status !== "upcoming" && (
                          <button
                            type="button"
                            onClick={() => onCompleteMilestone(m.id, m.xp)}
                            className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-indigo-700"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resources */}
          {phase.resources?.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Resources</p>
              <div className="flex flex-wrap gap-1.5">
                {phase.resources.map(r => (
                  <span key={r} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">{r}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RoadmapPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profile } = useSelector(s => s.student);
  const { roadmap, roadmapStatus, roadmapError, skillRecs, skillRecsStatus, placement, placementStatus, targetRole } = useSelector(s => s.roadmap);
  const { completedMilestones } = useSelector(s => s.gamification);
  const [role, setRole] = useState(targetRole || profile?.placementReadiness?.preferredRoles?.[0] || "");
  const [activeTab, setActiveTab] = useState("roadmap");
  const [toast, setToast] = useState("");

  const skills = profile?.skillInventory?.technical?.map(s => s.skillName) ?? [];
  const readiness = profile?.scores?.readinessScore ?? profile?.readinessScore ?? 50;
  const gradMonths = profile?.academicInfo?.graduationYear
    ? Math.max(0, (profile.academicInfo.graduationYear - new Date().getFullYear()) * 12)
    : 12;

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  function handleGenerate() {
    if (!role.trim()) return;
    dispatch(setTargetRole(role));
    dispatch(fetchRoadmap({
      current_skills: skills,
      target_role: role,
      readiness_score: readiness,
      graduation_months_away: gradMonths,
      weak_areas: [],
      completed_milestones: completedMilestones,
    }));
    dispatch(fetchSkillRecommendations({
      current_skills: skills,
      target_role: role,
      readiness_score: readiness,
    }));
    dispatch(fetchPlacementPrediction({
      readiness_score: readiness,
      skills_count: skills.length,
      advanced_skills_count: profile?.skillInventory?.technical?.filter(s => s.proficiencyLevel === "advanced" || s.proficiencyLevel === "expert").length ?? 0,
      resumes_count: profile?.resumes?.length ?? 0,
      interviews_completed: profile?.mockInterviews?.filter(i => i.status === "completed").length ?? 0,
      avg_interview_score: (() => {
        const done = profile?.mockInterviews?.filter(i => i.status === "completed") ?? [];
        return done.length > 0 ? done.reduce((s, i) => s + (i.feedback?.overallScore ?? 0), 0) / done.length : 0;
      })(),
      tests_passed: Object.values({}).filter(r => r?.isPassed).length,
      graduation_months_away: gradMonths,
      target_ctc: profile?.placementReadiness?.targetCTC ?? 0,
    }));
  }

  function handleCompleteMilestone(milestoneId, xp) {
    dispatch(completeMilestone(milestoneId));
    dispatch(awardXp({ amount: xp, reason: `Completed roadmap milestone`, badgeCheck: "roadmap_complete" }));
    showToast(`+${xp} XP — Milestone completed!`);
  }

  const totalMilestones = roadmap?.phases?.flatMap(p => p.milestones ?? []).length ?? 0;
  const doneMilestones = roadmap?.phases?.flatMap(p => p.milestones ?? []).filter(m => completedMilestones.includes(m.id)).length ?? 0;
  const overallProgress = totalMilestones > 0 ? Math.round((doneMilestones / totalMilestones) * 100) : 0;

  return (
    <section className="space-y-6">
      <Toast message={toast} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Learning Roadmap</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Personalised placement roadmap with milestones, skill gaps, and placement prediction.
            </p>
          </div>
          <div className="flex gap-2">
            {["roadmap", "skills", "placement"].map(t => (
              <button key={t} type="button"
                onClick={() => setActiveTab(t)}
                className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${activeTab === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}
              >
                {t === "skills" ? "Skill Gaps" : t === "placement" ? "Placement" : "Roadmap"}
              </button>
            ))}
          </div>
        </div>

        {/* Role selector */}
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Role</label>
            <div className="mt-1 flex gap-2">
              <input
                value={role}
                onChange={e => setRole(e.target.value)}
                placeholder="e.g. Frontend Developer"
                list="role-options"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <datalist id="role-options">
                {ROLE_OPTIONS.map(r => <option key={r} value={r} />)}
              </datalist>
            </div>
          </div>
          <Button onClick={handleGenerate} disabled={!role.trim() || roadmapStatus === "loading"}>
            {roadmapStatus === "loading" ? "Generating..." : roadmap ? "Regenerate" : "Generate Roadmap"}
          </Button>
          {roadmap && <Button variant="secondary" onClick={() => dispatch(clearRoadmap())}>Clear</Button>}
        </div>
      </Card>

      {/* ── ROADMAP TAB ── */}
      {activeTab === "roadmap" && (
        <>
          {roadmapStatus === "idle" && !roadmap && (
            <Card>
              <div className="py-10 text-center">
                <p className="text-4xl">🗺️</p>
                <p className="mt-3 text-lg font-semibold text-gray-700 dark:text-gray-300">No roadmap yet</p>
                <p className="mt-1 text-sm text-gray-500">Select your target role above and click Generate Roadmap.</p>
              </div>
            </Card>
          )}

          {roadmapStatus === "loading" && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          )}

          {roadmapStatus === "failed" && (
            <Card>
              <p className="text-sm text-red-600">Failed to generate roadmap. {roadmapError}</p>
            </Card>
          )}

          {roadmap && roadmapStatus !== "loading" && (
            <>
              {/* Summary bar */}
              <div className="grid gap-4 sm:grid-cols-4">
                {[
                  { label: "Target Role", value: roadmap.target_role, color: "text-indigo-600" },
                  { label: "Total Weeks", value: `${roadmap.total_weeks}w`, color: "text-gray-900 dark:text-gray-100" },
                  { label: "XP Available", value: `${roadmap.total_xp_available?.toLocaleString()} XP`, color: "text-amber-600" },
                  { label: "Progress", value: `${overallProgress}%`, color: overallProgress >= 75 ? "text-emerald-600" : "text-indigo-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Progress bar */}
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Overall Progress</p>
                  <p className="text-sm text-gray-500">{doneMilestones}/{totalMilestones} milestones</p>
                </div>
                <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                  <div className="h-3 rounded-full bg-indigo-600 transition-all" style={{ width: `${overallProgress}%` }} />
                </div>
              </Card>

              {/* AI Insights */}
              {roadmap.insights?.length > 0 && (
                <Card>
                  <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">AI Insights</p>
                  <div className="space-y-2">
                    {roadmap.insights.map((insight, i) => (
                      <div key={i} className="flex gap-2 rounded-lg bg-indigo-50 px-3 py-2 dark:bg-indigo-950/30">
                        <span className="text-indigo-500">💡</span>
                        <p className="text-sm text-indigo-800 dark:text-indigo-200">{insight}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Phases */}
              <div className="space-y-3">
                {roadmap.phases?.map((phase, i) => (
                  <PhaseCard
                    key={i}
                    phase={phase}
                    index={i}
                    completedMilestones={completedMilestones}
                    onCompleteMilestone={handleCompleteMilestone}
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── SKILL GAPS TAB ── */}
      {activeTab === "skills" && (
        <>
          {skillRecsStatus === "idle" && !skillRecs && (
            <Card>
              <div className="py-10 text-center">
                <p className="text-4xl">🔍</p>
                <p className="mt-3 text-lg font-semibold text-gray-700 dark:text-gray-300">No skill analysis yet</p>
                <p className="mt-1 text-sm text-gray-500">Generate a roadmap first to see your skill gaps.</p>
              </div>
            </Card>
          )}

          {skillRecsStatus === "loading" && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              ))}
            </div>
          )}

          {skillRecs && skillRecsStatus !== "loading" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Current Skills", value: skillRecs.current_skill_count, color: "text-indigo-600" },
                  { label: "Skill Gaps", value: skillRecs.gap_count, color: "text-amber-600" },
                  { label: "Target Role", value: skillRecs.target_role, color: "text-gray-900 dark:text-gray-100" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {skillRecs.recommendations?.map((rec, i) => (
                  <Card key={i}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{rec.skill}</h3>
                          <Badge tone={PRIORITY_COLORS[rec.priority] ?? "slate"}>{rec.priority} priority</Badge>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">{rec.reason}</p>
                        <div className="mt-2 flex flex-wrap gap-4 text-sm">
                          <span className="text-emerald-600 font-semibold">+{rec.estimated_salary_impact_pct}% salary impact</span>
                          <span className="text-gray-500">{rec.estimated_weeks_to_proficiency} weeks to proficiency</span>
                        </div>
                      </div>
                      <a
                        href={rec.resource_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                      >
                        Learn →
                      </a>
                    </div>
                    {/* ROI bar */}
                    <div className="mt-3">
                      <div className="mb-1 flex justify-between text-xs text-gray-400">
                        <span>Salary Impact</span>
                        <span>{rec.estimated_salary_impact_pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                        <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(100, rec.estimated_salary_impact_pct * 3)}%` }} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── PLACEMENT TAB ── */}
      {activeTab === "placement" && (
        <>
          {placementStatus === "idle" && !placement && (
            <Card>
              <div className="py-10 text-center">
                <p className="text-4xl">📊</p>
                <p className="mt-3 text-lg font-semibold text-gray-700 dark:text-gray-300">No prediction yet</p>
                <p className="mt-1 text-sm text-gray-500">Generate a roadmap first to see your placement prediction.</p>
              </div>
            </Card>
          )}

          {placementStatus === "loading" && (
            <div className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          )}

          {placement && placementStatus !== "loading" && (
            <>
              <div className="grid gap-6 lg:grid-cols-3">
                {/* Gauge */}
                <Card>
                  <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Placement Probability</h3>
                  <div className="flex justify-center">
                    <ProbabilityGauge probability={placement.placement_probability} />
                  </div>
                  <div className="mt-4 space-y-2 text-center">
                    <p className="text-sm text-gray-500">
                      Confidence: {Math.round(placement.confidence_interval?.lower * 100)}% – {Math.round(placement.confidence_interval?.upper * 100)}%
                    </p>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      Est. {placement.estimated_placement_months} months to placement
                    </p>
                    <div className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                      placement.readiness_tier === "high" ? "bg-emerald-100 text-emerald-700" :
                      placement.readiness_tier === "medium" ? "bg-amber-100 text-amber-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {placement.readiness_tier === "high" ? "High Readiness" : placement.readiness_tier === "medium" ? "Medium Readiness" : "Needs Work"}
                    </div>
                  </div>
                </Card>

                {/* Factors */}
                <Card>
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Factors</h3>
                  {placement.factors_helping?.length > 0 && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-600">Helping</p>
                      <ul className="space-y-1">
                        {placement.factors_helping.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-emerald-500">✓</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {placement.factors_hindering?.length > 0 && (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-500">Hindering</p>
                      <ul className="space-y-1">
                        {placement.factors_hindering.map((f, i) => (
                          <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <span className="text-red-400">✗</span>{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>

                {/* Actions */}
                <Card>
                  <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Recommended Actions</h3>
                  <ol className="space-y-2">
                    {placement.recommended_actions?.map((a, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className="shrink-0 font-bold text-indigo-600">{i + 1}.</span>{a}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-4 flex flex-col gap-2">
                    <Button onClick={() => navigate("/skills")} variant="secondary" className="w-full">Take Skill Tests</Button>
                    <Button onClick={() => navigate("/mock-interview")} className="w-full">Practice Interviews</Button>
                  </div>
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default RoadmapPage;
