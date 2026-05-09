import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchResumes,
  createResume,
  deleteResume,
  analyzeResumeAI,
  clearAnalysis
} from "../store/slices/resumeSlice";
import { awardXp, XP_AWARDS } from "../store/slices/gamificationSlice";
import { pushNotification } from "../store/slices/notificationSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

const EMPTY_SECTIONS = {
  personalInfo: { name: "", email: "", phone: "", location: "" },
  summary: "",
  experience: [],
  education: [],
  projects: [],
  skills: [],
  certifications: []
};

function ScoreRing({ score }) {
  const s = Math.max(0, Math.min(100, Math.round(score)));
  const r = 44, stroke = 8;
  const nr = r - stroke / 2;
  const circ = nr * 2 * Math.PI;
  const offset = circ - (s / 100) * circ;
  const color = s >= 75 ? "#10b981" : s >= 55 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={r * 2} width={r * 2} className="-rotate-90">
        <circle stroke="#e5e7eb" fill="transparent" strokeWidth={stroke} r={nr} cx={r} cy={r} />
        <circle stroke={color} fill="transparent" strokeLinecap="round" strokeWidth={stroke}
          strokeDasharray={`${circ} ${circ}`} style={{ strokeDashoffset: offset }} r={nr} cx={r} cy={r} />
      </svg>
      <div className="absolute text-center">
        <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  );
}

function SectionBar({ label, score, max }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(score)}/{max}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ExperienceEditor({ items, onChange }) {
  function add() {
    onChange([...items, { title: "", company: "", startDate: "", endDate: "", description: "" }]);
  }
  function update(i, field, val) {
    const next = items.map((item, idx) => idx === i ? { ...item, [field]: val } : item);
    onChange(next);
  }
  function remove(i) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-3">
      {items.map((exp, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 flex justify-between">
            <span className="text-xs font-semibold text-gray-500">Experience {i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={exp.title} onChange={e => update(i, "title", e.target.value)} placeholder="Job Title"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            <input value={exp.company} onChange={e => update(i, "company", e.target.value)} placeholder="Company"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            <input value={exp.startDate} onChange={e => update(i, "startDate", e.target.value)} placeholder="Start (e.g. Jan 2023)"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            <input value={exp.endDate} onChange={e => update(i, "endDate", e.target.value)} placeholder="End (or Present)"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <textarea value={exp.description} onChange={e => update(i, "description", e.target.value)}
            placeholder="Describe your role, achievements, and impact with metrics..."
            rows={2} className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
        </div>
      ))}
      <Button variant="secondary" onClick={add} className="w-full">+ Add Experience</Button>
    </div>
  );
}

function ProjectEditor({ items, onChange }) {
  function add() { onChange([...items, { name: "", description: "", url: "", technologies: "" }]); }
  function update(i, field, val) { onChange(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item)); }
  function remove(i) { onChange(items.filter((_, idx) => idx !== i)); }

  return (
    <div className="space-y-3">
      {items.map((proj, i) => (
        <div key={i} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
          <div className="mb-2 flex justify-between">
            <span className="text-xs font-semibold text-gray-500">Project {i + 1}</span>
            <button type="button" onClick={() => remove(i)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={proj.name} onChange={e => update(i, "name", e.target.value)} placeholder="Project Name"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
            <input value={proj.url} onChange={e => update(i, "url", e.target.value)} placeholder="GitHub / Live URL"
              className="rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          </div>
          <input value={proj.technologies} onChange={e => update(i, "technologies", e.target.value)}
            placeholder="Technologies used (e.g. React, Node.js, MongoDB)"
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
          <textarea value={proj.description} onChange={e => update(i, "description", e.target.value)}
            placeholder="What did you build? What problem did it solve? Include metrics."
            rows={2} className="mt-2 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100" />
        </div>
      ))}
      <Button variant="secondary" onClick={add} className="w-full">+ Add Project</Button>
    </div>
  );
}

