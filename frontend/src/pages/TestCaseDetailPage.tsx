import { FormEvent, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import PageContainer from "../components/PageContainer";
import StatusBadge from "../components/StatusBadge";
import { usePermissions } from "../hooks/usePermissions";
import { useProjectFeatures } from "../hooks/useProjectPlanning";
import type { ApiResponse, Bug, Feature, Task, TestCase, Ticket } from "../types";
import { getProjectPalette } from "../utils/projectStyle";

export default function TestCaseDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const permissions = usePermissions();
  const canView = permissions.can_view_test_cases;
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    preconditions: "",
    steps: "",
    expected_result: "",
    status: "draft",
    priority: "medium",
    test_type: "functional",
    feature: "",
  });

  const { data: testCase } = useQuery({
    queryKey: ["test-case", id],
    queryFn: async () => {
      const res = await api.get<ApiResponse<TestCase>>(`/test-cases/${id}/`);
      return unwrap(res);
    },
    enabled: Boolean(id) && canView,
  });

  const { data: features } = useProjectFeatures(testCase?.project);

  useEffect(() => {
    if (testCase && showEdit) {
      setEditForm({
        title: testCase.title,
        description: testCase.description ?? "",
        preconditions: testCase.preconditions ?? "",
        steps: testCase.steps ?? "",
        expected_result: testCase.expected_result ?? "",
        status: testCase.status,
        priority: testCase.priority,
        test_type: testCase.test_type ?? "functional",
        feature: testCase.feature ? String(testCase.feature) : "",
      });
    }
  }, [testCase, showEdit]);

  const updateTestCase = useMutation({
    mutationFn: async () => {
      const res = await api.patch<ApiResponse<TestCase>>(`/test-cases/${id}/`, {
        ...editForm,
        feature: editForm.feature ? Number(editForm.feature) : null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-case", id] });
      qc.invalidateQueries({ queryKey: ["test-cases"] });
      setShowEdit(false);
    },
  });

  const deleteTestCase = useMutation({
    mutationFn: async () => {
      await api.delete(`/test-cases/${id}/`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-cases"] });
      navigate(`/test-cases/project/${testCase?.project}`);
    },
  });

  const spawnTask = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Task>>(`/test-cases/${id}/create-task/`, {});
      return unwrap(res);
    },
    onSuccess: (task) => {
      qc.invalidateQueries({ queryKey: ["test-case", id] });
      navigate(`/tasks/${task.id}`);
    },
  });

  const spawnBug = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Bug>>(`/test-cases/${id}/create-bug/`, {});
      return unwrap(res);
    },
    onSuccess: (bug) => {
      qc.invalidateQueries({ queryKey: ["test-case", id] });
      navigate(`/bugs/${bug.id}`);
    },
  });

  const spawnTicket = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Ticket>>(
        `/test-cases/${id}/create-ticket/`,
        { request_type: "issue" }
      );
      return unwrap(res);
    },
    onSuccess: (ticket) => {
      qc.invalidateQueries({ queryKey: ["test-case", id] });
      navigate(`/tickets/${ticket.id}`);
    },
  });

  if (!canView) return <Navigate to="/" replace />;
  if (!testCase) return <p className="text-slate-400">Loading test case…</p>;

  const palette = getProjectPalette(testCase.project);
  const canEdit = permissions.can_edit_test_cases;
  const canDelete = permissions.can_delete_test_cases;
  const canSpawn =
    permissions.can_create_test_cases ||
    permissions.can_create_tasks ||
    permissions.can_create_bugs ||
    permissions.can_create_tickets;

  return (
    <PageContainer>
      <BackLink
        to={`/test-cases/project/${testCase.project}`}
        label={testCase.project_name ?? "Test cases"}
      />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-80`} />
        <div className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{testCase.title}</h1>
                <StatusBadge status={testCase.status} />
              </div>
              <p className="text-sm text-slate-500 mt-2">
                <Link to={`/projects/${testCase.project}`} className="text-brand-600 hover:underline">
                  {testCase.project_name}
                </Link>
                {testCase.feature_title && (
                  <span> · {testCase.feature_title}</span>
                )}
              </p>
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="rounded-full bg-teal-50 text-teal-700 px-2.5 py-0.5 font-medium capitalize">
                  {testCase.test_type?.replace(/_/g, " ")}
                </span>
                <span className="rounded-full bg-violet-50 text-violet-700 px-2.5 py-0.5 font-medium capitalize">
                  {testCase.priority}
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setShowEdit(!showEdit)}
                  className="text-sm border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Edit
                </button>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Delete this test case?")) deleteTestCase.mutate();
                  }}
                  className="text-sm border border-rose-200 text-rose-700 px-3 py-2 rounded-lg hover:bg-rose-50 font-medium"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEdit && canEdit && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            updateTestCase.mutate();
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Edit test case</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Title</span>
              <input
                required
                value={editForm.title}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Preconditions</span>
              <textarea
                value={editForm.preconditions}
                onChange={(e) => setEditForm({ ...editForm, preconditions: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Test steps</span>
              <textarea
                required
                value={editForm.steps}
                onChange={(e) => setEditForm({ ...editForm, steps: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Expected result</span>
              <textarea
                required
                value={editForm.expected_result}
                onChange={(e) => setEditForm({ ...editForm, expected_result: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Feature</span>
              <select
                value={editForm.feature}
                onChange={(e) => setEditForm({ ...editForm, feature: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">None</option>
                {features?.map((f: Feature) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
                <option value="in_progress">In progress</option>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
                <option value="deprecated">Deprecated</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Priority</span>
              <select
                value={editForm.priority}
                onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={editForm.test_type}
                onChange={(e) => setEditForm({ ...editForm, test_type: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="functional">Functional</option>
                <option value="regression">Regression</option>
                <option value="smoke">Smoke</option>
                <option value="integration">Integration</option>
                <option value="uat">UAT</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={updateTestCase.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setShowEdit(false)}
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {!showEdit && (
        <div className="mt-6 space-y-6">
          {testCase.description && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Description</h2>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{testCase.description}</p>
            </section>
          )}
          {testCase.preconditions && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Preconditions</h2>
              <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{testCase.preconditions}</p>
            </section>
          )}
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Test steps</h2>
            <pre className="mt-2 text-sm text-slate-700 whitespace-pre-wrap font-sans">{testCase.steps}</pre>
          </section>
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="font-semibold text-slate-900">Expected result</h2>
            <p className="mt-2 text-sm text-slate-700 whitespace-pre-wrap">{testCase.expected_result}</p>
          </section>
        </div>
      )}

      {canSpawn && (
        <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
          <h2 className="font-semibold text-slate-900">Create linked work item</h2>
          <p className="text-sm text-slate-500 mt-1">
            Spawn a task, bug, or ticket pre-filled from this test case.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(permissions.can_create_test_cases || permissions.can_create_tasks) && (
              <button
                type="button"
                onClick={() => spawnTask.mutate()}
                disabled={spawnTask.isPending}
                className="text-sm bg-sky-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-sky-700 disabled:opacity-50"
              >
                Create task
              </button>
            )}
            {(permissions.can_create_test_cases || permissions.can_create_bugs) && (
              <button
                type="button"
                onClick={() => spawnBug.mutate()}
                disabled={spawnBug.isPending}
                className="text-sm bg-amber-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                Create bug
              </button>
            )}
            {(permissions.can_create_test_cases || permissions.can_create_tickets) && (
              <button
                type="button"
                onClick={() => spawnTicket.mutate()}
                disabled={spawnTicket.isPending}
                className="text-sm bg-violet-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                Create ticket
              </button>
            )}
          </div>
          {(testCase.linked_task_count ?? 0) > 0 ||
          (testCase.linked_bug_count ?? 0) > 0 ||
          (testCase.linked_ticket_count ?? 0) > 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              Linked: {testCase.linked_task_count ?? 0} task(s), {testCase.linked_bug_count ?? 0}{" "}
              bug(s), {testCase.linked_ticket_count ?? 0} ticket(s)
            </p>
          ) : null}
        </section>
      )}
    </PageContainer>
  );
}
