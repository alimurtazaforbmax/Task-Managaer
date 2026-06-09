import api, { unwrap } from "../api/client";
import type { ApiResponse } from "../types";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = globalThis.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushSupported(): boolean {
  return "serviceWorker" in navigator && "Notification" in globalThis;
}

export async function unsubscribePushNotifications(): Promise<void> {
  if (!isPushSupported()) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;

    await api.post("/notifications/push/unsubscribe/", {
      endpoint: subscription.endpoint,
    });
    await subscription.unsubscribe();
  } catch {
    // Ignore errors during logout cleanup.
  }
}

export async function subscribePushNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (!isPushSupported()) return "unsupported";

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";

  const vapidRes = await api.get<ApiResponse<{ public_key: string }>>(
    "/notifications/push/vapid-key/"
  );
  const { public_key: publicKey } = unwrap(vapidRes);

  const registration = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
    throw new Error("Invalid push subscription.");
  }

  await api.post("/notifications/push/subscribe/", {
    endpoint: json.endpoint,
    keys: {
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
    },
  });

  return "granted";
}
