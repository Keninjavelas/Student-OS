import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchJobs, applyToJob, saveJob, unsaveJob, setFilter, clearFilter } from "../store/slices/jobsSlice";
import { pushNotification } from "../store/slices/notificationSlice";
import { awardXp } from "../store/slices/gamificationSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

const STATUS_COLORS = { applied: "emerald", saved: "indigo", open: "slate" };

function MatchScore({ job, profile }) {
  const skills = profile?.skillInventory?.technical?.map(s => s.skillName.toLowerCase()) ?? [];
  const readiness = profile?.scores?.readinessScore ?? profile?.readinessScore ?? 0;
  const matched = job.requiredSkills.filter(s => skills.some(sk => sk.includes(s.toLowerCase()) || s.toLowerCase().includes(sk)));
  const skillMatch = job.requiredSkills.length > 0 ? Math.round((matched.length / job.requiredSkills.length) * 100) : 0;
  const readinessMatch = readiness >= job.minReadiness ? 100 : Math.round((readiness / job.minReadiness) * 100);
  const overall = Math.round((skillMatch * 0.6) + (readinessMatch * 0.4));
  const color = overall >= 75 ? "text-emerald-600" : overall >= 50 ? "text-amber-600" : "text-red-500";
  return (
    <div className="text-right">
      <p className={`text-lg font-bold ${color}`}>{overall}%</p>
      <p className="text-xs text-gray-400">match</p>
    </div>
  );
}

function JobCard({ job, profile, application, isSaved, onApply, onSave, onUnsave, onView }) {
  const ctcL = (Number(job.ctc) / 100000).toFixed(1);
  const skills = profile?.skillInventory?.technical?.map(s => s.skillName.toLowerCase()) ?? [];
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white ${job.logoColor}`}>
            {job.logo}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{job.role}</h3>
            <p className="text-sm text-gray-500">{job.company} · {job.location}</p>
          </div>
        </div>
        <MatchScore job={job} profile={profile} />
      </div>

      <p className="mt-3 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{job.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {job.requiredSkills.map(s => {
          const has = skills.some(sk => sk.includes(s.toLowerCase()) || s.toLowerCase().includes(sk));
          return (
            <span key={s} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${has ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>
              {has ? "✓ " : ""}{s}
            </span>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <span className="font-semibold text-emerald-600">₹{ctcL}L CTC</span>
        <span>{job.openings} opening{job.openings !== 1 ? "s" : ""}</span>
        <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
        <span>Min readiness: {job.minReadiness}</span>
      </div>

      <div className="mt-4 flex gap-2">
        {application ? (
          <span className="flex-1 rounded-lg bg-emerald-100 px-3 py-2 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            ✓ Applied
          </span>
        ) : (
          <Button onClick={() => onApply(job)} className="flex-1">Apply Now</Button>
        )}
        <Button variant="secondary" onClick={() => onView(job)}>Details</Button>
        <button
          type="button"
          onClick={() => isSaved ? onUnsave(job._id) : onSave(job._id)}
          className={`rounded-lg px-3 py-2 text-sm transition ${isSaved ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"}`}
          aria-label={isSaved ? "Unsave job" : "Save job"}
        >
          {isSaved ? "★" : "☆"}
        </button>
      </div>
    </div>
  );
}

