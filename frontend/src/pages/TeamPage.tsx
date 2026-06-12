import { useEffect, useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PageContainer from "../components/PageContainer";
import ReportModal from "../components/ReportModal";
import ReportPeriodSelect, {
  createReportPeriodState,
  type ReportPeriodState,
} from "../components/ReportPeriodSelect";
import SearchInput from "../components/SearchInput";
import TeamMemberRow from "../components/TeamMemberRow";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { appendReportQueryParams } from "../utils/reportQuery";
import type { ApiResponse, TeamSummary, User } from "../types";

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

export default function TeamPage() {
  const { user: currentUser } = useAuth();
  const permissions = usePermissions();
  const canView = currentUser?.role === "admin" || permissions.can_view_team;
  const canReport =
    currentUser?.role === "admin" || permissions.can_generate_user_reports;

  const [reportPeriod, setReportPeriod] = useState<ReportPeriodState>(
    createReportPeriodState
  );
  const [searchParams] = useSearchParams();
  const initialProject = searchParams.get("project");
  const [projectId, setProjectId] = useState<number | "">(
    initialProject && /^\d+$/.test(initialProject) ? Number(initialProject) : ""
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    const raw = searchParams.get("project");
    if (raw && /^\d+$/.test(raw)) {
      setProjectId(Number(raw));
    }
  }, [searchParams]);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [reportUser, setReportUser] = useState<User | null>(null);

  const summaryUrl = useMemo(() => {
    const params: {
      period?: string;
      reference?: string;
      search?: string;
      project?: string;
    } = {
      period: reportPeriod.period,
      reference: reportPeriod.reference,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (projectId !== "") params.project = String(projectId);
    return appendReportQueryParams("/auth/team/summary/", params);
  }, [reportPeriod, debouncedSearch, projectId]);

  const { data: summary, isLoading } = useQuery({
    queryKey: ["team-summary", reportPeriod, debouncedSearch, projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TeamSummary>>(summaryUrl);
      return unwrap(res);
    },
    enabled: canView,
  });

  if (!canView) return <Navigate to="/" replace />;

  const stats = summary?.stats;
  const members = summary?.members ?? [];
  const projects = summary?.projects ?? [];

  const reportFilename = reportUser
    ? `user-report-${reportUser.username}-${reportPeriod.period}.pdf`
    : "user-report.pdf";

  return (
    <PageContainer size="lg">
      {reportUser && (
        <ReportModal
          url={`/auth/users/${reportUser.id}/report/`}
          filename={reportFilename}
          periodState={reportPeriod}
          onPeriodStateChange={setReportPeriod}
          onClose={() => setReportUser(null)}
        />
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="text-sm text-slate-500 mt-1">
            People across your projects — progress, workload, and reports.
          </p>
        </div>
        <ReportPeriodSelect value={reportPeriod} onChange={setReportPeriod} />
      </div>

      {summary?.period_label && (
        <p className="text-sm text-slate-500 mt-3">
          Showing <span className="font-medium text-slate-700">{summary.period_label}</span>
          {summary.period_start && summary.period_end
            ? ` (${summary.period_start} – ${summary.period_end})`
            : ""}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="block space-y-1 min-w-[200px]">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Project
          </span>
          <select
            value={projectId}
            onChange={(e) =>
              setProjectId(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">All my projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1 flex-1 min-w-[200px]">
          <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Search
          </span>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search team members…"
          />
        </label>
      </div>

      {isLoading ? (
        <p className="text-slate-400 mt-8">Loading team…</p>
      ) : (
        <>
          {stats && (
            <section className="mt-8">
              <h2 className="font-semibold text-lg text-slate-900">Team overview</h2>
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                <StatCard
                  label="Members"
                  value={stats.member_count}
                  accent="border-violet-400"
                />
                <StatCard
                  label="Hours logged"
                  value={`${stats.hours_logged}h`}
                  accent="border-slate-400"
                />
                <StatCard
                  label="Tasks completed"
                  value={stats.completed_tasks}
                  accent="border-emerald-400"
                />
                <StatCard
                  label="Open tasks"
                  value={stats.open_tasks}
                  accent="border-sky-400"
                />
                <StatCard
                  label="Overdue tasks"
                  value={stats.overdue_tasks}
                  accent="border-rose-400"
                  valueClass={stats.overdue_tasks ? "text-rose-600" : undefined}
                />
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg text-slate-900">
                Team members
                {members.length > 0 && (
                  <span className="text-slate-400 font-normal text-base ml-2">
                    ({members.length})
                  </span>
                )}
              </h2>
            </div>
            <ul className="mt-3 space-y-3">
              {members.length ? (
                members.map((entry) => (
                  <TeamMemberRow
                    key={entry.user.id}
                    member={entry}
                    canReport={canReport}
                    onReport={() => setReportUser(entry.user)}
                  />
                ))
              ) : (
                <p className="text-sm text-slate-400 py-8 text-center rounded-xl border border-dashed border-slate-200">
                  {projects.length === 0
                    ? "You are not a member of any projects yet."
                    : "No team members match your filters."}
                </p>
              )}
            </ul>
          </section>
        </>
      )}
    </PageContainer>
  );
}
