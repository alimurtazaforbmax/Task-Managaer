export interface ProjectPalette {
  gradient: string;
  softBg: string;
  text: string;
  border: string;
  solid: string;
  ring: string;
}

const PALETTES: ProjectPalette[] = [
  {
    gradient: "from-indigo-500 to-violet-600",
    softBg: "bg-indigo-50",
    text: "text-indigo-700",
    border: "border-indigo-200",
    solid: "bg-indigo-600",
    ring: "ring-indigo-200",
  },
  {
    gradient: "from-sky-500 to-cyan-600",
    softBg: "bg-sky-50",
    text: "text-sky-700",
    border: "border-sky-200",
    solid: "bg-sky-600",
    ring: "ring-sky-200",
  },
  {
    gradient: "from-emerald-500 to-teal-600",
    softBg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-200",
    solid: "bg-emerald-600",
    ring: "ring-emerald-200",
  },
  {
    gradient: "from-amber-500 to-orange-600",
    softBg: "bg-amber-50",
    text: "text-amber-800",
    border: "border-amber-200",
    solid: "bg-amber-600",
    ring: "ring-amber-200",
  },
  {
    gradient: "from-rose-500 to-pink-600",
    softBg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-200",
    solid: "bg-rose-600",
    ring: "ring-rose-200",
  },
  {
    gradient: "from-fuchsia-500 to-purple-600",
    softBg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    border: "border-fuchsia-200",
    solid: "bg-fuchsia-600",
    ring: "ring-fuchsia-200",
  },
];

function hashSeed(seed: string | number): number {
  if (typeof seed === "number") return Math.abs(seed);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getProjectPalette(seed: string | number): ProjectPalette {
  return PALETTES[hashSeed(seed) % PALETTES.length];
}

export function getProjectInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function isWithinDays(dateStr: string | undefined, days: number): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;
  const diffMs = Date.now() - date.getTime();
  return diffMs >= 0 && diffMs <= days * 24 * 60 * 60 * 1000;
}

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  project_manager: "Project Manager",
  pm: "Project Manager",
  developer: "Developer",
  qa: "QA",
  viewer: "Viewer",
};

export const MEMBER_ROLE_STYLES: Record<string, string> = {
  project_manager: "bg-violet-100 text-violet-800",
  pm: "bg-violet-100 text-violet-800",
  developer: "bg-blue-100 text-blue-800",
  qa: "bg-teal-100 text-teal-800",
  viewer: "bg-slate-100 text-slate-700",
  admin: "bg-amber-100 text-amber-800",
};

export function formatRoleLabel(role: string): string {
  return ROLE_LABELS[role] ?? role.replace(/_/g, " ");
}

export const PRIORITY_DOT: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-sky-500",
  high: "bg-amber-500",
  urgent: "bg-rose-500",
  critical: "bg-rose-600",
};
