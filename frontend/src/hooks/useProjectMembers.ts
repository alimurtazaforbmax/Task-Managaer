import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import type { ApiResponse, ProjectMember, User } from "../types";

export function useProjectMembers(projectId: string | number | undefined) {
  return useQuery({
    queryKey: ["project-members", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ProjectMember[]>>(
        `/projects/${projectId}/members/`
      );
      return unwrap(res);
    },
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
