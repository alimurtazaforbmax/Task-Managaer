import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import api, { unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Department, Paginated } from "../types";

const PERM_LABELS: { key: keyof Department; label: string }[] = [
  { key: "can_create_tasks", label: "Create tasks" },
  { key: "can_create_bugs", label: "Create bugs" },
  { key: "can_edit_tasks", label: "Edit tasks" },
  { key: "can_edit_bugs", label: "Edit bugs" },
];

const emptyForm = {
  name: "",
  description: "",
  can_create_tasks: false,
  can_create_bugs: false,
  can_edit_tasks: false,
  can_edit_bugs: false,
};

export default function DepartmentsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  const { data: departments, isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Department> | Department[]>>(
        "/auth/departments/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    setError("");
  };

  const saveDepartment = useMutation({
    mutationFn: async () => {
      if (editing) {
        const res = await api.patch<ApiResponse<Department>>(
          `/auth/departments/${editing.id}/`,
          form
        );
        return unwrap(res);
      }
      const res = await api.post<ApiResponse<Department>>("/auth/departments/", form);
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["departments"] });
      resetForm();
    },
    onError: () => setError("Could not save department."),
  });

  const deleteDepartment = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/departments/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["departments"] }),
    onError: () => setError("Cannot delete department with assigned users."),
  });

  const startEdit = (dept: Department) => {
    setEditing(dept);
    setShowForm(true);
    setForm({
      name: dept.name,
      description: dept.description,
      can_create_tasks: dept.can_create_tasks ?? false,
      can_create_bugs: dept.can_create_bugs ?? false,
      can_edit_tasks: dept.can_edit_tasks ?? false,
      can_edit_bugs: dept.can_edit_bugs ?? false,
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Departments</h1>
          <p className="text-slate-500 mt-1">
            Manage departments and their permissions. Users inherit permissions from their department.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          New department
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveDepartment.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">{editing ? "Edit department" : "Create department"}</h2>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <input
            required
            placeholder="Department name"
            className="w-full border rounded-lg px-3 py-2"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <textarea
            placeholder="Description"
            className="w-full border rounded-lg px-3 py-2"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="border rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-slate-700">Permissions</p>
            {PERM_LABELS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(form[key])}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {label}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
              {editing ? "Save changes" : "Create department"}
            </button>
            <button type="button" onClick={resetForm} className="border px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-8 space-y-3">
          {departments?.map((d) => (
            <div key={d.id} className="bg-white border rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-semibold text-lg">{d.name}</h2>
                  <p className="text-sm text-slate-500 mt-1">{d.description || "No description"}</p>
                  <p className="text-xs text-slate-400 mt-2">{d.member_count ?? 0} members</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(d)}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteDepartment.mutate(d.id)}
                    className="text-sm text-rose-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {PERM_LABELS.filter(({ key }) => d[key]).map(({ key, label }) => (
                  <span
                    key={key}
                    className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
