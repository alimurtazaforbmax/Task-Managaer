import type { ReactNode } from "react";
import WorkItemSection from "./WorkItemSection";

interface WorkItemStatusPickerProps {
  readonly type: "task" | "bug";
  readonly currentStatus: string;
  readonly statuses: readonly string[];
  readonly canChange: boolean;
  readonly isPending: boolean;
  readonly onSelect: (status: string) => void;
  readonly extraActions?: ReactNode;
}

export default function WorkItemStatusPicker({
  type,
  currentStatus,
  statuses,
  canChange,
  isPending,
  onSelect,
  extraActions,
}: WorkItemStatusPickerProps) {
  if (!canChange) {
    return (
      <WorkItemSection
        title="Status"
        subtitle="Only the owner or assignees can update workflow"
        accent={type}
      >
        <p className="text-sm text-slate-500">
          Only the {type} owner or assignees can change status.
        </p>
      </WorkItemSection>
    );
  }

  return (
    <WorkItemSection title="Status workflow" subtitle="Move this item through its lifecycle" accent={type}>
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            disabled={isPending}
            onClick={() => onSelect(s)}
            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition shadow-sm disabled:opacity-50 ${
              currentStatus === s
                ? type === "task"
                  ? "bg-sky-600 text-white border-sky-600"
                  : "bg-amber-600 text-white border-amber-600"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
        {extraActions}
      </div>
    </WorkItemSection>
  );
}
