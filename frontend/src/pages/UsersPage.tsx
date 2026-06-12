import { FormEvent, useEffect, useState, type ReactNode } from "react";
import PaginationBar from "../components/PaginationBar";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation } from "react-router-dom";
import api, { unwrap } from "../api/client";
import FilterBar, { FilterSelect } from "../components/FilterBar";
import UserCard from "../components/UserCard";
import UserPhotoUpload from "../components/UserPhotoUpload";
import { useAuth } from "../context/AuthContext";
import { usePermissions } from "../hooks/usePermissions";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { usePaginatedList } from "../hooks/usePaginatedList";
import type { ApiResponse, Department, Paginated, Role, User } from "../types";

const PAGE_SIZE = 20;

const emptyUserFilters = {
  search: "",
  access_role: "",
  department: "",
  is_active: "",
};

function FieldLabel({
  children,
  htmlFor,
}: {
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <span className="text-sm font-medium text-slate-700" id={htmlFor}>
      {children}
    </span>
  );
}

export default function UsersPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const location = useLocation();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [filters, setFilters] = useState(emptyUserFilters);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(filters.search);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.access_role, filters.department, filters.is_active]);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    job_title: "",
    access_role: "" as string | number,
    department: "" as string | number,
    is_active: true,
  });

  const hasActiveFilters = Boolean(
    filters.search || filters.access_role || filters.department || filters.is_active
  );

  const { data: roles } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Role> | Role[]>>(
        "/auth/roles/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: departments } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<Department> | Department[]>>(
        "/auth/departments/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const { data: userPage, isLoading } = usePaginatedList<User>({
    queryKey: ["users", debouncedSearch, filters.access_role, filters.department, filters.is_active],
    path: "/auth/users/",
    params: {
      search: debouncedSearch,
      access_role: filters.access_role,
      department: filters.department,
      is_active: filters.is_active,
    },
    page,
    pageSize: PAGE_SIZE,
  });
  const users = userPage?.results ?? [];

  const clearPhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
  };

  const resetForm = () => {
    setForm({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      job_title: "",
      access_role: roles?.find((r) => r.slug === "developer")?.id ?? "",
      department: "",
      is_active: true,
    });
    clearPhoto();
    setEditing(null);
    setShowForm(false);
  };

  const buildCreateFormData = () => {
    const fd = new FormData();
    fd.append("username", form.username);
    fd.append("email", form.email);
    fd.append("password", form.password);
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("job_title", form.job_title);
    fd.append("access_role", String(form.access_role));
    if (form.department) fd.append("department", String(form.department));
    if (profilePhoto) fd.append("profile_picture", profilePhoto);
    return fd;
  };

  const buildUpdateFormData = () => {
    const fd = new FormData();
    fd.append("email", form.email);
    fd.append("first_name", form.first_name);
    fd.append("last_name", form.last_name);
    fd.append("job_title", form.job_title);
    fd.append("access_role", String(form.access_role));
    fd.append("is_active", String(form.is_active));
    if (form.department) fd.append("department", String(form.department));
    if (form.password) fd.append("password", form.password);
    if (profilePhoto) fd.append("profile_picture", profilePhoto);
    return fd;
  };

  const createUser = useMutation({
    mutationFn: async () => {
      if (profilePhoto) {
        const res = await api.post<ApiResponse<User>>("/auth/users/", buildCreateFormData(), {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return unwrap(res);
      }
      const payload = {
        ...form,
        access_role: Number(form.access_role),
        department: form.department ? Number(form.department) : null,
      };
      const res = await api.post<ApiResponse<User>>("/auth/users/", payload);
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      resetForm();
    },
  });

  const updateUser = useMutation({
    mutationFn: async () => {
      if (!editing) return;

      if (profilePhoto) {
        const res = await api.patch<ApiResponse<User>>(
          `/auth/users/${editing.id}/`,
          buildUpdateFormData(),
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        return unwrap(res);
      }

      const payload: Record<string, unknown> = {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        job_title: form.job_title,
        access_role: Number(form.access_role),
        is_active: form.is_active,
        department: form.department ? Number(form.department) : null,
      };
      if (form.password) payload.password = form.password;
      const res = await api.patch<ApiResponse<User>>(
        `/auth/users/${editing.id}/`,
        payload
      );
      return unwrap(res);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      resetForm();
    },
  });

  const startEdit = (u: User) => {
    setEditing(u);
    setShowForm(true);
    clearPhoto();
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      first_name: u.first_name,
      last_name: u.last_name,
      job_title: u.job_title ?? "",
      access_role: u.access_role ?? "",
      department: u.department ?? "",
      is_active: u.is_active !== false,
    });
  };

  useEffect(() => {
    const editUser = (location.state as { editUser?: User } | null)?.editUser;
    if (editUser) startEdit(editUser);
  }, [location.state]);

  const previewName =
    [form.first_name, form.last_name].filter(Boolean).join(" ") || form.username || "User";

  const canViewUsers =
    user?.role === "admin" || permissions.can_view_users || permissions.can_manage_users;
  const canManageUsers = user?.role === "admin" || permissions.can_manage_users;

  if (!canViewUsers) return <Navigate to="/" replace />;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 mt-1">Team profiles, roles, and account settings</p>
        </div>
        {canManageUsers && (
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm"
          >
            New user
          </button>
        )}
      </div>

      <FilterBar
        search={filters.search}
        onSearchChange={(search) => setFilters((f) => ({ ...f, search }))}
        searchPlaceholder="Search by name, email, or username…"
        showClear={hasActiveFilters}
        onClear={() => {
          setFilters(emptyUserFilters);
          setPage(1);
        }}
      >
        <FilterSelect
          label="Role"
          value={filters.access_role}
          onChange={(access_role) => setFilters((f) => ({ ...f, access_role }))}
          options={[
            { value: "", label: "All roles" },
            ...(roles?.map((r) => ({ value: String(r.id), label: r.name })) ?? []),
          ]}
        />
        <FilterSelect
          label="Department"
          value={filters.department}
          onChange={(department) => setFilters((f) => ({ ...f, department }))}
          options={[
            { value: "", label: "All departments" },
            ...(departments?.map((d) => ({ value: String(d.id), label: d.name })) ?? []),
          ]}
        />
        <FilterSelect
          label="Status"
          value={filters.is_active}
          onChange={(is_active) => setFilters((f) => ({ ...f, is_active }))}
          options={[
            { value: "", label: "All accounts" },
            { value: "true", label: "Active" },
            { value: "false", label: "Inactive" },
          ]}
        />
      </FilterBar>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (editing) updateUser.mutate();
            else createUser.mutate();
          }}
          className="mt-6 bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm"
        >
          <div className="h-1 bg-gradient-to-r from-brand-500 to-indigo-500" />
          <div className="p-6 space-y-6">
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">
                {editing ? "Edit profile" : "Create user"}
              </h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {editing
                  ? "Update account details and profile photo."
                  : "Set up a new team member with role, department, and optional photo."}
              </p>
            </div>

            <UserPhotoUpload
              name={previewName}
              photoUrl={editing?.profile_picture_url}
              previewUrl={photoPreview}
              seed={editing?.id ?? (form.username || "new")}
              hasExistingPhoto={Boolean(editing?.profile_picture_url)}
              onSelect={(file) => {
                setProfilePhoto(file);
                setPhotoPreview(URL.createObjectURL(file));
              }}
              onClear={clearPhoto}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Account
                </h3>
                {!editing && (
                  <label className="block space-y-1">
                    <FieldLabel>Username</FieldLabel>
                    <input
                      required
                      placeholder="jane.doe"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                    />
                  </label>
                )}
                <label className="block space-y-1">
                  <FieldLabel>Email</FieldLabel>
                  <input
                    required
                    type="email"
                    placeholder="jane@company.com"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <FieldLabel>{editing ? "New password (optional)" : "Password"}</FieldLabel>
                  <input
                    type="password"
                    required={!editing}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                  />
                </label>
              </section>

              <section className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Profile & role
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block space-y-1">
                    <FieldLabel>First name</FieldLabel>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                      value={form.first_name}
                      onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                    />
                  </label>
                  <label className="block space-y-1">
                    <FieldLabel>Last name</FieldLabel>
                    <input
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                      value={form.last_name}
                      onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                    />
                  </label>
                </div>
                <label className="block space-y-1">
                  <FieldLabel>Job title</FieldLabel>
                  <input
                    placeholder="e.g. Senior Developer"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                    value={form.job_title}
                    onChange={(e) => setForm({ ...form, job_title: e.target.value })}
                  />
                </label>
                <label className="block space-y-1">
                  <FieldLabel>Access role</FieldLabel>
                  <select
                    required
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                    value={form.access_role}
                    onChange={(e) => setForm({ ...form, access_role: e.target.value })}
                  >
                    <option value="">Select role</option>
                    {roles?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                        {r.is_admin ? " (full access)" : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block space-y-1">
                  <FieldLabel>Department</FieldLabel>
                  <select
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 shadow-sm"
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                  >
                    <option value="">No department</option>
                    {departments?.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                {editing && (
                  <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    />
                    Account active
                  </label>
                )}
              </section>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <button
                type="submit"
                disabled={createUser.isPending || updateUser.isPending}
                className="bg-brand-600 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {editing ? "Save changes" : "Create user"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="border border-slate-200 px-5 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading profiles…</p>
      ) : users?.length ? (
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((u) => (
            <UserCard key={u.id} user={u} onEdit={startEdit} />
          ))}
        </div>
      ) : (
        <p className="mt-8 text-slate-400">
          {hasActiveFilters ? "No users match your filters." : "No users yet."}
        </p>
      )}
      <PaginationBar
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={userPage?.count ?? 0}
        onPageChange={setPage}
        isLoading={isLoading}
      />
    </div>
  );
}
