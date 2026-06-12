import { FormEvent, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import BackLink from "../components/BackLink";
import FilterBar, { FilterSelect } from "../components/FilterBar";
import PageContainer from "../components/PageContainer";
import PaginationBar from "../components/PaginationBar";
import TestCaseCard from "../components/TestCaseCard";
import { usePermissions } from "../hooks/usePermissions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePaginatedList } from "../hooks/usePaginatedList";
import { useProjectFeatures } from "../hooks/useProjectPlanning";
import type { ApiResponse, Feature, Project, TestCase } from "../types";
import { getProjectPalette } from "../utils/projectStyle";

const PAGE_SIZE = 20;

const emptyForm = {
  title: "",
  description: "",
  preconditions: "",
  steps: "",
  expected_result: "",
  feature: "",
  priority: "medium",
  test_type: "functional",
  status: "draft",
};

export default function TestCasesProjectPage() {
  const { projectId } = useParams();
  const permissions = usePermissions();
  const qc = useQueryClient();
  const canView = permissions.can_view_test_cases;
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(emptyForm);
  const debouncedSearch = useDebouncedValue(search);

  const { data: project } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Project>>(`/projects/${projectId}/`);
      return unwrap(res);
    },
    enabled: Boolean(projectId) && canView,
  });

  const { data: features } = useProjectFeatures(projectId ? Number(projectId) : undefined);

  const { data: testCasePage, isLoading } = usePaginatedList<TestCase>({
    queryKey: ["test-cases", projectId, debouncedSearch, status],
    path: "/test-cases/",
    page,
    pageSize: PAGE_SIZE,
    params: {
      project: projectId,
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(status ? { status } : {}),
    },
    enabled: Boolean(projectId) && canView,
  });

  const createTestCase = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<TestCase>>("/test-cases/", {
        ...form,
        project: Number(projectId),
        feature: form.feature ? Number(form.feature) : null,
        status: form.status,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["test-cases"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project", projectId] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  if (!canView) return <Navigate to="/" replace />;
  if (!projectId) return <Navigate to="/test-cases" replace />;

  const palette = project ? getProjectPalette(project.id) : getProjectPalette(1);
  const testCases = testCasePage?.results ?? [];

  return (
    <PageContainer>
      <BackLink to="/test-cases" label="Test cases" />

      <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className={`h-1 bg-gradient-to-r ${palette.gradient} opacity-80`} />
        <div className="p-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project?.name ?? "Project"}</h1>
            <p className="text-slate-500 font-mono text-sm mt-0.5">{project?.code}</p>
            <p className="text-sm text-slate-500 mt-2">
              {project?.test_case_count ?? testCasePage?.count ?? 0} test cases
            </p>
          </div>
          {permissions.can_create_test_cases && (
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
            >
              New test case
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createTestCase.mutate();
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Create test case</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Title *</span>
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Preconditions</span>
              <textarea
                value={form.preconditions}
                onChange={(e) => setForm({ ...form, preconditions: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Test steps *</span>
              <textarea
                required
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                rows={4}
                placeholder="1. Navigate to…&#10;2. Click…&#10;3. Verify…"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Expected result *</span>
              <textarea
                required
                value={form.expected_result}
                onChange={(e) => setForm({ ...form, expected_result: e.target.value })}
                rows={2}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Feature</span>
              <select
                value={form.feature}
                onChange={(e) => setForm({ ...form, feature: e.target.value })}
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
              <span className="text-sm font-medium text-slate-700">Type</span>
              <select
                value={form.test_type}
                onChange={(e) => setForm({ ...form, test_type: e.target.value })}
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
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Priority</span>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Status</span>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="ready">Ready</option>
              </select>
            </label>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createTestCase.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <FilterBar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        searchPlaceholder="Search test cases…"
      >
        <FilterSelect
          label="Status"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[
            { value: "", label: "All statuses" },
            { value: "draft", label: "Draft" },
            { value: "ready", label: "Ready" },
            { value: "in_progress", label: "In progress" },
            { value: "passed", label: "Passed" },
            { value: "failed", label: "Failed" },
            { value: "blocked", label: "Blocked" },
            { value: "deprecated", label: "Deprecated" },
          ]}
        />
      </FilterBar>

      {isLoading ? (
        <p className="text-slate-400 mt-8">Loading test cases…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {testCases.map((tc) => (
              <TestCaseCard key={tc.id} testCase={tc} />
            ))}
            {!testCases.length && (
              <p className="text-sm text-slate-400 col-span-full py-8 text-center">
                No test cases for this project yet.
                {permissions.can_create_test_cases && (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="text-brand-600 font-medium hover:underline"
                    >
                      Create one
                    </button>
                  </>
                )}
              </p>
            )}
          </div>
          <PaginationBar
            page={page}
            pageSize={PAGE_SIZE}
            totalCount={testCasePage?.count ?? 0}
            onPageChange={setPage}
          />
        </>
      )}

      {project && (
        <p className="mt-6 text-sm text-slate-500">
          <Link to={`/projects/${project.id}`} className="text-brand-600 hover:underline">
            ← Back to project details
          </Link>
        </p>
      )}
    </PageContainer>
  );
}
