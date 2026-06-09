import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PageContainer from "../components/PageContainer";
import WorkItemRow from "../components/WorkItemRow";
import { BugCreateForm, emptyBugForm } from "../components/WorkItemForms";
import { usePermissions } from "../hooks/usePermissions";
import { useUsers } from "../hooks/useUsers";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Bug, Paginated, Project } from "../types";

export default function BugsPage() {
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [projectId, setProjectId] = useState("");
  const { data: users } = useUsers();
  const [form, setForm] = useState(emptyBugForm);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>("/projects/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: bugs, isLoading } = useQuery({
    queryKey: ["bugs"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Bug> | Bug[]>>("/bugs/");
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

      {showForm && (
        <div className="mt-6">
          <BugCreateForm
            form={form}
            users={users ?? []}
            onChange={setForm}
            onSubmit={(files) => createBug.mutate(files)}
            isSubmitting={createBug.isPending}
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
        <ul className="mt-8 space-y-2">
          {bugs?.map((b) => (
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
      )}
    </PageContainer>
  );
}
