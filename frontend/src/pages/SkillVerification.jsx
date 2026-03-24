import { useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { incrementAttempt } from "../store/slices/skillsSlice";

const initialTests = [
  {
    id: "dsa",
    title: "Data Structures",
    difficulty: "Intermediate",
    duration: "45 min",
    questions: 25,
    defaultAttempts: 2
  },
  {
    id: "frontend",
    title: "Frontend Development",
    difficulty: "Advanced",
    duration: "60 min",
    questions: 30,
    defaultAttempts: 1
  },
  {
    id: "backend",
    title: "Backend APIs",
    difficulty: "Intermediate",
    duration: "50 min",
    questions: 28,
    defaultAttempts: 0
  },
  {
    id: "sql",
    title: "SQL & Databases",
    difficulty: "Beginner",
    duration: "30 min",
    questions: 20,
    defaultAttempts: 3
  }
];

function SkillVerification() {
  const dispatch = useDispatch();
  const attempts = useSelector((state) => state.skills.tests);
  const tests = useMemo(
    () =>
      initialTests.map((test) => ({
        ...test,
        attempts: attempts.find((item) => item.id === test.id)?.attempts ?? test.defaultAttempts
      })),
    [attempts]
  );

  function handleTakeTest(testId) {
    dispatch(incrementAttempt(testId));
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Skill Verification Tests</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Validate your technical strengths with objective assessments trusted by placement teams.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {tests.map((test) => (
          <article
            key={test.id}
            className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md dark:bg-gray-900 dark:ring-gray-800"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{test.title}</h3>
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                {test.difficulty}
              </span>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600">
              <p>Duration: {test.duration}</p>
              <p>Questions: {test.questions}</p>
              <p>Attempts so far: {test.attempts}</p>
            </div>

            <button
              type="button"
              onClick={() => handleTakeTest(test.id)}
              className="mt-5 w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Take Test
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

export default SkillVerification;
