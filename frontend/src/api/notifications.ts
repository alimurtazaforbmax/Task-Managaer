import api, { unwrap } from "./client";
import type { ApiResponse, Notification, Paginated } from "../types";

export interface NotificationsResult {
  results: Notification[];
  count: number;
}

export async function fetchNotifications(pageSize = 15): Promise<NotificationsResult> {
  const res = await api.get<ApiResponse<Paginated<Notification>>>(
    `/notifications/?page_size=${pageSize}`
  );
  const data = unwrap(res);
  const results = data.results ?? (data as unknown as Notification[]);
  return {
    results,
    count: "count" in data && typeof data.count === "number" ? data.count : results.length,
  };
}

export async function markNotificationRead(id: number): Promise<void> {
  await api.post(`/notifications/${id}/read/`);
}

export async function markAllNotificationsRead(): Promise<void> {
  await api.post("/notifications/read-all/");
}
