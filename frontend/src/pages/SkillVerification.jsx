import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  TEST_CATALOG,
  fetchProfileSkills,
  addProfileSkill,
  deleteProfileSkill,
  startTest,
  answerQuestion,
  nextQuestion,
  prevQuestion,
  clearActiveTest,
  submitSkillTest
} from "../store/slices/skillsSlice";
import { awardXp, XP_AWARDS } from "../store/slices/gamificationSlice";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Modal from "../components/ui/Modal";
import Toast from "../components/ui/Toast";

const PROFICIENCY_COLORS = { beginner: "slate", intermediate: "amber", advanced: "emerald", expert: "indigo" };
const DIFFICULTY_COLORS = { Beginner: "emerald", Intermediate: "amber", Advanced: "slate" };

function TestResultView({ testId, result, onRetake, onClose }) {
  const catalog = TEST_CATALOG.find(t => t.id === testId);
  return (
    <div className="space-y-5">
      <div className={`rounded-xl p-6 text-center ${result.isPassed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-red-50 dark:bg-red-950/30"}`}>
        <p className={`text-5xl font-bold ${result.isPassed ? "text-emerald-600" : "text-red-500"}`}>
          {result.score}%
        </p>
        <p className={`mt-2 text-lg font-semibold ${result.isPassed ? "text-emerald-800 dark:text-emerald-200" : "text-red-700 dark:text-red-300"}`}>
          {result.isPassed ? "🎉 Passed!" : "Not Passed"}
        </p>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          {result.correct} / {result.total} correct · {Math.round(result.timeTaken / 60)} min
        </p>
        {result.isPassed && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-sm font-semibold text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200">
            ✓ Certificate Earned — {catalog?.skillName}
          </div>
        )}
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">Score Breakdown</p>
        <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-3 rounded-full ${result.isPassed ? "bg-emerald-500" : "bg-red-400"}`}
            style={{ width: `${result.score}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-gray-500">
          <span>0</span>
          <span>Passing: {catalog?.passingScore ?? 70}%</span>
          <span>100</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={onClose} className="flex-1">Close</Button>
        <Button onClick={onRetake} className="flex-1">Retake Test</Button>
      </div>
    </div>
  );
}

function ActiveTestView({ activeTest, onSubmit, testStatus }) {
  const { questions, answers, currentQuestion, testId } = activeTest;
  const catalog = TEST_CATALOG.find(t => t.id === testId);
  const dispatch = useDispatch();
  const [timeLeft, setTimeLeft] = useState((catalog?.duration ?? 30) * 60);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) { clearInterval(timer); onSubmit(); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const answered = answers.filter(a => a !== null).length;
  const q = questions[currentQuestion];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <div>
          <p className="font-semibold text-gray-900 dark:text-gray-100">{catalog?.title}</p>
          <p className="text-sm text-gray-500">Q{currentQuestion + 1} of {questions.length} · {answered} answered</p>
        </div>
        <div className={`rounded-lg px-4 py-2 text-center font-mono font-bold ${timeLeft < 120 ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"}`}>
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-gray-700">
        <div
          className="h-1.5 rounded-full bg-indigo-600 transition-all"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>

      {/* Question */}
      <Card>
        <p className="mb-5 text-base font-medium text-gray-900 dark:text-gray-100">{q.q}</p>
        <div className="space-y-2">
          {q.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => dispatch(answerQuestion({ index: currentQuestion, answer: i }))}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                answers[currentQuestion] === i
                  ? "border-indigo-500 bg-indigo-50 font-semibold text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200"
                  : "border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              <span className="mr-3 font-semibold">{String.fromCharCode(65 + i)}.</span>
              {opt}
            </button>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-between">
          <Button variant="secondary" onClick={() => dispatch(prevQuestion())} disabled={currentQuestion === 0}>
            Previous
          </Button>
          {currentQuestion < questions.length - 1 ? (
            <Button onClick={() => dispatch(nextQuestion())}>Next</Button>
          ) : (
            <Button variant="success" onClick={onSubmit} disabled={testStatus === "submitting"}>
              {testStatus === "submitting" ? "Submitting..." : "Submit Test"}
            </Button>
          )}
        </div>
      </Card>

      {/* Question navigator */}
      <Card>
        <p className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Question Navigator</p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => dispatch(answerQuestion({ index: i, answer: answers[i] })) || dispatch(nextQuestion())}
              className={`h-8 w-8 rounded text-xs font-semibold transition ${
                i === currentQuestion
                  ? "bg-indigo-600 text-white"
                  : answers[i] !== null
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
              }`}
              onClick={() => {
                // navigate to question
                const diff = i - currentQuestion;
                if (diff > 0) for (let j = 0; j < diff; j++) dispatch(nextQuestion());
                else for (let j = 0; j < -diff; j++) dispatch(prevQuestion());
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-100" /> Answered</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-gray-100" /> Unanswered</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-indigo-600" /> Current</span>
        </div>
      </Card>
    </div>
  );
}

