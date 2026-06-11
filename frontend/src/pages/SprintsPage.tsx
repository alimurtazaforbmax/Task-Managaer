import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PaginationBar from "../components/PaginationBar";
import PageContainer from "../components/PageContainer";
import SprintCard from "../components/SprintCard";
import { usePermissions } from "../hooks/usePermissions";
import { usePaginatedList } from "../hooks/usePaginatedList";
import type { ApiResponse, Paginated, Project, Sprint } from "../types";

const PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  goal: "",
  description: "",
  project: "",
  start_date: "",
  end_date: "",
};

export default function SprintsPage() {
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(emptyForm);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>("/projects/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: sprintPage, isLoading } = usePaginatedList<Sprint>({
    queryKey: ["sprints"],
    path: "/sprints/",
    page,
    pageSize: PAGE_SIZE,
  });
  const sprints = sprintPage?.results ?? [];

  const createSprint = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Sprint>>("/sprints/", {
        ...form,
        project: Number(form.project),
        status: "planned",
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sprints"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sprints</h1>
          <p className="text-slate-500 mt-1">Time-boxed iterations tied to your projects</p>
        </div>
        {permissions.can_create_sprints && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            New sprint
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createSprint.mutate();
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Create sprint</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                required
                placeholder="Sprint 12"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Goal</span>
              <textarea
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Project *</span>
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
              <span className="text-sm font-medium text-slate-700">Start date *</span>
              <input
                required
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">End date *</span>
              <input
                required
                type="date"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createSprint.isPending}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Create sprint
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sprints?.map((s) => (
            <SprintCard key={s.id} sprint={s} />
          ))}
          {!sprints?.length && (
            <p className="text-slate-400 col-span-full">No sprints yet.</p>
          )}
        </div>
      )}
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={sprintPage?.count ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </PageContainer>
  );
}
