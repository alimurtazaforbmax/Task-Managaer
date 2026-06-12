import {
  createReportPeriodState,
  defaultReferenceForPeriod,
  periodInputToReference,
  referenceToPeriodInput,
  todayReference,
  type ReportPeriodState,
} from "../utils/reportPeriod";

export const REPORT_PERIODS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

export type ReportPeriod = (typeof REPORT_PERIODS)[number]["value"];

interface ReportPeriodSelectProps {
  readonly value: ReportPeriodState;
  readonly onChange: (value: ReportPeriodState) => void;
  readonly className?: string;
}

const PERIOD_INPUT_LABELS: Record<ReportPeriod, string> = {
  daily: "Select day",
  weekly: "Select week",
  monthly: "Select month",
  yearly: "Select year",
};

export default function ReportPeriodSelect({
  value,
  onChange,
  className = "",
}: ReportPeriodSelectProps) {
  const periodInput = referenceToPeriodInput(value.period, value.reference);

  const handlePeriodChange = (period: ReportPeriod) => {
    onChange({
      period,
      reference: defaultReferenceForPeriod(period),
    });
  };

  const handleReferenceInput = (input: string) => {
    onChange({
      period: value.period,
      reference: periodInputToReference(value.period, input),
    });
  };

  const maxDate = todayReference();
  const yearOptions = Array.from({ length: 8 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return year;
  });

  return (
    <div className={`flex flex-wrap items-end gap-3 ${className}`}>
      <label className="block space-y-1 min-w-[130px]">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Report period
        </span>
        <select
          value={value.period}
          onChange={(e) => handlePeriodChange(e.target.value as ReportPeriod)}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
        >
          {REPORT_PERIODS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1 min-w-[160px]">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {PERIOD_INPUT_LABELS[value.period]}
        </span>
        {value.period === "daily" && (
          <input
            type="date"
            value={periodInput}
            max={maxDate}
            onChange={(e) => handleReferenceInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
        )}
        {value.period === "weekly" && (
          <input
            type="week"
            value={periodInput}
            max={referenceToPeriodInput("weekly", maxDate)}
            onChange={(e) => handleReferenceInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
        )}
        {value.period === "monthly" && (
          <input
            type="month"
            value={periodInput}
            max={maxDate.slice(0, 7)}
            onChange={(e) => handleReferenceInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          />
        )}
        {value.period === "yearly" && (
          <select
            value={periodInput}
            onChange={(e) => handleReferenceInput(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
          >
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        )}
      </label>
    </div>
  );
}

export { createReportPeriodState };
