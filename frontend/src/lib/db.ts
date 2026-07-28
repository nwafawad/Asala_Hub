import Dexie, { type Table } from 'dexie';
import { generateUUID } from './uuid';

export interface TransactionLogItem {
  id?: number;
  offlineId?: string; // UUID v4 collision-safe offline record ID (FR-14)
  action: 'CREATE_SUBMISSION' | 'UPDATE_COURSE' | 'GRADE_ASSIGNMENT' | 'COMPLETE_MODULE';
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
  }
}

export const db = new AsalaHubDatabase();

export async function seedInitialMockData() {
  try {
    // Purge legacy demo entries if present to ensure clean backend wiring
    const demoUserIds = ['user-student-1', 'user-educator-1'];
    const demoCourseIds = ['cs101', 'se202'];
    const demoSubIds = ['sub-101', 'sub-102'];

    await Promise.all([
      db.users.where('id').anyOf(demoUserIds).delete(),
      db.cachedCourses.where('id').anyOf(demoCourseIds).delete(),
      db.cachedModules.where('courseId').anyOf(demoCourseIds).delete(),
      db.cachedSubmissions.where('id').anyOf(demoSubIds).delete(),
    ]);
  } catch (err) {
    // Silently ignore cleanup errors on empty store
  }
}

