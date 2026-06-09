import { FormEvent } from "react";
import MultiUserSelect from "./MultiUserSelect";
import { BugPrioritySelect, BugSeveritySelect, DueDateField, TaskPrioritySelect } from "./WorkItemFields";
import type { User } from "../types";

export interface TaskFormState {
  title: string;
  description: string;
  priority: string;
  task_type: string;
  due_date: string;
  assignees: number[];
}

export interface BugFormState {
  title: string;
  description: string;
  steps_to_reproduce: string;
  environment: string;
  severity: string;
  priority: string;
  due_date: string;
  assignees: number[];
}

export const emptyTaskForm = (): TaskFormState => ({
  title: "",
  description: "",
  priority: "medium",
  task_type: "feature",
  due_date: "",
  assignees: [],
});

export const emptyBugForm = (): BugFormState => ({
  title: "",
  description: "",
  steps_to_reproduce: "",
  environment: "",
  severity: "medium",
  priority: "medium",
  due_date: "",
  assignees: [],
});

interface TaskFormProps {
  form: TaskFormState;
  users: User[];
  onChange: (form: TaskFormState) => void;
  onSubmit: () => void;
  submitLabel?: string;
  showProjectSelect?: boolean;
  projects?: { id: number; name: string }[];
  projectId?: string;
  onProjectChange?: (id: string) => void;
}

export function TaskCreateForm({
  form,
  users,
  onChange,
  onSubmit,
  submitLabel = "Create task",
  showProjectSelect,
  projects,
  projectId,
  onProjectChange,
}: TaskFormProps) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      {showProjectSelect && projects && onProjectChange && (
        <select
          required
          className="w-full border rounded-lg px-3 py-2"
          value={projectId ?? ""}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <input
        required
        placeholder="Title"
        className="w-full border rounded-lg px-3 py-2"
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
      />
      <textarea
        placeholder="Description"
        className="w-full border rounded-lg px-3 py-2"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <TaskPrioritySelect
          value={form.priority}
          onChange={(priority) => onChange({ ...form, priority })}
        />
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.task_type}
            onChange={(e) => onChange({ ...form, task_type: e.target.value })}
          >
            <option value="feature">Feature</option>
            <option value="chore">Chore</option>
            <option value="spike">Spike</option>
          </select>
        </div>
      </div>
      <DueDateField
        value={form.due_date}
        onChange={(due_date) => onChange({ ...form, due_date })}
      />
      <MultiUserSelect
        label="Assign to"
        users={users}
        selected={form.assignees}
        onChange={(assignees) => onChange({ ...form, assignees })}
      />
      <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
        {submitLabel}
      </button>
    </form>
  );
}

interface BugFormProps {
  form: BugFormState;
  users: User[];
  onChange: (form: BugFormState) => void;
  onSubmit: () => void;
  submitLabel?: string;
  showProjectSelect?: boolean;
  projects?: { id: number; name: string }[];
  projectId?: string;
  onProjectChange?: (id: string) => void;
}

export function BugCreateForm({
  form,
  users,
  onChange,
  onSubmit,
  submitLabel = "Report bug",
  showProjectSelect,
  projects,
  projectId,
  onProjectChange,
}: BugFormProps) {
  return (
    <form
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-3"
    >
      {showProjectSelect && projects && onProjectChange && (
        <select
          required
          className="w-full border rounded-lg px-3 py-2"
          value={projectId ?? ""}
          onChange={(e) => onProjectChange(e.target.value)}
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
      <input
        required
        placeholder="Title"
        className="w-full border rounded-lg px-3 py-2"
        value={form.title}
        onChange={(e) => onChange({ ...form, title: e.target.value })}
      />
      <textarea
        placeholder="Description"
        className="w-full border rounded-lg px-3 py-2"
        value={form.description}
        onChange={(e) => onChange({ ...form, description: e.target.value })}
      />
      <textarea
        placeholder="Steps to reproduce"
        className="w-full border rounded-lg px-3 py-2"
        value={form.steps_to_reproduce}
        onChange={(e) => onChange({ ...form, steps_to_reproduce: e.target.value })}
      />
      <input
        placeholder="Environment (e.g. Chrome / Windows)"
        className="w-full border rounded-lg px-3 py-2"
        value={form.environment}
        onChange={(e) => onChange({ ...form, environment: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <BugSeveritySelect
          value={form.severity}
          onChange={(severity) => onChange({ ...form, severity })}
        />
        <BugPrioritySelect
          value={form.priority}
          onChange={(priority) => onChange({ ...form, priority })}
        />
      </div>
      <DueDateField
        value={form.due_date}
        onChange={(due_date) => onChange({ ...form, due_date })}
      />
      <MultiUserSelect
        label="Assign to"
        users={users}
        selected={form.assignees}
        onChange={(assignees) => onChange({ ...form, assignees })}
      />
      <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
        {submitLabel}
      </button>
    </form>
  );
}
