import { useQuery } from "@tanstack/react-query";
import { useDebouncedValue } from "./useDebouncedValue";
import { fetchPaginatedPage } from "../utils/paginatedApi";
import type { User } from "../types";

export function useUserSearch(search: string, enabled = true) {
  const debouncedSearch = useDebouncedValue(search);

  return useQuery({
    queryKey: ["users", "search", debouncedSearch],
    queryFn: () =>
      fetchPaginatedPage<User>("/auth/users/", {
        search: debouncedSearch,
        is_active: true,
        page: 1,
        page_size: 20,
      }),
    enabled,
  });
}
