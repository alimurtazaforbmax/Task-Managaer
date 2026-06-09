import { FormEvent, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import api, { unwrap } from "../api/client";
import DepartmentCard from "../components/DepartmentCard";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Department, Paginated, Permission } from "../types";
import { DEPARTMENT_OVERLAY_PERMISSIONS } from "../types";

interface PermissionCatalogResponse {
  catalog: Permission[];
  grouped: Record<string, Permission[]>;
}

const emptyForm = {
  name: "",
  description: "",
  permission_ids: [] as number[],
};

export default function DepartmentsPage() {
  const { user } = useAuth();
  const location = useLocation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const { data: catalog } = useQuery({
    queryKey: ["permissions-catalog"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<PermissionCatalogResponse>>("/auth/permissions/");
      return unwrap(res);
    },
    enabled: user?.role === "admin",
  });

  const overlayPermissions = useMemo(
    () =>
      (catalog?.catalog ?? []).filter((p) =>
        DEPARTMENT_OVERLAY_PERMISSIONS.includes(
          p.codename as (typeof DEPARTMENT_OVERLAY_PERMISSIONS)[number]
        )
      ),
    [catalog]
  );

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
      permission_ids:
        dept.permissions_detail?.map((p) => p.id) ?? dept.permission_ids ?? [],
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
            Organize teams. Extra department permissions add on top of each user&apos;s role.
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
              Department extras are merged with each member&apos;s role permissions.
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
            <p className="text-sm font-semibold text-slate-800">Extra permissions</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {overlayPermissions.map((perm) => (
                <label
                  key={perm.id}
                  className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                    form.permission_ids.includes(perm.id)
                      ? "border-brand-200 bg-brand-50/60"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.permission_ids.includes(perm.id)}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        permission_ids: prev.permission_ids.includes(perm.id)
                          ? prev.permission_ids.filter((id) => id !== perm.id)
                          : [...prev.permission_ids, perm.id],
                      }))
                    }
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800">{perm.name}</span>
                    <span className="block text-xs text-slate-500 mt-0.5">{perm.description}</span>
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
