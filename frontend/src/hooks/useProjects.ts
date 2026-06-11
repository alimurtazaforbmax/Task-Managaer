import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import type { ApiResponse, Paginated, Project } from "../types";

export function useProjects() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>(
        "/projects/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });
}
