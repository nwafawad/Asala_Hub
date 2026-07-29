import { UserRoleType, AccountStatusType } from './admin';

export const CURRENT_SCHEMA_VERSION = 1;
export const MIN_SUPPORTED_SCHEMA_VERSION = 1;

// User & Auth DTOs
export interface UserReadDTO {
  id: string;
  full_name: string;
  email: string;
  role: UserRoleType;
  status: AccountStatusType;
  must_change_password: boolean;
  preferred_language: string;
  requires_guardian_consent: boolean;
  guardian_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserAuthClaimsDTO {
  user_id: string;
  role: UserRoleType;
  email?: string | null;
}

export interface TokenResponseDTO {
  access_token: string;
  refresh_token?: string | null;
  token_type: string;
}

export interface RoleSwitchRequestDTO {
  role: UserRoleType;
}

// Course DTOs
export interface CourseReadDTO {
  id: string;
  title: string;
  description: string;
  educator_id: string;
  created_at: string;
  updated_at: string;
}

export interface CourseReadWithModulesDTO extends CourseReadDTO {
  modules: ModuleReadDTO[];
}

export interface CourseCreateDTO {
  title: string;
  description?: string;
}

export interface CourseUpdateDTO {
  title?: string | null;
  description?: string | null;
}

// Module DTOs
export type ContentTypeDTO = 'reading' | 'audio' | 'syllabus' | 'assignment';

export interface ModuleReadDTO {
  id: string;
  course_id: string;
  title: string;
  content_type: ContentTypeDTO;
  content: string;
  order_index: number;
  media_variants?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ModuleSyllabusReadDTO {
  id: string;
  course_id: string;
  title: string;
  content_type: ContentTypeDTO;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleCreateDTO {
  title: string;
  content_type: ContentTypeDTO;
  content: string;
  order_index: number;
}

export interface ModuleUpdateDTO {
  title?: string | null;
  content_type?: ContentTypeDTO | null;
  content?: string | null;
  order_index?: number | null;
}

// Assignment & Submission DTOs
export interface AssignmentReadDTO {
  id: string;
  course_id: string;
  title: string;
  description: string;
  due_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentCreateDTO {
  title: string;
  description?: string;
  due_date: string;
}

export interface GradeUpdateDTO {
  grade: number;
  feedback?: string | null;
}

export interface SubmissionReadDTO {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  sync_status: 'synced' | 'pending' | 'failed' | 'conflict';
  grade?: number | null;
  version: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

// Sync DTOs
export interface SubmissionContentPayloadDTO {
  assignment_id: string;
  content?: string;
  version?: number | null;
}

export interface GradePayloadDTO {
  grade: number;
  version?: number | null;
}

export interface SyncTransactionInDTO {
  transaction_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  payload: Record<string, any>;
  client_timestamp: string;
  schema_version?: number;
}

export interface SyncBatchRequestDTO {
  transactions: SyncTransactionInDTO[];
}

export interface SyncTransactionResultDTO {
  transaction_id: string;
  status: 'accepted' | 'rejected' | 'skipped' | 'unsupported_schema_version';
  server_sequence?: number | null;
  synced_at?: string | null;
  error?: string | null;
}

export interface SyncBatchResponseDTO {
  results: SyncTransactionResultDTO[];
  synced_count: number;
  error_count: number;
}

// FastAPI 422 Error Items
export interface ApiValidationErrorItem {
  loc: (string | number)[];
  msg: string;
  type: string;
}
