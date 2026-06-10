import { FormEvent, useEffect, useRef, useState } from "react";
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
import { useAuth } from "../context/AuthContext";
import { projectMembersToUsers, useProjectMembers } from "../hooks/useProjectMembers";
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

  const { data: projectMembers, isLoading: membersLoading } = useProjectMembers(bug?.project);
  const assignableUsers = projectMembersToUsers(projectMembers);

  useEffect(() => {
    if (bug && showEdit) {
      const memberIds = new Set((projectMembers ?? []).map((m) => m.user));
      setEditForm({
        title: bug.title,
        description: bug.description,
        steps_to_reproduce: bug.steps_to_reproduce,
        environment: bug.environment,
        severity: bug.severity,
        priority: bug.priority,
        assignees: (bug.assignees ?? []).filter((id) => memberIds.has(id)),
        due_date: bug.due_date ?? "",
      });
    }
  }, [bug, showEdit, projectMembers]);

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
    <PageContainer size="md">
    <div className="space-y-6">
      <BackLink to="/bugs" label="Bugs" />

      <WorkItemHero
        type="bug"
        title={bug.title}
        status={bug.status}
        description={bug.description}
        projectId={bug.project}
        projectName={bug.project_name}
        priority={bug.priority}
        severity={bug.severity}
        dueDate={bug.due_date}
        environment={bug.environment}
        reporter={bug.reporter_detail}
        assignees={bug.assignees_detail}
        actions={
          bug.is_owner ? (
            <WorkItemActions
              editLabel={showEdit ? "Close edit" : "Edit bug"}
              itemTitle={bug.title}
              isEditing={showEdit}
              onEdit={() => setShowEdit(!showEdit)}
              onDelete={() => deleteBug.mutate()}
              deletePending={deleteBug.isPending}
            />
          ) : undefined
        }
      >
        {bug.steps_to_reproduce && (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 mb-2">
              Steps to reproduce
            </p>
            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {bug.steps_to_reproduce}
            </pre>
          </div>
        )}
      </WorkItemHero>

      {showEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateBug.mutate();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Edit bug</h2>
          <input
            required
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            placeholder="Description"
            rows={3}
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <textarea
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            placeholder="Steps to reproduce"
            rows={4}
            value={editForm.steps_to_reproduce}
            onChange={(e) => setEditForm({ ...editForm, steps_to_reproduce: e.target.value })}
          />
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
            placeholder="Environment"
            value={editForm.environment}
            onChange={(e) => setEditForm({ ...editForm, environment: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
              value={editForm.severity}
              onChange={(e) => setEditForm({ ...editForm, severity: e.target.value })}
            >
              {["low", "medium", "high", "critical"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select
              className="border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
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
            users={assignableUsers}
            selected={editForm.assignees}
            onChange={(ids) => setEditForm({ ...editForm, assignees: ids })}
            disabled={membersLoading}
            emptyMessage={
              membersLoading ? "Loading project members..." : "No project members available"
            }
          />
          <button type="submit" className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-amber-700">
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
        type="bug"
        currentStatus={bug.status}
        statuses={BUG_STATUSES}
        canChange={Boolean(bug.can_change_status)}
        isPending={statusMutation.isPending}
        onSelect={(s) => statusMutation.mutate(s)}
        extraActions={
          canReject ? (
            <button
              type="button"
              onClick={() => setShowReject(!showReject)}
              className="text-xs px-3 py-1.5 rounded-full border border-rose-300 text-rose-700 font-medium hover:bg-rose-50 shadow-sm"
            >
              Reject
            </button>
          ) : undefined
        }
      />

      {showReject && (
        <form
          className="rounded-2xl border border-rose-200 bg-rose-50 p-5 shadow-sm"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (rejectReason.length >= 10) rejectMutation.mutate(rejectReason);
          }}
        >
          <p className="text-sm font-semibold text-rose-800">Rejection reason (min 10 chars)</p>
          <textarea
            required
            minLength={10}
            rows={3}
            className="mt-2 w-full border border-rose-200 rounded-lg px-3 py-2 text-sm shadow-sm"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <button
            type="submit"
            className="mt-3 bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm hover:bg-rose-700"
          >
            Confirm reject
          </button>
        </form>
      )}

      <WorkItemSection
        title="Evidence"
        subtitle="Images and video attachments"
        accent="bug"
        action={
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-sm font-medium text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg"
          >
            Upload
          </button>
        }
      >
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
        {!bug.attachments?.length ? (
          <p className="text-sm text-slate-400">No attachments uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {bug.attachments.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm shadow-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 border border-amber-200">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <a
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-brand-600 hover:underline truncate block"
                    >
                      {a.original_name}
                    </a>
                    <p className="text-xs text-slate-500 capitalize">{a.attachment_type}</p>
                  </div>
                </div>
                {canDeleteFile && (
                  <button
                    type="button"
                    onClick={() => deleteAttachment.mutate(a.id)}
                    className="text-rose-600 hover:text-rose-800 text-xs font-medium px-2 py-1"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </WorkItemSection>

      <WorkItemComments
        type="bug"
        comments={bug.comments}
        comment={comment}
        onCommentChange={setComment}
        onSubmit={() => {
          if (comment.trim()) addComment.mutate(comment);
        }}
        placeholder="Reply..."
      />
    </div>
    </PageContainer>
  );
}
