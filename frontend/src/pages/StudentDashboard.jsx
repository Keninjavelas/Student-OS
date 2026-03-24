import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchStudentProfile } from "../store/slices/studentSlice";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";

const FIXED_STUDENT_ID = import.meta.env.VITE_STUDENT_USER_ID || "";

function ProgressRing({ score }) {
  const boundedScore = Math.max(0, Math.min(100, Math.round(score)));
  const radius = 54;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (boundedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90">
        <circle
          stroke="#e5e7eb"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="#4f46e5"
          fill="transparent"
          strokeLinecap="round"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold text-gray-900">{boundedScore}</p>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Score</p>
      </div>
    </div>
  );
}

function StudentDashboard() {
  const dispatch = useDispatch();
  const { profile, status, source } = useSelector((state) => state.student);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchStudentProfile(FIXED_STUDENT_ID || user?._id || user?.id));
  }, [dispatch, user?._id, user?.id]);

  const loading = status === "loading" || !profile;
  if (loading) {
    return <div className="rounded-xl bg-white p-6 text-gray-700 shadow-sm dark:bg-gray-900 dark:text-gray-200">Loading profile...</div>;
  }

  const readinessScore = Number(profile?.readinessScore ?? 0);
  const dsaSolved = Number(profile?.dsaScore ?? 0);

  return (
    <section className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Student Dashboard</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">
              {profile?.user?.fullName || "Student"} ({profile?.user?.email || "N/A"})
            </p>
          </div>
          {source === "mock" ? (
            <Badge tone="amber">Showing mock data</Badge>
          ) : (
            <Badge tone="emerald">Live data</Badge>
          )}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Placement Readiness</h3>
          <p className="mt-1 text-sm text-gray-500">AI-powered score based on skills and profile signals</p>
          <div className="mt-6 flex justify-center">
            <ProgressRing score={readinessScore} />
          </div>
          <div className="mt-6 rounded-lg bg-indigo-50 p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-indigo-700">Current status</p>
            <p className="text-lg font-semibold text-indigo-900">
              {readinessScore >= 80 ? "Placement Ready" : "Needs Improvement"}
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-base font-semibold text-gray-900">Acquired Badges</h3>
          <p className="mt-1 text-sm text-gray-500">Verified capabilities recognized by assessments</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {profile?.badges?.length ? (
              profile.badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-700"
                >
                  {badge}
                </span>
              ))
            ) : (
              <p className="text-sm text-gray-500">No badges yet</p>
            )}
          </div>
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500">Total badges earned</p>
            <p className="text-2xl font-bold text-gray-900">{profile?.badges?.length ?? 0}</p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
          <h3 className="text-base font-semibold text-gray-900">DSA Progress</h3>
          <p className="mt-1 text-sm text-gray-500">Problem-solving consistency across coding sessions</p>
          <div className="mt-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm font-medium text-blue-700">Total Problems Solved</p>
            <p className="mt-1 text-4xl font-bold text-blue-900">{dsaSolved}</p>
          </div>
          <div className="mt-4 h-2 w-full rounded-full bg-gray-100">
            <div
              className="h-2 rounded-full bg-blue-600"
              style={{ width: `${Math.min(100, Math.max(10, Math.round((dsaSolved / 150) * 100)))}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-500">Target: 150 solved problems for strong placement readiness</p>
        </div>
      </div>
    </section>
  );
}

export default StudentDashboard;
