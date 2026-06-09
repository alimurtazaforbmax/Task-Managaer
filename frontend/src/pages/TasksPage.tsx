import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PageContainer from "../components/PageContainer";
import WorkItemRow from "../components/WorkItemRow";
import { emptyTaskForm, TaskCreateForm } from "../components/WorkItemForms";
import { usePermissions } from "../hooks/usePermissions";
import { useProjectFeatures, useProjectSprints } from "../hooks/useProjectPlanning";
import { useUsers } from "../hooks/useUsers";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Paginated, Project, Task } from "../types";

export default function TasksPage() {
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const { data: users } = useUsers();
  const [form, setForm] = useState(emptyTaskForm);

  const { data: features } = useProjectFeatures(projectId);
  const { data: sprints } = useProjectSprints(projectId);

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
    mutationFn: async (attachments: File[]) => {
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...form,
        project: Number(projectId),
        status: "backlog",
        due_date: form.due_date || null,
        feature: form.feature ? Number(form.feature) : null,
        sprint: form.sprint ? Number(form.sprint) : null,
      });
      const task = unwrap(res);
      if (attachments.length) {
        await uploadWorkItemAttachments("tasks", task.id, attachments);
      }
      return task;
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
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-slate-500 mt-1">
            Pick a project first, then optionally link a feature and sprint
          </p>
        </div>
        {permissions.can_create_tasks && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            New task
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-6">
          <TaskCreateForm
            form={form}
            users={users ?? []}
            onChange={setForm}
            onSubmit={(files) => createTask.mutate(files)}
            isSubmitting={createTask.isPending}
            showProjectSelect
            projects={projects}
            projectId={projectId}
            onProjectChange={(pid) => {
              setProjectId(pid);
              setForm((f) => ({ ...f, feature: "", sprint: "" }));
            }}
            features={features?.map((f) => ({ id: f.id, title: f.title }))}
            sprints={sprints?.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <ul className="mt-8 space-y-2">
          {tasks?.map((t) => (
            <WorkItemRow
              key={t.id}
              title={t.title}
              subtitle={[
                t.project_name,
                t.feature_title,
                t.sprint_name,
                t.priority,
                t.due_date ? `due ${t.due_date}` : "",
                t.assignees_detail?.length
                  ? t.assignees_detail.map((u) => u.username).join(", ")
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              status={t.status}
              priority={t.priority}
              to={`/tasks/${t.id}`}
              accentColor="bg-brand-500"
              type="task"
            />
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
