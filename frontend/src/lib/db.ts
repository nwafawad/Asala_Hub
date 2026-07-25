import Dexie, { type Table } from 'dexie';

export interface TransactionLogItem {
  id?: number;
  action: 'CREATE_SUBMISSION' | 'UPDATE_COURSE' | 'GRADE_ASSIGNMENT';
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  status: 'pending' | 'synced' | 'failed';
  errorMessage?: string;
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

export interface AttachmentFile {
  name: string;
  size: number;
  type: string;
  dataUrl: string;
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
}

export class AsalaHubDatabase extends Dexie {
  transactionLogs!: Table<TransactionLogItem, number>;
  cachedCourses!: Table<CachedCourse, string>;
  cachedSubmissions!: Table<CachedSubmission, string>;
  users!: Table<IndexedDBUser, string>;
  userSession!: Table<UserSession, string>;

  constructor() {
    super('AsalaHubDB');
    this.version(2).stores({
      transactionLogs: '++id, action, entityType, entityId, timestamp, status',
      cachedCourses: 'id, title, code, educatorName',
      cachedSubmissions: 'id, assignmentId, studentName, syncStatus',
      users: 'id, email, role',
      userSession: 'id, token, rememberMe, expiresAt',
    });
  }
}

export const db = new AsalaHubDatabase();

export async function seedInitialMockData() {
  try {
    const [courseCount, subCount, userCount] = await Promise.all([
      db.cachedCourses.count(),
      db.cachedSubmissions.count(),
      db.users.count(),
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
          moduleCount: 3,
          isCachedOffline: true,
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
