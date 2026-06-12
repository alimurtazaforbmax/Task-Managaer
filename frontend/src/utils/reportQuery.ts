export function appendReportQueryParams(
  url: string,
  params: { period?: string; reference?: string; projects?: number[] }
): string {
  const search = new URLSearchParams();
  if (params.period) search.set("period", params.period);
  if (params.reference) search.set("reference", params.reference);
  if (params.projects && params.projects.length > 0) {
    search.set("projects", params.projects.join(","));
  }
  const qs = search.toString();
  if (!qs) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${qs}`;
}
