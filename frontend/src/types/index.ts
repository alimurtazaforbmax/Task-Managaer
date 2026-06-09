export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface Paginated<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
}

export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  access_role?: number | null;
  access_role_name?: string;
  department: number | null;
  department_name?: string;
  permissions?: UserPermissions;
  job_title?: string;
  profile_picture_url?: string | null;
  is_active?: boolean;
}

export interface ProjectDocument {
  id: number;
  project: number;
  title: string;
  file_url: string;
  original_name: string;
  mime_type: string;
  size_bytes: number;
  uploaded_by: number | null;
  created_at: string;
}

export interface Permission {
  id: number;
  codename: string;
  name: string;
  category: string;
  description: string;
}

export interface Role {
  id: number;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  is_admin: boolean;
  permissions_detail?: Permission[];
  permission_ids?: number[];
  user_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface DepartmentPermissions {
  can_create_tasks: boolean;
  can_create_bugs: boolean;
  can_edit_tasks: boolean;
  can_edit_bugs: boolean;
}

export interface UserPermissions extends Record<string, boolean> {
  can_create_tasks: boolean;
  can_create_bugs: boolean;
  can_edit_tasks: boolean;
  can_edit_bugs: boolean;
  can_delete_tasks: boolean;
  can_delete_bugs: boolean;
  can_create_tickets: boolean;
  can_edit_tickets: boolean;
  can_approve_tickets: boolean;
  can_manage_projects: boolean;
  can_view_all_projects: boolean;
  can_manage_users: boolean;
  can_manage_departments: boolean;
  can_manage_roles: boolean;
  can_view_audit_logs: boolean;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  permission_ids?: number[];
  permissions_detail?: Permission[];
  member_count?: number;
  created_at?: string;
}

export interface DepartmentPermissionItem {
  key: string;
  label: string;
  enabled: boolean;
}

export interface DepartmentStats {
  member_count: number;
  active_members: number;
  inactive_members: number;
  department_tasks: number;
  open_department_tasks: number;
  department_bugs: number;
  open_department_bugs: number;
  member_open_tasks: number;
  member_open_bugs: number;
}

export interface DepartmentSummary {
  department: Department;
  permissions: DepartmentPermissionItem[];
  stats: DepartmentStats;
  role_breakdown: Record<string, number>;
  members: User[];
  recent_tasks: Task[];
  recent_bugs: Bug[];
}

export interface ProjectMember {
  id: number;
  user: number;
  user_detail?: User;
  role: string;
  joined_at?: string;
}

export interface Project {
  id: number;
  name: string;
  code: string;
  description: string;
  status: string;
  start_date?: string | null;
  end_date?: string | null;
  created_at?: string;
  updated_at?: string;
  member_count?: number;
  task_count?: number;
  bug_count?: number;
  members?: ProjectMember[];
}

export interface Task {
  id: number;
  project: number;
  project_name?: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  task_type: string;
  assignees: number[];
  assignees_detail?: User[];
  assignee_department: number | null;
  reporter?: number;
  reporter_detail?: User;
  is_owner?: boolean;
  can_change_status?: boolean;
  due_date: string | null;
  estimated_hours?: string | null;
  tags?: string;
  comments?: Comment[];
  attachments?: Attachment[];
  time_entries?: { id: number; minutes: number; work_date: string }[];
  updated_at?: string;
}

export interface Bug {
  id: number;
  project: number;
  project_name?: string;
  related_task: number | null;
  title: string;
  description: string;
  steps_to_reproduce: string;
  environment: string;
  status: string;
  severity: string;
  priority: string;
  assignees: number[];
  assignees_detail?: User[];
  assignee_department: number | null;
  reporter?: number;
  reporter_detail?: User;
  is_owner?: boolean;
  can_change_status?: boolean;
  due_date: string | null;
  comments?: Comment[];
  attachments?: Attachment[];
  updated_at?: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  request_type: "task" | "bug" | "issue" | "other";
  status: "pending" | "approved" | "rejected";
  project: number;
  project_name?: string;
  raised_by: number;
  raised_by_detail?: User;
  mentioned_user: number | null;
  mentioned_user_detail?: User | null;
  mentioned_department: number | null;
  mentioned_department_detail?: Department | null;
  last_edited_by: number | null;
  last_edited_by_detail?: User | null;
  approved_by: number | null;
  approved_by_detail?: User | null;
  approved_at: string | null;
  rejection_reason?: string;
  created_task: number | null;
  created_bug: number | null;
  can_edit?: boolean;
  can_approve?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: number;
  actor: number | null;
  actor_detail?: User | null;
  action: string;
  entity_type: string;
  entity_id: number;
  entity_label: string;
  detail: string;
  changes: Record<string, unknown>;
  created_at: string;
}

export interface Comment {
  id: number;
  author_detail?: User;
  text: string;
  comment_type: string;
  created_at: string;
}

export interface Attachment {
  id: number;
  file_url: string;
  original_name: string;
  attachment_type: string;
}

export interface DashboardStats {
  my_open_tasks: number;
  my_open_bugs: number;
  project_open_bugs: number;
  overdue_tasks: number;
}

export interface UserStats {
  total_hours: number;
  task_hours: number;
  bug_hours: number;
  assigned_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_tasks: number;
  assigned_bugs: number;
  open_bugs: number;
  completed_bugs: number;
  reported_tasks: number;
  reported_bugs: number;
  projects_count: number;
}

export interface UserProjectMembership {
  id: number;
  name: string;
  code: string;
  status: string;
  role: string;
  joined_at: string;
}

export interface UserSummary {
  user: User;
  stats: UserStats;
  projects: UserProjectMembership[];
  recent_tasks: Task[];
  recent_bugs: Bug[];
}

export interface ReportStatCard {
  label: string;
  value: string | number;
  tone?: "default" | "task" | "bug" | "success" | "danger";
}

export interface ReportProfileRow {
  label: string;
  value: string;
}

export interface ReportSection {
  title: string;
  headers?: string[];
  rows?: string[][];
  bullets?: string[];
}

export interface WorkItemReport {
  title: string;
  generated_at: string;
  report_type?: "user" | "project";
  stat_cards?: ReportStatCard[];
  profile_rows?: ReportProfileRow[];
  sections?: ReportSection[];
  progress?: {
    task_completion_percent: number;
    bug_resolution_percent: number;
    open_tasks: number;
    open_bugs: number;
    total_tasks: number;
    total_bugs: number;
    tasks_done: number;
    bugs_closed: number;
  };
}

export interface Notification {
  id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export const DEPARTMENT_OVERLAY_PERMISSIONS = [
  "can_create_tasks",
  "can_create_bugs",
  "can_edit_tasks",
  "can_edit_bugs",
] as const;
