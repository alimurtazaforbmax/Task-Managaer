interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

export function DueDateField({ value, onChange, label = "Deadline" }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <input
        type="date"
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface PriorityProps {
  value: string;
  onChange: (value: string) => void;
}

export function TaskPrioritySelect({ value, onChange }: PriorityProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  );
}

export function BugPrioritySelect({ value, onChange }: PriorityProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Priority</label>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </div>
  );
}

export function BugSeveritySelect({ value, onChange }: PriorityProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">Severity</label>
      <select
        className="w-full border rounded-lg px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
        <option value="critical">Critical</option>
      </select>
    </div>
  );
}
