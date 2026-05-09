import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminStudents } from "../../store/slices/adminSlice";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

// Market demand weights — how important each skill is for placement
const MARKET_DEMAND = {
  "Data Structures & Algorithms": 95,
  "System Design": 90,
  "React": 85,
  "Node.js": 80,
  "Python": 82,
  "SQL": 78,
  "TypeScript": 75,
  "Docker": 72,
  "Git": 70,
  "REST APIs": 68,
  "Machine Learning": 65,
  "Kubernetes": 60,
  "AWS/GCP/Azure": 62,
  "Testing": 58,
  "CI/CD": 55,
};

function GapBar({ demand, coverage }) {
  const gap = Math.max(0, demand - coverage);
  return (
    <div className="relative h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className="absolute h-3 rounded-full bg-indigo-200 dark:bg-indigo-900/50" style={{ width: `${demand}%` }} />
      <div className="absolute h-3 rounded-full bg-emerald-500" style={{ width: `${coverage}%` }} />
    </div>
  );
}

function SkillGapPage() {
  const dispatch = useDispatch();
  const { students, status, source } = useSelector(s => s.admin);
  const [sortBy, setSortBy] = useState("gap"); // gap | demand | coverage
  const [filterDept, setFilterDept] = useState("all");

  useEffect(() => {
    if (students.length === 0) dispatch(fetchAdminStudents({ limit: 100 }));
  }, [dispatch, students.length]);

  const departments = useMemo(() => {
    const depts = new Set(students.map(s => s.academicInfo?.department).filter(Boolean));
    return ["all", ...Array.from(depts)];
  }, [students]);

  const filteredStudents = useMemo(() => {
    if (filterDept === "all") return students;
    return students.filter(s => s.academicInfo?.department === filterDept);
  }, [students, filterDept]);

  const skillAnalysis = useMemo(() => {
    const total = filteredStudents.length;
    if (total === 0) return [];

    // Count how many students have each skill
    const skillCounts = {};
    for (const student of filteredStudents) {
      const skills = student.skillInventory?.technical ?? [];
      for (const skill of skills) {
        const name = skill.skillName;
        if (!skillCounts[name]) skillCounts[name] = { count: 0, advanced: 0 };
        skillCounts[name].count++;
        if (skill.proficiencyLevel === "advanced" || skill.proficiencyLevel === "expert") {
          skillCounts[name].advanced++;
        }
      }
    }

    // Build analysis for market-demanded skills
    const analysis = Object.entries(MARKET_DEMAND).map(([skill, demand]) => {
      const data = skillCounts[skill] ?? { count: 0, advanced: 0 };
      const coverage = Math.round((data.count / total) * 100);
      const advancedCoverage = Math.round((data.advanced / total) * 100);
      const gap = Math.max(0, demand - coverage);
      return { skill, demand, coverage, advancedCoverage, gap, studentsWithSkill: data.count, total };
    });

    // Sort
    if (sortBy === "gap") return analysis.sort((a, b) => b.gap - a.gap);
    if (sortBy === "demand") return analysis.sort((a, b) => b.demand - a.demand);
    return analysis.sort((a, b) => b.coverage - a.coverage);
  }, [filteredStudents, sortBy]);

  const criticalGaps = skillAnalysis.filter(s => s.gap >= 40);
  const avgGap = skillAnalysis.length > 0
    ? Math.round(skillAnalysis.reduce((s, a) => s + a.gap, 0) / skillAnalysis.length)
    : 0;

  function exportCsv() {
    const rows = [
      ["Skill", "Market Demand %", "Cohort Coverage %", "Gap %", "Students With Skill", "Total Students"],
      ...skillAnalysis.map(s => [s.skill, s.demand, s.coverage, s.gap, s.studentsWithSkill, s.total])
    ];
    const csv = rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "skill-gap-analysis.csv";
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Skill Gap Analysis</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              Market demand vs cohort coverage — identify training priorities.
            </p>
          </div>
          <div className="flex gap-2">
            {source === "mock" && <Badge tone="amber">Mock data</Badge>}
            <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Critical Gaps (≥40%)", value: criticalGaps.length, color: "text-red-500" },
          { label: "Avg Skill Gap", value: `${avgGap}%`, color: "text-amber-600" },
          { label: "Students Analyzed", value: filteredStudents.length, color: "text-indigo-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          {departments.map(d => <option key={d} value={d}>{d === "all" ? "All Departments" : d}</option>)}
        </select>
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="gap">Sort by Gap (highest first)</option>
          <option value="demand">Sort by Market Demand</option>
          <option value="coverage">Sort by Coverage</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-indigo-200" /> Market Demand</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-emerald-500" /> Cohort Coverage</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-6 rounded bg-red-100" /> Gap = Demand − Coverage</span>
      </div>

      {/* Skill gap table */}
      <Card>
        {status === "loading" ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => <div key={i} className="h-12 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {skillAnalysis.map(item => (
              <div key={item.skill}>
                <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.skill}</span>
                    {item.gap >= 50 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">Critical</span>}
                    {item.gap >= 30 && item.gap < 50 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-600">High</span>}
                  </div>
                  <div className="flex gap-4 text-xs">
                    <span className="text-indigo-600">Demand: {item.demand}%</span>
                    <span className="text-emerald-600">Coverage: {item.coverage}%</span>
                    <span className={`font-semibold ${item.gap >= 40 ? "text-red-500" : item.gap >= 20 ? "text-amber-600" : "text-gray-500"}`}>
                      Gap: {item.gap}%
                    </span>
                    <span className="text-gray-400">{item.studentsWithSkill}/{item.total} students</span>
                  </div>
                </div>
                <GapBar demand={item.demand} coverage={item.coverage} />
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Training recommendations */}
      {criticalGaps.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Training Recommendations</h3>
          <div className="space-y-3">
            {criticalGaps.slice(0, 5).map(item => (
              <div key={item.skill} className="flex items-start gap-3 rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
                <span className="text-red-500 text-lg">⚠</span>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{item.skill}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Only {item.coverage}% of students have this skill, but {item.demand}% of companies require it.
                    Consider scheduling a batch training session for {item.total - item.studentsWithSkill} students.
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </section>
  );
}

export default SkillGapPage;
