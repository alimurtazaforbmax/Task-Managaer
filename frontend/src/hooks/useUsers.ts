import { useQuery } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import type { ApiResponse, Paginated, User } from "../types";

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<User> | User[]>>(
        "/auth/users/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });
}
