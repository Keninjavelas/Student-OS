import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { fetchStudentProfile, updateStudentProfile } from "../store/slices/studentSlice";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

function ProgressRing({ score, size = 108, strokeWidth = 12 }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const r = size / 2;
  const nr = r - strokeWidth / 2;
  const circ = nr * 2 * Math.PI;
  const offset = circ - (s / 100) * circ;
  const color = s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={size} width={size} className="-rotate-90">
        <circle stroke="#e5e7eb" fill="transparent" strokeWidth={strokeWidth} r={nr} cx={r} cy={r} />
        <circle stroke={color} fill="transparent" strokeLinecap="round" strokeWidth={strokeWidth}
          strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: offset }} r={nr} cx={r} cy={r} />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900 dark:text-gray-100">{s}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Score</p>
      </div>
    </div>
  );
}

function MiniBar({ label, value, max = 100, color = "bg-indigo-500" }) {
  const pct = Math.round((Math.min(value, max) / max) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(value)}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ProfileEditModal({ profile, isOpen, onClose, onSave }) {
  const [form, setForm] = useState({
    department: profile?.academicInfo?.department ?? "",
    graduationYear: profile?.academicInfo?.graduationYear ?? "",
    gpa: profile?.academicInfo?.gpa ?? "",
    targetCTC: profile?.placementReadiness?.targetCTC ?? "",
    preferredRoles: (profile?.placementReadiness?.preferredRoles ?? []).join(", "),
    preferredLocations: (profile?.placementReadiness?.preferredLocations ?? []).join(", ")
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    await onSave({
      department: form.department,
      graduationYear: Number(form.graduationYear),
      gpa: Number(form.gpa),
      targetCTC: Number(form.targetCTC),
      preferredRoles: form.preferredRoles.split(",").map(s => s.trim()).filter(Boolean),
      preferredLocations: form.preferredLocations.split(",").map(s => s.trim()).filter(Boolean)
    });
    setSaving(false);
    onClose();
  }

  return (
    <Modal isOpen={isOpen} title="Edit Profile" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          ["department", "Department", "text", "e.g. Computer Science"],
          ["graduationYear", "Graduation Year", "number", "e.g. 2026"],
          ["gpa", "GPA (out of 10)", "number", "e.g. 8.5"],
          ["targetCTC", "Target CTC (₹)", "number", "e.g. 1200000"],
          ["preferredRoles", "Preferred Roles", "text", "Frontend Dev, Full Stack Dev"],
          ["preferredLocations", "Preferred Locations", "text", "Bangalore, Hyderabad"]
        ].map(([field, label, type, placeholder]) => (
          <label key={field} className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            <input
              type={type}
              value={form[field]}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              placeholder={placeholder}
              step={type === "number" ? "any" : undefined}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        ))}
        <div className="flex gap-2 pt-1">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" disabled={saving} className="flex-1">{saving ? "Saving..." : "Save Changes"}</Button>
        </div>
      </form>
    </Modal>
  );
}

function StudentDashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { profile, status, source } = useSelector(s => s.student);
  const { user } = useSelector(s => s.auth);
  const [showEdit, setShowEdit] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    dispatch(fetchStudentProfile(user?._id ?? user?.id));
  }, [dispatch, user?._id, user?.id]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleSaveProfile(data) {
    const result = await dispatch(updateStudentProfile(data));
    if (!result.error) showToast("Profile updated successfully.");
    else showToast("Failed to update profile.");
  }

  if (status === "loading" || !profile) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        ))}
      </div>
    );
  }

  const readinessScore = Number(profile?.readinessScore ?? profile?.scores?.readinessScore ?? 0);
  const dsaScore = Number(profile?.dsaScore ?? profile?.scores?.dsaScore ?? 0);
  const commScore = Number(profile?.scores?.communicationScore ?? 0);
  const overallScore = Number(profile?.scores?.overallScore ?? readinessScore);
  const badges = profile?.badges ?? [];
  const skills = profile?.skillInventory?.technical ?? [];
  const resumes = profile?.resumes ?? [];
  const interviews = profile?.mockInterviews ?? [];
  const placementStatus = profile?.placementReadiness?.status ?? "in-progress";
  const targetCTC = profile?.placementReadiness?.targetCTC;
  const preferredRoles = profile?.placementReadiness?.preferredRoles ?? [];
  const department = profile?.academicInfo?.department ?? "—";
  const gradYear = profile?.academicInfo?.graduationYear ?? "—";
  const gpa = profile?.academicInfo?.gpa;

  const statusColors = { "not-ready": "slate", "in-progress": "amber", ready: "emerald", placed: "indigo" };
  const completedInterviews = interviews.filter(i => i.status === "completed");
  const avgInterviewScore = completedInterviews.length > 0
    ? Math.round(completedInterviews.reduce((s, i) => s + (i.feedback?.overallScore ?? 0), 0) / completedInterviews.length)
    : null;

  const nextSteps = [];
  if (skills.length < 3) nextSteps.push({ label: "Add at least 3 technical skills", route: "/skills", cta: "Add Skills" });
  if (resumes.length === 0) nextSteps.push({ label: "Build and analyze your resume", route: "/resume", cta: "Build Resume" });
  if (completedInterviews.length === 0) nextSteps.push({ label: "Complete your first mock interview", route: "/mock-interview", cta: "Start Interview" });
  if (readinessScore < 70) nextSteps.push({ label: "Take skill assessments to boost your score", route: "/skills", cta: "Take Tests" });

  return (
    <section className="space-y-6">
      <Toast message={toast} />

      {/* Header */}
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {profile?.user?.fullName ?? profile?.user?.firstName ?? user?.firstName ?? "Student"}'s Dashboard
            </h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {profile?.user?.email ?? user?.email ?? ""}
              {department !== "—" && ` · ${department}`}
              {gradYear !== "—" && ` · Class of ${gradYear}`}
              {gpa && ` · GPA ${gpa}`}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={statusColors[placementStatus] ?? "slate"}>
                {placementStatus.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </Badge>
              {source === "mock" && <Badge tone="amber">Mock data</Badge>}
            </div>
          </div>
          <Button variant="secondary" onClick={() => setShowEdit(true)}>Edit Profile</Button>
        </div>
      </Card>

      {/* Score cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Readiness gauge */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Placement Readiness</h3>
          <p className="mt-1 text-sm text-gray-500">AI-powered score based on your full profile</p>
          <div className="mt-5 flex justify-center">
            <ProgressRing score={readinessScore} />
          </div>
          <div className="mt-5 space-y-2">
            <MiniBar label="DSA / Problem Solving" value={dsaScore} color="bg-blue-500" />
            <MiniBar label="Communication" value={commScore} color="bg-purple-500" />
            <MiniBar label="Overall" value={overallScore} color="bg-indigo-500" />
          </div>
          <div className={`mt-4 rounded-lg p-3 text-center ${readinessScore >= 80 ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
            <p className={`text-sm font-semibold ${readinessScore >= 80 ? "text-emerald-700" : "text-amber-700"}`}>
              {readinessScore >= 80 ? "✓ Placement Ready" : readinessScore >= 60 ? "In Progress" : "Needs Improvement"}
            </p>
          </div>
        </div>

        {/* Badges */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Earned Badges</h3>
          <p className="mt-1 text-sm text-gray-500">Verified capabilities from assessments</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.length > 0 ? (
              badges.map((badge, i) => (
                <span key={i} className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
                  {typeof badge === "string" ? badge : badge.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-400">No badges yet. Complete skill tests to earn them.</p>
            )}
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{badges.length}</p>
                <p className="text-xs text-gray-500">Badges</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{skills.length}</p>
                <p className="text-xs text-gray-500">Skills</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity summary */}
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Activity Summary</h3>
          <p className="mt-1 text-sm text-gray-500">Your placement journey at a glance</p>
          <div className="mt-4 space-y-3">
            {[
              { label: "Resumes Created", value: resumes.length, color: "text-indigo-600" },
              { label: "Interviews Completed", value: completedInterviews.length, color: "text-emerald-600" },
              { label: "Avg Interview Score", value: avgInterviewScore != null ? avgInterviewScore : "—", color: "text-amber-600" },
              { label: "Target CTC", value: targetCTC ? `₹${(targetCTC / 100000).toFixed(1)}L` : "Not set", color: "text-purple-600" }
            ].map(({ label, value, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                <span className={`text-sm font-bold ${color}`}>{value}</span>
              </div>
            ))}
          </div>
          {preferredRoles.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-800">
              <p className="mb-2 text-xs text-gray-500">Target Roles</p>
              <div className="flex flex-wrap gap-1.5">
                {preferredRoles.map(role => (
                  <span key={role} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{role}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Next Steps */}
      {nextSteps.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Recommended Next Steps</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {nextSteps.map((step, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 dark:border-indigo-900 dark:bg-indigo-950/30">
                <p className="text-sm text-indigo-800 dark:text-indigo-200">{step.label}</p>
                <Button onClick={() => navigate(step.route)} className="ml-3 shrink-0 text-xs px-3 py-1.5">
                  {step.cta}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <Card>
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Quick Actions</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Build Resume", desc: "Create or update your resume", route: "/resume", color: "bg-indigo-600" },
            { label: "Mock Interview", desc: "Practice with AI feedback", route: "/mock-interview", color: "bg-emerald-600" },
            { label: "Skill Tests", desc: "Verify and earn certificates", route: "/skills", color: "bg-amber-600" },
            { label: "Settings", desc: "Manage preferences", route: "/settings", color: "bg-gray-600" }
          ].map(({ label, desc, route, color }) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              className="rounded-xl border border-gray-100 p-4 text-left transition hover:shadow-md dark:border-gray-800"
            >
              <div className={`mb-2 inline-flex h-8 w-8 items-center justify-center rounded-lg ${color} text-white text-xs font-bold`}>
                {label[0]}
              </div>
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent interviews */}
      {completedInterviews.length > 0 && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">Recent Interviews</h3>
            <Button variant="secondary" onClick={() => navigate("/mock-interview")}>View All</Button>
          </div>
          <div className="space-y-2">
            {completedInterviews.slice(0, 3).map(iv => (
              <div key={iv._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{iv.title}</p>
                  <p className="text-xs text-gray-500">{iv.type} · {iv.completedAt ? new Date(iv.completedAt).toLocaleDateString() : ""}</p>
                </div>
                {iv.feedback?.overallScore != null && (
                  <span className={`text-sm font-bold ${iv.feedback.overallScore >= 75 ? "text-emerald-600" : "text-amber-600"}`}>
                    {Math.round(iv.feedback.overallScore)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <ProfileEditModal
        profile={profile}
        isOpen={showEdit}
        onClose={() => setShowEdit(false)}
        onSave={handleSaveProfile}
      />
    </section>
  );
}

export default StudentDashboard;
