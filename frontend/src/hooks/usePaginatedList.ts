import { useQuery } from "@tanstack/react-query";
import { fetchPaginatedPage, type PaginatedResult } from "../utils/paginatedApi";

export function usePaginatedList<T>({
  queryKey,
  path,
  params = {},
  page,
  pageSize = 20,
  enabled = true,
}: {
  queryKey: readonly unknown[];
  path: string;
  params?: Record<string, string | number | boolean | undefined | null>;
  page: number;
  pageSize?: number;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: [...queryKey, page, pageSize, params],
    queryFn: (): Promise<PaginatedResult<T>> =>
      fetchPaginatedPage<T>(path, { ...params, page, page_size: pageSize }),
    enabled,
  });
}