function SkillVerification() {
  const dispatch = useDispatch();
  const { technical, soft, profileStatus, activeTest, testResults, testStatus } = useSelector(s => s.skills);
  const [tab, setTab] = useState("tests"); // "tests" | "skills"
  const [showAddSkill, setShowAddSkill] = useState(false);
  const [showResult, setShowResult] = useState(null); // testId
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");
  const [skillForm, setSkillForm] = useState({ skillName: "", proficiencyLevel: "intermediate", yearsOfExperience: 0 });
  const [addStatus, setAddStatus] = useState("idle");

  useEffect(() => { dispatch(fetchProfileSkills()); }, [dispatch]);

  function showToast(msg, tone = "success") {
    setToast(msg);
    setToastTone(tone);
    setTimeout(() => setToast(""), 3000);
  }

  function handleStartTest(testId) {
    const catalog = TEST_CATALOG.find(t => t.id === testId);
    dispatch(startTest({ testId, questionCount: catalog?.totalQuestions ?? 10 }));
  }

  async function handleSubmitTest() {
    if (!activeTest) return;
    const catalog = TEST_CATALOG.find(t => t.id === activeTest.testId);
    const timeTaken = Math.round((Date.now() - activeTest.startTime) / 1000);
    const result = await dispatch(submitSkillTest({
      testId: activeTest.testId,
      skillName: catalog?.skillName ?? activeTest.testId,
      answers: activeTest.answers,
      questions: activeTest.questions,
      timeTaken
    }));
    if (!result.error) {
      const { isPassed, score } = result.payload;
      // Award XP
      dispatch(awardXp({
        amount: isPassed ? XP_AWARDS.SKILL_TEST_PASSED : XP_AWARDS.SKILL_TEST_FAILED,
        reason: isPassed ? `Passed ${catalog?.title} test (${score}%)` : `Attempted ${catalog?.title} test`,
        badgeCheck: isPassed
          ? ["test_pass", "first_test",
             Object.values(result.payload).filter ? undefined : undefined].filter(Boolean)
          : ["first_test"],
      }));
      setShowResult(activeTest.testId);
      showToast(isPassed ? "Test passed! Certificate earned." : "Test submitted. Keep practicing!");
    }
  }

  async function handleAddSkill(e) {
    e.preventDefault();
    setAddStatus("loading");
    const result = await dispatch(addProfileSkill(skillForm));
    if (!result.error) {
      setShowAddSkill(false);
      setSkillForm({ skillName: "", proficiencyLevel: "intermediate", yearsOfExperience: 0 });
      showToast("Skill added successfully.");
    } else {
      showToast(result.payload ?? "Failed to add skill.", "error");
    }
    setAddStatus("idle");
  }

  async function handleDeleteSkill(skillId) {
    await dispatch(deleteProfileSkill(skillId));
    showToast("Skill removed.");
  }

  // Active test view
  if (activeTest && !showResult) {
    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Skill Assessment</h2>
          <Button variant="secondary" onClick={() => dispatch(clearActiveTest())}>Exit Test</Button>
        </div>
        <ActiveTestView activeTest={activeTest} onSubmit={handleSubmitTest} testStatus={testStatus} />
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <Toast message={toast} tone={toastTone} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Skills & Verification</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Take assessments to verify your skills and build your placement profile.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTab("tests")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "tests" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              Assessments
            </button>
            <button
              type="button"
              onClick={() => setTab("skills")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${tab === "skills" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              My Skills
            </button>
          </div>
        </div>
      </Card>

      {tab === "tests" && (
        <>
          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-sm text-gray-500">Tests Available</p>
              <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-gray-100">{TEST_CATALOG.length}</p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-sm text-gray-500">Passed</p>
              <p className="mt-1 text-3xl font-bold text-emerald-600">
                {Object.values(testResults).filter(r => r.isPassed).length}
              </p>
            </div>
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
              <p className="text-sm text-gray-500">Certificates Earned</p>
              <p className="mt-1 text-3xl font-bold text-indigo-600">
                {Object.values(testResults).filter(r => r.isPassed).length}
              </p>
            </div>
          </div>

          {/* Test catalog */}
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {TEST_CATALOG.map(test => {
              const result = testResults[test.id];
              return (
                <article
                  key={test.id}
                  className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{test.title}</h3>
                    <Badge tone={DIFFICULTY_COLORS[test.difficulty] ?? "slate"}>{test.difficulty}</Badge>
                  </div>

                  <div className="mt-3 space-y-1 text-sm text-gray-600 dark:text-gray-400">
                    <p>{test.duration} min · {test.totalQuestions} questions · Pass: {test.passingScore}%</p>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {test.topics.slice(0, 3).map(t => (
                        <span key={t} className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400">{t}</span>
                      ))}
                      {test.topics.length > 3 && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-800">+{test.topics.length - 3}</span>
                      )}
                    </div>
                  </div>

                  {result && (
                    <div className={`mt-3 rounded-lg p-3 ${result.isPassed ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}>
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold ${result.isPassed ? "text-emerald-700" : "text-amber-700"}`}>
                          {result.isPassed ? "✓ Passed" : "Not Passed"} — {result.score}%
                        </span>
                        <span className="text-xs text-gray-500">{result.correct}/{result.total} correct</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex gap-2">
                    <Button onClick={() => handleStartTest(test.id)} className="flex-1">
                      {result ? "Retake" : "Start Test"}
                    </Button>
                    {result && (
                      <Button variant="secondary" onClick={() => setShowResult(test.id)}>Results</Button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}

      {tab === "skills" && (
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Technical Skills ({technical.length})
            </h3>
            <Button onClick={() => setShowAddSkill(true)}>+ Add Skill</Button>
          </div>

          {profileStatus === "loading" ? (
            <p className="text-sm text-gray-500">Loading skills...</p>
          ) : technical.length === 0 ? (
            <div className="rounded-lg bg-gray-50 p-6 text-center dark:bg-gray-800">
              <p className="text-gray-500">No skills added yet.</p>
              <p className="mt-1 text-sm text-gray-400">Add your technical skills to strengthen your placement profile.</p>
              <Button className="mt-3" onClick={() => setShowAddSkill(true)}>Add First Skill</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {technical.map(skill => (
                <div
                  key={skill._id ?? skill.skillName}
                  className="flex items-center justify-between rounded-lg border border-gray-100 px-4 py-3 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{skill.skillName}</p>
                      <p className="text-xs text-gray-500">{skill.yearsOfExperience ?? 0} yrs exp</p>
                    </div>
                    <Badge tone={PROFICIENCY_COLORS[skill.proficiencyLevel] ?? "slate"}>
                      {skill.proficiencyLevel}
                    </Badge>
                    {skill.verificationStatus === "verified" && (
                      <Badge tone="emerald">✓ Verified</Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSkill(skill._id)}
                    className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30"
                    aria-label={`Remove ${skill.skillName}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Result modal */}
      <Modal
        isOpen={Boolean(showResult)}
        title={`Test Results — ${TEST_CATALOG.find(t => t.id === showResult)?.title ?? ""}`}
        onClose={() => setShowResult(null)}
      >
        {showResult && testResults[showResult] && (
          <TestResultView
            testId={showResult}
            result={testResults[showResult]}
            onRetake={() => { setShowResult(null); handleStartTest(showResult); }}
            onClose={() => setShowResult(null)}
          />
        )}
      </Modal>

      {/* Add skill modal */}
      <Modal isOpen={showAddSkill} title="Add Technical Skill" onClose={() => setShowAddSkill(false)}>
        <form onSubmit={handleAddSkill} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Skill Name</span>
            <input
              value={skillForm.skillName}
              onChange={e => setSkillForm(f => ({ ...f, skillName: e.target.value }))}
              placeholder="e.g. React, Python, System Design"
              required
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proficiency Level</span>
            <select
              value={skillForm.proficiencyLevel}
              onChange={e => setSkillForm(f => ({ ...f, proficiencyLevel: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="expert">Expert</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Years of Experience</span>
            <input
              type="number"
              min="0"
              max="20"
              value={skillForm.yearsOfExperience}
              onChange={e => setSkillForm(f => ({ ...f, yearsOfExperience: Number(e.target.value) }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAddSkill(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={addStatus === "loading"} className="flex-1">
              {addStatus === "loading" ? "Adding..." : "Add Skill"}
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}

export default SkillVerification;
