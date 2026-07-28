import Dexie, { type Table } from 'dexie';
import { generateUUID } from './uuid';

export interface TransactionLogItem {
  id?: number;
  offlineId?: string; // UUID v4 collision-safe offline record ID (FR-14)
  action:
    | 'CREATE_SUBMISSION'
    | 'UPDATE_COURSE'
    | 'GRADE_ASSIGNMENT'
    | 'COMPLETE_MODULE'
    | 'CREATE_MODULE'
    | 'UPDATE_MODULE'
    | 'UPDATE_ROSTER';
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
  serverSeqNum?: number; // Server-authoritative conflict resolution sequence (FR-15)
  retryCount?: number;   // Exponential backoff retry counter (FR-16)
  nextRetryAt?: string;  // Next scheduled retry timestamp (FR-16)
  lastAckedId?: number;  // Last acknowledged log ID for sync resume (FR-16)
}

export interface CachedCourse {
  id: string;
  title: string;
  titleAr?: string;
  code: string;
  educatorName: string;
  moduleCount: number;
  isCachedOffline: boolean;
  sizeMb: number;
  updatedAt: string;
}

export interface CachedModule {
  id: string;
  courseId: string;
  title: string;
  titleAr?: string;
  type: 'reading' | 'audio' | 'syllabus' | 'assignment';
  sequenceOrder: number;
  isCachedOffline: boolean;
  sizeMb: number;
  content?: string;
  audioUrl?: string;
  durationMinutes?: number;
  assignmentId?: string;
  dueDate?: string;
  points?: number;
  isCompleted?: boolean;
  userNotes?: string;
}

export interface AttachmentFile {
  name: string;
  size: number;
  type: string;
  dataUrl?: string;          // Legacy Base64 — kept for backward compat with existing IndexedDB records
  arrayBuffer?: ArrayBuffer; // Preferred: raw binary storage, ~33% smaller than Base64 (Perf #1)
}

export interface DraftSnapshot {
  id: string;
  timestamp: string;
  content: string;
  wordCount: number;
  sizeKb: number;
  isServerConflict?: boolean;
  label?: string;
}

export interface CachedSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentName: string;
  content: string;
  attachments?: AttachmentFile[];
  submittedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  conflictStatus?: 'none' | 'resolved_lww';
  receiptHash?: string;
  draftHistory?: DraftSnapshot[];
  serverSeqNum?: number;
  deviceConflictDrafts?: DraftSnapshot[];
  // Educator grading extensions (FR-9, BR-4)
  score?: number;
  maxScore?: number;
  feedback?: string;
  gradeStatus?: 'graded' | 'pending' | 'needs_revision';
  gradedAt?: string;
  educatorId?: string;
}

export interface CachedCohort {
  id: string;
  name: string;
  courseId: string;
  educatorId: string;
  studentCount: number;
  updatedAt: string;
}

export interface CohortEnrollment {
  id: string; // cohortId_studentId
  cohortId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  status: 'active' | 'suspended' | 'completed' | 'withdrawn';
  adminFlags: string[];
  gradeAverage?: number;
  lastActiveAt: string;
}

export interface IndexedDBUser {
  id: string;
  email: string;
  fullName: string;
  role: 'student' | 'educator';
  preferredLanguage: 'en' | 'ar';
  requiresGuardianConsent?: boolean;
  guardianEmail?: string;
}

export interface UserSession {
  id: string;
  token: string;
  user: IndexedDBUser;
  rememberMe: boolean;
  expiresAt: string;
  lastLoginAt: string;
  pinCode?: string;
  hasAcceptedConsent?: boolean;
}

export class AsalaHubDatabase extends Dexie {
  transactionLogs!: Table<TransactionLogItem, number>;
  cachedCourses!: Table<CachedCourse, string>;
  cachedSubmissions!: Table<CachedSubmission, string>;
  users!: Table<IndexedDBUser, string>;
  userSession!: Table<UserSession, string>;
  cachedModules!: Table<CachedModule, string>;
  cachedCohorts!: Table<CachedCohort, string>;
  cohortEnrollments!: Table<CohortEnrollment, string>;

