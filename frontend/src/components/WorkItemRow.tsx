import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import { PRIORITY_DOT } from "../utils/projectStyle";

interface WorkItemRowProps {
  readonly title: string;
  readonly subtitle: string;
  readonly status: string;
  readonly priority?: string;
  readonly to: string;
  readonly accentColor: string;
  readonly type: "task" | "bug" | "ticket";
}

export default function WorkItemRow({
  title,
  subtitle,
  status,
  priority,
  to,
  accentColor,
  type,
}: WorkItemRowProps) {
  const priorityDot = priority ? PRIORITY_DOT[priority] ?? "bg-slate-400" : "bg-slate-400";

  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className={`w-1 self-stretch rounded-full ${accentColor}`} />
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 border border-slate-100">
          {type === "task" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            </svg>
          ) : type === "ticket" ? (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86a2 2 0 001.74-3l-6.93-12a2 2 0 00-3.48 0l-6.93 12a2 2 0 001.74 3z" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full shrink-0 ${priorityDot}`} title={priority} />
            <span className="font-medium text-slate-900 truncate group-hover:text-brand-700">
              {title}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </Link>
    </li>
  );
}
