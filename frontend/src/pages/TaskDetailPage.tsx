import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import MultiUserSelect from "../components/MultiUserSelect";
import WorkItemActions from "../components/WorkItemActions";
import WorkItemComments from "../components/workitem/WorkItemComments";
import WorkItemHero from "../components/workitem/WorkItemHero";
import WorkItemSection from "../components/workitem/WorkItemSection";
import WorkItemStatusPicker from "../components/workitem/WorkItemStatusPicker";
import { useProjectFeatures, useProjectSprints } from "../hooks/useProjectPlanning";
import { useUsers } from "../hooks/useUsers";
import type { ApiResponse, Task } from "../types";

const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"];

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: users } = useUsers();
  const [comment, setComment] = useState("");
  const [minutes, setMinutes] = useState("");
  const [showEdit, setShowEdit] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    priority: "medium",
    task_type: "feature",
    assignees: [] as number[],
    due_date: "",
    tags: "",
    feature: "",
    sprint: "",
  });

  const { data: task } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task>>(`/tasks/${id}/`);
      return unwrap(res);
    },
  });

  const { data: features } = useProjectFeatures(task?.project);
  const { data: sprints } = useProjectSprints(task?.project);

  useEffect(() => {
    if (task && showEdit) {
      setEditForm({
        title: task.title,
        description: task.description,
        priority: task.priority,
        task_type: task.task_type,
        assignees: task.assignees ?? [],
        due_date: task.due_date ?? "",
        tags: task.tags ?? "",
        feature: task.feature ? String(task.feature) : "",
        sprint: task.sprint ? String(task.sprint) : "",
      });
    }
  }, [task, showEdit]);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.post<ApiResponse<Task>>(`/tasks/${id}/status/`, { status });
      return res.data;
    },
    onSuccess: (response) => {
      setStatusFeedback({ type: "success", message: response.message });
      qc.invalidateQueries({ queryKey: ["task", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setStatusFeedback({
        type: "error",
        message: err.response?.data?.message ?? "Could not update status.",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Task>>(`/tasks/${id}/`, {
        ...editForm,
        due_date: editForm.due_date || null,
        feature: editForm.feature ? Number(editForm.feature) : null,
        sprint: editForm.sprint ? Number(editForm.sprint) : null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      setShowEdit(false);
      qc.invalidateQueries({ queryKey: ["task", id] });
    },
  });

  const addComment = useMutation({
    mutationFn: (text: string) =>
      api.post(`/tasks/${id}/comments/`, { text, comment_type: "general" }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["task", id] });
    },
  });

  const logTime = useMutation({
    mutationFn: (data: { minutes: number; work_date: string; note: string }) =>
      api.post(`/tasks/${id}/time-entries/`, data),
    onSuccess: () => {
      setMinutes("");
      qc.invalidateQueries({ queryKey: ["task", id] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async () => {
      const res = await api.delete<ApiResponse<null>>(`/tasks/${id}/`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (task?.project) {
        qc.invalidateQueries({ queryKey: ["project-tasks", String(task.project)] });
      }
      navigate("/tasks");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setStatusFeedback({
        type: "error",
        message: err.response?.data?.message ?? "Could not delete task.",
      });
    },
  });

  if (!task) return <p className="text-slate-400">Loading...</p>;

  const totalMinutes = task.time_entries?.reduce((sum, e) => sum + e.minutes, 0) ?? 0;

  return (
    <PageContainer size="md">
    <div className="space-y-6">
      <BackLink to="/tasks" label="Tasks" />

      <WorkItemHero
        type="task"
        title={task.title}
        status={task.status}
        description={task.description}
        projectId={task.project}
        projectName={task.project_name}
        featureId={task.feature}
        featureTitle={task.feature_title}
        sprintId={task.sprint}
        sprintName={task.sprint_name}
        priority={task.priority}
        taskType={task.task_type}
        dueDate={task.due_date}
        reporter={task.reporter_detail}
        assignees={task.assignees_detail}
        actions={
          task.is_owner ? (
            <WorkItemActions
              editLabel={showEdit ? "Close edit" : "Edit task"}
              itemTitle={task.title}
              isEditing={showEdit}
              onEdit={() => setShowEdit(!showEdit)}
              onDelete={() => deleteTask.mutate()}
              deletePending={deleteTask.isPending}
            />
          ) : undefined
        }
      />

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateTask.mutate();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Edit task</h2>
          <input
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            rows={4}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
              value={editForm.task_type}
              onChange={(e) => setEditForm({ ...editForm, task_type: e.target.value })}
            >
              {["feature", "chore", "spike"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <MultiUserSelect
            label="Assignees"
            users={users ?? []}
            selected={editForm.assignees}
            onChange={(ids) => setEditForm({ ...editForm, assignees: ids })}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Feature (optional)</span>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                value={editForm.feature}
                onChange={(e) => setEditForm({ ...editForm, feature: e.target.value })}
              >
                <option value="">None</option>
                {features?.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-slate-700">Sprint (optional)</span>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                value={editForm.sprint}
                onChange={(e) => setEditForm({ ...editForm, sprint: e.target.value })}
              >
                <option value="">None</option>
                {sprints?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <input
            type="date"
            className="border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            value={editForm.due_date}
            onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
          />
          <button type="submit" className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-sky-700">
            Save changes
          </button>
        </form>
      )}

      {statusFeedback && (
        <p
          className={`text-sm rounded-xl px-4 py-3 shadow-sm ${
            statusFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusFeedback.message}
        </p>
      )}

      <WorkItemStatusPicker
        type="task"
        currentStatus={task.status}
        statuses={TASK_STATUSES}
        canChange={Boolean(task.can_change_status)}
        isPending={statusMutation.isPending}
        onSelect={(s) => statusMutation.mutate(s)}
      />

      <WorkItemSection
        title="Time tracking"
        subtitle={totalMinutes > 0 ? `${(totalMinutes / 60).toFixed(1)} hours logged total` : "No time logged yet"}
        accent="task"
      >
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            logTime.mutate({
              minutes: Number(minutes),
              work_date: new Date().toISOString().slice(0, 10),
              note: "",
            });
          }}
        >
          <input
            type="number"
            min={1}
            placeholder="Minutes"
            className="border border-slate-200 rounded-lg px-3 py-2 w-32 shadow-sm"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-slate-900">
            Log time
          </button>
        </form>
        {task.time_entries && task.time_entries.length > 0 && (
          <ul className="mt-4 space-y-2">
            {task.time_entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                <span className="font-medium text-slate-800">{entry.minutes} min</span>
                <span className="text-slate-500">{entry.work_date}</span>
              </li>
            ))}
          </ul>
        )}
      </WorkItemSection>

      <WorkItemComments
        type="task"
        comments={task.comments}
        comment={comment}
        onCommentChange={setComment}
        onSubmit={() => {
          if (comment.trim()) addComment.mutate(comment);
        }}
      />
    </div>
    </PageContainer>
  );
}
