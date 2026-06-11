import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import FilterBar, { FilterSelect, formatFilterLabel } from "../components/FilterBar";
import PageContainer from "../components/PageContainer";
import WorkItemRow from "../components/WorkItemRow";
import { BugCreateForm, emptyBugForm } from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePermissions } from "../hooks/usePermissions";
import { projectMembersToUsers, useProjectMembers } from "../hooks/useProjectMembers";
import { useProjects } from "../hooks/useProjects";
import { buildQueryString } from "../utils/buildQueryString";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Bug, Paginated } from "../types";

const BUG_STATUSES = [
  "open",
  "triaged",
  "in_progress",
  "fixed",
  "qa_verification",
  "closed",
  "rejected",
];
const BUG_SEVERITIES = ["low", "medium", "high", "critical"];
const BUG_PRIORITIES = ["low", "medium", "high", "urgent"];
const BUG_ENVIRONMENTS = ["staging", "uat", "production"];

const emptyFilters = {
  search: "",
  project: "",
  status: "",
  severity: "",
  priority: "",
  environment: "",
  assignee: "",
};

export default function BugsPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const [form, setForm] = useState(emptyBugForm);
  const [filters, setFilters] = useState(emptyFilters);
  const debouncedSearch = useDebouncedValue(filters.search);

  const { data: projectMembers, isLoading: membersLoading } = useProjectMembers(projectId);
  const assignableUsers = projectMembersToUsers(projectMembers);

  const { data: projects } = useProjects();

  const hasActiveFilters = Boolean(
    filters.search ||
      filters.project ||
      filters.status ||
      filters.severity ||
      filters.priority ||
      filters.environment ||
      filters.assignee
  );

  const { data: bugs, isLoading } = useQuery({
    queryKey: [
      "bugs",
      debouncedSearch,
      filters.project,
      filters.status,
      filters.severity,
      filters.priority,
      filters.environment,
      filters.assignee,
    ],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Bug> | Bug[]>>(
        `/bugs/${buildQueryString({
          search: debouncedSearch,
          project: filters.project,
          status: filters.status,
          severity: filters.severity,
          priority: filters.priority,
          environment: filters.environment,
          assignees: filters.assignee === "me" && user ? user.id : undefined,
          page_size: 100,
        })}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const createBug = useMutation({
    mutationFn: async (attachments: File[]) => {
      const res = await api.post<ApiResponse<Bug>>("/bugs/", {
        ...form,
        project: Number(projectId),
        status: "open",
        due_date: form.due_date || null,
      });
      const bug = unwrap(res);
      if (attachments.length) {
        await uploadWorkItemAttachments("bugs", bug.id, attachments);
      }
      return bug;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bugs"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setShowForm(false);
      setProjectId("");
      setForm(emptyBugForm());
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
          <h1 className="text-2xl font-bold text-slate-900">Bugs</h1>
          <p className="text-slate-500 mt-1">QA issues and defect tracking</p>
        </div>
        {permissions.can_create_bugs && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            Report bug
          </button>
        )}
      </div>

      <FilterBar
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search bugs…"
        showClear={hasActiveFilters}
        onClear={() => setFilters(emptyFilters)}
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
            ...BUG_STATUSES.map((s) => ({ value: s, label: formatFilterLabel(s) })),
          ]}
        />
        <FilterSelect
          label="Severity"
          value={filters.severity}
          onChange={(severity) => setFilters((f) => ({ ...f, severity }))}
          options={[
            { value: "", label: "All severities" },
            ...BUG_SEVERITIES.map((s) => ({ value: s, label: formatFilterLabel(s) })),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={filters.priority}
          onChange={(priority) => setFilters((f) => ({ ...f, priority }))}
          options={[
            { value: "", label: "All priorities" },
            ...BUG_PRIORITIES.map((p) => ({ value: p, label: formatFilterLabel(p) })),
          ]}
        />
        <FilterSelect
          label="Environment"
          value={filters.environment}
          onChange={(environment) => setFilters((f) => ({ ...f, environment }))}
          options={[
            { value: "", label: "All environments" },
            ...BUG_ENVIRONMENTS.map((e) => ({ value: e, label: formatFilterLabel(e) })),
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
          <BugCreateForm
            form={form}
            users={assignableUsers}
            onChange={setForm}
            onSubmit={(files) => createBug.mutate(files)}
            isSubmitting={createBug.isPending}
            assigneesLoading={membersLoading}
            showProjectSelect
            projects={projects}
            projectId={projectId}
            onProjectChange={(pid) => {
              setProjectId(pid);
              setForm((f) => ({ ...f, assignees: [] }));
            }}
          />
        </div>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : bugs?.length ? (
        <ul className="mt-8 space-y-2">
          {bugs.map((b) => (
            <WorkItemRow
              key={b.id}
              title={b.title}
              subtitle={[
                b.project_name,
                b.severity,
                b.priority,
                b.due_date ? `due ${b.due_date}` : "",
                b.assignees_detail?.length
                  ? b.assignees_detail.map((u) => u.username).join(", ")
                  : "",
              ]
                .filter(Boolean)
                .join(" · ")}
              status={b.status}
              priority={b.severity}
              to={`/bugs/${b.id}`}
              accentColor="bg-slate-600"
              type="bug"
            />
          ))}
        </ul>
      ) : (
        <p className="mt-8 text-slate-400">
          {hasActiveFilters ? "No bugs match your filters." : "No bugs yet."}
        </p>
      )}
    </PageContainer>
  );
}
