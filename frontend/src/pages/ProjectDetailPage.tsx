import { FormEvent, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import ProjectMemberSelect from "../components/ProjectMemberSelect";
import StatusBadge from "../components/StatusBadge";
import {
  BugCreateForm,
  emptyBugForm,
  emptyTaskForm,
  TaskCreateForm,
} from "../components/WorkItemForms";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useUsers } from "../hooks/useUsers";
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
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Task>>("/tasks/", {
        ...taskForm,
        project: Number(id),
        status: "backlog",
        due_date: taskForm.due_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      setShowTaskForm(false);
      setTaskForm(emptyTaskForm());
      qc.invalidateQueries({ queryKey: ["tasks", { project: id }] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const createBug = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Bug>>("/bugs/", {
        ...bugForm,
        project: Number(id),
        status: "open",
        due_date: bugForm.due_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      setShowBugForm(false);
      setBugForm(emptyBugForm());
      qc.invalidateQueries({ queryKey: ["bugs", { project: id }] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (!project) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
      <BackLink to="/projects" label="Projects" />
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <StatusBadge status={project.status} />
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowEdit(!showEdit)}
            className="text-sm border px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            Edit project
          </button>
        )}
      </div>
      <p className="text-slate-500">{project.code}</p>
      <p className="mt-4 text-slate-700">{project.description}</p>

      {project.members && project.members.length > 0 && (
        <section className="mt-6 bg-white border rounded-xl p-5">
          <h2 className="font-semibold">Members</h2>
          <ul className="mt-3 space-y-2">
            {project.members.map((m) => (
              <li key={m.id} className="flex items-center justify-between text-sm">
                <span>
                  {m.user_detail?.first_name || m.user_detail?.username || `User #${m.user}`}
                </span>
                <span className="text-slate-500 capitalize">{m.role.replace(/_/g, " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <h2 className="font-semibold text-lg">Tasks</h2>
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
          <div className="mt-4 bg-white border rounded-xl p-5">
            <TaskCreateForm
              form={taskForm}
              users={users ?? []}
              onChange={setTaskForm}
              onSubmit={() => createTask.mutate()}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => (
            <li key={t.id}>
              <Link
                to={`/tasks/${t.id}`}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <span>{t.title}</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {t.priority}
                    {t.due_date ? ` · due ${t.due_date}` : ""}
                  </p>
                </div>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Bugs</h2>
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
          <div className="mt-4 bg-white border rounded-xl p-5">
            <BugCreateForm
              form={bugForm}
              users={users ?? []}
              onChange={setBugForm}
              onSubmit={() => createBug.mutate()}
            />
          </div>
        )}
        <ul className="mt-3 space-y-2">
          {bugs?.map((b) => (
            <li key={b.id}>
              <Link
                to={`/bugs/${b.id}`}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:bg-slate-50"
              >
                <div>
                  <span>{b.title}</span>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {b.severity} · {b.priority}
                    {b.due_date ? ` · due ${b.due_date}` : ""}
                  </p>
                </div>
                <StatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
