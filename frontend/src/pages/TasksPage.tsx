import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { BugCreateForm, emptyBugForm, emptyTaskForm, TaskCreateForm } from "../components/WorkItemForms";
import { usePermissions } from "../hooks/usePermissions";
import { useUsers } from "../hooks/useUsers";
import type { ApiResponse, Bug, Paginated, Project, Task } from "../types";

export default function TasksPage() {
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const { data: users } = useUsers();
  const [form, setForm] = useState(emptyTaskForm);

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
        project: Number(projectId),
        status: "backlog",
        due_date: form.due_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setProjectId("");
      setForm(emptyTaskForm());
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-slate-500 mt-1">Development work items</p>
        </div>
        {permissions.can_create_tasks && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            New task
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-6 bg-white border rounded-xl p-5">
          <TaskCreateForm
            form={form}
            users={users ?? []}
            onChange={setForm}
            onSubmit={() => createTask.mutate()}
            showProjectSelect
            projects={projects}
            projectId={projectId}
            onProjectChange={setProjectId}
          />
        </div>
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
                  {t.priority ? ` · ${t.priority}` : ""}
                  {t.due_date ? ` · due ${t.due_date}` : ""}
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
