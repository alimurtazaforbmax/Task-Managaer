import type { ReportPeriod } from "../components/ReportPeriodSelect";

/** Today's date as YYYY-MM-DD in local time. */
export function todayReference(): string {
  const now = new Date();
  return formatLocalDate(now);
}

export function defaultReferenceForPeriod(period: ReportPeriod): string {
  const today = todayReference();
  if (period === "daily") return today;
  if (period === "weekly") return mondayOfWeekContaining(today);
  if (period === "monthly") return `${today.slice(0, 7)}-01`;
  return `${today.slice(0, 4)}-01-01`;
}

function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function mondayOfWeekContaining(iso: string): string {
  const date = parseLocalDate(iso);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return formatLocalDate(date);
}

/** ISO week string (YYYY-Www) for a local calendar date. */
function dateToWeekInput(iso: string): string {
  const date = parseLocalDate(iso);
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.getTime();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  const week = 1 + Math.ceil((firstThursday - target.getTime()) / 604800000);
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday (YYYY-MM-DD) for an ISO week input value. */
function weekInputToMonday(input: string): string {
  const match = /^(\d{4})-W(\d{1,2})$/i.exec(input);
  if (!match) return mondayOfWeekContaining(input);
  const year = Number(match[1]);
  const week = Number(match[2]);
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const isoWeekStart = new Date(simple);
  if (dow <= 4) {
    isoWeekStart.setDate(simple.getDate() - simple.getDay() + 1);
  } else {
    isoWeekStart.setDate(simple.getDate() + 8 - simple.getDay());
  }
  return formatLocalDate(isoWeekStart);
}

export function referenceToPeriodInput(
  period: ReportPeriod,
  reference: string
): string {
  if (period === "daily") return reference;
  if (period === "weekly") return dateToWeekInput(reference);
  if (period === "monthly") return reference.slice(0, 7);
  return reference.slice(0, 4);
}

export function periodInputToReference(
  period: ReportPeriod,
  input: string
): string {
  if (period === "daily") return input;
  if (period === "weekly") return weekInputToMonday(input);
  if (period === "monthly") {
    if (input.length === 7) return `${input}-01`;
    return `${input.slice(0, 7)}-01`;
  }
  return `${input.slice(0, 4)}-01-01`;
}

export interface ReportPeriodState {
  period: ReportPeriod;
  reference: string;
}

export function createReportPeriodState(
  period: ReportPeriod = "monthly"
): ReportPeriodState {
  return { period, reference: defaultReferenceForPeriod(period) };
}
