import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminStudents } from "../store/slices/adminSlice";

function AdminDashboard() {
  const dispatch = useDispatch();
  const { students, status, source } = useSelector((state) => state.admin);
  const { compactTableMode } = useSelector((state) => state.settings);
  const [filterHighScore, setFilterHighScore] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("readinessDesc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  useEffect(() => {
    dispatch(fetchAdminStudents());
  }, [dispatch]);

  const visibleStudents = useMemo(() => {
    let results = filterHighScore
      ? students.filter((student) => Number(student.readinessScore ?? 0) > 80)
      : [...students];

    if (searchTerm.trim()) {
      const query = searchTerm.trim().toLowerCase();
      results = results.filter((student) => {
        const name = student.user?.fullName?.toLowerCase() || "";
        const email = student.user?.email?.toLowerCase() || "";
        const badges = (student.badges || []).join(" ").toLowerCase();
        return name.includes(query) || email.includes(query) || badges.includes(query);
      });
    }

    const sorted = [...results];
    if (sortBy === "readinessAsc") {
      sorted.sort((a, b) => Number(a.readinessScore ?? 0) - Number(b.readinessScore ?? 0));
    } else if (sortBy === "gpaDesc") {
      sorted.sort((a, b) => Number(b.gpa ?? 0) - Number(a.gpa ?? 0));
    } else if (sortBy === "gpaAsc") {
      sorted.sort((a, b) => Number(a.gpa ?? 0) - Number(b.gpa ?? 0));
    } else {
      sorted.sort((a, b) => Number(b.readinessScore ?? 0) - Number(a.readinessScore ?? 0));
    }

    return sorted;
  }, [students, filterHighScore, searchTerm, sortBy]);

  const totalPages = Math.max(1, Math.ceil(visibleStudents.length / pageSize));
  const pagedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return visibleStudents.slice(start, start + pageSize);
  }, [visibleStudents, currentPage]);

  const readinessDistribution = useMemo(() => {
    const bands = {
      "90-100": 0,
      "80-89": 0,
      "70-79": 0,
      "0-69": 0
    };
    students.forEach((student) => {
      const score = Number(student.readinessScore ?? 0);
      if (score >= 90) bands["90-100"] += 1;
      else if (score >= 80) bands["80-89"] += 1;
      else if (score >= 70) bands["70-79"] += 1;
      else bands["0-69"] += 1;
    });
    return bands;
  }, [students]);

  const totalStudents = students.length;
  const averageReadinessScore =
    students.length > 0
      ? Math.round(
          students.reduce((sum, student) => sum + Number(student.readinessScore ?? 0), 0) / students.length
        )
      : 0;
  const topMissingSkill = "System Design";

  function exportCsv() {
    const rows = [
      ["Name", "Email", "GPA", "Badges", "ReadinessScore"],
      ...visibleStudents.map((student) => [
        student.user?.fullName || "Student",
        student.user?.email || "",
        Number(student.gpa ?? 0).toFixed(1),
        (student.badges || []).join(" | "),
        Number(student.readinessScore ?? 0)
      ])
    ];

    const csv = rows
      .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "student-readiness-report.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  if (status === "loading") {
    return <div className="rounded-xl bg-white p-6 text-gray-700 shadow-sm ring-1 ring-gray-100">Loading...</div>;
  }

  return (
    <section className="space-y-6">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Admin Analytics Dashboard</h2>
            <p className="mt-1 text-gray-600">Campus placement readiness and cohort performance overview</p>
          </div>
          {source === "mock" ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Showing mock data
            </span>
          ) : (
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
              Live data
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Total Students</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{totalStudents}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Average Readiness Score</p>
          <p className="mt-2 text-3xl font-bold text-indigo-700">{averageReadinessScore}</p>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
          <p className="text-sm text-gray-500">Top Missing Skill</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{topMissingSkill}</p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Readiness Distribution</h3>
        <div className="mt-4 space-y-3">
          {Object.entries(readinessDistribution).map(([band, count]) => {
            const width = students.length ? Math.round((count / students.length) * 100) : 0;
            return (
              <div key={band}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">{band}</span>
                  <span className="text-gray-500">{count} students</span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-gray-100">
                  <div className="h-2.5 rounded-full bg-indigo-600" style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">Student Readiness Table</h3>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={searchTerm}
              onChange={(event) => {
                setSearchTerm(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search name, email, badge..."
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            />
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
            >
              <option value="readinessDesc">Sort: Readiness High to Low</option>
              <option value="readinessAsc">Sort: Readiness Low to High</option>
              <option value="gpaDesc">Sort: GPA High to Low</option>
              <option value="gpaAsc">Sort: GPA Low to High</option>
            </select>
            <button
              type="button"
              onClick={() => {
                setFilterHighScore((prev) => !prev);
                setCurrentPage(1);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                filterHighScore
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              {filterHighScore ? "Show All Scores" : "Filter by Score > 80"}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Export CSV
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  GPA
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Badges
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Readiness Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {pagedStudents.map((student) => (
                <tr key={student._id}>
                  <td className={`px-4 ${compactTableMode ? "py-2" : "py-3"}`}>
                    <p className="text-sm font-semibold text-gray-900">{student.user?.fullName || "Student"}</p>
                    <p className="text-xs text-gray-500">{student.user?.email || "No email"}</p>
                  </td>
                  <td className={`px-4 text-sm text-gray-700 ${compactTableMode ? "py-2" : "py-3"}`}>
                    {Number(student.gpa ?? 0).toFixed(1)}
                  </td>
                  <td className={`px-4 ${compactTableMode ? "py-2" : "py-3"}`}>
                    <div className="flex flex-wrap gap-1.5">
                      {(student.badges || []).length > 0 ? (
                        student.badges.map((badge) => (
                          <span
                            key={`${student._id}-${badge}`}
                            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700"
                          >
                            {badge}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">No badges</span>
                      )}
                    </div>
                  </td>
                  <td className={`px-4 ${compactTableMode ? "py-2" : "py-3"}`}>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        Number(student.readinessScore ?? 0) > 80
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {Number(student.readinessScore ?? 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleStudents.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No students match the current filter.</p>
        ) : (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, visibleStudents.length)} of{" "}
              {visibleStudents.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm font-medium text-gray-700">
                Page {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default AdminDashboard;
