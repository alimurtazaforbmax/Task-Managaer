import { FormEvent, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import api, { unwrap } from "../api/client";
import DepartmentCard from "../components/DepartmentCard";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Department, Paginated } from "../types";

const PERM_LABELS: { key: keyof Department; label: string; desc: string }[] = [
  { key: "can_create_tasks", label: "Create tasks", desc: "Allow creating new tasks" },
  { key: "can_create_bugs", label: "Create bugs", desc: "Allow reporting bugs" },
  { key: "can_edit_tasks", label: "Edit tasks", desc: "Allow editing task details" },
  { key: "can_edit_bugs", label: "Edit bugs", desc: "Allow editing bug details" },
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
  const location = useLocation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

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
    setError("");
    setForm({
      name: dept.name,
      description: dept.description,
      can_create_tasks: dept.can_create_tasks ?? false,
      can_create_bugs: dept.can_create_bugs ?? false,
      can_edit_tasks: dept.can_edit_tasks ?? false,
      can_edit_bugs: dept.can_edit_bugs ?? false,
    });
  };

  useEffect(() => {
    const editDepartment = (location.state as { editDepartment?: Department } | null)
      ?.editDepartment;
    if (editDepartment) startEdit(editDepartment);
  }, [location.state]);

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Departments</h1>
          <p className="text-slate-500 mt-1">
            Organize teams and control what members can create or edit.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
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
          className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-slate-900">
              {editing ? "Edit department" : "Create department"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Users inherit permissions from their assigned department.
            </p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                required
                placeholder="e.g. Engineering"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                placeholder="What this department is responsible for"
                rows={3}
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">Permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PERM_LABELS.map(({ key, label, desc }) => (
                <label
                  key={key}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    form[key]
                      ? "border-brand-200 bg-brand-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={Boolean(form[key])}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saveDepartment.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {editing ? "Save changes" : "Create department"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border border-slate-200 px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading departments…</p>
      ) : !departments?.length ? (
        <p className="mt-8 text-slate-400">No departments yet. Create one to get started.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((d) => (
            <DepartmentCard
              key={d.id}
              department={d}
              onEdit={startEdit}
              onDelete={(id) => deleteDepartment.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
