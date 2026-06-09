import { useQuery } from "@tanstack/react-query";
import { fetchUnreadNotificationCount } from "../api/notifications";

export function useUnreadNotifications(enabled = true) {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: fetchUnreadNotificationCount,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    enabled,
  });
}
