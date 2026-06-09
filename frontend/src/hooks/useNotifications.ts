import { useQuery } from "@tanstack/react-query";
import { fetchNotifications } from "../api/notifications";

export function useNotifications(pageSize = 15) {
  return useQuery({
    queryKey: ["notifications", pageSize],
    queryFn: () => fetchNotifications(pageSize),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
  });
}
