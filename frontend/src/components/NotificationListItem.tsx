import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { markNotificationRead } from "../api/notifications";
import {
  isExternalNotificationLink,
  resolveNotificationPath,
} from "../utils/notificationLink";
import type { Notification } from "../types";

interface NotificationListItemProps {
  readonly notification: Notification;
  readonly onAction?: () => void;
}

export default function NotificationListItem({
  notification,
  onAction,
}: NotificationListItemProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const markRead = useMutation({
    mutationFn: () => markNotificationRead(notification.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
  });

  const handleMarkRead = () => {
    if (notification.is_read || markRead.isPending) return;
    markRead.mutate();
  };

  const handleOpen = () => {
    const path = resolveNotificationPath(notification.link);
    if (!path) return;

    if (!notification.is_read && !markRead.isPending) {
      markRead.mutate();
    }

    if (isExternalNotificationLink(path)) {
      globalThis.location.assign(path);
    } else {
      navigate(path);
    }
    onAction?.();
  };

  return (
    <div
      className={`rounded-lg border p-3 transition ${
        notification.is_read
          ? "bg-slate-50 border-slate-200"
          : "bg-brand-50 border-brand-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm text-slate-900">{notification.title}</p>
        {!notification.is_read && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded">
            New
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!notification.is_read && (
          <button
            type="button"
            onClick={handleMarkRead}
            disabled={markRead.isPending}
            className="text-xs font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            {markRead.isPending ? "Marking…" : "Mark as read"}
          </button>
        )}
        {notification.link && (
          <button
            type="button"
            onClick={handleOpen}
            className="text-xs font-medium text-brand-600 hover:text-brand-700"
          >
            Open
          </button>
        )}
      </div>
    </div>
  );
}
