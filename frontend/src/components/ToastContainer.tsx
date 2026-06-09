import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { markNotificationRead } from "../api/notifications";
import { useToast } from "../context/ToastContext";

export default function ToastContainer() {
  const { toasts, dismissToast } = useToast();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const markRead = useMutation({
    mutationFn: (id: number) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  if (!toasts.length) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          onClick={() => {
            dismissToast(toast.id);
            if (toast.notificationId) {
              markRead.mutate(toast.notificationId);
            }
            if (toast.link) navigate(toast.link);
          }}
          className="pointer-events-auto text-left bg-white border border-brand-200 shadow-lg rounded-xl p-4 hover:border-brand-300 transition-colors animate-[slideIn_0.25s_ease-out]"
        >
          <p className="font-semibold text-sm text-slate-900">{toast.title}</p>
          <p className="text-sm text-slate-600 mt-1 line-clamp-3">{toast.message}</p>
          {toast.link && (
            <p className="text-xs text-brand-600 mt-2 font-medium">Click to open</p>
          )}
        </button>
      ))}
    </div>
  );
}
