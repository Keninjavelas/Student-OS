import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setResumeAnalysis } from "../store/slices/resumeSlice";

function ResumeBuilder() {
  const dispatch = useDispatch();
  const { atsScore: storedScore, lastAnalyzedAt } = useSelector((state) => state.resume);
  const [formData, setFormData] = useState({
    name: "Aarav Sharma",
    email: "aarav.sharma@studentos.com",
    education: "B.Tech Computer Science, 2027",
    rawResumeText:
      "Built full-stack projects using React, Node.js, and MongoDB. Solved 120+ DSA problems and participated in hackathons."
  });
  const [analysis, setAnalysis] = useState({
    strengths: ["Clear technical stack", "Quantified achievements", "Relevant project work"],
    gaps: ["Add internship impact metrics", "Include cloud certifications", "Expand leadership section"]
  });

  const wordCount = useMemo(() => {
    return formData.rawResumeText.trim().split(/\s+/).filter(Boolean).length;
  }, [formData.rawResumeText]);

  function handleChange(event) {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function analyzeResume() {
    const text = formData.rawResumeText.toLowerCase();
    const keywords = ["react", "node", "mongodb", "python", "api", "dsa", "project"];
    const found = keywords.filter((keyword) => text.includes(keyword)).length;
    const densityBoost = Math.min(20, Math.floor(wordCount / 25));
    const newScore = Math.min(98, 50 + found * 4 + densityBoost);
    dispatch(setResumeAnalysis({ atsScore: newScore }));

    const strengths = [];
    const gaps = [];

    if (text.includes("project")) strengths.push("Project context present");
    if (text.includes("dsa")) strengths.push("Problem-solving signal included");
    if (text.includes("api")) strengths.push("Backend/API experience visible");
    if (!text.includes("intern")) gaps.push("Add internship or real-world experience");
    if (!text.includes("lead")) gaps.push("Mention leadership or teamwork evidence");
    if (!text.includes("cloud")) gaps.push("Include cloud platform exposure");

    setAnalysis({
      strengths: strengths.length ? strengths : ["Strong technical narrative"],
      gaps: gaps.length ? gaps : ["Optimize formatting and add role-specific keywords"]
    });
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">ATS Resume Builder</h2>
        <p className="mt-1 text-gray-600 dark:text-gray-300">
          Build and analyze your resume for better recruiter visibility and placement outcomes.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Resume Input</h3>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Name</span>
              <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Email</span>
              <input
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Education</span>
              <input
                name="education"
                value={formData.education}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Raw Resume Text</span>
              <textarea
                name="rawResumeText"
                rows={8}
                value={formData.rawResumeText}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
              <p className="mt-1 text-xs text-gray-500">{wordCount} words</p>
            </label>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">ATS Insights</h3>

          <div className="mt-5 rounded-xl bg-indigo-50 p-5 ring-1 ring-indigo-100">
            <p className="text-sm font-medium text-indigo-700">ATS Score</p>
            <p className="mt-1 text-5xl font-bold text-indigo-900">{storedScore}</p>
            <p className="mt-1 text-sm text-indigo-700">Keyword relevance and resume quality confidence</p>
            {lastAnalyzedAt ? (
              <p className="mt-2 text-xs text-indigo-700">
                Last analyzed: {new Date(lastAnalyzedAt).toLocaleString()}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={analyzeResume}
            className="mt-4 inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
          >
            Analyze Resume
          </button>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
              <h4 className="text-sm font-semibold text-emerald-800">Strengths</h4>
              <ul className="mt-2 space-y-1 text-sm text-emerald-900">
                {analysis.strengths.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800">Improvements</h4>
              <ul className="mt-2 space-y-1 text-sm text-amber-900">
                {analysis.gaps.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ResumeBuilder;
