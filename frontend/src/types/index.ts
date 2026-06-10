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
  can_assign_tasks: boolean;
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
  can_create_features: boolean;
  can_edit_features: boolean;
  can_delete_features: boolean;
  can_create_sprints: boolean;
  can_edit_sprints: boolean;
  can_delete_sprints: boolean;
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
  feature_count?: number;
  sprint_count?: number;
  members?: ProjectMember[];
}

export interface Feature {
  id: number;
  project: number;
  project_name?: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  owner?: number | null;
  owner_detail?: User;
  created_by?: number;
  created_by_detail?: User;
  target_date?: string | null;
  task_count?: number;
  completed_task_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Sprint {
  id: number;
  project: number;
  project_name?: string;
  name: string;
  goal?: string;
  description?: string;
  status: string;
  start_date: string;
  end_date: string;
  created_by?: number;
  created_by_detail?: User;
  task_count?: number;
  completed_task_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface TimeEntry {
  id: number;
  minutes: number;
  work_date: string;
  note?: string;
  user?: number;
  user_detail?: User;
}

export interface Task {
  id: number;
  project: number;
  project_name?: string;
  feature?: number | null;
  feature_title?: string | null;
  sprint?: number | null;
  sprint_name?: string | null;
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
  time_entries?: TimeEntry[];
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

export interface DashboardSprintSummary {
  id: number;
  name: string;
  project_id: number;
  project_name: string;
  end_date: string | null;
  status: string;
}

export interface DashboardFeatureSummary {
  id: number;
  title: string;
  project_id: number;
  project_name: string;
  status: string;
  target_date: string | null;
}

export interface DashboardStats {
  greeting_name?: string;
  my_open_tasks: number;
  my_open_bugs: number;
  project_open_bugs: number;
  overdue_tasks: number;
  due_soon_tasks?: number;
  my_projects_count?: number;
  unread_notifications?: number;
  pending_tickets?: number;
  active_features?: number;
  my_owned_features?: number;
  active_sprints?: number;
  can_approve_tickets?: boolean;
  upcoming_tasks?: Task[];
  recent_tasks?: Task[];
  recent_bugs?: Bug[];
  active_sprints_list?: DashboardSprintSummary[];
  my_features?: DashboardFeatureSummary[];
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
  "can_create_features",
  "can_create_sprints",
  "can_edit_features",
  "can_edit_sprints",
] as const;
