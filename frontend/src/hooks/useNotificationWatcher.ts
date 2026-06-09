import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "../context/ToastContext";
import { useNotifications } from "./useNotifications";
import type { Notification } from "../types";

function showNewNotificationToasts(
  notifications: Notification[],
  seenIds: Set<number>,
  initialized: boolean,
  showToast: (toast: {
    title: string;
    message: string;
    link?: string;
    notificationId?: number;
  }) => void
): boolean {
  if (!initialized) {
    notifications.forEach((n) => seenIds.add(n.id));
    return true;
  }

  const newItems = notifications.filter((n) => !seenIds.has(n.id));
  newItems.forEach((n) => {
    seenIds.add(n.id);
    showToast({
      title: n.title,
      message: n.message,
      link: n.link || undefined,
      notificationId: n.id,
    });
  });
  return initialized;
}

export function useNotificationWatcher(enabled: boolean) {
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const { data } = useNotifications();
  const notifications = data?.results;
  const seenIdsRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !notifications) return;

    initializedRef.current = showNewNotificationToasts(
      notifications,
      seenIdsRef.current,
      initializedRef.current,
      showToast
    );
  }, [enabled, notifications, showToast]);

  useEffect(() => {
    if (!enabled) return;

    const onMessage = (event: MessageEvent) => {
      if (event.data?.type !== "PUSH_NOTIFICATION") return;
      void queryClient.refetchQueries({ queryKey: ["notifications"] });
    };

    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [enabled, queryClient, showToast]);

  useEffect(() => {
    if (!enabled) {
      seenIdsRef.current.clear();
      initializedRef.current = false;
    }
  }, [enabled]);
}