  constructor() {
    super('AsalaHubDB');
    this.version(4).stores({
      transactionLogs: '++id, offlineId, action, entityType, entityId, timestamp, status, serverSeqNum',
      cachedCourses: 'id, title, code, educatorName',
      cachedSubmissions: 'id, assignmentId, studentName, syncStatus, serverSeqNum',
      users: 'id, email, role',
      userSession: 'id, token, rememberMe, expiresAt',
      cachedModules: 'id, courseId, type, sequenceOrder, isCachedOffline',
    });

    // v5: Add [status+id] compound index for O(log n) pending-log range queries (Perf #1)
    this.version(5).stores({
      transactionLogs: '++id, offlineId, action, entityType, entityId, timestamp, status, serverSeqNum, [status+id]',
      cachedCourses: 'id, title, code, educatorName',
      cachedSubmissions: 'id, assignmentId, studentName, syncStatus, serverSeqNum',
      users: 'id, email, role',
      userSession: 'id, token, rememberMe, expiresAt',
      cachedModules: 'id, courseId, type, sequenceOrder, isCachedOffline',
    });

    // v6: Add educator cohorts and cohort enrollments schema
    this.version(6).stores({
      transactionLogs: '++id, offlineId, action, entityType, entityId, timestamp, status, serverSeqNum, [status+id]',
      cachedCourses: 'id, title, code, educatorName',
      cachedSubmissions: 'id, assignmentId, studentName, syncStatus, serverSeqNum',
      users: 'id, email, role',
      userSession: 'id, token, rememberMe, expiresAt',
      cachedModules: 'id, courseId, type, sequenceOrder, isCachedOffline',
      cachedCohorts: 'id, name, courseId, educatorId',
      cohortEnrollments: 'id, cohortId, studentId, studentName, status',
    });
  }
}

export const db = new AsalaHubDatabase();

export async function seedInitialMockData() {
  try {
    await db.users.bulkPut([
      {
        id: 'user-educator-1',
        email: 'educator@asalahub.edu',
        fullName: 'Prof. Tariq Al-Mansoor',
        role: 'educator',
        preferredLanguage: 'en',
      },
      {
        id: 'user-student-1',
        email: 'student@asalahub.edu',
        fullName: 'Sami Mansoor',
        role: 'student',
        preferredLanguage: 'en',
      },
    ]);

    // Self-heal current active session if cached with legacy student role
    const currentSession = await db.userSession.get('current_session');
    if (
      currentSession &&
      (currentSession.user.email.includes('educator') || currentSession.user.email.includes('prof'))
    ) {
      if (currentSession.user.role !== 'educator') {
        currentSession.user.role = 'educator';
        await db.userSession.put(currentSession);
      }
    }

    const existingCohorts = await db.cachedCohorts.count();
    if (existingCohorts === 0) {
      await db.cachedCohorts.bulkPut([
        {
          id: 'cohort-cs101-a',
          name: 'CS101 - Section A (Fall 2026)',
          courseId: 'cs101',
          educatorId: 'user-educator-1',
          studentCount: 3,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'cohort-se202-b',
          name: 'SE202 - Section B (Fall 2026)',
          courseId: 'se202',
          educatorId: 'user-educator-1',
          studentCount: 2,
          updatedAt: new Date().toISOString(),
        },
      ]);

      await db.cohortEnrollments.bulkPut([
        {
          id: 'cohort-cs101-a_user-student-1',
          cohortId: 'cohort-cs101-a',
          studentId: 'user-student-1',
          studentName: 'Tariq Al-Mansoor',
          studentEmail: 'tariq.student@asalahub.edu',
          status: 'active',
          adminFlags: ['Scholarship Grantee', 'Offline Device Sync Enabled'],
          gradeAverage: 88.5,
          lastActiveAt: new Date().toISOString(),
        },
        {
          id: 'cohort-cs101-a_user-student-2',
          cohortId: 'cohort-cs101-a',
          studentId: 'user-student-2',
          studentName: 'Amina Khalil',
          studentEmail: 'amina.k@asalahub.edu',
          status: 'active',
          adminFlags: ['Honor Roll'],
          gradeAverage: 94.0,
          lastActiveAt: new Date().toISOString(),
        },
        {
          id: 'cohort-cs101-a_user-student-3',
          cohortId: 'cohort-cs101-a',
          studentId: 'user-student-3',
          studentName: 'Zayd Hassan',
          studentEmail: 'zayd.h@asalahub.edu',
          status: 'suspended',
          adminFlags: ['Pending Fee Clearance'],
          gradeAverage: 65.0,
          lastActiveAt: new Date().toISOString(),
        },
      ]);
    }
  } catch (err) {
    console.warn('Error seeding mock cohort data:', err);
  }
}


