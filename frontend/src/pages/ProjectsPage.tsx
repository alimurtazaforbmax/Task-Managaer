import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Paginated, Project } from "../types";

export default function ProjectsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", code: "", description: "" });
  const [error, setError] = useState("");

  const canCreate = user?.role === "admin" || user?.role === "project_manager";

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
        ...form,
        code: form.code.toLowerCase().replace(/\s+/g, "-"),
        status: "active",
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm({ name: "", code: "", description: "" });
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
        {canCreate && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            New project
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createProject.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
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
