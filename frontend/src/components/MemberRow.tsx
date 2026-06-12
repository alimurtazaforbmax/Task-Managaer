import { Link } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { ProjectMember } from "../types";

interface MemberRowProps {
  readonly member: ProjectMember;
  readonly linkToProfile?: boolean;
}

export default function MemberRow({ member, linkToProfile = false }: MemberRowProps) {
  const detail = member.user_detail;
  const displayName =
    [detail?.first_name, detail?.last_name].filter(Boolean).join(" ") ||
    detail?.username ||
    `User #${member.user}`;
  const roleKey = detail?.role ?? member.role;
  const roleStyle = MEMBER_ROLE_STYLES[roleKey] ?? "bg-slate-100 text-slate-700";

  const content = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar
          name={displayName}
          photoUrl={detail?.profile_picture_url}
          seed={member.user}
          size="sm"
        />
        <span
          className={`text-sm font-medium truncate ${
            linkToProfile ? "text-slate-800 group-hover:text-brand-700" : "text-slate-800"
          }`}
        >
          {displayName}
        </span>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
        {formatRoleLabel(roleKey)}
      </span>
    </>
  );

  if (linkToProfile && member.user) {
    return (
      <li>
        <Link
          to={`/users/${member.user}`}
          className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300 hover:shadow-md"
        >
          {content}
        </Link>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      {content}
    </li>
  );
}
