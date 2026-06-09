import { FormEvent, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import ReportModal from "../components/ReportModal";
import MemberRow from "../components/MemberRow";
import ProjectDocumentsSection from "../components/ProjectDocumentsSection";
import ProjectMemberSelect from "../components/ProjectMemberSelect";
import StatChip from "../components/StatChip";
import StatusBadge from "../components/StatusBadge";
import WorkItemRow from "../components/WorkItemRow";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";
import {
  BugCreateForm,
  emptyBugForm,
  emptyTaskForm,
  TaskCreateForm,
} from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useUsers } from "../hooks/useUsers";
import { uploadWorkItemAttachments } from "../utils/uploadWorkItemAttachments";
import type { ApiResponse, Bug, Project, Task } from "../types";

export default function ProjectDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const permissions = usePermissions();
  const { data: users } = useUsers();
  const qc = useQueryClient();
  const isAdmin = user?.role === "admin";
  const [showEdit, setShowEdit] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showBugForm, setShowBugForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [bugForm, setBugForm] = useState(emptyBugForm);
  const [editForm, setEditForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "active",
    member_ids: [] as number[],
  });

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project>>(`/projects/${id}/`);
      return unwrap(res);
    },
  });

  useEffect(() => {
    if (project && showEdit) {
      setEditForm({
        name: project.name,
        code: project.code,
        description: project.description,
        status: project.status,
        member_ids: project.members?.map((m) => m.user) ?? [],
      });
    }
  }, [project, showEdit]);

  const { data: tasks } = useQuery({
    queryKey: ["tasks", { project: id }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ results: Task[] }>>(`/tasks/?project=${id}`);
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: bugs } = useQuery({
    queryKey: ["bugs", { project: id }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<{ results: Bug[] }>>(`/bugs/?project=${id}`);
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const updateProject = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<Project>>(`/projects/${id}/`, {
        name: editForm.name,
        code: editForm.code.toLowerCase().replace(/\s+/g, "-"),
        description: editForm.description,
        status: editForm.status,
        member_ids: editForm.member_ids,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      setShowEdit(false);
      qc.invalidateQueries({ queryKey: ["project", id] });
      qc.invalidateQueries({ queryKey: ["projects"] });
    },
  });

  const createTask = useMutation({
    mutationFn: async (attachments: File[]) => {
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...taskForm,
        project: Number(id),
        status: "backlog",
        due_date: taskForm.due_date || null,
      });
      const task = unwrap(res);
      if (attachments.length) {
        await uploadWorkItemAttachments("tasks", task.id, attachments);
      }
      return task;
    },
    onSuccess: () => {
      setShowTaskForm(false);
      setTaskForm(emptyTaskForm());
      qc.invalidateQueries({ queryKey: ["tasks", { project: id }] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const createBug = useMutation({
    mutationFn: async (attachments: File[]) => {
      const res = await api.post<ApiResponse<Bug>>("/bugs/", {
        ...bugForm,
        project: Number(id),
        status: "open",
        due_date: bugForm.due_date || null,
      });
      const bug = unwrap(res);
      if (attachments.length) {
        await uploadWorkItemAttachments("bugs", bug.id, attachments);
      }
      return bug;
    },
    onSuccess: () => {
      setShowBugForm(false);
      setBugForm(emptyBugForm());
      qc.invalidateQueries({ queryKey: ["bugs", { project: id }] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (!project) return <p className="text-slate-400">Loading...</p>;

  const palette = getProjectPalette(project.id);

  return (
    <PageContainer>
      {showReport && id && (
        <ReportModal
          url={`/projects/${id}/report/`}
          filename={`project-report-${project.code}.pdf`}
          onClose={() => setShowReport(false)}
        />
      )}
      <BackLink to="/projects" label="Projects" />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-70`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ${palette.gradient}`}
              >
                {getProjectInitials(project.name)}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
                  <StatusBadge status={project.status} />
                </div>
                <p className="text-slate-500 font-mono text-sm mt-1">{project.code}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowReport(true)}
                className="text-sm border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm font-medium text-slate-700"
              >
                Progress report
              </button>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowEdit(!showEdit)}
                  className="text-sm border px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm"
                >
                  Edit project
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 text-slate-700 leading-relaxed">
            {project.description || "No description yet."}
          </p>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StatChip label="Tasks" value={project.task_count ?? tasks?.length ?? 0} tone="tasks" />
            <StatChip label="Bugs" value={project.bug_count ?? bugs?.length ?? 0} tone="bugs" />
            <StatChip
              label="Members"
              value={project.member_count ?? project.members?.length ?? 0}
              tone="members"
            />
          </div>
        </div>
      </div>

      {project.members && project.members.length > 0 && (
        <section className="mt-8">
          <h2 className="font-semibold text-lg text-slate-900">Team members</h2>
          <ul className="mt-3 space-y-2">
            {project.members.map((m) => (
              <MemberRow key={m.id} member={m} />
            ))}
          </ul>
        </section>
      )}

      <ProjectDocumentsSection projectId={String(id)} />

      {showEdit && isAdmin && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateProject.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">Edit project</h2>
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
          />
          <input
            required
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.code}
            onChange={(e) => setEditForm({ ...editForm, code: e.target.value })}
          />
          <textarea
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
          >
            <option value="active">Active</option>
            <option value="on_hold">On Hold</option>
            <option value="archived">Archived</option>
          </select>
          <ProjectMemberSelect
            users={users ?? []}
            selected={editForm.member_ids}
            onChange={(member_ids) => setEditForm({ ...editForm, member_ids })}
          />
          <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
            Save changes
          </button>
        </form>
      )}

      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-900">Tasks</h2>
          {permissions.can_create_tasks && (
            <button
              onClick={() => {
                setShowBugForm(false);
                setShowTaskForm(!showTaskForm);
              }}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
            >
              New task
            </button>
          )}
        </div>
        {showTaskForm && permissions.can_create_tasks && (
          <div className="mt-4">
            <TaskCreateForm
              form={taskForm}
              users={users ?? []}
              onChange={setTaskForm}
              onSubmit={(files) => createTask.mutate(files)}
              isSubmitting={createTask.isPending}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => (
            <WorkItemRow
              key={t.id}
              title={t.title}
              subtitle={[t.priority, t.due_date ? `due ${t.due_date}` : ""].filter(Boolean).join(" · ")}
              status={t.status}
              priority={t.priority}
              to={`/tasks/${t.id}`}
              accentColor="bg-slate-400"
              type="task"
            />
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg text-slate-900">Bugs</h2>
          {permissions.can_create_bugs && (
            <button
              onClick={() => {
                setShowTaskForm(false);
                setShowBugForm(!showBugForm);
              }}
              className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
            >
              Report bug
            </button>
          )}
        </div>
        {showBugForm && permissions.can_create_bugs && (
          <div className="mt-4">
            <BugCreateForm
              form={bugForm}
              users={users ?? []}
              onChange={setBugForm}
              onSubmit={(files) => createBug.mutate(files)}
              isSubmitting={createBug.isPending}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {bugs?.map((b) => (
            <WorkItemRow
              key={b.id}
              title={b.title}
              subtitle={[b.severity, b.priority, b.due_date ? `due ${b.due_date}` : ""].filter(Boolean).join(" · ")}
              status={b.status}
              priority={b.severity}
              to={`/bugs/${b.id}`}
              accentColor="bg-slate-500"
              type="bug"
            />
          ))}
        </ul>
      </section>
    </PageContainer>
  );
}
