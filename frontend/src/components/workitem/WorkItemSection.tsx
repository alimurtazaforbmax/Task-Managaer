import type { ReactNode } from "react";

interface WorkItemSectionProps {
  readonly title: string;
  readonly subtitle?: string;
  readonly accent?: "task" | "bug" | "neutral";
  readonly action?: ReactNode;
  readonly children: ReactNode;
}

const ACCENTS = {
  task: "border-l-sky-500",
  bug: "border-l-amber-500",
  neutral: "border-l-slate-400",
};

export default function WorkItemSection({
  title,
  subtitle,
  accent = "neutral",
  action,
  children,
}: WorkItemSectionProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`border-l-4 ${ACCENTS[accent]} px-5 py-4 border-b border-slate-100 bg-slate-50/50`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
