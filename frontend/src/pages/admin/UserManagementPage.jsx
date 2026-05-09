import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAdminUsers, updateUserRole, toggleUserActive } from "../../store/slices/adminSlice";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Modal from "../../components/ui/Modal";
import Toast from "../../components/ui/Toast";

const ROLE_COLORS = { student: "indigo", admin: "emerald", mentor: "amber" };

function UserManagementPage() {
  const dispatch = useDispatch();
  const { users, usersStatus, source } = useSelector(s => s.admin);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [toast, setToast] = useState("");
  const [toastTone, setToastTone] = useState("success");

  useEffect(() => { dispatch(fetchAdminUsers()); }, [dispatch]);

  function showToast(msg, tone = "success") {
    setToast(msg); setToastTone(tone);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleRoleUpdate() {
    if (!editUser || !newRole) return;
    const result = await dispatch(updateUserRole({ userId: editUser._id, role: newRole }));
    if (!result.error) showToast(`Role updated to ${newRole}`);
    else showToast("Failed to update role", "error");
    setEditUser(null);
  }

  async function handleToggleActive(user) {
    const result = await dispatch(toggleUserActive({ userId: user._id, isActive: !user.isActive }));
    if (!result.error) showToast(`User ${user.isActive ? "suspended" : "activated"}`);
    else showToast("Failed to update status", "error");
  }

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = { all: users.length, student: users.filter(u => u.role === "student").length, admin: users.filter(u => u.role === "admin").length, mentor: users.filter(u => u.role === "mentor").length };

  return (
    <section className="space-y-6">
      <Toast message={toast} tone={toastTone} />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">User Management</h2>
            <p className="mt-1 text-gray-600 dark:text-gray-300">Manage roles, status, and access for all platform users.</p>
          </div>
          {source === "mock" && <Badge tone="amber">Mock data</Badge>}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Users", value: counts.all, color: "text-gray-900 dark:text-gray-100" },
          { label: "Students", value: counts.student, color: "text-indigo-600" },
          { label: "Admins", value: counts.admin, color: "text-emerald-600" },
          { label: "Mentors", value: counts.mentor, color: "text-amber-600" },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
            <p className="text-xs text-gray-500">{label}</p>
            <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or email..."
          className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <div className="flex gap-1">
          {["all", "student", "admin", "mentor"].map(r => (
            <button key={r} type="button" onClick={() => setRoleFilter(r)}
              className={`rounded-lg px-3 py-2 text-sm font-semibold capitalize transition ${roleFilter === r ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"}`}>
              {r} {r !== "all" && `(${counts[r]})`}
            </button>
          ))}
        </div>
      </div>

      {/* User table */}
      <Card>
        {usersStatus === "loading" ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-gray-400">No users match your search.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 dark:divide-gray-800">
              <thead>
                <tr>
                  {["User", "Role", "Status", "Verified", "Joined", "Actions"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filtered.map(user => (
                  <tr key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.firstName} {user.lastName}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={ROLE_COLORS[user.role] ?? "slate"}>{user.role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"}`}>
                        {user.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${user.isEmailVerified ? "text-emerald-600" : "text-gray-400"}`}>
                        {user.isEmailVerified ? "✓" : "✗"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => { setEditUser(user); setNewRole(user.role); }}
                          className="rounded bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-300"
                        >
                          Edit Role
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user)}
                          className={`rounded px-2 py-1 text-xs font-semibold ${user.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}
                        >
                          {user.isActive ? "Suspend" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Edit role modal */}
      <Modal isOpen={Boolean(editUser)} title={`Edit Role — ${editUser?.firstName} ${editUser?.lastName}`} onClose={() => setEditUser(null)}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">{editUser?.email}</p>
          <label className="block">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">New Role</span>
            <select
              value={newRole}
              onChange={e => setNewRole(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="student">Student</option>
              <option value="admin">Admin</option>
              <option value="mentor">Mentor</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditUser(null)} className="flex-1">Cancel</Button>
            <Button onClick={handleRoleUpdate} className="flex-1">Update Role</Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}

export default UserManagementPage;
