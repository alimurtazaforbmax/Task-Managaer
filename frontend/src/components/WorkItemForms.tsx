import { FormEvent, useState, type ReactNode } from "react";
import FileUploadField from "./FileUploadField";
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
  feature: string;
  sprint: string;
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
  feature: "",
  sprint: "",
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

const INPUT =
  "w-full border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-400";

function CreateFormShell({
  type,
  title,
  subtitle,
  children,
}: {
  type: "task" | "bug";
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  const accent = type === "task" ? "from-sky-500 to-indigo-600" : "from-amber-500 to-rose-600";
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-5 sm:p-6">
        <h2 className="font-semibold text-lg text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>
        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

interface TaskFormProps {
  form: TaskFormState;
  users: User[];
  onChange: (form: TaskFormState) => void;
  onSubmit: (attachments: File[]) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  showProjectSelect?: boolean;
  projects?: { id: number; name: string }[];
  projectId?: string;
  onProjectChange?: (id: string) => void;
  features?: { id: number; title: string }[];
  sprints?: { id: number; name: string }[];
  assigneesLoading?: boolean;
  canAssign?: boolean;
}

export function TaskCreateForm({
  form,
  users,
  onChange,
  onSubmit,
  submitLabel = "Create task",
  isSubmitting = false,
  showProjectSelect,
  projects,
  projectId,
  onProjectChange,
  features,
  sprints,
  assigneesLoading = false,
  canAssign = true,
}: TaskFormProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const assignDisabled = Boolean(showProjectSelect && !projectId);
  const assignEmptyMessage = assignDisabled
    ? "Select a project first"
    : assigneesLoading
      ? "Loading project members..."
      : "No project members available";

  return (
    <CreateFormShell
      type="task"
      title="New task"
      subtitle="Select project, then optionally link a feature and sprint for this work."
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit(attachments);
        }}
        className="space-y-4"
      >
        {showProjectSelect && projects && onProjectChange && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Project</span>
            <select
              required
              className={INPUT}
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
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            required
            placeholder="What needs to be done?"
            className={INPUT}
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            rows={3}
            placeholder="Add context, acceptance criteria, or links"
            className={INPUT}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <TaskPrioritySelect
            value={form.priority}
            onChange={(priority) => onChange({ ...form, priority })}
          />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              className={INPUT}
              value={form.task_type}
              onChange={(e) => onChange({ ...form, task_type: e.target.value })}
            >
              <option value="feature">Feature</option>
              <option value="chore">Chore</option>
              <option value="spike">Spike</option>
            </select>
          </div>
        </div>
        {(features?.length || sprints?.length) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {features && features.length > 0 && (
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Feature (optional)</span>
                <select
                  className={INPUT}
                  value={form.feature}
                  onChange={(e) => onChange({ ...form, feature: e.target.value })}
                >
                  <option value="">None</option>
                  {features.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.title}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {sprints && sprints.length > 0 && (
              <label className="block space-y-1">
                <span className="text-sm font-medium text-slate-700">Sprint (optional)</span>
                <select
                  className={INPUT}
                  value={form.sprint}
                  onChange={(e) => onChange({ ...form, sprint: e.target.value })}
                >
                  <option value="">None</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}
        <DueDateField
          value={form.due_date}
          onChange={(due_date) => onChange({ ...form, due_date })}
        />
        {canAssign ? (
          <MultiUserSelect
            label="Assign to"
            users={users}
            selected={form.assignees}
            onChange={(assignees) => onChange({ ...form, assignees })}
            disabled={assignDisabled}
            emptyMessage={assignEmptyMessage}
          />
        ) : (
          <p className="text-sm text-slate-500">
            Assignees can only be set by project leads or managers.
          </p>
        )}
        <FileUploadField files={attachments} onChange={setAttachments} />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? "Creating…" : submitLabel}
        </button>
      </form>
    </CreateFormShell>
  );
}

interface BugFormProps {
  form: BugFormState;
  users: User[];
  onChange: (form: BugFormState) => void;
  onSubmit: (attachments: File[]) => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  showProjectSelect?: boolean;
  projects?: { id: number; name: string }[];
  projectId?: string;
  onProjectChange?: (id: string) => void;
  assigneesLoading?: boolean;
}

export function BugCreateForm({
  form,
  users,
  onChange,
  onSubmit,
  submitLabel = "Report bug",
  isSubmitting = false,
  showProjectSelect,
  projects,
  projectId,
  onProjectChange,
  assigneesLoading = false,
}: BugFormProps) {
  const [attachments, setAttachments] = useState<File[]>([]);
  const assignDisabled = Boolean(showProjectSelect && !projectId);
  const assignEmptyMessage = assignDisabled
    ? "Select a project first"
    : assigneesLoading
      ? "Loading project members..."
      : "No project members available";

  return (
    <CreateFormShell
      type="bug"
      title="Report bug"
      subtitle="Document the issue, steps to reproduce, and attach screenshots or video."
    >
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          onSubmit(attachments);
        }}
        className="space-y-4"
      >
        {showProjectSelect && projects && onProjectChange && (
          <label className="block space-y-1">
            <span className="text-sm font-medium text-slate-700">Project</span>
            <select
              required
              className={INPUT}
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
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Title</span>
          <input
            required
            placeholder="Short summary of the bug"
            className={INPUT}
            value={form.title}
            onChange={(e) => onChange({ ...form, title: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Description</span>
          <textarea
            rows={3}
            placeholder="What happened? What did you expect?"
            className={INPUT}
            value={form.description}
            onChange={(e) => onChange({ ...form, description: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Steps to reproduce</span>
          <textarea
            rows={4}
            placeholder="1. Go to…&#10;2. Click…&#10;3. See error"
            className={INPUT}
            value={form.steps_to_reproduce}
            onChange={(e) => onChange({ ...form, steps_to_reproduce: e.target.value })}
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Environment</span>
          <input
            placeholder="e.g. Chrome 120 / Windows 11"
            className={INPUT}
            value={form.environment}
            onChange={(e) => onChange({ ...form, environment: e.target.value })}
          />
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          disabled={assignDisabled}
          emptyMessage={assignEmptyMessage}
        />
        <FileUploadField
          files={attachments}
          onChange={setAttachments}
          hint="Screenshots or video evidence · optional"
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium shadow-sm disabled:opacity-50"
        >
          {isSubmitting ? "Submitting…" : submitLabel}
        </button>
      </form>
    </CreateFormShell>
  );
}
