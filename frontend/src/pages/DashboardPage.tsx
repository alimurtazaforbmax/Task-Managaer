import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import { markAllNotificationsRead } from "../api/notifications";
import NotificationListItem from "../components/NotificationListItem";
import { useNotifications } from "../hooks/useNotifications";
import { isPushSupported, subscribePushNotifications } from "../utils/pushNotifications";
import type { ApiResponse, DashboardStats } from "../types";

const COLLAPSED_LIMIT = 5;
const EXPANDED_PAGE_SIZE = 50;

export default function DashboardPage() {
  const qc = useQueryClient();
  const pushSupported = isPushSupported();
  const [showAllNotifications, setShowAllNotifications] = useState(false);
  const [pushStatus, setPushStatus] = useState<"idle" | "enabling" | "enabled" | "denied">(
    "idle"
  );

  const { data: stats } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<DashboardStats>>("/dashboard/");
      return unwrap(res);
    },
  });

  const pageSize = showAllNotifications ? EXPANDED_PAGE_SIZE : COLLAPSED_LIMIT;
  const {
    data: notificationData,
    isFetching: notificationsFetching,
    refetch: refetchNotifications,
  } = useNotifications(pageSize);

  const notifications = notificationData?.results ?? [];
  const displayed = showAllNotifications
    ? notifications
    : notifications.slice(0, COLLAPSED_LIMIT);
  const hasMore =
    !showAllNotifications &&
    ((notificationData?.count ?? 0) > COLLAPSED_LIMIT ||
      notifications.length > COLLAPSED_LIMIT);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAllRead = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const cards = [
    {
      label: "My open tasks",
      value: stats?.my_open_tasks ?? 0,
      to: "/tasks",
      accent: "border-l-brand-500",
      valueClass: "text-brand-600",
    },
    {
      label: "My open bugs",
      value: stats?.my_open_bugs ?? 0,
      to: "/bugs",
      accent: "border-l-slate-500",
      valueClass: "text-slate-800",
    },
    {
      label: "Open bugs (projects)",
      value: stats?.project_open_bugs ?? 0,
      to: "/bugs",
      accent: "border-l-slate-400",
      valueClass: "text-slate-700",
    },
    {
      label: "Overdue tasks",
      value: stats?.overdue_tasks ?? 0,
      to: "/tasks",
      accent: "border-l-rose-500",
      valueClass: "text-rose-600",
      labelClass: "text-rose-600",
    },
  ];

  return (
    <div>
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Overview of your work</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className={`bg-white rounded-xl border border-slate-200 border-l-4 ${card.accent} p-5 shadow-sm hover:shadow-md transition`}
          >
            <p className={`text-sm ${card.labelClass ?? "text-slate-500"}`}>{card.label}</p>
            <p className={`text-3xl font-bold mt-2 ${card.valueClass}`}>{card.value}</p>
          </Link>
        ))}
      </div>

      <section className="mt-8 bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-lg">Notifications</h2>
            {unreadCount > 0 && showAllNotifications && (
              <span className="text-xs text-slate-500">{unreadCount} unread</span>
            )}
            <button
              type="button"
              onClick={() => {
                void refetchNotifications();
                void qc.invalidateQueries({ queryKey: ["dashboard"] });
              }}
              disabled={notificationsFetching}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
            >
              {notificationsFetching ? "Refreshing…" : "Refresh"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {showAllNotifications && unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="text-sm border px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                Mark all read
              </button>
            )}
            {pushSupported &&
              Notification.permission !== "granted" &&
              pushStatus !== "enabled" && (
                <button
                  type="button"
                  disabled={pushStatus === "enabling"}
                  onClick={async () => {
                    setPushStatus("enabling");
                    const result = await subscribePushNotifications().catch(
                      () => "denied" as const
                    );
                    setPushStatus(result === "granted" ? "enabled" : "denied");
                  }}
                  className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50"
                >
                  {pushStatus === "enabling" ? "Enabling…" : "Enable browser alerts"}
                </button>
              )}
            {pushSupported && Notification.permission === "granted" && (
              <span className="text-xs text-emerald-600 font-medium">Browser alerts on</span>
            )}
          </div>
        </div>
        {pushStatus === "denied" && (
          <p className="text-sm text-rose-600 mt-2">
            Browser alerts are blocked. Enable them in your browser settings to get desktop
            notifications.
          </p>
        )}
        {!displayed.length ? (
          <p className="text-slate-400 mt-4 text-sm">No notifications yet.</p>
        ) : (
          <>
            <ul className="mt-4 space-y-3">
              {displayed.map((n) => (
                <li key={n.id}>
                  <NotificationListItem notification={n} />
                </li>
              ))}
            </ul>
            {hasMore && (
              <button
                type="button"
                onClick={() => setShowAllNotifications(true)}
                className="mt-4 text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                View more notifications →
              </button>
            )}
            {showAllNotifications && (
              <button
                type="button"
                onClick={() => setShowAllNotifications(false)}
                className="mt-4 text-sm font-medium text-slate-600 hover:text-slate-800"
              >
                Show less
              </button>
            )}
            {showAllNotifications &&
              notificationData &&
              notificationData.count > notifications.length && (
                <p className="text-sm text-slate-500 mt-2">
                  Showing {notifications.length} of {notificationData.count} notifications.
                </p>
              )}
          </>
        )}
      </section>
    </div>
  );
}
