import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import type { ApiResponse, Feature, Paginated, Sprint } from "../types";

export function useProjectFeatures(projectId: string | number | undefined) {
  return useQuery({
    queryKey: ["features", { project: projectId }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Feature> | Feature[]>>(
        `/features/?project=${projectId}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: Boolean(projectId),
  });
}

export function useProjectSprints(projectId: string | number | undefined) {
  return useQuery({
    queryKey: ["sprints", { project: projectId }],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Sprint> | Sprint[]>>(
        `/sprints/?project=${projectId}`
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: Boolean(projectId),
  });
}
