import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import MultiUserSelect from "../components/MultiUserSelect";
import StatusBadge from "../components/StatusBadge";
import { useUsers } from "../hooks/useUsers";
import type { ApiResponse, Paginated, Project, Task } from "../types";

export default function TasksPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: users } = useUsers();
  const [form, setForm] = useState({
    project: "",
    title: "",
    description: "",
    priority: "medium",
    task_type: "feature",
    assignees: [] as number[],
  });

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>("/projects/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Task> | Task[]>>("/tasks/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const createTask = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...form,
        project: Number(form.project),
        status: "backlog",
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      setShowForm(false);
      setForm({ project: "", title: "", description: "", priority: "medium", task_type: "feature", assignees: [] });
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-500 mt-1">Development work items</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          New task
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createTask.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <select
            required
            className="w-full border rounded-lg px-3 py-2"
            value={form.project}
            onChange={(e) => setForm({ ...form, project: e.target.value })}
          >
            <option value="">Select project</option>
            {projects?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            required
            placeholder="Title"
            className="w-full border rounded-lg px-3 py-2"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <textarea
            placeholder="Description"
            className="w-full border rounded-lg px-3 py-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <MultiUserSelect
            label="Assign to"
            users={users ?? []}
            selected={form.assignees}
            onChange={(ids) => setForm({ ...form, assignees: ids })}
          />
          <button
            type="submit"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            Create
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-8 space-y-2">
          {tasks?.map((t) => (
            <Link
              key={t.id}
              to={`/tasks/${t.id}`}
              className="flex items-center justify-between bg-white border rounded-xl px-5 py-4 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{t.title}</p>
                <p className="text-xs text-slate-500">
                  {t.project_name}
                  {t.assignees_detail?.length
                    ? ` · ${t.assignees_detail.map((u) => u.username).join(", ")}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={t.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
