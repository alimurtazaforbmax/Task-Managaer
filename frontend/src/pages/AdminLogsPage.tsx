import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import PageContainer from "../components/PageContainer";
import PaginationBar from "../components/PaginationBar";
import { useAuth } from "../context/AuthContext";
import { usePaginatedList } from "../hooks/usePaginatedList";
import type { AuditLog } from "../types";

const PAGE_SIZE = 20;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString();
}

function formatUser(u?: { first_name?: string; last_name?: string; username: string } | null) {
  if (!u) return "System";
  const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim();
  return name || u.username;
}

export default function AdminLogsPage() {
  const { user } = useAuth();
  const [entityFilter, setEntityFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [entityFilter, actionFilter]);

  const { data: logPage, isLoading } = usePaginatedList<AuditLog>({
    queryKey: ["audit-logs", entityFilter, actionFilter],
    path: "/audit-logs/",
    params: {
      entity_type: entityFilter,
      action: actionFilter,
      ordering: "-created_at",
    },
    page,
    pageSize: PAGE_SIZE,
    enabled: user?.role === "admin",
  });
  const logs = logPage?.results ?? [];

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return (
    <PageContainer>
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin logs</h1>
        <p className="text-slate-500 mt-1">Audit trail of create, update, and delete actions</p>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All entities</option>
          <option value="ticket">Tickets</option>
          <option value="task">Tasks</option>
          <option value="bug">Bugs</option>
          <option value="project">Projects</option>
          <option value="user">Users</option>
          <option value="department">Departments</option>
        </select>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">All actions</option>
          <option value="created">Created</option>
          <option value="updated">Updated</option>
          <option value="deleted">Deleted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="archived">Archived</option>
          <option value="deactivated">Deactivated</option>
        </select>
      </div>

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">User</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Action</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {formatUser(log.actor_detail)}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    <span className="text-slate-500">{log.entity_type}</span>
                    {log.entity_label ? ` · ${log.entity_label}` : ` #${log.entity_id}`}
                  </td>
                  <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                    {log.detail || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!logs?.length && (
            <p className="p-8 text-center text-slate-400 text-sm">No log entries yet.</p>
          )}
        </div>
      )}
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={logPage?.count ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </PageContainer>
  );
}
