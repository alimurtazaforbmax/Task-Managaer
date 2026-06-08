import { FormEvent, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import api, { unwrap } from "../api/client";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse, Department, Paginated, User } from "../types";
import { USER_ROLES } from "../types";

export default function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    role: "developer",
    department: "" as string | number,
  });

  if (user?.role !== "admin") return <Navigate to="/" replace />;

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

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Paginated<User> | User[]>>(
        "/auth/users/?page_size=100"
      );
      const d = unwrap(res);
      return Array.isArray(d) ? d : d.results;
    },
  });

  const resetForm = () => {
    setForm({
      username: "",
      email: "",
      password: "",
      first_name: "",
      last_name: "",
      role: "developer",
      department: "",
    });
    setEditing(null);
    setShowForm(false);
  };

  const createUser = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
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
      const payload: Record<string, unknown> = {
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: form.role,
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
    setForm({
      username: u.username,
      email: u.email,
      password: "",
      first_name: u.first_name,
      last_name: u.last_name,
      role: u.role,
      department: u.department ?? "",
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-slate-500 mt-1">Manage accounts and permissions</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          New user
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            if (editing) updateUser.mutate();
            else createUser.mutate();
          }}
          className="mt-6 bg-white border rounded-xl p-5 space-y-3"
        >
          <h2 className="font-semibold">{editing ? "Edit user" : "Create user"}</h2>
          {!editing && (
            <input
              required
              placeholder="Username"
              className="w-full border rounded-lg px-3 py-2"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email"
            className="w-full border rounded-lg px-3 py-2"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            type="password"
            placeholder={editing ? "New password (optional)" : "Password"}
            required={!editing}
            className="w-full border rounded-lg px-3 py-2"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="First name"
              className="border rounded-lg px-3 py-2"
              value={form.first_name}
              onChange={(e) => setForm({ ...form, first_name: e.target.value })}
            />
            <input
              placeholder="Last name"
              className="border rounded-lg px-3 py-2"
              value={form.last_name}
              onChange={(e) => setForm({ ...form, last_name: e.target.value })}
            />
          </div>
          <select
            className="w-full border rounded-lg px-3 py-2"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
          >
            {USER_ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <select
            className="w-full border rounded-lg px-3 py-2"
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
          <div className="flex gap-2">
            <button type="submit" className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm">
              {editing ? "Save changes" : "Create user"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-lg text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <p className="mt-8 text-slate-400">Loading...</p>
      ) : (
        <div className="mt-8 bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Department</th>
                <th className="text-left p-3">Status</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {users?.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{u.username}</td>
                  <td className="p-3 text-slate-600">{u.email}</td>
                  <td className="p-3 capitalize">{u.role.replace(/_/g, " ")}</td>
                  <td className="p-3 text-slate-600">{u.department_name || "—"}</td>
                  <td className="p-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        u.is_active !== false
                          ? "bg-green-100 text-green-800"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {u.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => startEdit(u)}
                      className="text-brand-600 hover:underline text-sm"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
