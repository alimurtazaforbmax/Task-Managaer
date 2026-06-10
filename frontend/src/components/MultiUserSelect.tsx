import type { User } from "../types";

interface Props {
  users: User[];
  selected: number[];
  onChange: (ids: number[]) => void;
  label?: string;
  disabled?: boolean;
  emptyMessage?: string;
}

export default function MultiUserSelect({
  users,
  selected,
  onChange,
  label,
  disabled = false,
  emptyMessage = "No users available",
}: Props) {
  const toggle = (id: number) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id));
    } else {
      onChange([...selected, id]);
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
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">{emptyMessage}</p>
        ) : (
          users.map((u) => (
            <label
              key={u.id}
              className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={selected.includes(u.id)}
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
