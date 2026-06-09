import { useNavigate } from "react-router-dom";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";
import type { Department } from "../types";

interface DepartmentCardProps {
  readonly department: Department;
  readonly onEdit: (department: Department) => void;
  readonly onDelete: (id: number) => void;
}

export default function DepartmentCard({
  department,
  onEdit,
  onDelete,
}: DepartmentCardProps) {
  const navigate = useNavigate();
  const palette = getProjectPalette(department.id);
  const activePerms = department.permissions_detail ?? [];

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/departments/${department.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          navigate(`/departments/${department.id}`);
        }
      }}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/40"
    >
      <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-80`} />
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ${palette.gradient}`}
          >
            {getProjectInitials(department.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-lg text-slate-900 truncate">{department.name}</h2>
            <p className="text-sm text-slate-500 mt-1 line-clamp-2 leading-relaxed">
              {department.description || "No description yet."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-semibold ${palette.softBg} ${palette.text} ${palette.border}`}
          >
            {department.member_count ?? 0} members
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 min-h-[1.5rem]">
          {activePerms.length === 0 ? (
            <span className="text-xs text-slate-400">No extra permissions</span>
          ) : (
            activePerms.map((perm) => (
              <span
                key={perm.id}
                className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-sky-100 text-sky-800"
              >
                {perm.name}
              </span>
            ))
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(department);
            }}
            className="flex-1 text-sm border border-slate-200 rounded-lg py-2 font-medium text-brand-600 hover:bg-brand-50 hover:border-brand-200 transition"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(department.id);
            }}
            className="text-sm border border-rose-200 rounded-lg px-3 py-2 font-medium text-rose-600 hover:bg-rose-50 transition"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
