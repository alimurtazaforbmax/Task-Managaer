import { useQuery } from "@tanstack/react-query";
import { fetchAllPages, fetchPaginatedPage } from "../utils/paginatedApi";
import type { ProjectMember, User } from "../types";

/** All project members (for assignee dropdowns). Fetches every page. */
export function useProjectMembers(projectId: string | number | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId, "all"],
    queryFn: () =>
      fetchAllPages<ProjectMember>(`/projects/${projectId}/members/`, { page_size: 100 }),
    enabled: Boolean(projectId),
  });
}

/** Paginated project members (for team list UI). */
export function useProjectMembersPaginated(
  projectId: string | number | undefined,
  page: number,
  pageSize = 20
) {
  return useQuery({
    queryKey: ["project-members", projectId, "page", page, pageSize],
    queryFn: () =>
      fetchPaginatedPage<ProjectMember>(`/projects/${projectId}/members/`, {
        page,
        page_size: pageSize,
      }),
    enabled: Boolean(projectId),
  });
}

export function projectMembersToUsers(members: ProjectMember[] | undefined): User[] {
  return (members ?? [])
    .map((m) => m.user_detail)
    .filter((u): u is User => Boolean(u));
}

export function formatMemberLabel(member: ProjectMember): string {
  const u = member.user_detail;
  if (!u) return `User #${member.user}`;
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
  return name || u.username;
}
