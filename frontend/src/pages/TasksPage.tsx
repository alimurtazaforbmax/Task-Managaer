import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import FilterBar, { FilterSelect, formatFilterLabel } from "../components/FilterBar";
import PaginationBar from "../components/PaginationBar";
import PageContainer from "../components/PageContainer";
import WorkItemRow from "../components/WorkItemRow";
import { emptyTaskForm, TaskCreateForm } from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePermissions } from "../hooks/usePermissions";
import { useProjectFeatures, useProjectSprints } from "../hooks/useProjectPlanning";
import { projectMembersToUsers, useProjectMembers } from "../hooks/useProjectMembers";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { useProjects } from "../hooks/useProjects";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Task } from "../types";

const PAGE_SIZE = 20;

const TASK_STATUSES = [
  "backlog",
  "todo",
  "in_progress",
  "in_review",
  "done",
  "blocked",
  "cancelled",
];
const TASK_PRIORITIES = ["low", "medium", "high", "urgent"];
const TASK_TYPES = ["feature", "chore", "spike"];

const emptyFilters = {
  search: "",
  project: "",
  status: "",
  priority: "",
  task_type: "",
  assignee: "",
};

export default function TasksPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState(emptyTaskForm);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);

  useEffect(() => {
    setPage(1);
  }, [
    debouncedSearch,
    filters.project,
    filters.status,
    filters.priority,
    filters.task_type,
    filters.assignee,
  ]);

  const { data: projectMembers, isLoading: membersLoading } = useProjectMembers(projectId);
  const assignableUsers = projectMembersToUsers(projectMembers);

  const { data: features } = useProjectFeatures(projectId);
  const { data: sprints } = useProjectSprints(projectId);

  const { data: projects } = useProjects();

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.project ||
      filters.status ||
      filters.priority ||
      filters.task_type ||
      filters.assignee
  );

  const { data: taskPage, isLoading } = usePaginatedList<Task>({
    queryKey: [
      "tasks",
      debouncedSearch,
      filters.project,
      filters.status,
      filters.priority,
      filters.task_type,
      filters.assignee,
    ],
    path: "/tasks/",
    params: {
      search: debouncedSearch,
      project: filters.project,
      status: filters.status,
      priority: filters.priority,
      task_type: filters.task_type,
      assignees: filters.assignee === "me" && user ? user.id : undefined,
    },
    page,
    pageSize: PAGE_SIZE,
  });
  const tasks = taskPage?.results ?? [];

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

  const projectOptions = [
    { value: "", label: "All projects" },
    ...(projects?.map((p) => ({ value: String(p.id), label: p.name })) ?? []),
  ];

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

      <FilterBar
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search tasks…"
        showClear={hasActiveFilters}
        onClear={() => {
          setFilters(emptyFilters);
          setPage(1);
        }}
      >
        <FilterSelect
          label="Project"
          value={filters.project}
          onChange={(project) => setFilters((f) => ({ ...f, project }))}
          options={projectOptions}
        />
        <FilterSelect
          label="Status"
          value={filters.status}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
          options={[
            { value: "", label: "All statuses" },
            ...TASK_STATUSES.map((s) => ({ value: s, label: formatFilterLabel(s) })),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={filters.priority}
          onChange={(priority) => setFilters((f) => ({ ...f, priority }))}
          options={[
            { value: "", label: "All priorities" },
            ...TASK_PRIORITIES.map((p) => ({ value: p, label: formatFilterLabel(p) })),
          ]}
        />
        <FilterSelect
          label="Type"
          value={filters.task_type}
          onChange={(task_type) => setFilters((f) => ({ ...f, task_type }))}
          options={[
            { value: "", label: "All types" },
            ...TASK_TYPES.map((t) => ({ value: t, label: formatFilterLabel(t) })),
          ]}
        />
        <FilterSelect
          label="Assignee"
          value={filters.assignee}
          onChange={(assignee) => setFilters((f) => ({ ...f, assignee }))}
          options={[
            { value: "", label: "Anyone" },
            { value: "me", label: "Assigned to me" },
          ]}
        />
      </FilterBar>

      {showForm && (
        <div className="mt-6">
          <TaskCreateForm
            form={form}
            users={assignableUsers}
            onChange={setForm}
            onSubmit={(files) => createTask.mutate(files)}
            isSubmitting={createTask.isPending}
            canAssign={permissions.can_assign_tasks}
            assigneesLoading={membersLoading}
            showProjectSelect
            projects={projects}
            projectId={projectId}
            onProjectChange={(pid) => {
              setProjectId(pid);
              setForm((f) => ({ ...f, feature: "", sprint: "", assignees: [] }));
            }}
            features={features?.map((f) => ({ id: f.id, title: f.title }))}
            sprints={sprints?.map((s) => ({ id: s.id, name: s.name }))}
          />
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : tasks?.length ? (
        <ul className="mt-8 space-y-2">
          {tasks.map((t) => (
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
      ) : (
        <p className="mt-8 text-slate-400">
          {hasActiveFilters ? "No tasks match your filters." : "No tasks yet."}
        </p>
      )}
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={taskPage?.count ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </PageContainer>
  );
}
