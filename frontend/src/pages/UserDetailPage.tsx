import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import ReportModal from "../components/ReportModal";
import ReportPeriodSelect, {
  createReportPeriodState,
  type ReportPeriodState,
} from "../components/ReportPeriodSelect";
import ReportProjectFilter from "../components/ReportProjectFilter";
import StatusBadge from "../components/StatusBadge";
import UserAvatar from "../components/UserAvatar";
import WorkItemRow from "../components/WorkItemRow";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { appendReportQueryParams } from "../utils/reportQuery";
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
  const permissions = usePermissions();
  const [showReport, setShowReport] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<ReportPeriodState>(
    createReportPeriodState
  );
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);

  const isSelf = currentUser?.id === Number(id);
  const canView =
    currentUser?.role === "admin" ||
    permissions.can_view_user_details ||
    isSelf;
  const canReport =
    currentUser?.role === "admin" ||
    permissions.can_generate_user_reports ||
    isSelf;
  const canEdit = currentUser?.role === "admin" || permissions.can_manage_users;

  const summaryUrl = appendReportQueryParams(`/auth/users/${id}/summary/`, {
    period: reportPeriod.period,
    reference: reportPeriod.reference,
    projects: selectedProjects,
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["user-summary", id, reportPeriod, selectedProjects],
    queryFn: async () => {
      const res = await api.get<ApiResponse<UserSummary>>(summaryUrl);
      return unwrap(res);
    },
    enabled: Boolean(id) && canView,
  });

  if (!canView) return <Navigate to="/" replace />;
  if (isLoading) return <p className="text-slate-400">Loading profile…</p>;
  if (!summary) return <p className="text-slate-400">User not found.</p>;

  const { user, stats, projects, recent_tasks, recent_bugs, project_breakdown } =
    summary;
  const filterProjects = summary.available_projects ?? projects;
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const roleStyle = MEMBER_ROLE_STYLES[user.role ?? ""] ?? "bg-slate-100 text-slate-700";
  const isActive = user.is_active !== false;

  const projectSuffix =
    selectedProjects.length > 0 ? `-p${selectedProjects.join("-")}` : "";
  const reportFilename = `user-report-${user.username}-${reportPeriod.period}${projectSuffix}.pdf`;

  return (
    <PageContainer size="lg">
      {showReport && canReport && (
        <ReportModal
          url={`/auth/users/${id}/report/`}
          filename={reportFilename}
          periodState={reportPeriod}
          onPeriodStateChange={setReportPeriod}
          projects={filterProjects}
          selectedProjects={selectedProjects}
          onProjectsChange={setSelectedProjects}
          onClose={() => setShowReport(false)}
        />
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/users" label="Users" />
        <div className="flex flex-wrap items-end gap-3">
          <ReportPeriodSelect value={reportPeriod} onChange={setReportPeriod} />
          {canReport && (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              className="text-sm border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-slate-700"
            >
              Generate report
            </button>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => navigate("/users", { state: { editUser: user } })}
              className="text-sm border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-brand-600"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      {filterProjects.length > 0 && (
        <div className="mt-4">
          <ReportProjectFilter
            projects={filterProjects}
            selected={selectedProjects}
            onChange={setSelectedProjects}
          />
        </div>
      )}

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
                  {user.access_role_name ?? formatRoleLabel(user.role)}
                </span>
                <StatusBadge status={isActive ? "active" : "inactive"} />
              </div>
              <p className="text-sm text-slate-500 mt-3">
                Showing <span className="font-medium text-slate-700">{summary.period_label ?? reportPeriod.period}</span> stats
                {summary.period_start && summary.period_end
                  ? ` (${summary.period_start} – ${summary.period_end})`
                  : ""}
                {selectedProjects.length > 0 && (
                  <span> · {selectedProjects.length} project(s) selected</span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">
          Total{selectedProjects.length > 0 ? " (selected projects)" : ""}
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Hours logged" value={`${stats.total_hours}h`} accent="border-slate-400" />
          <StatCard label="Task hours" value={`${stats.task_hours}h`} accent="border-sky-400" />
          <StatCard label="Bug hours" value={`${stats.bug_hours}h`} accent="border-amber-400" />
          <StatCard label="Tasks completed" value={stats.completed_tasks} accent="border-emerald-400" />
          <StatCard label="Bugs closed" value={stats.completed_bugs} accent="border-emerald-400" />
          <StatCard label="Open tasks" value={stats.open_tasks} accent="border-sky-300" />
          <StatCard label="Open bugs" value={stats.open_bugs} accent="border-amber-300" />
          <StatCard label="Projects in scope" value={stats.projects_count} accent="border-violet-400" />
        </div>
      </section>

      {project_breakdown && project_breakdown.length > 0 && (
        <section className="mt-10">
          <h2 className="font-semibold text-lg text-slate-900">Work by project</h2>
          <p className="text-sm text-slate-500 mt-1">
            Hours and completions for each project in the selected period.
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Project</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Hours</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Task hrs</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Bug hrs</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Tasks done</th>
                  <th className="text-right px-4 py-3 font-medium text-slate-600">Bugs closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {project_breakdown.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{row.name}</p>
                      <p className="text-xs text-slate-500 font-mono">{row.code}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{row.hours_logged}h</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.task_hours}h</td>
                    <td className="px-4 py-3 text-right text-slate-600">{row.bug_hours}h</td>
                    <td className="px-4 py-3 text-right">{row.completed_tasks}</td>
                    <td className="px-4 py-3 text-right">{row.completed_bugs}</td>
                  </tr>
                ))}
                <tr className="bg-brand-50/50 font-semibold">
                  <td className="px-4 py-3 text-slate-900">Total</td>
                  <td className="px-4 py-3 text-right">{stats.total_hours}h</td>
                  <td className="px-4 py-3 text-right">{stats.task_hours}h</td>
                  <td className="px-4 py-3 text-right">{stats.bug_hours}h</td>
                  <td className="px-4 py-3 text-right">{stats.completed_tasks}</td>
                  <td className="px-4 py-3 text-right">{stats.completed_bugs}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="mt-10">
        <h2 className="font-semibold text-lg text-slate-900">Recent tasks</h2>
        <ul className="mt-3 space-y-2">
          {recent_tasks.length ? (
            recent_tasks.map((t) => (
              <WorkItemRow
                key={t.id}
                title={t.title}
                subtitle={[t.project_name, t.priority].filter(Boolean).join(" · ")}
                status={t.status}
                priority={t.priority}
                to={`/tasks/${t.id}`}
                accentColor="bg-brand-500"
                type="task"
              />
            ))
          ) : (
            <p className="text-sm text-slate-400">No recent tasks in this period.</p>
          )}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg text-slate-900">Recent bugs</h2>
        <ul className="mt-3 space-y-2">
          {recent_bugs.length ? (
            recent_bugs.map((b) => (
              <WorkItemRow
                key={b.id}
                title={b.title}
                subtitle={[b.project_name, b.severity].filter(Boolean).join(" · ")}
                status={b.status}
                priority={b.severity}
                to={`/bugs/${b.id}`}
                accentColor="bg-slate-500"
                type="bug"
              />
            ))
          ) : (
            <p className="text-sm text-slate-400">No recent bugs in this period.</p>
          )}
        </ul>
      </section>
    </PageContainer>
  );
}
