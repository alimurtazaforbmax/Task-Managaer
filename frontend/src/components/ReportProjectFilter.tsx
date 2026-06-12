import type { UserProjectMembership } from "../types";

interface ReportProjectFilterProps {
  readonly projects: UserProjectMembership[];
  readonly selected: number[];
  readonly onChange: (ids: number[]) => void;
  readonly className?: string;
}

export default function ReportProjectFilter({
  projects,
  selected,
  onChange,
  className = "",
}: ReportProjectFilterProps) {
  const allSelected = selected.length === 0;

  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
      return;
    }
    onChange([...selected, id]);
  };

  return (
    <section className={`rounded-xl border border-slate-200 bg-slate-50/80 p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Projects</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {allSelected
              ? "All projects included"
              : `${selected.length} project${selected.length === 1 ? "" : "s"} selected`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs font-medium text-brand-600 hover:text-brand-700"
        >
          Select all
        </button>
      </div>
      {projects.length === 0 ? (
        <p className="text-sm text-slate-400">No project memberships.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {projects.map((project) => {
            const active = allSelected || selected.includes(project.id);
            return (
              <button
                key={project.id}
                type="button"
                onClick={() => {
                  if (allSelected) {
                    onChange([project.id]);
                    return;
                  }
                  toggle(project.id);
                }}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-brand-300 bg-brand-50 text-brand-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                {project.name}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
