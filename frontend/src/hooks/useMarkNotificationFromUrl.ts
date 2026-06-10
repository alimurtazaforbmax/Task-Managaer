import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { markNotificationRead } from "../api/notifications";

export function useMarkNotificationFromUrl(enabled: boolean) {
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const params = new URLSearchParams(location.search);
    const rawId = params.get("notificationId");
    if (!rawId) return;

    const key = `${location.pathname}:${rawId}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    const id = Number(rawId);
    if (!Number.isFinite(id)) return;

    void markNotificationRead(id).then(() => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    });

    params.delete("notificationId");
    const nextSearch = params.toString();
    navigate(
      { pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : "" },
      { replace: true }
    );
  }, [enabled, location.pathname, location.search, navigate, qc]);
}
