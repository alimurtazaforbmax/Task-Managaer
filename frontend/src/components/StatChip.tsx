interface StatChipProps {
  readonly label: string;
  readonly value: number;
  readonly tone: "tasks" | "bugs" | "members";
}

const TONES = {
  tasks: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    value: "text-slate-900",
  },
  bugs: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    value: "text-slate-900",
  },
  members: {
    bg: "bg-slate-50",
    border: "border-slate-200",
    text: "text-slate-600",
    value: "text-slate-900",
  },
};

export default function StatChip({ label, value, tone }: StatChipProps) {
  const style = TONES[tone];
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-center shadow-sm ${style.bg} ${style.border}`}
    >
      <p className={`text-lg font-bold leading-none ${style.value}`}>{value}</p>
      <p className={`text-[11px] font-medium mt-1 ${style.text}`}>{label}</p>
    </div>
  );
}
