import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import StatusBadge from "../components/StatusBadge";
import { formatMemberLabel, useProjectMembers } from "../hooks/useProjectMembers";
import type { ApiResponse, Department, Paginated, Project, Ticket } from "../types";

const REQUEST_TYPES = [
  { value: "task", label: "Task request" },
  { value: "bug", label: "Bug report" },
  { value: "issue", label: "General issue" },
  { value: "other", label: "Other" },
] as const;

function formatUser(u?: { first_name?: string; last_name?: string; username: string }) {
  if (!u) return "—";
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.username;
}

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const { data: ticket, isLoading } = useQuery({
    queryKey: ["ticket", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Ticket>>(`/tickets/${id}/`);
      return unwrap(res);
    },
    enabled: !!id,
  });

  const { data: projects } = useQuery({
    queryKey: ["projects", "members-only"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        "/projects/?members_only=true"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Department> | Department[]>>(
        "/auth/departments/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    request_type: "issue" as Ticket["request_type"],
    project: "",
    mentioned_user: "",
    mentioned_department: "",
  });

  const { data: projectMembers, isLoading: membersLoading } = useProjectMembers(
    editForm.project || undefined
  );

  useEffect(() => {
    if (ticket && showEdit) {
      setEditForm({
        title: ticket.title,
        description: ticket.description,
        request_type: ticket.request_type,
        project: String(ticket.project),
        mentioned_user: ticket.mentioned_user ? String(ticket.mentioned_user) : "",
        mentioned_department: ticket.mentioned_department
          ? String(ticket.mentioned_department)
          : "",
      });
    }
  }, [ticket, showEdit]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ticket", id] });
    qc.invalidateQueries({ queryKey: ["tickets"] });
  };

  const updateTicket = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Ticket>>(`/tickets/${id}/`, {
        title: editForm.title,
        description: editForm.description,
        request_type: editForm.request_type,
        project: Number(editForm.project),
        mentioned_user: editForm.mentioned_user ? Number(editForm.mentioned_user) : null,
        mentioned_department: editForm.mentioned_department
          ? Number(editForm.mentioned_department)
          : null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      invalidate();
      setShowEdit(false);
    },
  });

  const approveTicket = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Ticket>>(`/tickets/${id}/approve/`);
      return unwrap(res);
    },
    onSuccess: () => invalidate(),
  });

  const rejectTicket = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Ticket>>(`/tickets/${id}/reject/`, {
        rejection_reason: rejectReason,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      invalidate();
      setShowReject(false);
      setRejectReason("");
    },
  });

  const deleteTicket = useMutation({
    mutationFn: async () => {
      await api.delete(`/tickets/${id}/`);
    },
    onSuccess: () => navigate("/tickets"),
  });

  if (isLoading || !ticket) {
    return (
      <PageContainer size="md">
        <p className="text-slate-400">Loading...</p>
      </PageContainer>
    );
  }

  const handleEditSubmit = (e: FormEvent) => {
    e.preventDefault();
    updateTicket.mutate();
  };

  return (
    <PageContainer size="md">
      <BackLink to="/tickets">Back to tickets</BackLink>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={ticket.status} />
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                {ticket.request_type.replace("_", " ")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mt-2">{ticket.title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {ticket.project_name} · Raised by {formatUser(ticket.raised_by_detail)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {ticket.can_edit && ticket.status === "pending" && (
              <button
                onClick={() => setShowEdit(!showEdit)}
                className="px-3 py-1.5 rounded-lg text-sm border border-slate-300 hover:bg-slate-50"
              >
                Edit
              </button>
            )}
            {ticket.can_approve && (
              <>
                <button
                  onClick={() => approveTicket.mutate()}
                  disabled={approveTicket.isPending}
                  className="px-3 py-1.5 rounded-lg text-sm bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => setShowReject(!showReject)}
                  className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white hover:bg-rose-700"
                >
                  Reject
                </button>
              </>
            )}
            {ticket.can_edit && ticket.status === "pending" && (
              <button
                onClick={() => {
                  if (window.confirm("Delete this ticket?")) deleteTicket.mutate();
                }}
                className="px-3 py-1.5 rounded-lg text-sm text-rose-600 border border-rose-200 hover:bg-rose-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>

        {showReject && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-100 space-y-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Rejection reason</span>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={() => rejectTicket.mutate()}
              disabled={rejectTicket.isPending}
              className="px-3 py-1.5 rounded-lg text-sm bg-rose-600 text-white"
            >
              Confirm reject
            </button>
          </div>
        )}

        {showEdit ? (
          <form onSubmit={handleEditSubmit} className="mt-6 space-y-4 border-t pt-6">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Type</span>
                <select
                  value={editForm.request_type}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      request_type: e.target.value as Ticket["request_type"],
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {REQUEST_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Project</span>
                <select
                  required
                  value={editForm.project}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      project: e.target.value,
                      mentioned_user: "",
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  {projects?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mention person</span>
                <select
                  value={editForm.mentioned_user}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mentioned_user: e.target.value })
                  }
                  disabled={!editForm.project}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">
                    {!editForm.project
                      ? "Select a project first"
                      : membersLoading
                        ? "Loading members..."
                        : "None"}
                  </option>
                  {projectMembers?.map((m) => (
                    <option key={m.user} value={m.user}>
                      {formatMemberLabel(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Mention department</span>
                <select
                  value={editForm.mentioned_department}
                  onChange={(e) =>
                    setEditForm({ ...editForm, mentioned_department: e.target.value })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="">None</option>
                  {departments?.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={updateTicket.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
              >
                Save changes
              </button>
              <button
                type="button"
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 rounded-lg text-sm text-slate-600"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <p className="mt-6 text-slate-700 whitespace-pre-wrap">
            {ticket.description || "No description provided."}
          </p>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Mentions</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Person</dt>
              <dd className="text-slate-900">{formatUser(ticket.mentioned_user_detail ?? undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Department</dt>
              <dd className="text-slate-900">
                {ticket.mentioned_department_detail?.name ?? "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Edit history</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last edited by</dt>
              <dd className="text-slate-900">
                {formatUser(ticket.last_edited_by_detail ?? undefined)}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Last updated</dt>
              <dd className="text-slate-900">{formatDateTime(ticket.updated_at)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Created</dt>
              <dd className="text-slate-900">{formatDateTime(ticket.created_at)}</dd>
            </div>
          </dl>
        </section>
      </div>

      {ticket.status !== "pending" && (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Review</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reviewed by</dt>
              <dd className="text-slate-900">{formatUser(ticket.approved_by_detail ?? undefined)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Reviewed at</dt>
              <dd className="text-slate-900">{formatDateTime(ticket.approved_at)}</dd>
            </div>
            {ticket.rejection_reason && (
              <div>
                <dt className="text-slate-500">Reason</dt>
                <dd className="text-slate-900 mt-1">{ticket.rejection_reason}</dd>
              </div>
            )}
            {ticket.created_task && (
              <div className="pt-2">
                <Link
                  to={`/tasks/${ticket.created_task}`}
                  className="text-brand-600 hover:underline text-sm font-medium"
                >
                  View created task →
                </Link>
              </div>
            )}
            {ticket.created_bug && (
              <div className="pt-2">
                <Link
                  to={`/bugs/${ticket.created_bug}`}
                  className="text-brand-600 hover:underline text-sm font-medium"
                >
                  View created bug →
                </Link>
              </div>
            )}
          </dl>
        </section>
      )}
    </PageContainer>
  );
}
