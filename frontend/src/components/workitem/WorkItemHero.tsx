import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import StatusBadge from "../StatusBadge";
import UserAvatar from "../UserAvatar";
import { PRIORITY_DOT } from "../../utils/projectStyle";
import type { User } from "../../types";

const TYPE_STYLES = {
  task: {
    gradient: "from-sky-500 to-indigo-600",
    softBg: "bg-sky-50",
    border: "border-sky-100",
    iconBg: "from-sky-500 to-indigo-600",
    label: "Task",
  },
  bug: {
    gradient: "from-amber-500 to-rose-600",
    softBg: "bg-amber-50",
    border: "border-amber-100",
    iconBg: "from-amber-500 to-rose-600",
    label: "Bug",
  },
};

function TaskIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  );
}

function BugIcon() {
  return (
    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" />
    </svg>
  );
}

interface WorkItemHeroProps {
  readonly type: "task" | "bug";
  readonly title: string;
  readonly status: string;
  readonly description?: string;
  readonly projectId?: number;
  readonly projectName?: string;
  readonly priority?: string;
  readonly severity?: string;
  readonly taskType?: string;
  readonly dueDate?: string | null;
  readonly environment?: string;
  readonly reporter?: User;
  readonly assignees?: User[];
  readonly actions?: ReactNode;
  readonly children?: ReactNode;
}

function personName(user?: User): string {
  if (!user) return "—";
  return [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
}

export default function WorkItemHero({
  type,
  title,
  status,
  description,
  projectId,
  projectName,
  priority,
  severity,
  taskType,
  dueDate,
  environment,
  reporter,
  assignees,
  actions,
  children,
}: WorkItemHeroProps) {
  const style = TYPE_STYLES[type];
  const priorityKey = type === "bug" ? severity : priority;
  const priorityDot = priorityKey ? PRIORITY_DOT[priorityKey] ?? "bg-slate-400" : "bg-slate-400";
  const isOverdue =
    dueDate && new Date(dueDate) < new Date() && !["done", "cancelled", "closed", "rejected"].includes(status);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${style.gradient} opacity-80`} />
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-sm ${style.iconBg}`}
            >
              {type === "task" ? <TaskIcon /> : <BugIcon />}
            </div>
            <div className="min-w-0">
              <span className={`text-xs font-semibold uppercase tracking-wide inline-block rounded-full border px-2 py-0.5 ${style.softBg} ${style.border} text-slate-600`}>
                {style.label}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 mt-2 leading-tight">{title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <StatusBadge status={status} />
                {priorityKey && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                    <span className={`h-2 w-2 rounded-full ${priorityDot}`} />
                    {type === "bug" ? `${severity} severity` : `${priority} priority`}
                  </span>
                )}
                {taskType && (
                  <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-medium text-indigo-700 capitalize">
                    {taskType.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          </div>
          {actions}
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {projectName && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Project</p>
              {projectId ? (
                <Link to={`/projects/${projectId}`} className="text-sm font-medium text-brand-600 hover:underline truncate block mt-0.5">
                  {projectName}
                </Link>
              ) : (
                <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{projectName}</p>
              )}
            </div>
          )}
          {dueDate && (
            <div className={`rounded-lg border px-3 py-2 ${isOverdue ? "border-rose-200 bg-rose-50" : "border-slate-100 bg-slate-50"}`}>
              <p className={`text-[11px] font-medium uppercase tracking-wide ${isOverdue ? "text-rose-600" : "text-slate-500"}`}>
                Due date
              </p>
              <p className={`text-sm font-medium mt-0.5 ${isOverdue ? "text-rose-700" : "text-slate-800"}`}>
                {dueDate}{isOverdue ? " · Overdue" : ""}
              </p>
            </div>
          )}
          {environment && (
            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Environment</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{environment}</p>
            </div>
          )}
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Reporter</p>
            <div className="flex items-center gap-2 mt-1">
              {reporter && (
                <UserAvatar name={personName(reporter)} photoUrl={reporter.profile_picture_url} seed={reporter.id} size="sm" />
              )}
              <p className="text-sm font-medium text-slate-800 truncate">{personName(reporter)}</p>
            </div>
          </div>
          <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 sm:col-span-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Assignees</p>
            {assignees?.length ? (
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {assignees.map((u) => (
                  <span key={u.id} className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
                    <UserAvatar name={personName(u)} photoUrl={u.profile_picture_url} seed={u.id} size="sm" />
                    {personName(u)}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 mt-0.5">Unassigned</p>
            )}
          </div>
        </div>

        {description && (
          <div className={`mt-5 rounded-xl border ${style.border} ${style.softBg} p-4`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Description</p>
            <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{description}</p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
