import UserAvatar from "./UserAvatar";
import { formatRoleLabel } from "../utils/projectStyle";
import type { User } from "../types";

interface SidebarUserPanelProps {
  readonly user: User;
  readonly onLogout: () => void;
}

export default function SidebarUserPanel({ user, onLogout }: SidebarUserPanelProps) {
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  return (
    <div className="p-4 border-t border-slate-700 space-y-3">
      <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-3 shadow-inner">
        <div className="flex items-center gap-3">
          <UserAvatar
            name={displayName}
            photoUrl={user.profile_picture_url}
            seed={user.id}
            size="md"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-xs text-brand-300 font-medium truncate">
              {formatRoleLabel(user.role)}
            </p>
          </div>
        </div>
        <div className="mt-3 space-y-1 border-t border-slate-700/80 pt-3">
          <p className="text-[11px] text-slate-500 uppercase tracking-wide">Email</p>
          <p className="text-xs text-slate-300 truncate">{user.email}</p>
          {user.department_name && (
            <>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mt-2">Department</p>
              <p className="text-xs text-slate-300 truncate">{user.department_name}</p>
            </>
          )}
          {user.job_title && (
            <>
              <p className="text-[11px] text-slate-500 uppercase tracking-wide mt-2">Title</p>
              <p className="text-xs text-slate-300 truncate">{user.job_title}</p>
            </>
          )}
        </div>
      </div>
      <button
        type="button"
        onClick={onLogout}
        className="w-full text-sm text-slate-400 hover:text-white rounded-lg py-2 hover:bg-slate-800 transition"
      >
        Sign out
      </button>
    </div>
  );
}
