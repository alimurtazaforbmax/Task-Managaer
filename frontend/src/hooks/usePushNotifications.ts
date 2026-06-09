import { useEffect } from "react";
import { isPushSupported, subscribePushNotifications } from "../utils/pushNotifications";

export function usePushNotifications(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !isPushSupported()) return;

    let cancelled = false;

    const setup = async () => {
      try {
        if (cancelled || Notification.permission === "denied") return;
        await subscribePushNotifications();
      } catch {
        // User may deny permission or push may be unavailable.
      }
    };

    setup();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
