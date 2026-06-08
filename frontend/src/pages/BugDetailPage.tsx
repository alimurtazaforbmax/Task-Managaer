import { FormEvent, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Bug } from "../types";

const BUG_STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "fixed",
  "qa_verification",
  "closed",
];

export default function BugDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);

  const { data: bug } = useQuery({
    queryKey: ["bug", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Bug>>(`/bugs/${id}/`);
      return unwrap(res);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.post(`/bugs/${id}/status/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bug", id] }),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => api.post(`/bugs/${id}/reject/`, { reason }),
    onSuccess: () => {
      setRejectReason("");
      setShowReject(false);
      qc.invalidateQueries({ queryKey: ["bug", id] });
    },
  });

  const addComment = useMutation({
    mutationFn: (text: string) =>
      api.post(`/bugs/${id}/comments/`, { text, comment_type: "general" }),
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["bug", id] });
    },
  });

  const uploadFile = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      await api.post(`/bugs/${id}/attachments/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bug", id] }),
  });

  if (!bug) return <p className="text-slate-400">Loading...</p>;

  const canReject = user?.role === "developer" || user?.role === "admin";

  return (
    <div className="max-w-3xl">
      <Link to="/bugs" className="text-sm text-brand-600 hover:underline">← Bugs</Link>
      <div className="flex items-center gap-3 mt-2">
        <h1 className="text-2xl font-bold">{bug.title}</h1>
        <StatusBadge status={bug.status} />
      </div>
      <p className="text-sm text-slate-500 mt-1">
        {bug.severity} severity · reported by {bug.reporter_detail?.username ?? "—"}
      </p>
      <p className="text-slate-600 mt-4">{bug.description}</p>
      {bug.steps_to_reproduce && (
        <pre className="mt-4 bg-slate-100 rounded-lg p-4 text-sm whitespace-pre-wrap">
          {bug.steps_to_reproduce}
        </pre>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        {BUG_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => statusMutation.mutate(s)}
            className={`text-xs px-3 py-1 rounded-full border ${
              bug.status === s ? "bg-brand-600 text-white border-brand-600" : "hover:bg-slate-100"
            }`}
          >
            {s.replace(/_/g, " ")}
          </button>
        ))}
        {canReject && bug.status !== "rejected" && (
          <button
            onClick={() => setShowReject(!showReject)}
            className="text-xs px-3 py-1 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50"
          >
            Reject
          </button>
        )}
      </div>

      {showReject && (
        <form
          className="mt-4 bg-rose-50 border border-rose-200 rounded-xl p-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (rejectReason.length >= 10) rejectMutation.mutate(rejectReason);
          }}
        >
          <p className="text-sm font-medium text-rose-800">Rejection reason (min 10 chars)</p>
          <textarea
            required
            minLength={10}
            className="mt-2 w-full border rounded-lg px-3 py-2 text-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button
            type="submit"
            className="mt-2 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Confirm reject
          </button>
        </form>
      )}

      <section className="mt-8 bg-white border rounded-xl p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Evidence (images / video)</h2>
          <button
            onClick={() => fileRef.current?.click()}
            className="text-sm text-brand-600 hover:underline"
          >
            Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadFile.mutate(f);
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {bug.attachments?.map((a) => (
            <a
              key={a.id}
              href={a.file_url}
              target="_blank"
              rel="noreferrer"
              className="block border rounded-lg p-2 text-sm text-brand-600 hover:bg-slate-50"
            >
              {a.original_name} ({a.attachment_type})
            </a>
          ))}
        </div>
      </section>

      <section className="mt-6 bg-white border rounded-xl p-5">
        <h2 className="font-semibold">Discussion</h2>
        <ul className="mt-3 space-y-3">
          {bug.comments?.map((c) => (
            <li
              key={c.id}
              className={`rounded-lg p-3 text-sm ${
                c.comment_type === "rejection_reason"
                  ? "bg-rose-50 border border-rose-100"
                  : "bg-slate-50"
              }`}
            >
              <p className="font-medium text-slate-700">
                {c.author_detail?.username ?? "User"}
                {c.comment_type === "rejection_reason" && (
                  <span className="ml-2 text-rose-600 text-xs">rejection</span>
                )}
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
            placeholder="Reply..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Post
          </button>
        </form>
      </section>
    </div>
  );
}
