import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import type { ApiResponse, Bug, Project, Task } from "../types";

export default function ProjectDetailPage() {
  const { id } = useParams();

  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project>>(`/projects/${id}/`);
      return unwrap(res);
    },
  });

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

  if (!project) return <p className="text-slate-400">Loading...</p>;

  return (
    <div>
      <Link to="/projects" className="text-sm text-brand-600 hover:underline">
        ← Projects
      </Link>
      <div className="flex items-center gap-3 mt-2">
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>
      <p className="text-slate-500">{project.code}</p>
      <p className="mt-4 text-slate-700">{project.description}</p>

      <section className="mt-10">
        <h2 className="font-semibold text-lg">Tasks</h2>
        <ul className="mt-3 space-y-2">
          {tasks?.map((t) => (
            <li key={t.id}>
              <Link
                to={`/tasks/${t.id}`}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:bg-slate-50"
              >
                <span>{t.title}</span>
                <StatusBadge status={t.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-semibold text-lg">Bugs</h2>
        <ul className="mt-3 space-y-2">
          {bugs?.map((b) => (
            <li key={b.id}>
              <Link
                to={`/bugs/${b.id}`}
                className="flex items-center justify-between bg-white border rounded-lg px-4 py-3 hover:bg-slate-50"
              >
                <span>{b.title}</span>
                <StatusBadge status={b.status} />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
