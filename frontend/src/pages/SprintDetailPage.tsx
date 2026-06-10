import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import StatusBadge from "../components/StatusBadge";
import WorkItemRow from "../components/WorkItemRow";
import { getProjectPalette } from "../utils/projectStyle";
import { emptyTaskForm, TaskCreateForm } from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useProjectFeatures } from "../hooks/useProjectPlanning";
import { useUsers } from "../hooks/useUsers";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Sprint, Task } from "../types";

export default function SprintDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { data: users } = useUsers();
  const [showEdit, setShowEdit] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editForm, setEditForm] = useState({
    name: "",
    goal: "",
    description: "",
    status: "planned",
    start_date: "",
    end_date: "",
  });

  const { data: sprint } = useQuery({
    queryKey: ["sprint", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Sprint>>(`/sprints/${id}/`);
      return unwrap(res);
    },
    enabled: !!id,
  });

  const { data: features } = useProjectFeatures(sprint?.project);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", { sprint: id }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ results: Task[] } | Task[]>>(
        `/tasks/?sprint=${id}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (sprint && showEdit) {
      setEditForm({
        name: sprint.name,
        goal: sprint.goal ?? "",
        description: sprint.description ?? "",
        status: sprint.status,
        start_date: sprint.start_date,
        end_date: sprint.end_date,
      });
    }
  }, [sprint, showEdit]);

  const updateSprint = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Sprint>>(`/sprints/${id}/`, editForm);
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprint", id] });
      qc.invalidateQueries({ queryKey: ["sprints"] });
      setShowEdit(false);
    },
  });

  const createTask = useMutation({
    mutationFn: async (attachments: File[]) => {
      if (!sprint) return;
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...taskForm,
        project: sprint.project,
        sprint: sprint.id,
        feature: taskForm.feature ? Number(taskForm.feature) : null,
        status: "backlog",
        due_date: taskForm.due_date || null,
      });
      const task = unwrap(res);
      if (attachments.length) {
        await uploadWorkItemAttachments("tasks", task.id, attachments);
      }
      return task;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", { sprint: id }] });
      qc.invalidateQueries({ queryKey: ["sprint", id] });
      setShowTaskForm(false);
      setTaskForm({ ...emptyTaskForm(), sprint: String(sprint?.id ?? "") });
    },
  });

  const deleteSprint = useMutation({
    mutationFn: async () => api.delete(`/sprints/${id}/`),
    onSuccess: () => navigate("/sprints"),
  });

  if (!sprint) {
    return (
      <PageContainer size="md">
        <p className="text-slate-400">Loading...</p>
      </PageContainer>
    );
  }

  const canEditSprint =
    permissions.can_edit_sprints || sprint.created_by === user?.id;
  const canDeleteSprint =
    permissions.can_delete_sprints || sprint.created_by === user?.id;

  const palette = getProjectPalette(sprint.project);
  const done = sprint.completed_task_count ?? 0;
  const total = sprint.task_count ?? 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <PageContainer size="md">
      <BackLink to="/sprints">Sprints</BackLink>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient}`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-slate-900">{sprint.name}</h1>
                <StatusBadge status={sprint.status} />
              </div>
              <Link
                to={`/projects/${sprint.project}`}
                className="text-sm text-brand-600 hover:underline mt-1 inline-block"
              >
                {sprint.project_name}
              </Link>
              <p className="text-sm text-slate-500 mt-2">
                {sprint.start_date} → {sprint.end_date}
              </p>
            </div>
            {(canEditSprint || canDeleteSprint) && (
              <div className="flex gap-2">
                {canEditSprint && (
                  <button
                    type="button"
                    onClick={() => setShowEdit(!showEdit)}
                    className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg"
                  >
                    Edit
                  </button>
                )}
                {canDeleteSprint && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalThis.confirm("Delete this sprint?")) deleteSprint.mutate();
                    }}
                    className="text-sm border border-rose-200 text-rose-600 px-3 py-1.5 rounded-lg"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          {sprint.goal && <p className="mt-4 text-slate-700">{sprint.goal}</p>}
          <div className="mt-5">
            <div className="flex justify-between text-sm text-slate-600 mb-1">
              <span>Sprint progress</span>
              <span>
                {done}/{total} tasks ({pct}%)
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateSprint.mutate();
          }}
          className="mt-6 rounded-xl border bg-white p-5 space-y-3"
        >
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Goal"
            value={editForm.goal}
            onChange={(e) => setEditForm({ ...editForm, goal: e.target.value })}
          />
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
          >
            <option value="planned">Planned</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="date"
              required
              className="border rounded-lg px-3 py-2"
              value={editForm.start_date}
              onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
            />
            <input
              type="date"
              required
              className="border rounded-lg px-3 py-2"
              value={editForm.end_date}
              onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
            />
          </div>
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Save
          </button>
        </form>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-900">Sprint tasks</h2>
          {permissions.can_create_tasks && (
            <button
              type="button"
              onClick={() => {
                setTaskForm({ ...emptyTaskForm(), sprint: String(sprint.id) });
                setShowTaskForm(!showTaskForm);
              }}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
            >
              Add task
            </button>
          )}
        </div>
        {showTaskForm && permissions.can_create_tasks && (
          <div className="mt-4">
            <TaskCreateForm
              form={taskForm}
              users={users ?? []}
              onChange={setTaskForm}
              onSubmit={(files) => createTask.mutate(files)}
              isSubmitting={createTask.isPending}
              canAssign={permissions.can_assign_tasks}
              submitLabel="Create task for this sprint"
              features={features?.map((f) => ({ id: f.id, title: f.title }))}
              sprints={[{ id: sprint.id, name: sprint.name }]}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => (
            <WorkItemRow
              key={t.id}
              title={t.title}
              subtitle={t.feature_title ? `Feature: ${t.feature_title}` : t.status}
              status={t.status}
              priority={t.priority}
              to={`/tasks/${t.id}`}
              accentColor="bg-indigo-500"
              type="task"
            />
          ))}
          {!tasks?.length && (
            <p className="text-sm text-slate-400">No tasks in this sprint yet.</p>
          )}
        </ul>
      </section>
    </PageContainer>
  );
}
