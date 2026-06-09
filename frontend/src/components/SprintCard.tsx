import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { getProjectPalette } from "../utils/projectStyle";
import type { Sprint } from "../types";

interface SprintCardProps {
  readonly sprint: Sprint;
}

export default function SprintCard({ sprint }: SprintCardProps) {
  const palette = getProjectPalette(sprint.project);
  const done = sprint.completed_task_count ?? 0;
  const total = sprint.task_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      to={`/sprints/${sprint.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`h-1 w-full bg-gradient-to-r ${palette.gradient} opacity-80`} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-lg text-slate-900 truncate group-hover:text-brand-700">
              {sprint.name}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">{sprint.project_name}</p>
          </div>
          <StatusBadge status={sprint.status} />
        </div>
        {sprint.goal && (
          <p className="text-sm text-slate-600 mt-3 line-clamp-2">{sprint.goal}</p>
        )}
        <p className="text-xs text-slate-500 mt-3 font-medium">
          {sprint.start_date} → {sprint.end_date}
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{done}/{total} tasks</span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
