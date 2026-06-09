import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PageContainer from "../components/PageContainer";
import WorkItemRow from "../components/WorkItemRow";
import { useUsers } from "../hooks/useUsers";
import type { ApiResponse, Department, Paginated, Project, Ticket } from "../types";

const REQUEST_TYPES = [
  { value: "task", label: "Task request" },
  { value: "bug", label: "Bug report" },
  { value: "issue", label: "General issue" },
  { value: "other", label: "Other" },
] as const;

function emptyForm() {
  return {
    title: "",
    description: "",
    request_type: "issue" as Ticket["request_type"],
    project: "",
    mentioned_user: "",
    mentioned_department: "",
  };
}

export default function TicketsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const { data: users } = useUsers();

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>("/projects/");
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

  const { data: tickets, isLoading } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Ticket> | Ticket[]>>("/tickets/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const createTicket = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Ticket>>("/tickets/", {
        title: form.title,
        description: form.description,
        request_type: form.request_type,
        project: Number(form.project),
        mentioned_user: form.mentioned_user ? Number(form.mentioned_user) : null,
        mentioned_department: form.mentioned_department
          ? Number(form.mentioned_department)
          : null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      setShowForm(false);
      setForm(emptyForm());
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    createTicket.mutate();
  };

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tickets</h1>
          <p className="text-slate-500 mt-1">
            Raise issues or request tasks and bugs for PM review
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
        >
          New ticket
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="text-lg font-semibold text-slate-900">Raise a ticket</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={form.request_type}
                onChange={(e) =>
                  setForm({
                    ...form,
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
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Project</span>
              <select
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Mention person (optional)
              </span>
              <select
                value={form.mentioned_user}
                onChange={(e) => setForm({ ...form, mentioned_user: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {users?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name || u.last_name
                      ? `${u.first_name} ${u.last_name}`.trim()
                      : u.username}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Mention department (optional)
              </span>
              <select
                value={form.mentioned_department}
                onChange={(e) =>
                  setForm({ ...form, mentioned_department: e.target.value })
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
              disabled={createTicket.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {createTicket.isPending ? "Submitting..." : "Submit ticket"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {tickets?.map((t) => (
            <WorkItemRow
              key={t.id}
              title={t.title}
              subtitle={[
                t.project_name,
                t.request_type.replace("_", " "),
                t.raised_by_detail?.username
                  ? `by ${t.raised_by_detail.username}`
                  : "",
                t.mentioned_user_detail?.username
                  ? `→ ${t.mentioned_user_detail.username}`
                  : t.mentioned_department_detail?.name
                    ? `→ ${t.mentioned_department_detail.name}`
                    : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              status={t.status}
              to={`/tickets/${t.id}`}
              accentColor="bg-violet-500"
              type="ticket"
            />
          ))}
          {!tickets?.length && (
            <p className="text-slate-400 text-sm">No tickets yet. Raise one above.</p>
          )}
        </ul>
      )}
    </PageContainer>
  );
}
