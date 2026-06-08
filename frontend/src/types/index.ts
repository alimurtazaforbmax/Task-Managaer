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
  department: number | null;
  department_name?: string;
  permissions?: UserPermissions;
  job_title?: string;
  is_active?: boolean;
}

export interface DepartmentPermissions {
  can_create_tasks: boolean;
  can_create_bugs: boolean;
  can_edit_tasks: boolean;
  can_edit_bugs: boolean;
}

export interface Department {
  id: number;
  name: string;
  description: string;
  can_create_tasks?: boolean;
  can_create_bugs?: boolean;
  can_edit_tasks?: boolean;
  can_edit_bugs?: boolean;
  member_count?: number;
}

export interface UserPermissions extends DepartmentPermissions {}

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
  due_date: string | null;
  estimated_hours?: string | null;
  tags?: string;
  comments?: Comment[];
  attachments?: Attachment[];
  time_entries?: { id: number; minutes: number; work_date: string }[];
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
  due_date: string | null;
  comments?: Comment[];
  attachments?: Attachment[];
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

export interface Notification {
  id: number;
  title: string;
  message: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

export const USER_ROLES = [
  "admin",
  "project_manager",
  "developer",
  "qa",
  "viewer",
] as const;
