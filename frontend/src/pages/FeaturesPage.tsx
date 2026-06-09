import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { unwrap } from "../api/client";
import FeatureCard from "../components/FeatureCard";
import PageContainer from "../components/PageContainer";
import { usePermissions } from "../hooks/usePermissions";
import type { ApiResponse, Feature, Paginated, Project } from "../types";

const emptyForm = {
  title: "",
  description: "",
  project: "",
  priority: "medium",
  target_date: "",
};

export default function FeaturesPage() {
  const permissions = usePermissions();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: projects } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Project> | Project[]>>("/projects/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: features, isLoading } = useQuery({
    queryKey: ["features"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Feature> | Feature[]>>("/features/");
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const createFeature = useMutation({
    mutationFn: async () => {
      const res = await api.post<ApiResponse<Feature>>("/features/", {
        ...form,
        project: Number(form.project),
        status: "backlog",
        target_date: form.target_date || null,
      });
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["features"] });
      qc.invalidateQueries({ queryKey: ["projects"] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Features</h1>
          <p className="text-slate-500 mt-1">Plan product capabilities within your projects</p>
        </div>
        {permissions.can_create_features && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            New feature
          </button>
        )}
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            createFeature.mutate();
          }}
          className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm"
        >
          <h2 className="font-semibold text-slate-900">Create feature</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Title</span>
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
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Project *</span>
              <select
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Select project</option>
                {projects?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
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
              <span className="text-sm font-medium text-slate-700">Target date</span>
              <input
                type="date"
                value={form.target_date}
                onChange={(e) => setForm({ ...form, target_date: e.target.value })}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={createFeature.isPending}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
          >
            Create feature
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features?.map((f) => (
            <FeatureCard key={f.id} feature={f} />
          ))}
          {!features?.length && (
            <p className="text-slate-400 col-span-full">No features yet.</p>
          )}
        </div>
      )}
    </PageContainer>
  );
}
