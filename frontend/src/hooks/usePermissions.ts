import { useAuth } from "../context/AuthContext";
import type { UserPermissions } from "../types";

const DEFAULT: UserPermissions = {
  can_create_tasks: false,
  can_create_bugs: false,
  can_edit_tasks: false,
  can_edit_bugs: false,
  can_delete_tasks: false,
  can_delete_bugs: false,
  can_create_tickets: false,
  can_edit_tickets: false,
  can_approve_tickets: false,
  can_manage_projects: false,
  can_view_all_projects: false,
  can_manage_users: false,
  can_manage_departments: false,
  can_manage_roles: false,
  can_view_audit_logs: false,
};

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  return { ...DEFAULT, ...(user?.permissions ?? {}) };
}

export function useHasPermission(codename: keyof UserPermissions): boolean {
  return usePermissions()[codename] ?? false;
}
