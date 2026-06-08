import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import api, { unwrap } from "../api/client";
import StatusBadge from "../components/StatusBadge";
import type { ApiResponse, Paginated, Project } from "../types";

export default function ProjectsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        "/projects/"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Projects</h1>
      <p className="text-slate-500 mt-1">All projects you have access to</p>

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="grid gap-4 mt-8">
          {data?.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="bg-white border rounded-xl p-5 hover:shadow-md transition block"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{p.name}</h2>
                  <p className="text-sm text-slate-500">{p.code}</p>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                {p.description || "No description"}
              </p>
              <div className="flex gap-4 mt-3 text-xs text-slate-500">
                <span>{p.task_count ?? 0} tasks</span>
                <span>{p.bug_count ?? 0} bugs</span>
                <span>{p.member_count ?? 0} members</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
