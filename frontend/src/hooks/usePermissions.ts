import { useAuth } from "../context/AuthContext";
import type { UserPermissions } from "../types";

const DEFAULT: UserPermissions = {
  can_create_tasks: false,
  can_create_bugs: false,
  can_edit_tasks: false,
  can_edit_bugs: false,
};

export function usePermissions(): UserPermissions {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return {
      can_create_tasks: true,
      can_create_bugs: true,
      can_edit_tasks: true,
      can_edit_bugs: true,
    };
  }
  return user?.permissions ?? DEFAULT;
}
