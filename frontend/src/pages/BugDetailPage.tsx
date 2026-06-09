import { FormEvent, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import MultiUserSelect from "../components/MultiUserSelect";
import StatusBadge from "../components/StatusBadge";
import WorkItemActions from "../components/WorkItemActions";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/useUsers";
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: users } = useUsers();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [comment, setComment] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    steps_to_reproduce: "",
    environment: "",
    severity: "medium",
    priority: "medium",
    assignees: [] as number[],
    due_date: "",
  });

  const { data: bug } = useQuery({
    queryKey: ["bug", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Bug>>(`/bugs/${id}/`);
      return unwrap(res);
    },
  });

  useEffect(() => {
    if (bug && showEdit) {
      setEditForm({
        title: bug.title,
        description: bug.description,
        steps_to_reproduce: bug.steps_to_reproduce,
        environment: bug.environment,
        severity: bug.severity,
        priority: bug.priority,
        assignees: bug.assignees ?? [],
        due_date: bug.due_date ?? "",
      });
    }
  }, [bug, showEdit]);

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await api.post<ApiResponse<Bug>>(`/bugs/${id}/status/`, { status });
      return res.data;
    },
    onSuccess: (response) => {
      setStatusFeedback({ type: "success", message: response.message });
      qc.invalidateQueries({ queryKey: ["bug", id] });
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

  const updateBug = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Bug>>(`/bugs/${id}/`, {
        ...editForm,
        due_date: editForm.due_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      setShowEdit(false);
      qc.invalidateQueries({ queryKey: ["bug", id] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (reason: string) => {
      const res = await api.post<ApiResponse<Bug>>(`/bugs/${id}/reject/`, { reason });
      return res.data;
    },
    onSuccess: (response) => {
      setRejectReason("");
      setShowReject(false);
      setStatusFeedback({ type: "success", message: response.message });
      qc.invalidateQueries({ queryKey: ["bug", id] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setStatusFeedback({
        type: "error",
        message: err.response?.data?.message ?? "Could not reject bug.",
      });
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

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: number) =>
      api.delete(`/bugs/${id}/attachments/${attachmentId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["bug", id] }),
  });

  const deleteBug = useMutation({
    mutationFn: async () => {
      const res = await api.delete<ApiResponse<null>>(`/bugs/${id}/`);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      if (bug?.project) {
        qc.invalidateQueries({ queryKey: ["project-bugs", String(bug.project)] });
      }
      navigate("/bugs");
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      setStatusFeedback({
        type: "error",
        message: err.response?.data?.message ?? "Could not delete bug.",
      });
    },
  });

  if (!bug) return <p className="text-slate-400">Loading...</p>;

  const canReject = bug.can_change_status && bug.status !== "rejected";
  const canDeleteFile = bug.is_owner || user?.role === "admin";

  return (
    <div className="max-w-3xl">
      <BackLink to="/bugs" label="Bugs" />
      <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-2">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-2xl font-bold">{bug.title}</h1>
          <StatusBadge status={bug.status} />
        </div>
        {bug.is_owner && (
          <div className="ml-auto shrink-0 pl-6">
            <WorkItemActions
              editLabel={showEdit ? "Close edit" : "Edit bug"}
              itemTitle={bug.title}
              isEditing={showEdit}
              onEdit={() => setShowEdit(!showEdit)}
              onDelete={() => deleteBug.mutate()}
              deletePending={deleteBug.isPending}
            />
          </div>
        )}
      </div>
      <p className="text-sm text-slate-500 mt-1">
        {bug.severity} severity · Owner: {bug.reporter_detail?.username ?? "—"}
        {bug.assignees_detail?.length ? (
          <> · Assigned: {bug.assignees_detail.map((u) => u.username).join(", ")}</>
        ) : null}
      </p>
      <p className="text-slate-600 mt-4">{bug.description}</p>
      {bug.steps_to_reproduce && (
        <pre className="mt-4 bg-slate-100 rounded-lg p-4 text-sm whitespace-pre-wrap">
          {bug.steps_to_reproduce}
        </pre>
      )}

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateBug.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">Edit bug</h2>
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Description"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Steps to reproduce"
            value={editForm.steps_to_reproduce}
            onChange={(e) => setEditForm({ ...editForm, steps_to_reproduce: e.target.value })}
          />
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Environment"
            value={editForm.environment}
            onChange={(e) => setEditForm({ ...editForm, environment: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border rounded-lg px-3 py-2"
              value={editForm.severity}
              onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
            >
              {["low", "medium", "high", "critical"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="border rounded-lg px-3 py-2"
              value={editForm.priority}
              onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
            >
              {["low", "medium", "high", "urgent"].map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <MultiUserSelect
            label="Assignees"
            users={users ?? []}
            selected={editForm.assignees}
            onChange={(ids) => setEditForm({ ...editForm, assignees: ids })}
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

      {bug.can_change_status ? (
        <div className="mt-6 flex gap-2 flex-wrap">
          {BUG_STATUSES.map((s) => (
            <button
              key={s}
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate(s)}
              className={`text-xs px-3 py-1 rounded-full border ${
                bug.status === s ? "bg-brand-600 text-white border-brand-600" : "hover:bg-slate-100"
              }`}
            >
              {s.replace(/_/g, " ")}
            </button>
          ))}
          {canReject && (
            <button
              onClick={() => setShowReject(!showReject)}
              className="text-xs px-3 py-1 rounded-full border border-rose-300 text-rose-700 hover:bg-rose-50"
            >
              Reject
            </button>
          )}
        </div>
      ) : (
        <p className="mt-6 text-sm text-slate-500">
          Only the bug owner or assignees can change status.
        </p>
      )}

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
        <div className="mt-3 space-y-2">
          {bug.attachments?.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between border rounded-lg p-2 text-sm"
            >
              <a
                href={a.file_url}
                target="_blank"
                rel="noreferrer"
                className="text-brand-600 hover:underline"
              >
                {a.original_name} ({a.attachment_type})
              </a>
              {canDeleteFile && (
                <button
                  onClick={() => deleteAttachment.mutate(a.id)}
                  className="text-rose-600 hover:text-rose-800 text-xs px-2 py-1"
                >
                  Remove
                </button>
              )}
            </div>
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
