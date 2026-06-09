import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import DepartmentMemberRow from "../components/DepartmentMemberRow";
import WorkItemRow from "../components/WorkItemRow";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, DepartmentSummary } from "../types";
import { formatRoleLabel, getProjectInitials, getProjectPalette } from "../utils/projectStyle";

const PERM_TONES: Record<string, { on: string; off: string }> = {
  can_create_tasks: {
    on: "border-sky-200 bg-sky-50 text-sky-800",
    off: "border-slate-200 bg-slate-50 text-slate-400",
  },
  can_create_bugs: {
    on: "border-amber-200 bg-amber-50 text-amber-800",
    off: "border-slate-200 bg-slate-50 text-slate-400",
  },
  can_edit_tasks: {
    on: "border-emerald-200 bg-emerald-50 text-emerald-800",
    off: "border-slate-200 bg-slate-50 text-slate-400",
  },
  can_edit_bugs: {
    on: "border-violet-200 bg-violet-50 text-violet-800",
    off: "border-slate-200 bg-slate-50 text-slate-400",
  },
};

function StatCard({
  label,
  value,
  accent,
  valueClass = "text-slate-900",
}: {
  label: string;
  value: string | number;
  accent: string;
  valueClass?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm border-l-4 ${accent}`}
    >
      <p className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</p>
      <p className="text-xs font-medium text-slate-500 mt-1.5">{label}</p>
    </div>
  );
}

export default function DepartmentDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: summary, isLoading } = useQuery({
    queryKey: ["department-summary", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DepartmentSummary>>(
        `/auth/departments/${id}/summary/`
      );
      return unwrap(res);
    },
    enabled: Boolean(id),
  });

  if (currentUser?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-slate-400">Loading department…</p>;
  if (!summary) return <p className="text-slate-400">Department not found.</p>;

  const { department, permissions, stats, role_breakdown, members, recent_tasks, recent_bugs } =
    summary;
  const palette = getProjectPalette(department.id);
  const enabledCount = permissions.filter((p) => p.enabled).length;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/departments" label="Departments" />
        <button
          type="button"
          onClick={() => navigate("/departments", { state: { editDepartment: department } })}
          className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-brand-600"
        >
          Edit department
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-80`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-sm ${palette.gradient}`}
            >
              {getProjectInitials(department.name)}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{department.name}</h1>
              <p className="text-slate-600 mt-2 leading-relaxed">
                {department.description || "No description yet."}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${palette.softBg} ${palette.text}`}
                >
                  {stats.member_count} members
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {enabledCount} of {permissions.length} permissions
                </span>
                {department.created_at && (
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                    Since {new Date(department.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Permissions</h2>
        <p className="text-sm text-slate-500 mt-1">
          All members of this department inherit these capabilities.
        </p>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {permissions.map((perm) => {
            const tone = PERM_TONES[perm.key] ?? PERM_TONES.can_create_tasks;
            return (
              <div
                key={perm.key}
                className={`rounded-xl border px-4 py-3 flex items-center justify-between ${
                  perm.enabled ? tone.on : tone.off
                }`}
              >
                <span className="text-sm font-medium">{perm.label}</span>
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {perm.enabled ? "Granted" : "Denied"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Overview</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total members"
            value={stats.member_count}
            accent="border-l-brand-500"
            valueClass="text-brand-600"
          />
          <StatCard
            label="Active members"
            value={stats.active_members}
            accent="border-l-emerald-500"
            valueClass="text-emerald-700"
          />
          <StatCard
            label="Inactive members"
            value={stats.inactive_members}
            accent="border-l-slate-400"
          />
          <StatCard
            label="Open member tasks"
            value={stats.member_open_tasks}
            accent="border-l-brand-500"
            valueClass="text-brand-600"
          />
          <StatCard
            label="Open member bugs"
            value={stats.member_open_bugs}
            accent="border-l-amber-500"
            valueClass="text-amber-700"
          />
          <StatCard
            label="Dept-assigned tasks"
            value={stats.department_tasks}
            accent="border-l-slate-400"
          />
          <StatCard
            label="Open dept tasks"
            value={stats.open_department_tasks}
            accent="border-l-slate-500"
          />
          <StatCard
            label="Dept-assigned bugs"
            value={stats.department_bugs}
            accent="border-l-slate-400"
          />
          <StatCard
            label="Open dept bugs"
            value={stats.open_department_bugs}
            accent="border-l-rose-500"
            valueClass="text-rose-600"
          />
        </div>
      </section>

      {Object.keys(role_breakdown).length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg text-slate-900">Roles in department</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {Object.entries(role_breakdown).map(([role, count]) => (
              <span
                key={role}
                className="rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-sm text-slate-700"
              >
                {formatRoleLabel(role)} · {count}
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">
          Members ({members.length})
        </h2>
        {members.length === 0 ? (
          <p className="text-slate-400 text-sm mt-3">No users assigned to this department.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {members.map((member) => (
              <DepartmentMemberRow key={member.id} member={member} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Recent member tasks</h2>
        {recent_tasks.length === 0 ? (
          <p className="text-slate-400 text-sm mt-3">No tasks assigned to department members.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent_tasks.map((task) => (
              <WorkItemRow
                key={task.id}
                title={task.title}
                subtitle={[task.project_name, task.priority, task.due_date ? `due ${task.due_date}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
                status={task.status}
                priority={task.priority}
                to={`/tasks/${task.id}`}
                accentColor="bg-slate-400"
                type="task"
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Recent member bugs</h2>
        {recent_bugs.length === 0 ? (
          <p className="text-slate-400 text-sm mt-3">No bugs assigned to department members.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recent_bugs.map((bug) => (
              <WorkItemRow
                key={bug.id}
                title={bug.title}
                subtitle={[bug.project_name, bug.severity, bug.due_date ? `due ${bug.due_date}` : ""]
                  .filter(Boolean)
                  .join(" · ")}
                status={bug.status}
                priority={bug.severity}
                to={`/bugs/${bug.id}`}
                accentColor="bg-slate-500"
                type="bug"
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
