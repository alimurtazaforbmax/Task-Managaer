import { Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { User } from "../types";

interface DepartmentMemberRowProps {
  readonly member: User;
}

export default function DepartmentMemberRow({ member }: DepartmentMemberRowProps) {
  const displayName =
    [member.first_name, member.last_name].filter(Boolean).join(" ") || member.username;
  const roleStyle = MEMBER_ROLE_STYLES[member.role] ?? "bg-slate-100 text-slate-700";
  const isActive = member.is_active !== false;

  return (
    <li>
      <Link
        to={`/users/${member.id}`}
        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex items-center gap-3 min-w-0">
          <UserAvatar
            name={displayName}
            photoUrl={member.profile_picture_url}
            seed={member.id}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">
              {[member.job_title, member.email].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
            {formatRoleLabel(member.role)}
          </span>
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
            }`}
          >
            {isActive ? "Active" : "Inactive"}
          </span>
        </div>
      </Link>
    </li>
  );
}
