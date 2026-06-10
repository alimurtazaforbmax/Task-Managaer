/** Normalize API/push notification links for in-app React Router navigation. */
export function resolveNotificationPath(link: string | null | undefined): string {
  if (!link?.trim()) return "";

  const trimmed = link.trim();

  try {
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      const url = new URL(trimmed);
      if (url.origin === globalThis.location.origin) {
        return `${url.pathname}${url.search}${url.hash}`;
      }
      return trimmed;
    }
  } catch {
    return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  }

  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

export function isExternalNotificationLink(link: string): boolean {
  return link.startsWith("http://") || link.startsWith("https://");
}
