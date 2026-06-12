import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import PageContainer from "../components/PageContainer";
import StatusBadge from "../components/StatusBadge";
import { usePermissions } from "../hooks/usePermissions";
import type { ApiResponse, Paginated, Project } from "../types";
import { getProjectInitials, getProjectPalette } from "../utils/projectStyle";

export default function TestCasesPage() {
  const permissions = usePermissions();
  const canView = permissions.can_view_test_cases;

  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects", "test-cases-hub"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        "/projects/?members_only=true"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: canView,
  });

  if (!canView) return <Navigate to="/" replace />;

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Test cases</h1>
        <p className="text-slate-500 mt-1">
          Select a project to view and manage its test cases
        </p>
      </div>

      {isLoading ? (
        <p className="text-slate-400 mt-8">Loading projects…</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects?.map((project) => {
            const palette = getProjectPalette(project.id);
            return (
              <Link
                key={project.id}
                to={`/test-cases/project/${project.id}`}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-80`} />
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-sm font-bold text-white shadow-sm ${palette.gradient}`}
                    >
                      {getProjectInitials(project.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h2 className="font-semibold text-lg text-slate-900 truncate group-hover:text-brand-700">
                        {project.name}
                      </h2>
                      <p className="text-sm text-slate-500 font-mono mt-0.5">{project.code}</p>
                    </div>
                    <StatusBadge status={project.status} />
                  </div>
                  <p className="mt-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">
                      {project.test_case_count ?? 0}
                    </span>{" "}
                    test case{(project.test_case_count ?? 0) === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            );
          })}
          {!projects?.length && (
            <p className="text-sm text-slate-400 col-span-full py-12 text-center rounded-xl border border-dashed border-slate-200">
              You are not a member of any projects yet.
            </p>
          )}
        </div>
      )}
    </PageContainer>
  );
}
