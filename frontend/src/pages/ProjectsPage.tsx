import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import ProjectMemberSelect from "../components/ProjectMemberSelect";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import { useUsers } from "../hooks/useUsers";
import type { ApiResponse, Paginated, Project } from "../types";

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

  const isAdmin = user?.role === "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        "/projects/"
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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-slate-500 mt-1">All projects you have access to</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            New project
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createProject.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
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
      ) : (
        <div className="grid gap-4 mt-8">
          {data?.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{p.name}</h2>
                  <p className="text-sm text-slate-500">{p.code}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                {p.description || "No description"}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{p.task_count ?? 0} tasks</span>
                <span>{p.bug_count ?? 0} bugs</span>
                <span>{p.member_count ?? 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
