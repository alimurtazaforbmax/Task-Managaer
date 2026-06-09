import { FormEvent, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import MultiUserSelect from "../components/MultiUserSelect";
import StatusBadge from "../components/StatusBadge";
import WorkItemActions from "../components/WorkItemActions";
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
  });

  const { data: task } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task>>(`/tasks/${id}/`);
      return unwrap(res);
    },
  });

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

  return (
    <div className="max-w-3xl">
      <BackLink to="/tasks" label="Tasks" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold">{task.title}</h1>
          <StatusBadge status={task.status} />
        </div>
        {task.is_owner && (
          <div className="ml-auto shrink-0 pl-6">
            <WorkItemActions
              editLabel={showEdit ? "Close edit" : "Edit task"}
              itemTitle={task.title}
              isEditing={showEdit}
              onEdit={() => setShowEdit(!showEdit)}
              onDelete={() => deleteTask.mutate()}
              deletePending={deleteTask.isPending}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 mt-1">
        Owner: {task.reporter_detail?.username ?? "—"}
        {task.assignees_detail?.length ? (
          <> · Assigned: {task.assignees_detail.map((u) => u.username).join(", ")}</>
        ) : null}
      </p>
      <p className="text-slate-600 mt-4">{task.description}</p>

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateTask.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">Edit task</h2>
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
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2"
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
          <input
            type="date"
            className="border rounded-lg px-3 py-2"
            value={editForm.due_date}
            onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Save changes
          </button>
        </form>
      )}

      {statusFeedback && (
        <p
          className={`mt-4 text-sm rounded-lg px-3 py-2 ${
            statusFeedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-rose-50 text-rose-800 border border-rose-200"
          }`}
        >
          {statusFeedback.message}
        </p>
      )}

      {task.can_change_status ? (
        <div className="mt-6 flex gap-2 flex-wrap">
          {TASK_STATUSES.map((s) => (
            <button
              key={s}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(s)}
              className={`text-xs px-3 py-1 rounded-full border ${
                task.status === s ? "bg-brand-600 text-white border-brand-600" : "hover:bg-slate-100"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Only the task owner or assignees can change status.
        </p>
      )}

      <section className="mt-10 bg-white border rounded-xl p-5">
        <h2 className="font-semibold">Comments</h2>
        <ul className="mt-3 space-y-3">
          {task.comments?.map((c) => (
            <li key={c.id} className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-slate-700">
                {c.author_detail?.username ?? "User"}
              </p>
              <p className="mt-1">{c.text}</p>
            </li>
          ))}
        </ul>
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (comment.trim()) addComment.mutate(comment);
          }}
        >
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Add a comment..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Post
          </button>
        </form>
      </section>

      <section className="mt-6 bg-white border rounded-xl p-5">
        <h2 className="font-semibold">Log time</h2>
        <form
          className="mt-3 flex gap-2"
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
            className="border rounded-lg px-3 py-2 w-32"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
          />
          <button type="submit" className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm">
            Log
          </button>
        </form>
        <ul className="mt-3 text-sm text-slate-600">
          {task.time_entries?.map((t) => (
            <li key={t.id}>
              {t.minutes} min — {t.work_date}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
