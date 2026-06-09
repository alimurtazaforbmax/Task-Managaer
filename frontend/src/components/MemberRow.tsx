import UserAvatar from "./UserAvatar";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { ProjectMember } from "../types";

interface MemberRowProps {
  readonly member: ProjectMember;
}

export default function MemberRow({ member }: MemberRowProps) {
  const detail = member.user_detail;
  const displayName =
    [detail?.first_name, detail?.last_name].filter(Boolean).join(" ") ||
    detail?.username ||
    `User #${member.user}`;
  const roleKey = detail?.role ?? member.role;
  const roleStyle = MEMBER_ROLE_STYLES[roleKey] ?? "bg-slate-100 text-slate-700";

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <UserAvatar
          name={displayName}
          photoUrl={detail?.profile_picture_url}
          seed={member.user}
          size="sm"
        />
        <span className="text-sm font-medium text-slate-800 truncate">{displayName}</span>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
        {formatRoleLabel(roleKey)}
      </span>
    </li>
  );
}
