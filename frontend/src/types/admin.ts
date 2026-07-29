export type UserRoleType = 'student' | 'educator' | 'admin';
export type AccountStatusType = 'active' | 'suspended';

export interface AdminUserRead {
  id: string;
  full_name: string;
  email: string;
  role: UserRoleType;
  status: AccountStatusType;
  must_change_password: boolean;
  preferred_language: string;
  created_at: string;
  updated_at: string;
  course_count: number;
  submission_count: number;
  pending_sync_count: number;
}

export interface CourseBasicInfo {
  id: string;
  title: string;
  code: string;
}

export interface SubmissionBasicInfo {
  id: string;
  assignment_title: string;
  submitted_at: string;
  sync_status: string;
  grade?: number;
}

export interface AdminUserDetail extends AdminUserRead {
  courses: CourseBasicInfo[];
  recent_submissions: SubmissionBasicInfo[];
  active_session_count: number;
}

export interface PasswordResetResponse {
  success: boolean;
  temporary_password?: string;
  message: string;
}

export interface SuspendResponse {
  success: boolean;
  had_unsynced_work: boolean;
  message: string;
}

export interface AdminUserCreatePayload {
  full_name: string;
  email: string;
  role: UserRoleType;
  preferred_language?: string;
  mode: 'generate' | 'custom';
  custom_password?: string;
}

export interface AdminUserCreateResponse {
  user: AdminUserRead;
  temporary_password: string;
  message: string;
}

export interface AuditEventRead {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email: string;
  action_type: 'password_reset' | 'account_suspended' | 'account_reactivated' | 'force_logout' | 'account_created' | 'bulk_accounts_created';
  target_user_id?: string;
  target_user_name?: string;
  target_user_email?: string;
  created_at: string;
  metadata_json?: string;
}

export interface AdminDashboardStats {
  total_students: number;
  total_educators: number;
  active_accounts: number;
  suspended_accounts: number;
  unresolved_conflicts: number;
  pending_sync_items: number;
  recent_audit_events: AuditEventRead[];
}

export interface AdminHealthResponse {
  status: string;
  database: string;
  total_transaction_logs: number;
  unresolved_conflicts: number;
  max_server_sequence: number;
  users_count: Record<string, number>;
}
