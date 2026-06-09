import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { markNotificationRead } from "../api/notifications";
import type { Notification } from "../types";

interface NotificationListItemProps {
  readonly notification: Notification;
}

export default function NotificationListItem({ notification }: NotificationListItemProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const markRead = useMutation({
    mutationFn: () => markNotificationRead(notification.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const handleOpen = () => {
    if (!notification.is_read && !markRead.isPending) {
      markRead.mutate();
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      className={`w-full text-left p-3 rounded-lg border transition hover:border-brand-300 ${
        notification.is_read ? "bg-slate-50" : "bg-brand-50 border-brand-100"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-medium text-sm">{notification.title}</p>
        {!notification.is_read && (
          <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-brand-600 bg-brand-100 px-1.5 py-0.5 rounded">
            New
          </span>
        )}
      </div>
      <p className="text-sm text-slate-600 mt-0.5">{notification.message}</p>
      {notification.link && (
        <p className="text-xs text-brand-600 mt-2 font-medium">Click to open</p>
      )}
    </button>
  );
}
