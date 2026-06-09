import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import StatusBadge from "../components/StatusBadge";
import WorkItemRow from "../components/WorkItemRow";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";
import { emptyTaskForm, TaskCreateForm } from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useProjectSprints } from "../hooks/useProjectPlanning";
import { useUsers } from "../hooks/useUsers";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Feature, Task } from "../types";

export default function FeatureDetailPage() {
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
    title: "",
    description: "",
    status: "backlog",
    priority: "medium",
    target_date: "",
  });

  const { data: feature } = useQuery({
    queryKey: ["feature", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Feature>>(`/features/${id}/`);
      return unwrap(res);
    },
    enabled: !!id,
  });

  const { data: sprints } = useProjectSprints(feature?.project);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", { feature: id }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ results: Task[] } | Task[]>>(
        `/tasks/?feature=${id}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (feature && showEdit) {
      setEditForm({
        title: feature.title,
        description: feature.description ?? "",
        status: feature.status,
        priority: feature.priority,
        target_date: feature.target_date ?? "",
      });
    }
  }, [feature, showEdit]);

  const updateFeature = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Feature>>(`/features/${id}/`, {
        ...editForm,
        target_date: editForm.target_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["feature", id] });
      qc.invalidateQueries({ queryKey: ["features"] });
      setShowEdit(false);
    },
  });

  const createTask = useMutation({
    mutationFn: async (attachments: File[]) => {
      if (!feature) return;
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...taskForm,
        project: feature.project,
        feature: feature.id,
        sprint: taskForm.sprint ? Number(taskForm.sprint) : null,
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
      qc.invalidateQueries({ queryKey: ["tasks", { feature: id }] });
      qc.invalidateQueries({ queryKey: ["feature", id] });
      setShowTaskForm(false);
      setTaskForm({ ...emptyTaskForm(), feature: String(feature?.id ?? "") });
    },
  });

  const deleteFeature = useMutation({
    mutationFn: async () => api.delete(`/features/${id}/`),
    onSuccess: () => navigate("/features"),
  });

  if (!feature) {
    return (
      <PageContainer size="md">
        <p className="text-slate-400">Loading...</p>
      </PageContainer>
    );
  }

  const canEditFeature =
    permissions.can_edit_features ||
    feature.owner === user?.id ||
    feature.created_by === user?.id;
  const canDeleteFeature =
    permissions.can_delete_features ||
    feature.owner === user?.id ||
    feature.created_by === user?.id;

  const palette = getProjectPalette(feature.project);
  const done = feature.completed_task_count ?? 0;
  const total = feature.task_count ?? 0;

  return (
    <PageContainer size="md">
      <BackLink to="/features">Features</BackLink>

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient}`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white ${palette.gradient}`}
              >
                {getProjectInitials(feature.title)}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900">{feature.title}</h1>
                  <StatusBadge status={feature.status} />
                </div>
                <Link
                  to={`/projects/${feature.project}`}
                  className="text-sm text-brand-600 hover:underline mt-1 inline-block"
                >
                  {feature.project_name}
                </Link>
              </div>
            </div>
            {(canEditFeature || canDeleteFeature) && (
              <div className="flex gap-2">
                {canEditFeature && (
                  <button
                    type="button"
                    onClick={() => setShowEdit(!showEdit)}
                    className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg"
                  >
                    Edit
                  </button>
                )}
                {canDeleteFeature && (
                  <button
                    type="button"
                    onClick={() => {
                      if (globalThis.confirm("Delete this feature?")) deleteFeature.mutate();
                    }}
                    className="text-sm border border-rose-200 text-rose-600 px-3 py-1.5 rounded-lg"
                  >
                    Delete
                  </button>
                )}
              </div>
            )}
          </div>
          <p className="mt-4 text-slate-700">{feature.description || "No description."}</p>
          <p className="mt-3 text-sm text-slate-500">
            {done}/{total} tasks completed · Priority: {feature.priority}
            {feature.target_date ? ` · Target ${feature.target_date}` : ""}
          </p>
        </div>
      </div>

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateFeature.mutate();
          }}
          className="mt-6 rounded-xl border bg-white p-5 space-y-3"
        >
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={editForm.status}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
            >
              <option value="backlog">Backlog</option>
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="border rounded-lg px-3 py-2"
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Save
          </button>
        </form>
      )}

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-900">Linked tasks</h2>
          {permissions.can_create_tasks && (
            <button
              type="button"
              onClick={() => {
                setTaskForm({ ...emptyTaskForm(), feature: String(feature.id) });
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
              submitLabel="Create task for this feature"
              features={[{ id: feature.id, title: feature.title }]}
              sprints={sprints?.map((s) => ({ id: s.id, name: s.name }))}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => (
            <WorkItemRow
              key={t.id}
              title={t.title}
              subtitle={t.status}
              status={t.status}
              priority={t.priority}
              to={`/tasks/${t.id}`}
              accentColor="bg-brand-500"
              type="task"
            />
          ))}
          {!tasks?.length && (
            <p className="text-sm text-slate-400">No tasks linked to this feature yet.</p>
          )}
        </ul>
      </section>
    </PageContainer>
  );
}
