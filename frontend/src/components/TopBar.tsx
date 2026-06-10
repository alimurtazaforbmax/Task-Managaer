import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { markAllNotificationsRead } from "../api/notifications";
import NotificationListItem from "./NotificationListItem";
import UserAvatar from "./UserAvatar";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../hooks/useNotifications";
import { useUnreadNotifications } from "../hooks/useUnreadNotifications";
import { formatRoleLabel } from "../utils/projectStyle";

interface TopBarProps {
  readonly onLogout: () => void;
}

export default function TopBar({ onLogout }: TopBarProps) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);

  const { data: notificationData, isFetching } = useNotifications(10);
  const { data: unreadTotal = 0 } = useUnreadNotifications();
  const notifications = notificationData?.results ?? [];

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!user) return null;

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(" ") || user.username;

  const closeMenus = () => {
    setNotificationsOpen(false);
    setProfileOpen(false);
  };

  return (
    <header
      ref={barRef}
      className="sticky top-0 z-30 flex items-center justify-end gap-2 border-b border-slate-200 bg-white/95 backdrop-blur px-4 sm:px-6 lg:px-8 py-3 shrink-0"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setProfileOpen(false);
            setNotificationsOpen((open) => !open);
          }}
          className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100 transition"
          aria-label="Notifications"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {unreadTotal > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unreadTotal > 99 ? "99+" : unreadTotal}
            </span>
          )}
        </button>

        {notificationsOpen && (
          <div className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="font-semibold text-slate-900">Notifications</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending || unreadTotal === 0}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50 disabled:text-slate-400"
                >
                  Mark all read
                </button>
                <button
                  type="button"
                  onClick={() => {
                    qc.invalidateQueries({ queryKey: ["notifications"] });
                    qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
                  }}
                  disabled={isFetching}
                  className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
                >
                  {isFetching ? "…" : "Refresh"}
                </button>
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto p-3 space-y-2">
              {notifications.length === 0 ? (
                <p className="text-sm text-slate-400 px-2 py-4 text-center">No notifications yet.</p>
              ) : (
                notifications.map((n) => (
                  <NotificationListItem
                    key={n.id}
                    notification={n}
                    onAction={closeMenus}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotificationsOpen(false);
            setProfileOpen((open) => !open);
          }}
          className="flex items-center gap-2 rounded-lg p-1.5 hover:bg-slate-100 transition"
          aria-label="User profile"
        >
          <UserAvatar
            name={displayName}
            photoUrl={user.profile_picture_url}
            seed={user.id}
            size="sm"
          />
          <span className="hidden sm:block text-sm font-medium text-slate-700 max-w-[8rem] truncate">
            {displayName}
          </span>
        </button>

        {profileOpen && (
          <div className="absolute right-0 mt-2 w-72 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 px-4 py-4">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={displayName}
                  photoUrl={user.profile_picture_url}
                  seed={user.id}
                  size="md"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-white truncate">{displayName}</p>
                  <p className="text-xs text-brand-300 font-medium truncate">
                    {user.access_role_name ?? formatRoleLabel(user.role)}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3 text-sm">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="text-slate-700 truncate mt-0.5">{user.email}</p>
              </div>
              {user.department_name && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Department
                  </p>
                  <p className="text-slate-700 truncate mt-0.5">{user.department_name}</p>
                </div>
              )}
              {user.job_title && (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Job title
                  </p>
                  <p className="text-slate-700 truncate mt-0.5">{user.job_title}</p>
                </div>
              )}
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                Username
              </p>
              <p className="text-slate-700 truncate">@{user.username}</p>
            </div>
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  closeMenus();
                  onLogout();
                }}
                className="w-full rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 transition text-left"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
