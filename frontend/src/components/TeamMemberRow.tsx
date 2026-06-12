import { Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { TeamMemberEntry } from "../types";

interface TeamMemberRowProps {
  readonly member: TeamMemberEntry;
  readonly canReport: boolean;
  readonly onReport?: () => void;
}

export default function TeamMemberRow({
  member,
  canReport,
  onReport,
}: TeamMemberRowProps) {
  const user = member.user;
  const stats = member.stats;
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const roleStyle = MEMBER_ROLE_STYLES[user.role ?? ""] ?? "bg-slate-100 text-slate-700";
  const projectLabels = member.project_roles
    .map((r) => r.project_code)
    .slice(0, 3)
    .join(", ");
  const extraProjects =
    member.project_roles.length > 3 ? ` +${member.project_roles.length - 3}` : "";

  return (
    <li className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 p-4">
        <Link
          to={`/users/${user.id}`}
          className="flex items-center gap-3 min-w-0 flex-1 group"
        >
          <UserAvatar
            name={displayName}
            photoUrl={user.profile_picture_url}
            seed={user.id}
            size="md"
          />
          <div className="min-w-0">
            <p className="font-medium text-slate-900 truncate group-hover:text-brand-700">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">@{user.username}</p>
            {member.project_roles.length > 0 && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {projectLabels}
                {extraProjects}
              </p>
            )}
          </div>
        </Link>

        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
            {user.access_role_name ?? formatRoleLabel(user.role)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 lg:min-w-[320px]">
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-slate-900">{stats.hours_logged}h</p>
            <p className="text-[10px] text-slate-500">Hours</p>
          </div>
          <div className="rounded-lg bg-emerald-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-emerald-800">{stats.completed_tasks}</p>
            <p className="text-[10px] text-emerald-600">Tasks done</p>
          </div>
          <div className="rounded-lg bg-sky-50 px-3 py-2 text-center">
            <p className="text-sm font-bold text-sky-800">{stats.open_tasks}</p>
            <p className="text-[10px] text-sky-600">Open tasks</p>
          </div>
          <div
            className={`rounded-lg px-3 py-2 text-center ${
              stats.overdue_tasks ? "bg-rose-50" : "bg-slate-50"
            }`}
          >
            <p
              className={`text-sm font-bold ${
                stats.overdue_tasks ? "text-rose-700" : "text-slate-900"
              }`}
            >
              {stats.overdue_tasks}
            </p>
            <p className="text-[10px] text-slate-500">Overdue</p>
          </div>
        </div>

        <div className="flex gap-2 lg:flex-col lg:min-w-[100px]">
          <Link
            to={`/users/${user.id}`}
            className="flex-1 text-center text-xs font-medium border border-slate-200 rounded-lg px-3 py-2 hover:bg-slate-50"
          >
            View profile
          </Link>
          {canReport && onReport && (
            <button
              type="button"
              onClick={onReport}
              className="flex-1 text-xs font-medium border border-brand-200 text-brand-700 rounded-lg px-3 py-2 hover:bg-brand-50"
            >
              Report
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
