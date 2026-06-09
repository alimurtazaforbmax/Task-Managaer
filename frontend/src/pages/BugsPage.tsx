import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import { BugCreateForm, emptyBugForm } from "../components/WorkItemForms";
import { usePermissions } from "../hooks/usePermissions";
import { useUsers } from "../hooks/useUsers";
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
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Bug>>("/bugs/", {
        ...form,
        project: Number(projectId),
        status: "open",
        due_date: form.due_date || null,
      });
      return unwrap(res);
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
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bugs</h1>
          <p className="text-slate-500 mt-1">QA issues and defect tracking</p>
        </div>
        {permissions.can_create_bugs && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            Report bug
          </button>
        )}
      </div>

      {showForm && (
        <div className="mt-6 bg-white border rounded-xl p-5">
          <BugCreateForm
            form={form}
            users={users ?? []}
            onChange={setForm}
            onSubmit={() => createBug.mutate()}
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
          {bugs?.map((b) => (
            <Link
              key={b.id}
              to={`/bugs/${b.id}`}
              className="flex items-center justify-between bg-white border rounded-xl px-5 py-4 hover:shadow-sm"
            >
              <div>
                <p className="font-medium">{b.title}</p>
                <p className="text-xs text-slate-500">
                  {b.project_name}
                  {b.priority ? ` · ${b.priority}` : ""}
                  {b.due_date ? ` · due ${b.due_date}` : ""}
                  {b.assignees_detail?.length
                    ? ` · ${b.assignees_detail.map((u) => u.username).join(", ")}`
                    : ""}
                </p>
              </div>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
