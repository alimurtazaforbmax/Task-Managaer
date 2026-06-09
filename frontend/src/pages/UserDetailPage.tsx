import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import ReportModal from "../components/ReportModal";
import StatusBadge from "../components/StatusBadge";
import UserAvatar from "../components/UserAvatar";
import WorkItemRow from "../components/WorkItemRow";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, UserSummary } from "../types";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";

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

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [showReport, setShowReport] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["user-summary", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserSummary>>(`/auth/users/${id}/summary/`);
      return unwrap(res);
    },
    enabled: Boolean(id),
  });

  if (currentUser?.role !== "admin") return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-slate-400">Loading profile…</p>;
  if (!summary) return <p className="text-slate-400">User not found.</p>;

  const { user, stats, projects, recent_tasks, recent_bugs } = summary;
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const roleStyle = MEMBER_ROLE_STYLES[user.role] ?? "bg-slate-100 text-slate-700";
  const isActive = user.is_active !== false;

  const reportFilename = `user-report-${user.username}.pdf`;

  return (
    <PageContainer size="lg">
      {showReport && (
        <ReportModal
          url={`/auth/users/${id}/report/`}
          filename={reportFilename}
          onClose={() => setShowReport(false)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/users" label="Users" />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowReport(true)}
            className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-slate-700"
          >
            Generate report
          </button>
          <button
            type="button"
            onClick={() => navigate("/users", { state: { editUser: user } })}
            className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-brand-600"
          >
            Edit profile
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
        <div className="p-6">
          <div className="flex flex-wrap items-start gap-5">
            <UserAvatar
              name={displayName}
              photoUrl={user.profile_picture_url}
              seed={user.id}
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-slate-900">{displayName}</h1>
              <p className="text-slate-500 mt-0.5">@{user.username}</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
                  {formatRoleLabel(user.role)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-slate-500 text-xs">Email</p>
              <p className="font-medium text-slate-800 truncate">{user.email}</p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-slate-500 text-xs">Department</p>
              <p className="font-medium text-slate-800">
                {user.department_name || "No department"}
              </p>
            </div>
            <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
              <p className="text-slate-500 text-xs">Job title</p>
              <p className="font-medium text-slate-800">{user.job_title || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Work summary</h2>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total hours logged"
            value={`${stats.total_hours}h`}
            accent="border-l-brand-500"
            valueClass="text-brand-600"
          />
          <StatCard
            label="Task hours"
            value={`${stats.task_hours}h`}
            accent="border-l-slate-400"
          />
          <StatCard
            label="Bug hours"
            value={`${stats.bug_hours}h`}
            accent="border-l-slate-500"
          />
          <StatCard
            label="Projects"
            value={stats.projects_count}
            accent="border-l-slate-400"
          />
          <StatCard
            label="Open tasks"
            value={stats.open_tasks}
            accent="border-l-brand-500"
            valueClass="text-brand-600"
          />
          <StatCard
            label="Overdue tasks"
            value={stats.overdue_tasks}
            accent="border-l-rose-500"
            valueClass="text-rose-600"
          />
          <StatCard
            label="Completed tasks"
            value={stats.completed_tasks}
            accent="border-l-emerald-500"
            valueClass="text-emerald-700"
          />
          <StatCard
            label="Assigned tasks"
            value={stats.assigned_tasks}
            accent="border-l-slate-300"
          />
          <StatCard
            label="Open bugs"
            value={stats.open_bugs}
            accent="border-l-amber-500"
            valueClass="text-amber-700"
          />
          <StatCard
            label="Completed bugs"
            value={stats.completed_bugs}
            accent="border-l-emerald-500"
            valueClass="text-emerald-700"
          />
          <StatCard
            label="Assigned bugs"
            value={stats.assigned_bugs}
            accent="border-l-slate-300"
          />
          <StatCard
            label="Reported tasks"
            value={stats.reported_tasks}
            accent="border-l-slate-300"
          />
          <StatCard
            label="Reported bugs"
            value={stats.reported_bugs}
            accent="border-l-slate-300"
          />
        </div>
      </section>

      {projects.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg text-slate-900">Projects</h2>
          <ul className="mt-3 space-y-2">
            {projects.map((project) => (
              <li
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-medium text-slate-900">{project.name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{project.code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={project.status} />
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    {formatRoleLabel(project.role)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Recent assigned tasks</h2>
        {recent_tasks.length === 0 ? (
          <p className="text-slate-400 text-sm mt-3">No tasks assigned.</p>
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
        <h2 className="font-semibold text-lg text-slate-900">Recent assigned bugs</h2>
        {recent_bugs.length === 0 ? (
          <p className="text-slate-400 text-sm mt-3">No bugs assigned.</p>
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
    </PageContainer>
  );
}
