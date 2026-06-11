import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import FilterBar, { FilterSelect, formatFilterLabel } from "../components/FilterBar";
import ProjectCard from "../components/ProjectCard";
import ProjectMemberSelect from "../components/ProjectMemberSelect";
import { useAuth } from "../context/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { useUsers } from "../hooks/useUsers";
import { buildQueryString } from "../utils/buildQueryString";
import type { ApiResponse, Paginated, Project } from "../types";

const PROJECT_STATUSES = ["active", "on_hold", "archived"];

const emptyFilters = {
  search: "",
  status: "",
};

const emptyForm = {
  name: "",
  code: "",
  description: "",
  status: "active",
  member_ids: [] as number[],
};

export default function ProjectsPage() {
  const { user } = useAuth();
  const { data: users } = useUsers();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedSearch = useDebouncedValue(filters.search);

  const isAdmin = user?.role === "admin";

  const hasActiveFilters = Boolean(filters.search || filters.status);

  const { data, isLoading } = useQuery({
    queryKey: ["projects", debouncedSearch, filters.status],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        `/projects/${buildQueryString({
          search: debouncedSearch,
          status: filters.status,
          page_size: 100,
        })}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const createProject = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Project>>("/projects/", {
        name: form.name,
        code: form.code.toLowerCase().replace(/\s+/g, "-"),
        description: form.description,
        status: form.status,
        member_ids: form.member_ids,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm(emptyForm);
      setError("");
    },
    onError: () => setError("Could not create project. Code may already exist."),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
          <p className="text-slate-500 mt-1">All projects you have access to</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            New project
          </button>
        )}
      </div>

      <FilterBar
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search projects…"
        showClear={hasActiveFilters}
        onClear={() => setFilters(emptyFilters)}
      >
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
          options={[
            { value: "", label: "All statuses" },
            ...PROJECT_STATUSES.map((s) => ({ value: s, label: formatFilterLabel(s) })),
          ]}
        />
      </FilterBar>

      {showForm && isAdmin && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createProject.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3 shadow-sm"
        >
          <h2 className="font-semibold">Create project</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            required
            placeholder="Project name"
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            required
            placeholder="Code (e.g. my-app)"
            className="w-full border rounded-lg px-3 py-2"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
          <textarea
            placeholder="Description"
            className="w-full border rounded-lg px-3 py-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="archived">Archived</option>
          </select>
          <ProjectMemberSelect
            users={users ?? []}
            selected={form.member_ids}
            onChange={(member_ids) => setForm({ ...form, member_ids })}
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Create project
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : data?.length ? (
        <div className="grid gap-5 mt-8 md:grid-cols-2">
          {data.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-slate-400">
          {hasActiveFilters ? "No projects match your filters." : "No projects yet."}
        </p>
      )}
    </div>
  );
}
