import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchInterviews,
  createInterview,
  startInterview,
  submitInterview,
  fetchInterviewFeedback,
  clearActiveInterview
} from "../store/slices/interviewSlice";
import { awardXp, XP_AWARDS } from "../store/slices/gamificationSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

const QUESTION_BANKS = {
  behavioral: [
    "Tell me about a time you faced a difficult technical challenge and how you solved it.",
    "Describe a situation where you had to work under pressure to meet a deadline.",
    "Give an example of when you had to learn a new technology quickly.",
    "Tell me about a time you disagreed with a team member and how you resolved it.",
    "Describe your most impactful project and your specific contributions."
  ],
  technical: [
    "Explain the difference between REST and GraphQL. When would you choose each?",
    "How would you optimize a React application that has performance bottlenecks?",
    "Describe how you would design a URL shortener service.",
    "What is the difference between SQL and NoSQL databases? Give use cases for each.",
    "Explain how JWT authentication works and its security considerations."
  ],
  "system-design": [
    "Design a scalable notification system for 10 million users.",
    "How would you architect a real-time collaborative document editor?",
    "Design a rate limiting system for a public API.",
    "How would you build a distributed caching layer for a high-traffic application?",
    "Design the backend for a campus placement platform like Student OS."
  ]
};

const DIFFICULTY_COLORS = { easy: "emerald", medium: "amber", hard: "slate" };
const STATUS_COLORS = {
  scheduled: "indigo",
  "in-progress": "amber",
  completed: "emerald",
  cancelled: "slate"
};

