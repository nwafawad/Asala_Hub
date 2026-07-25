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
  updatedAt: string;
}

export interface CachedSubmission {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  studentName: string;
  content: string;
  submittedAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
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
