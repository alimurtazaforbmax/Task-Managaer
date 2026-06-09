import { useNavigate } from "react-router-dom";
import UserAvatar from "./UserAvatar";
import { formatRoleLabel, MEMBER_ROLE_STYLES } from "../utils/projectStyle";
import type { User } from "../types";

interface UserCardProps {
  readonly user: User;
  readonly onEdit: (user: User) => void;
}

export default function UserCard({ user, onEdit }: UserCardProps) {
  const navigate = useNavigate();
  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;
  const roleStyle = MEMBER_ROLE_STYLES[user.role] ?? "bg-slate-100 text-slate-700";
  const isActive = user.is_active !== false;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/users/${user.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/users/${user.id}`);
        }
      }}
      className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40"
    >
      <div className="h-1 bg-gradient-to-r from-slate-300 to-slate-400" />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <UserAvatar
            name={displayName}
            photoUrl={user.profile_picture_url}
            seed={user.id}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-slate-900 truncate">{displayName}</h2>
            <p className="text-sm text-slate-500">@{user.username}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${roleStyle}`}>
                {formatRoleLabel(user.role)}
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-1.5 text-sm">
          <p className="text-slate-600 truncate">{user.email}</p>
          <p className="text-slate-500">
            {user.department_name ? `Department: ${user.department_name}` : "No department"}
          </p>
          {user.job_title && <p className="text-slate-500">{user.job_title}</p>}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(user);
          }}
          className="mt-4 w-full text-sm border border-slate-200 rounded-lg py-2 font-medium text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition"
        >
          Edit profile
        </button>
      </div>
    </div>
  );
}