function ScoreBar({ label, score, max = 100 }) {
  const pct = Math.round((score / max) * 100);
  const color = pct >= 75 ? "bg-emerald-500" : pct >= 55 ? "bg-amber-500" : "bg-red-400";
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">{label}</span>
        <span className="font-semibold text-gray-900 dark:text-gray-100">{Math.round(score)}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FeedbackPanel({ feedback, onClose }) {
  if (!feedback) return null;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Overall", score: feedback.overallScore },
          { label: "Communication", score: feedback.communicationScore },
          { label: "Technical", score: feedback.technicalScore },
          { label: "Analytical", score: feedback.analyticalScore },
          { label: "Time Mgmt", score: feedback.timeManagementScore ?? feedback.timeManagement }
        ].map(({ label, score }) =>
          typeof score === "number" ? (
            <div key={label} className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
              <p className="text-xs text-gray-500">{label}</p>
              <p className={`text-2xl font-bold ${score >= 75 ? "text-emerald-600" : score >= 55 ? "text-amber-600" : "text-red-500"}`}>
                {Math.round(score)}
              </p>
            </div>
          ) : null
        )}
      </div>

      {feedback.strengths?.length > 0 && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
          <p className="mb-2 text-sm font-semibold text-emerald-800 dark:text-emerald-300">Strengths</p>
          <ul className="space-y-1">
            {feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm text-emerald-900 dark:text-emerald-200">✓ {s}</li>
            ))}
          </ul>
        </div>
      )}

      {(feedback.areasForImprovement ?? feedback.improvements)?.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
          <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-300">Areas to Improve</p>
          <ul className="space-y-1">
            {(feedback.areasForImprovement ?? feedback.improvements).map((s, i) => (
              <li key={i} className="text-sm text-amber-900 dark:text-amber-200">→ {s}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.detailedFeedback && (
        <p className="text-sm text-gray-600 dark:text-gray-400">{feedback.detailedFeedback}</p>
      )}

      {feedback.perQuestionFeedback?.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Per-Question Breakdown</p>
          <div className="space-y-2">
            {feedback.perQuestionFeedback.map((pq, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 dark:bg-gray-800">
                <span className="text-sm text-gray-700 dark:text-gray-300">Q{pq.question_num ?? i + 1}</span>
                <span className={`text-sm font-semibold ${pq.score >= 75 ? "text-emerald-600" : pq.score >= 55 ? "text-amber-600" : "text-red-500"}`}>
                  {Math.round(pq.score)} — {pq.feedback}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Button onClick={onClose} variant="secondary" className="w-full">Close Feedback</Button>
    </div>
  );
}

function ActiveInterviewView({ interview, onSubmit, submitStatus }) {
  const questions = interview.questions ?? [];
  const [answers, setAnswers] = useState(() => questions.map(() => ""));
  const [current, setCurrent] = useState(0);
  const [startTimes] = useState(() => questions.map(() => Date.now()));

  function handleAnswer(value) {
    setAnswers(prev => { const next = [...prev]; next[current] = value; return next; });
  }

  function handleSubmit() {
    const responses = questions.map((q, i) => ({
      questionId: q._id ?? `q-${i}`,
      response: answers[i],
      duration: Math.round((Date.now() - startTimes[i]) / 1000)
    }));
    onSubmit(interview._id, responses, interview.type, questions.map(q => q.questionText), answers);
  }

  const answered = answers.filter(a => a.trim().length > 0).length;
  const progress = Math.round((answered / questions.length) * 100);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{interview.title}</h3>
          <p className="text-sm text-gray-500">Question {current + 1} of {questions.length}</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Answered</p>
          <p className="text-lg font-bold text-indigo-600">{answered}/{questions.length}</p>
        </div>
      </div>

      <div className="mb-4 h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {questions.length > 0 ? (
        <>
          <div className="mb-4 rounded-lg bg-indigo-50 p-4 dark:bg-indigo-950/30">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-200">
              {questions[current].questionText}
            </p>
          </div>
          <textarea
            rows={7}
            value={answers[current]}
            onChange={e => handleAnswer(e.target.value)}
            placeholder="Type your answer as if speaking to an interviewer. Be specific and use examples."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <div className="mt-4 flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
                Previous
              </Button>
              {current < questions.length - 1 ? (
                <Button onClick={() => setCurrent(c => c + 1)}>Next</Button>
              ) : null}
            </div>
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={submitStatus === "loading" || answered === 0}
            >
              {submitStatus === "loading" ? "Submitting..." : "Submit Interview"}
            </Button>
          </div>

          {/* Question navigator */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {questions.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrent(i)}
                className={`h-7 w-7 rounded text-xs font-semibold transition ${
                  i === current
                    ? "bg-indigo-600 text-white"
                    : answers[i].trim()
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">No questions loaded for this interview.</p>
      )}
    </Card>
  );
}

function MockInterview() {
  const dispatch = useDispatch();
  const { interviews, status, activeInterview, submitStatus, feedbackStatus, source } = useSelector(s => s.interview);
  const [showCreate, setShowCreate] = useState(false);
  const [viewFeedback, setViewFeedback] = useState(null);
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [form, setForm] = useState({ title: "", type: "technical", difficulty: "medium" });
  const [inSession, setInSession] = useState(false);

  useEffect(() => { dispatch(fetchInterviews()); }, [dispatch]);

  function showToast(msg, tone = "success") {
    setToast(msg);
    setToastTone(tone);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    const questions = (QUESTION_BANKS[form.type] ?? QUESTION_BANKS.technical).map(q => ({
      questionText: q,
      questionType: form.type
    }));
    const result = await dispatch(createInterview({ ...form, questions }));
    if (!result.error) {
      setShowCreate(false);
      setForm({ title: "", type: "technical", difficulty: "medium" });
      showToast("Interview created successfully.");
    }
  }

  async function handleStart(interview) {
    const result = await dispatch(startInterview(interview._id));
    if (!result.error) {
      setInSession(true);
    } else {
      // If backend fails, still allow local session
      setInSession(true);
    }
  }

  async function handleSubmit(interviewId, responses, type, questions, rawAnswers) {
    await dispatch(submitInterview({ interviewId, responses }));
    // Award base XP for completing
    dispatch(awardXp({
      amount: XP_AWARDS.INTERVIEW_COMPLETED,
      reason: "Completed a mock interview",
      badgeCheck: ["first_interview"],
    }));
    // Request AI feedback
    dispatch(fetchInterviewFeedback({
      interviewId,
      type,
      questions,
      responses: rawAnswers,
      timeTaken: responses.map(r => r.duration)
    }));
    setInSession(false);
    showToast("Interview submitted! AI feedback is being generated.");
  }

  function handleCancelSession() {
    dispatch(clearActiveInterview());
    setInSession(false);
  }

  const completedInterviews = interviews.filter(i => i.status === "completed");
  const upcomingInterviews = interviews.filter(i => i.status === "scheduled" || i.status === "in-progress");

  if (inSession && activeInterview) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Interview in Progress</h2>
          <Button variant="secondary" onClick={handleCancelSession}>Exit Session</Button>
        </div>
        <ActiveInterviewView
          interview={activeInterview}
          onSubmit={handleSubmit}
          submitStatus={submitStatus}
        />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Toast message={toast} tone={toastTone} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Mock Interviews</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Practice with structured questions and get AI-powered feedback on every response.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === "mock" && <Badge tone="amber">Mock data</Badge>}
            <Button onClick={() => setShowCreate(true)}>+ New Interview</Button>
          </div>
        </div>
      </Card>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm text-gray-500">Total Sessions</p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{interviews.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm text-gray-500">Completed</p>
          <p className="mt-1 text-3xl font-bold text-emerald-600">{completedInterviews.length}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="mt-1 text-3xl font-bold text-indigo-600">
            {completedInterviews.length > 0
              ? Math.round(completedInterviews.reduce((s, i) => s + (i.feedback?.overallScore ?? 0), 0) / completedInterviews.length)
              : "—"}
          </p>
        </div>
      </div>

      {/* Upcoming */}
      {upcomingInterviews.length > 0 && (
        <Card>
          <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Scheduled / In Progress</h3>
          <div className="space-y-3">
            {upcomingInterviews.map(iv => (
              <div key={iv._id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{iv.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge tone={STATUS_COLORS[iv.status] ?? "slate"}>{iv.status}</Badge>
                    <Badge tone="indigo">{iv.type}</Badge>
                    <Badge tone={DIFFICULTY_COLORS[iv.difficulty] ?? "slate"}>{iv.difficulty}</Badge>
                  </div>
                </div>
                <Button onClick={() => handleStart(iv)}>
                  {iv.status === "in-progress" ? "Resume" : "Start Interview"}
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* History */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Interview History</h3>
        {status === "loading" ? (
          <p className="text-sm text-gray-500">Loading interviews...</p>
        ) : completedInterviews.length === 0 ? (
          <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
            <p className="text-gray-500">No completed interviews yet.</p>
            <p className="mt-1 text-sm text-gray-400">Create and complete an interview to see AI feedback here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completedInterviews.map(iv => (
              <div key={iv._id} className="rounded-lg border border-gray-100 p-4 dark:border-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{iv.title}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <Badge tone="emerald">completed</Badge>
                      <Badge tone="indigo">{iv.type}</Badge>
                      <Badge tone={DIFFICULTY_COLORS[iv.difficulty] ?? "slate"}>{iv.difficulty}</Badge>
                    </div>
                    {iv.completedAt && (
                      <p className="mt-1 text-xs text-gray-400">{new Date(iv.completedAt).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {iv.feedback?.overallScore != null && (
                      <div className="text-center">
                        <p className="text-xs text-gray-500">Score</p>
                        <p className={`text-xl font-bold ${iv.feedback.overallScore >= 75 ? "text-emerald-600" : iv.feedback.overallScore >= 55 ? "text-amber-600" : "text-red-500"}`}>
                          {Math.round(iv.feedback.overallScore)}
                        </p>
                      </div>
                    )}
                    {iv.feedback ? (
                      <Button variant="secondary" onClick={() => setViewFeedback(iv)}>View Feedback</Button>
                    ) : feedbackStatus === "loading" ? (
                      <span className="text-xs text-gray-400">Generating AI feedback...</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create modal */}
      <Modal isOpen={showCreate} title="Schedule New Interview" onClose={() => setShowCreate(false)}>
        <form onSubmit={handleCreate} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Interview Title</span>
            <input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Frontend Technical Round"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Type</span>
            <select
              value={form.type}
              onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="technical">Technical</option>
              <option value="behavioral">Behavioral</option>
              <option value="system-design">System Design</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Difficulty</span>
            <select
              value={form.difficulty}
              onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)} className="flex-1">Cancel</Button>
            <Button type="submit" className="flex-1">Create Interview</Button>
          </div>
        </form>
      </Modal>

      {/* Feedback modal */}
      <Modal
        isOpen={Boolean(viewFeedback)}
        title={`Feedback — ${viewFeedback?.title ?? ""}`}
        onClose={() => setViewFeedback(null)}
      >
        {viewFeedback?.feedback && (
          <FeedbackPanel feedback={viewFeedback.feedback} onClose={() => setViewFeedback(null)} />
        )}
      </Modal>
    </section>
  );
}

export default MockInterview;
