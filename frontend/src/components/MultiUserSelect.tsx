import type { User } from "../types";

interface Props {
  users: User[];
  selected: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  disabled?: boolean;
  emptyMessage?: string;
  excludeUserIds?: number[];
}

export default function MultiUserSelect({
  users,
  selected,
  onChange,
  label,
  disabled = false,
  emptyMessage = "No users available",
  excludeUserIds = [],
}: Props) {
  const excluded = new Set(excludeUserIds);
  const visibleUsers = users.filter((u) => !excluded.has(u.id));
  const visibleSelected = selected.filter((id) => !excluded.has(id));

  const toggle = (id: number) => {
    if (excluded.has(id)) return;
    if (visibleSelected.includes(id)) {
      onChange(visibleSelected.filter((x) => x !== id));
    } else {
      onChange([...visibleSelected, id]);
    }
  };

  return (
    <div>
      {label && <p className="text-sm font-medium text-slate-700 mb-2">{label}</p>}
      <div
        className={`border rounded-lg p-3 max-h-40 overflow-y-auto space-y-1 ${
          disabled ? "bg-slate-50 opacity-60 pointer-events-none" : ""
        }`}
      >
        {visibleUsers.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          visibleUsers.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={visibleSelected.includes(u.id)}
                onChange={() => toggle(u.id)}
                disabled={disabled}
              />
              <span>
                {u.first_name || u.username} ({u.role})
              </span>
            </label>
          ))
        )}
      </div>
    </div>
  );
}
