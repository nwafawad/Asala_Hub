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

export class AsalaHubDatabase extends Dexie {
  transactionLogs!: Table<TransactionLogItem, number>;
  cachedCourses!: Table<CachedCourse, string>;
  cachedSubmissions!: Table<CachedSubmission, string>;

  constructor() {
    super('AsalaHubDB');
    this.version(1).stores({
      transactionLogs: '++id, action, entityType, entityId, timestamp, status',
      cachedCourses: 'id, title, code, educatorName',
      cachedSubmissions: 'id, assignmentId, studentName, syncStatus',
    });
  }
}

export const db = new AsalaHubDatabase();

export async function seedInitialMockData() {
  try {
    const [courseCount, subCount] = await Promise.all([
      db.cachedCourses.count(),
      db.cachedSubmissions.count(),
    ]);

    if (courseCount === 0) {
      await db.cachedCourses.bulkAdd([
        {
          id: 'cs101',
          title: 'Data Structures & Algorithms',
          titleAr: 'خوارزميات وهياكل البيانات',
          code: 'CS101',
          educatorName: 'Dr. Tariq Mansour',
          moduleCount: 6,
          isCachedOffline: true,
          sizeMb: 18.5,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'se202',
          title: 'Software Architecture & Design',
          titleAr: 'هندسة وتصميم البرمجيات',
          code: 'SE202',
          educatorName: 'Prof. Amira Al-Husseini',
          moduleCount: 4,
          isCachedOffline: true,
          sizeMb: 12.2,
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'is301',
          title: 'Database Management Systems',
          titleAr: 'نظم إدارة قواعد البيانات',
          code: 'IS301',
          educatorName: 'Dr. Hassan Al-Masri',
          moduleCount: 5,
          isCachedOffline: false,
          sizeMb: 24.0,
          updatedAt: new Date().toISOString(),
        },
      ]);
    }
    if (subCount === 0) {
      await db.cachedSubmissions.bulkAdd([
        {
          id: 'sub-101',
          assignmentId: 'assign-1',
          assignmentTitle: 'Binary Search Tree Implementation',
          studentName: 'Asala Student',
          content: 'Implemented BST insertion, deletion, and tree traversals in C++. All tests pass.',
          submittedAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          syncStatus: 'synced',
          conflictStatus: 'none',
          receiptHash: 'hash-8a92bc110f',
        },
        {
          id: 'sub-102',
          assignmentId: 'assign-2',
          assignmentTitle: 'Offline Transaction Log Architecture',
          studentName: 'Asala Student',
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
