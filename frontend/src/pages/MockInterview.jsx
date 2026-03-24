import { useState } from "react";

const questions = [
  "Explain the difference between REST and GraphQL for building APIs.",
  "How would you optimize a React application that has performance bottlenecks?",
  "Describe a real project where you solved a difficult technical challenge."
];

function MockInterview() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState(["", "", ""]);
  const [submitted, setSubmitted] = useState(false);

  function updateAnswer(value) {
    setAnswers((prev) => {
      const next = [...prev];
      next[current] = value;
      return next;
    });
  }

  function goToNext() {
    if (current < questions.length - 1) {
      setCurrent((prev) => prev + 1);
      return;
    }
    setSubmitted(true);
  }

  const completion = Math.round(((current + (submitted ? 1 : 0)) / questions.length) * 100);

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">AI Mock Interview</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Practice interview communication and build confidence with structured prompts.
        </p>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <div className="mb-5 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Question {Math.min(current + 1, questions.length)} of {questions.length}
          </p>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            Progress {completion}%
          </span>
        </div>

        {!submitted ? (
          <>
            <h3 className="text-lg font-semibold text-gray-900">{questions[current]}</h3>
            <textarea
              rows={8}
              value={answers[current]}
              onChange={(event) => updateAnswer(event.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Type your answer as if you are speaking to an interviewer."
            />
            <button
              type="button"
              onClick={goToNext}
              className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              {current < questions.length - 1 ? "Save and Next" : "Submit Interview"}
            </button>
          </>
        ) : (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <h4 className="text-lg font-semibold text-emerald-900">Interview Submitted</h4>
            <p className="mt-1 text-sm text-emerald-800">
              Great work. You answered {answers.filter((answer) => answer.trim().length > 0).length} out of{" "}
              {questions.length} questions. This session can now be sent to AI scoring in the next backend phase.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

export default MockInterview;
