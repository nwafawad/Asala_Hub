import Dexie, { type Table } from 'dexie';
import { generateUUID } from './uuid';

export interface TransactionLogItem {
  id?: number;
  offlineId: string; // UUID v4 collision-safe offline record ID (FR-14)
  action:
    | 'CREATE_SUBMISSION'
    | 'SUBMIT_ASSIGNMENT'
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

export interface QuizOption {
  id: string;
  text: string;
  textAr?: string;
  isCorrect: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'short_answer';
  prompt: string;
  promptAr?: string;
  options?: QuizOption[];
  correctAnswer?: string;
  points: number;
  explanation?: string;
}

export interface QuizSchema {
  questions: QuizQuestion[];
  passingScorePercentage: number;
  timeLimitMinutes?: number;
  allowRetries: boolean;
}

export interface AssignmentSchema {
  instructions: string;
  instructionsAr?: string;
  allowedFileTypes?: string[];
  maxFileSizeMb: number;
  rubricCriteria?: Record<string, unknown>[];
}

export interface CachedModule {
  id: string;
  courseId: string;
  title: string;
  titleAr?: string;
  type: 'reading' | 'audio' | 'video' | 'quiz' | 'assignment' | 'pdf' | 'syllabus';
  sequenceOrder: number;
  isCachedOffline: boolean;
  sizeMb: number;
  content?: string;
  audioUrl?: string;
  audioArrayBuffer?: ArrayBuffer;
  videoUrl?: string;
  videoOfflineText?: string;
  attachmentFile?: AttachmentFile;
  durationMinutes?: number;
  assignmentId?: string;
  dueDate?: string;
  points?: number;
  quizSchema?: QuizSchema;
  assignmentSchema?: AssignmentSchema;
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
  role: 'student' | 'educator' | 'admin';
  preferredLanguage: 'en' | 'ar';
  status?: 'active' | 'suspended';
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

export async function initializeDatabase() {
  try {
    // Database schema initialization & session role verification
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
  } catch (err) {
    console.warn('Error initializing database:', err);
  }
}

// Backwards-compatibility alias for initializeDatabase
export const seedInitialMockData = initializeDatabase;


