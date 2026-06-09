import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import api, { unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Paginated, Permission, Role } from "../types";

interface PermissionCatalogResponse {
  catalog: Permission[];
  grouped: Record<string, Permission[]>;
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  permission_ids: [] as number[],
};

export default function RolesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
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

  const { data: roles, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Role> | Role[]>>(
        "/auth/roles/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
    enabled: user?.role === "admin",
  });

  const grouped = useMemo(() => catalog?.grouped ?? {}, [catalog]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(false);
    setError("");
  };

  const saveRole = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        slug: form.slug,
        description: form.description,
        permission_ids: form.permission_ids,
      };
      if (editing) {
        const res = await api.patch<ApiResponse<Role>>(`/auth/roles/${editing.id}/`, payload);
        return unwrap(res);
      }
      const res = await api.post<ApiResponse<Role>>("/auth/roles/", payload);
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      resetForm();
    },
    onError: () => setError("Could not save role."),
  });

  const deleteRole = useMutation({
    mutationFn: (id: number) => api.delete(`/auth/roles/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
    onError: () => setError("Cannot delete role while assigned to users or if it is a system role."),
  });

  const startEdit = (role: Role) => {
    if (role.is_admin) return;
    setEditing(role);
    setShowForm(true);
    setError("");
    setForm({
      name: role.name,
      slug: role.slug,
      description: role.description,
      permission_ids: role.permissions_detail?.map((p) => p.id) ?? role.permission_ids ?? [],
    });
  };

  const togglePermission = (permId: number) => {
    setForm((prev) => ({
      ...prev,
      permission_ids: prev.permission_ids.includes(permId)
        ? prev.permission_ids.filter((id) => id !== permId)
        : [...prev.permission_ids, permId],
    }));
  };

  if (user?.role !== "admin") return <Navigate to="/" replace />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & permissions</h1>
          <p className="text-slate-500 mt-1">
            Define access roles and assign them to users. Department extras stack on top.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
        >
          New role
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            saveRole.mutate();
          }}
          className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-sm"
        >
          <div>
            <h2 className="font-semibold text-slate-900">
              {editing ? "Edit role" : "Create role"}
            </h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Users inherit all permissions granted to their assigned role.
            </p>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                required
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Slug</span>
              <input
                required
                disabled={Boolean(editing?.is_system)}
                placeholder="team_lead"
                className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm disabled:bg-slate-50"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              rows={2}
              className="mt-1 w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </label>

          <div className="space-y-4">
            {Object.entries(grouped).map(([category, perms]) => (
              <div key={category} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">{category}</p>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {perms.map((perm) => (
                    <label
                      key={perm.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
                        form.permission_ids.includes(perm.id)
                          ? "border-brand-200 bg-brand-50/60"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={form.permission_ids.includes(perm.id)}
                        onChange={() => togglePermission(perm.id)}
                      />
                      <span>
                        <span className="block text-sm font-medium text-slate-800">
                          {perm.name}
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5">
                          {perm.description}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saveRole.isPending}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
            >
              {editing ? "Save changes" : "Create role"}
            </button>
            <button type="button" onClick={resetForm} className="border border-slate-200 px-4 py-2 rounded-lg text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading roles…</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {roles?.map((role) => (
            <div
              key={role.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-lg text-slate-900">{role.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{role.description || role.slug}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {role.is_system && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      System
                    </span>
                  )}
                  {role.is_admin && (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      Full access
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {role.user_count ?? 0} users · {role.is_admin ? "All permissions" : `${role.permissions_detail?.length ?? 0} permissions`}
              </p>
              {!role.is_admin && (
                <div className="mt-3 flex flex-wrap gap-1.5 min-h-[1.25rem]">
                  {role.permissions_detail?.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-full px-2 py-0.5 text-[11px] font-medium bg-brand-50 text-brand-700"
                    >
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-4 flex gap-2">
                {!role.is_admin && (
                  <button
                    type="button"
                    onClick={() => startEdit(role)}
                    className="flex-1 text-sm border border-slate-200 rounded-lg py-2 font-medium text-brand-600 hover:bg-brand-50"
                  >
                    Edit
                  </button>
                )}
                {!role.is_system && (
                  <button
                    type="button"
                    onClick={() => deleteRole.mutate(role.id)}
                    className="text-sm border border-rose-200 rounded-lg px-3 py-2 font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
