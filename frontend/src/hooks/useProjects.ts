import { useQuery } from "@tanstack/react-query";
import { fetchAllPages } from "../utils/paginatedApi";
import type { Project } from "../types";

export function useProjects(options?: { membersOnly?: boolean }) {
  return useQuery({
    queryKey: ["projects", options?.membersOnly ? "members-only" : "all"],
    queryFn: () =>
      fetchAllPages<Project>("/projects/", {
        page_size: 100,
        members_only: options?.membersOnly ? true : undefined,
      }),
  });
}
