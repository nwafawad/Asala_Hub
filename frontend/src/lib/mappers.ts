import {
  UserReadDTO,
  CourseReadDTO,
  ModuleReadDTO,
  SubmissionReadDTO,
} from '@/types/api';
import {
  IndexedDBUser,
  CachedCourse,
  CachedModule,
  CachedSubmission,
} from '@/lib/db';

/**
 * Map backend UserReadDTO (snake_case) to IndexedDBUser entity (camelCase).
 */
export function mapUserReadToIndexedDB(dto: UserReadDTO): IndexedDBUser {
  return {
    id: dto.id,
    email: dto.email,
    fullName: dto.full_name,
    role: dto.role,
    preferredLanguage: (dto.preferred_language as 'en' | 'ar') || 'en',
    status: dto.status,
    requiresGuardianConsent: dto.requires_guardian_consent,
    guardianEmail: dto.guardian_email || undefined,
  };
}

/**
 * Map backend CourseReadDTO (snake_case) to CachedCourse entity (camelCase).
 */
export function mapCourseReadToCached(
  dto: CourseReadDTO,
  educatorName = 'Faculty',
  moduleCount = 0
): CachedCourse {
  return {
    id: dto.id,
    title: dto.title,
    code: dto.id.slice(0, 8).toUpperCase(),
    educatorName,
    moduleCount,
    isCachedOffline: true,
    sizeMb: 0.5,
    updatedAt: dto.updated_at || dto.created_at,
  };
}

/**
 * Map backend ModuleReadDTO (snake_case) to CachedModule entity (camelCase).
 */
export function mapModuleReadToCached(dto: ModuleReadDTO): CachedModule {
  return {
    id: dto.id,
    courseId: dto.course_id,
    title: dto.title,
    type: dto.content_type,
    sequenceOrder: dto.order_index,
    isCachedOffline: true,
    sizeMb: 0.2,
    content: dto.content,
  };
}

/**
 * Map backend SubmissionReadDTO (snake_case) to CachedSubmission entity (camelCase).
 */
export function mapSubmissionReadToCached(
  dto: SubmissionReadDTO,
  assignmentTitle = 'Assignment',
  studentName = 'Student'
): CachedSubmission {
  return {
    id: dto.id,
    assignmentId: dto.assignment_id,
    assignmentTitle,
    studentName,
    content: dto.content,
    submittedAt: dto.submitted_at,
    syncStatus: dto.sync_status === 'conflict' ? 'failed' : (dto.sync_status as any),
    score: dto.grade ?? undefined,
    gradeStatus: dto.grade !== null && dto.grade !== undefined ? 'graded' : 'pending',
    serverSeqNum: dto.version,
  };
}
