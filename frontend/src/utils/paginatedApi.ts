import api, { unwrap } from "../api/client";
import { buildQueryString } from "./buildQueryString";
import type { ApiResponse, Paginated } from "../types";

export interface PaginatedResult<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export function normalizePaginated<T>(data: Paginated<T> | T[]): PaginatedResult<T> {
  if (Array.isArray(data)) {
    return { results: data, count: data.length, next: null, previous: null };
  }
  const results = data.results ?? [];
  return {
    results,
    count: typeof data.count === "number" ? data.count : results.length,
    next: data.next ?? null,
    previous: data.previous ?? null,
  };
}

export async function fetchPaginatedPage<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {}
): Promise<PaginatedResult<T>> {
  const res = await api.get<ApiResponse<Paginated<T> | T[]>>(
    `${path}${buildQueryString(params)}`
  );
  return normalizePaginated(unwrap(res));
}

export async function fetchAllPages<T>(
  path: string,
  params: Record<string, string | number | boolean | undefined | null> = {},
  maxPages = 50
): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore && page <= maxPages) {
    const data = await fetchPaginatedPage<T>(path, { ...params, page, page_size: 100 });
    items.push(...data.results);
    hasMore = Boolean(data.next) && data.results.length > 0;
    page += 1;
  }

  return items;
}