function ApplyModal({ job, isOpen, onClose, onConfirm }) {
  const [note, setNote] = useState("");
  if (!job) return null;
  return (
    <Modal isOpen={isOpen} title={`Apply — ${job.role} at ${job.company}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-gray-900 dark:text-gray-100">{job.company}</span> · {job.role} · ₹{(Number(job.ctc)/100000).toFixed(1)}L
          </p>
        </div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Cover Note (optional)</span>
          <textarea
            rows={4}
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Briefly explain why you're a great fit for this role..."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </label>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => { onConfirm(job._id, note); onClose(); }} className="flex-1">Submit Application</Button>
        </div>
      </div>
    </Modal>
  );
}

function JobDetailModal({ job, profile, isOpen, onClose, onApply, application }) {
  if (!job) return null;
  const ctcL = (Number(job.ctc) / 100000).toFixed(1);
  const skills = profile?.skillInventory?.technical?.map(s => s.skillName.toLowerCase()) ?? [];
  return (
    <Modal isOpen={isOpen} title={`${job.role} — ${job.company}`} onClose={onClose}>
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="flex items-center gap-3">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white ${job.logoColor}`}>{job.logo}</div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{job.company}</p>
            <p className="text-sm text-gray-500">{job.location} · {job.type}</p>
          </div>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300">{job.description}</p>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-400">CTC</p>
            <p className="font-bold text-emerald-600">₹{ctcL}L</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-400">Openings</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">{job.openings}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-400">Min Readiness</p>
            <p className="font-bold text-indigo-600">{job.minReadiness}/100</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
            <p className="text-xs text-gray-400">Deadline</p>
            <p className="font-bold text-gray-900 dark:text-gray-100">{new Date(job.deadline).toLocaleDateString()}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Required Skills</p>
          <div className="flex flex-wrap gap-1.5">
            {job.requiredSkills.map(s => {
              const has = skills.some(sk => sk.includes(s.toLowerCase()) || s.toLowerCase().includes(sk));
              return (
                <span key={s} className={`rounded-full px-2.5 py-1 text-xs font-medium ${has ? "bg-emerald-100 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                  {has ? "✓ " : "✗ "}{s}
                </span>
              );
            })}
          </div>
        </div>
        {application ? (
          <div className="rounded-lg bg-emerald-50 p-3 text-center dark:bg-emerald-950/30">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">✓ Application submitted</p>
            <p className="text-xs text-emerald-600">{new Date(application.appliedAt).toLocaleDateString()}</p>
          </div>
        ) : (
          <Button onClick={() => { onApply(job); onClose(); }} className="w-full">Apply Now</Button>
        )}
      </div>
    </Modal>
  );
}

function JobBoardPage() {
  const dispatch = useDispatch();
  const { jobs, applications, savedJobs, status, source, filter } = useSelector(s => s.jobs);
  const { profile } = useSelector(s => s.student);
  const [applyTarget, setApplyTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [tab, setTab] = useState("all"); // all | saved | applied
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => { dispatch(fetchJobs()); }, [dispatch]);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(""), 3000); }

  async function handleApply(jobId, note) {
    await dispatch(applyToJob({ jobId, coverNote: note }));
    const job = jobs.find(j => j._id === jobId);
    dispatch(pushNotification({
      type: "success",
      title: "Application submitted!",
      message: `Your application to ${job?.company} for ${job?.role} has been sent.`,
      link: "/jobs",
    }));
    dispatch(awardXp({ amount: 50, reason: `Applied to ${job?.company}` }));
    showToast("Application submitted successfully!");
  }

  const readiness = profile?.scores?.readinessScore ?? profile?.readinessScore ?? 0;
  const skills = profile?.skillInventory?.technical?.map(s => s.skillName.toLowerCase()) ?? [];

  const filtered = useMemo(() => {
    let list = jobs;
    if (tab === "saved") list = list.filter(j => savedJobs.includes(j._id));
    if (tab === "applied") list = list.filter(j => applications[j._id]);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(j => j.role.toLowerCase().includes(q) || j.company.toLowerCase().includes(q) || j.requiredSkills.some(s => s.toLowerCase().includes(q)));
    }
    // Sort by match score
    return [...list].sort((a, b) => {
      const scoreA = a.requiredSkills.filter(s => skills.some(sk => sk.includes(s.toLowerCase()) || s.toLowerCase().includes(sk))).length / Math.max(1, a.requiredSkills.length);
      const scoreB = b.requiredSkills.filter(s => skills.some(sk => sk.includes(s.toLowerCase()) || s.toLowerCase().includes(sk))).length / Math.max(1, b.requiredSkills.length);
      return scoreB - scoreA;
    });
  }, [jobs, tab, savedJobs, applications, search, skills]);

  const eligibleCount = jobs.filter(j => readiness >= j.minReadiness).length;

  return (
    <section className="space-y-6">
      <Toast message={toast} />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Job Board</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Companies matched to your skills and readiness score.
            </p>
          </div>
          {source === "mock" && <Badge tone="amber">Sample data</Badge>}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Open Roles", value: jobs.length, color: "text-gray-900 dark:text-gray-100" },
          { label: "You're Eligible", value: eligibleCount, color: "text-emerald-600" },
          { label: "Applied", value: Object.keys(applications).length, color: "text-indigo-600" },
          { label: "Saved", value: savedJobs.length, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1">
          {[["all", "All Jobs"], ["saved", "Saved"], ["applied", "Applied"]].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${tab === id ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}>
              {label}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search role, company, skill..."
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {/* Job grid */}
      {status === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="text-4xl">💼</p>
            <p className="mt-3 text-gray-500">No jobs match your current filters.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map(job => (
            <JobCard
              key={job._id}
              job={job}
              profile={profile}
              application={applications[job._id]}
              isSaved={savedJobs.includes(job._id)}
              onApply={j => setApplyTarget(j)}
              onSave={id => dispatch(saveJob(id))}
              onUnsave={id => dispatch(unsaveJob(id))}
              onView={j => setViewTarget(j)}
            />
          ))}
        </div>
      )}

      <ApplyModal
        job={applyTarget}
        isOpen={Boolean(applyTarget)}
        onClose={() => setApplyTarget(null)}
        onConfirm={handleApply}
      />
      <JobDetailModal
        job={viewTarget}
        profile={profile}
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        onApply={j => { setViewTarget(null); setApplyTarget(j); }}
        application={viewTarget ? applications[viewTarget._id] : null}
      />
    </section>
  );
}

export default JobBoardPage;
