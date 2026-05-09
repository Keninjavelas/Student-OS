import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchCohortStats, fetchPlacementReadiness } from "../../store/slices/adminSlice";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";

function Bar({ value, max, color = "bg-indigo-500" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-gray-700">
      <div className={`h-2 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function CohortCard({ stat }) {
  const dept = stat._id?.department ?? "Unknown";
  const year = stat._id?.graduationYear ?? "—";
  const placedPct = stat.totalStudents > 0 ? Math.round((stat.placedCount / stat.totalStudents) * 100) : 0;
  const readyPct = stat.totalStudents > 0 ? Math.round(((stat.readyCount + stat.placedCount) / stat.totalStudents) * 100) : 0;
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{dept}</h3>
          <p className="text-sm text-gray-500">Class of {year}</p>
        </div>
        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
          {stat.totalStudents} students
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-500">Avg Readiness</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(stat.averageReadinessScore ?? 0)}/100</span>
          </div>
          <Bar value={stat.averageReadinessScore ?? 0} max={100} color="bg-indigo-500" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-500">Avg DSA Score</span>
            <span className="font-semibold text-gray-700 dark:text-gray-300">{Math.round(stat.averageDSAScore ?? 0)}/100</span>
          </div>
          <Bar value={stat.averageDSAScore ?? 0} max={100} color="bg-blue-500" />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-gray-500">Placement Ready</span>
            <span className="font-semibold text-emerald-600">{readyPct}%</span>
          </div>
          <Bar value={readyPct} max={100} color="bg-emerald-500" />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
        {[
          { label: "Placed", value: stat.placedCount, color: "text-emerald-600" },
          { label: "Ready", value: stat.readyCount, color: "text-indigo-600" },
          { label: "Placed %", value: `${placedPct}%`, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="text-center">
            <p className={`text-lg font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CohortStatsPage() {
  const dispatch = useDispatch();
  const { cohortStats, cohortStatus, placementTrends, placementStatus, source } = useSelector(s => s.admin);

  useEffect(() => {
    dispatch(fetchCohortStats());
    dispatch(fetchPlacementReadiness());
  }, [dispatch]);

  const totals = useMemo(() => {
    const total = cohortStats.reduce((s, c) => s + c.totalStudents, 0);
    const placed = cohortStats.reduce((s, c) => s + c.placedCount, 0);
    const ready = cohortStats.reduce((s, c) => s + c.readyCount, 0);
    const avgReadiness = cohortStats.length > 0
      ? Math.round(cohortStats.reduce((s, c) => s + (c.averageReadinessScore ?? 0), 0) / cohortStats.length)
      : 0;
    return { total, placed, ready, avgReadiness };
  }, [cohortStats]);

  const STATUS_COLORS = { placed: "bg-emerald-500", ready: "bg-indigo-500", "in-progress": "bg-amber-500", "not-ready": "bg-red-400", "not-started": "bg-gray-300" };

  return (
    <section className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Cohort Statistics</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">Placement readiness breakdown by department and graduation year.</p>
          </div>
          {source === "mock" && <Badge tone="amber">Mock data</Badge>}
        </div>
      </Card>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Students", value: totals.total, color: "text-gray-900 dark:text-gray-100" },
          { label: "Placed", value: totals.placed, color: "text-emerald-600" },
          { label: "Ready", value: totals.ready, color: "text-indigo-600" },
          { label: "Avg Readiness", value: `${totals.avgReadiness}/100`, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-sm text-gray-500">{label}</p>
            <p className={`mt-1 text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Placement status distribution */}
      {placementTrends.length > 0 && (
        <Card>
          <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-gray-100">Placement Status Distribution</h3>
          <div className="space-y-3">
            {placementTrends.map(trend => {
              const total = placementTrends.reduce((s, t) => s + t.count, 0);
              const pct = total > 0 ? Math.round((trend.count / total) * 100) : 0;
              return (
                <div key={trend._id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium capitalize text-gray-700 dark:text-gray-300">
                      {trend._id?.replace(/-/g, " ") ?? "Unknown"}
                    </span>
                    <span className="text-gray-500">{trend.count} students ({pct}%)</span>
                  </div>
                  <div className="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
                    <div
                      className={`h-3 rounded-full ${STATUS_COLORS[trend._id] ?? "bg-gray-400"} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-gray-400">
                    <span>Avg score: {Math.round(trend.averageScore ?? 0)}</span>
                    {trend.averageCTC > 0 && <span>Avg CTC: ₹{(trend.averageCTC / 100000).toFixed(1)}L</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Cohort cards */}
      {cohortStatus === "loading" ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />)}
        </div>
      ) : cohortStats.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-gray-400">No cohort data available.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cohortStats.map((stat, i) => <CohortCard key={i} stat={stat} />)}
        </div>
      )}
    </section>
  );
}

export default CohortStatsPage;