function ResumeBuilder() {
  const dispatch = useDispatch();
  const { resumes, status, analysis, analysisStatus, analysisError } = useSelector(s => s.resume);
  const [activeTab, setActiveTab] = useState("editor"); // "editor" | "list"
  const [showSave, setShowSave] = useState(false);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [saveTitle, setSaveTitle] = useState("");
  const [sections, setSections] = useState({
    personalInfo: { name: "", email: "", phone: "", location: "" },
    summary: "",
    experience: [],
    education: [{ school: "", degree: "", field: "", graduationDate: "" }],
    projects: [],
    skills: [""],
    certifications: []
  });

  useEffect(() => { dispatch(fetchResumes()); }, [dispatch]);

  function showToast(msg, tone = "success") {
    setToast(msg);
    setToastTone(tone);
    setTimeout(() => setToast(""), 3000);
  }

  function updatePersonal(field, val) {
    setSections(s => ({ ...s, personalInfo: { ...s.personalInfo, [field]: val } }));
  }

  function handleAnalyze() {
    const hasGithub = sections.projects.some(p => p.url?.includes("github"));
    const hasPortfolio = sections.projects.some(p => p.url?.length > 0);
    const hasQuantified = sections.experience.some(e =>
      /\d+%|\d+x|\$\d+|increased|decreased|improved|reduced/i.test(e.description)
    );
    dispatch(analyzeResumeAI({
      personal_info_complete: Boolean(sections.personalInfo.name && sections.personalInfo.email),
      summary_text: sections.summary,
      summary_length: sections.summary.length,
      experience_entries: sections.experience.length,
      experience_detail_score: sections.experience.length > 0
        ? Math.min(1, sections.experience.reduce((s, e) => s + (e.description?.length ?? 0), 0) / (sections.experience.length * 200))
        : 0,
      education_entries: sections.education.filter(e => e.school).length,
      project_entries: sections.projects.length,
      skill_count: sections.skills.filter(s => s.trim()).length,
      certification_count: sections.certifications.length,
      has_github: hasGithub,
      has_portfolio: hasPortfolio,
      has_quantified_achievements: hasQuantified
    })).then(result => {
      if (!result.error) {
        const score = result.payload?.score ?? 0;
        dispatch(awardXp({ amount: XP_AWARDS.RESUME_ANALYZED, reason: "Analyzed resume with AI", badgeCheck: score >= 75 ? ["resume_score_75"] : [] }));
        if (score >= 75) {
          dispatch(pushNotification({ type: "success", title: "Strong Resume!", message: `Your resume scored ${score}/100. Badge unlocked!`, link: "/resume" }));
        }
      }
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!saveTitle.trim()) return;
    const result = await dispatch(createResume({ title: saveTitle, sections }));
    if (!result.error) {
      setShowSave(false);
      setSaveTitle("");
      dispatch(awardXp({ amount: XP_AWARDS.RESUME_CREATED, reason: "Created a resume", badgeCheck: ["first_resume"] }));
      dispatch(pushNotification({ type: "success", title: "Resume saved!", message: `"${saveTitle}" has been saved.`, link: "/resume" }));
      showToast("Resume saved successfully.");
      setActiveTab("list");
    } else {
      showToast("Failed to save resume.", "error");
    }
  }

  async function handleDelete(resumeId) {
    await dispatch(deleteResume(resumeId));
    showToast("Resume deleted.");
  }

  const SECTION_WEIGHTS = { personal_info: 10, summary: 15, experience: 25, education: 10, projects: 15, skills: 10, certifications: 10, format: 5 };

  return (
    <section className="space-y-6">
      <Toast message={toast} tone={toastTone} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Resume Builder</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Build your resume section by section and get AI-powered analysis.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("editor")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "editor" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Editor
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("list")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${activeTab === "list" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Saved ({resumes.length})
            </button>
          </div>
        </div>
      </Card>

      {activeTab === "editor" && (
        <div className="grid gap-6 xl:grid-cols-5">
          {/* Editor — 3 cols */}
          <div className="space-y-5 xl:col-span-3">
            {/* Personal Info */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Personal Information</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {[["name", "Full Name"], ["email", "Email"], ["phone", "Phone"], ["location", "Location"]].map(([field, label]) => (
                  <label key={field} className="block">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
                    <input
                      value={sections.personalInfo[field]}
                      onChange={e => updatePersonal(field, e.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    />
                  </label>
                ))}
              </div>
            </Card>

            {/* Summary */}
            <Card>
              <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Professional Summary</h3>
              <textarea
                rows={4}
                value={sections.summary}
                onChange={e => setSections(s => ({ ...s, summary: e.target.value }))}
                placeholder="Write 2-3 sentences about your background, key skills, and career goals. Aim for 120-150 words."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">{sections.summary.length} chars · target 500+</p>
            </Card>

            {/* Experience */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Work Experience</h3>
              <ExperienceEditor
                items={sections.experience}
                onChange={exp => setSections(s => ({ ...s, experience: exp }))}
              />
            </Card>

            {/* Education */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Education</h3>
              {sections.education.map((edu, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-2">
                  {[["school", "Institution"], ["degree", "Degree"], ["field", "Field of Study"], ["graduationDate", "Graduation Year"]].map(([field, label]) => (
                    <label key={field} className="block">
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
                      <input
                        value={edu[field]}
                        onChange={e => {
                          const next = sections.education.map((ed, idx) => idx === i ? { ...ed, [field]: e.target.value } : ed);
                          setSections(s => ({ ...s, education: next }));
                        }}
                        className="mt-1 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                      />
                    </label>
                  ))}
                </div>
              ))}
            </Card>

            {/* Projects */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Projects</h3>
              <ProjectEditor
                items={sections.projects}
                onChange={proj => setSections(s => ({ ...s, projects: proj }))}
              />
            </Card>

            {/* Skills */}
            <Card>
              <h3 className="mb-3 text-base font-semibold text-gray-900 dark:text-gray-100">Skills</h3>
              <textarea
                rows={3}
                value={sections.skills.join(", ")}
                onChange={e => setSections(s => ({ ...s, skills: e.target.value.split(",").map(sk => sk.trim()) }))}
                placeholder="React, Node.js, Python, MongoDB, Docker, AWS, System Design..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-400">{sections.skills.filter(s => s).length} skills · separate with commas</p>
            </Card>

            <div className="flex gap-3">
              <Button onClick={handleAnalyze} disabled={analysisStatus === "loading"} className="flex-1">
                {analysisStatus === "loading" ? "Analyzing..." : "Analyze with AI"}
              </Button>
              <Button variant="secondary" onClick={() => setShowSave(true)} className="flex-1">
                Save Resume
              </Button>
            </div>
          </div>

          {/* AI Analysis Panel — 2 cols */}
          <div className="xl:col-span-2">
            <div className="sticky top-24 space-y-4">
              <Card>
                <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">AI Analysis</h3>

                {analysisStatus === "idle" && !analysis && (
                  <div className="rounded-lg bg-gray-50 p-5 text-center dark:bg-gray-800">
                    <p className="text-sm text-gray-500">Fill in your resume sections and click "Analyze with AI" to get a detailed score and feedback.</p>
                  </div>
                )}

                {analysisStatus === "loading" && (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-4 animate-pulse rounded bg-gray-100 dark:bg-gray-700" style={{ width: `${70 + i * 7}%` }} />
                    ))}
                  </div>
                )}

                {analysisStatus === "failed" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      AI service unavailable. {analysisError ?? "Please try again."}
                    </p>
                  </div>
                )}

                {analysis && analysisStatus !== "loading" && (
                  <div className="space-y-5">
                    <div className="flex items-center gap-4">
                      <ScoreRing score={analysis.score ?? analysis.totalScore ?? 0} />
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Resume Score</p>
                        <p className={`text-lg font-bold ${(analysis.score ?? 0) >= 75 ? "text-emerald-600" : (analysis.score ?? 0) >= 55 ? "text-amber-600" : "text-red-500"}`}>
                          {(analysis.score ?? 0) >= 75 ? "Strong" : (analysis.score ?? 0) >= 55 ? "Good" : "Needs Work"}
                        </p>
                        <p className="text-xs text-gray-400">Analyzed just now</p>
                      </div>
                    </div>

                    {analysis.section_scores && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Section Scores</p>
                        {Object.entries(analysis.section_scores).map(([key, val]) => (
                          <SectionBar
                            key={key}
                            label={key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            score={val}
                            max={SECTION_WEIGHTS[key] ?? 10}
                          />
                        ))}
                      </div>
                    )}

                    {analysis.strengths?.length > 0 && (
                      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950/30">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Strengths</p>
                        <ul className="space-y-1">
                          {analysis.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-emerald-900 dark:text-emerald-200">✓ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(analysis.improvements ?? analysis.areasForImprovement)?.length > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">Improvements</p>
                        <ul className="space-y-1">
                          {(analysis.improvements ?? analysis.areasForImprovement).map((s, i) => (
                            <li key={i} className="text-sm text-amber-900 dark:text-amber-200">→ {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {analysis.suggestions?.length > 0 && (
                      <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-3 dark:border-indigo-800 dark:bg-indigo-950/30">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Suggestions</p>
                        <ul className="space-y-1">
                          {analysis.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-indigo-900 dark:text-indigo-200">💡 {s}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <Button variant="secondary" onClick={() => dispatch(clearAnalysis())} className="w-full">
                      Clear Analysis
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === "list" && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Saved Resumes</h3>
          {status === "loading" ? (
            <p className="text-sm text-gray-500">Loading resumes...</p>
          ) : resumes.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
              <p className="text-gray-500">No saved resumes yet.</p>
              <Button className="mt-3" onClick={() => setActiveTab("editor")}>Build Your First Resume</Button>
            </div>
          ) : (
            <div className="space-y-3">
              {resumes.map(r => (
                <div key={r.id ?? r._id} className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{r.title}</p>
                    <p className="text-xs text-gray-500">
                      v{r.version} · {r.uploadedAt ? new Date(r.uploadedAt).toLocaleDateString() : ""}
                      {r.isDefault && " · Default"}
                    </p>
                    {r.aiAnalysis?.score != null && (
                      <p className="mt-0.5 text-xs text-indigo-600">AI Score: {r.aiAnalysis.score}/100</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {r.isDefault && <Badge tone="emerald">Default</Badge>}
                    <Button variant="danger" onClick={() => handleDelete(r.id ?? r._id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Save modal */}
      <Modal isOpen={showSave} title="Save Resume" onClose={() => setShowSave(false)}>
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Resume Title</span>
            <input
              value={saveTitle}
              onChange={e => setSaveTitle(e.target.value)}
              placeholder="e.g. Frontend Developer Resume v2"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowSave(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default ResumeBuilder;
