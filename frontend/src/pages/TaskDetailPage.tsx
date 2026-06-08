import { FormEvent, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import type { ApiResponse, Task } from "../types";

const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done", "blocked", "cancelled"];

export default function TaskDetailPage() {
  const { id } = useParams();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [minutes, setMinutes] = useState("");

  const { data: task } = useQuery({
    queryKey: ["task", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Task>>(`/tasks/${id}/`);
      return unwrap(res);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) =>
      api.post(`/tasks/${id}/status/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task", id] }),
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

  if (!task) return <p className="text-slate-400">Loading...</p>;

  return (
    <div className="max-w-3xl">
      <Link to="/tasks" className="text-sm text-brand-600 hover:underline">← Tasks</Link>
      <div className="flex items-center gap-3 mt-2">
        <h1 className="text-2xl font-bold">{task.title}</h1>
        <StatusBadge status={task.status} />
      </div>
      <p className="text-slate-600 mt-4">{task.description}</p>

      <div className="mt-6 flex gap-2 flex-wrap">
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => statusMutation.mutate(s)}
            className={`text-xs px-3 py-1 rounded-full border ${
              task.status === s ? "bg-brand-600 text-white border-brand-600" : "hover:bg-slate-100"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <section className="mt-10 bg-white border rounded-xl p-5">
        <h2 className="font-semibold">Comments</h2>
        <ul className="mt-3 space-y-3">
          {task.comments?.map((c) => (
            <li key={c.id} className="bg-slate-50 rounded-lg p-3 text-sm">
              <p className="font-medium text-slate-700">
                {c.author_detail?.username ?? "User"}
                <span className="text-slate-400 font-normal ml-2">{c.comment_type}</span>
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
