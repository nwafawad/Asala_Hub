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
  dataUrl: string;
}

export interface DraftSnapshot {
  id: string;
  timestamp: string;
  content: string;
  wordCount: number;
  sizeKb: number;
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
  }
}

export const db = new AsalaHubDatabase();

export async function seedInitialMockData() {
  try {
    const [courseCount, subCount, userCount, moduleCount] = await Promise.all([
      db.cachedCourses.count(),
      db.cachedSubmissions.count(),
      db.users.count(),
      db.cachedModules.count(),
    ]);

    if (userCount === 0) {
      await db.users.bulkAdd([
        {
          id: 'user-student-1',
          email: 'omar@asalahub.dev',
          fullName: 'Omar Khalid',
          role: 'student',
          preferredLanguage: 'en',
        },
        {
          id: 'user-educator-1',
          email: 'layla@asalahub.dev',
          fullName: 'Layla Al-Rashidi',
          role: 'educator',
          preferredLanguage: 'ar',
        },
      ]);
    }

    if (courseCount === 0) {
      await db.cachedCourses.bulkAdd([
        {
          id: 'cs101',
          title: 'Introduction to Computer Science',
          titleAr: 'مقدمة في علوم الحاسوب',
          code: 'CS101',
          educatorName: 'Layla Al-Rashidi',
          moduleCount: 4,
          isCachedOffline: false,
          sizeMb: 18.5,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'se202',
          title: 'Software Architecture & Design',
          titleAr: 'هندسة وتصميم البرمجيات',
          code: 'SE202',
          educatorName: 'Layla Al-Rashidi',
          moduleCount: 4,
          isCachedOffline: true,
          sizeMb: 12.2,
          updatedAt: new Date().toISOString(),
        },
      ]);
    }

    if (moduleCount === 0) {
      await db.cachedModules.bulkAdd([
        {
          id: 'cs101-m1',
          courseId: 'cs101',
          title: 'Course Syllabus & Offline Policies',
          titleAr: 'خطة المقرر وسياسات العمل بدون إنترنت',
          type: 'syllabus',
          sequenceOrder: 1,
          isCachedOffline: true,
          sizeMb: 1.2,
          content: 'Welcome to CS101. This course covers core algorithms, computational thinking, and offline LMS data synchronization patterns.',
        },
        {
          id: 'cs101-m2',
          courseId: 'cs101',
          title: 'Lecture 1: Computing & Data Structures',
          titleAr: 'المحاضرة 1: أساسيات الحاسوب وهياكل البيانات',
          type: 'audio',
          sequenceOrder: 2,
          isCachedOffline: true,
          sizeMb: 8.5,
          durationMinutes: 45,
          audioUrl: '/audio/cs101-lec1.mp3',
          content: 'Audio lecture covering binary trees, graph algorithms, and flat JSON delta storage.',
        },
        {
          id: 'cs101-m3',
          courseId: 'cs101',
          title: 'Reading: Algorithmic Logic & P vs NP',
          titleAr: 'قراءة: المنطق الخوارزمي وتعقيد الحسابات',
          type: 'reading',
          sequenceOrder: 3,
          isCachedOffline: false,
          sizeMb: 3.4,
          content: 'Detailed analysis of P vs NP computational complexity classes and heuristic search methods.',
        },
        {
          id: 'cs101-m4',
          courseId: 'cs101',
          title: 'Assignment 1: Foundations of Aqeedah Homework',
          titleAr: 'التكليف 1: واجب التفكير الخوارزمي والمعاملات',
          type: 'assignment',
          sequenceOrder: 4,
          isCachedOffline: false,
          sizeMb: 5.4,
          assignmentId: 'assign-1',
          dueDate: '2026-08-15',
          points: 100,
        },
        {
          id: 'se202-m1',
          courseId: 'se202',
          title: 'SE202 Syllabus & Architectural Principles',
          titleAr: 'خطة مقرر SE202 ومبادئ المعمارية',
          type: 'syllabus',
          sequenceOrder: 1,
          isCachedOffline: true,
          sizeMb: 1.5,
          content: 'Syllabus outlining domain-driven design, repository patterns, and IndexedDB local caching.',
        },
        {
          id: 'se202-m2',
          courseId: 'se202',
          title: 'Reading: Clean Architecture & SOLID',
          titleAr: 'قراءة: المعمارية النظيفة ومبادئ SOLID',
          type: 'reading',
          sequenceOrder: 2,
          isCachedOffline: true,
          sizeMb: 2.8,
          content: 'Overview of Single Responsibility, Open-Closed, and Dependency Inversion principles.',
        },
        {
          id: 'se202-m3',
          courseId: 'se202',
          title: 'Audio Lecture: Event-Driven Systems & CQRS',
          titleAr: 'محاضرة صوتية: الأنظمة المعتمدة على الأحداث',
          type: 'audio',
          sequenceOrder: 3,
          isCachedOffline: true,
          sizeMb: 12.0,
          durationMinutes: 52,
          audioUrl: '/audio/se202-lec3.mp3',
          content: 'Deep dive into transaction outbox patterns and asynchronous synchronization queues.',
        },
        {
          id: 'se202-m4',
          courseId: 'se202',
          title: 'Assignment 2: Offline Transaction Log Architecture',
          titleAr: 'التكليف 2: معمارية سجل المعاملات المحلي',
          type: 'assignment',
          sequenceOrder: 4,
          isCachedOffline: false,
          sizeMb: 4.2,
          assignmentId: 'assign-2',
          dueDate: '2026-08-20',
          points: 100,
        },
      ]);
    }

    if (subCount === 0) {
      await db.cachedSubmissions.bulkAdd([
        {
          id: 'sub-101',
          assignmentId: 'assign-1',
          assignmentTitle: 'Foundations of Aqeedah Homework',
          studentName: 'Omar Khalid',
          content: 'Submitted notes detailing core principles and offline sync architecture.',
          submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          syncStatus: 'synced',
          conflictStatus: 'none',
          receiptHash: 'hash-8a92bc110f',
        },
        {
          id: 'sub-102',
          assignmentId: 'assign-2',
          assignmentTitle: 'Offline Transaction Log Architecture',
          studentName: 'Omar Khalid',
          content: 'Draft solution detailing flat JSON delta packaging over TLS 1.2+ connection.',
          submittedAt: new Date().toISOString(),
          syncStatus: 'pending',
          conflictStatus: 'resolved_lww',
          receiptHash: 'hash-3f77ea9921',
        },
      ]);
    }
  } catch (err) {
    console.error('Error seeding initial mock data:', err);
  }
}

