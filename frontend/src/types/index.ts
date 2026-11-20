export type UserRole = 'admin' | 'project_manager' | 'safety_inspector' | 'worker' | 'client';

export interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role_name: UserRole;
  phone?: string;
  permissions: string[];
  assigned_project_ids?: string[];
}

export type HazardSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus =
  | 'pending_admin_review'
  | 'approved'
  | 'rejected'
  | 'action_assigned'
  | 'in_progress'
  | 'completed'
  | 'overdue';

export interface ProjectSummary {
  id: string;
  name: string;
  code: string;
  client: string;
  location: string;
  status: string;
  start_date: string;
  expected_completion_date: string;
  safety_score?: number;
}
