/** Backend origin, e.g. http://192.168.11.209:8001 — empty uses Vite proxy (/api) */
const root = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

export const API_BASE_URL = root ? `${root}/api` : "/api";
