import Dexie, { Table } from 'dexie';

// Institutional tables
export interface LocalCourse {
  id: string;
  title: string;
  description: string;
  educatorId: string;
  colorIndex: number; // 0-5 for flat color header
  createdAt: string;
  updatedAt: string;
}

export interface LocalModule {
  id: string;
  courseId: string;
  title: string;
  contentType: 'text' | 'video' | 'audio';
  content: string;
  orderIndex: number;
  isCached: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocalAssignment {
  id: string;
  courseId: string;
  title: string;
  description: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  content: string;
  submittedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'draft' | 'queued';
  grade: number | null;
  gradedBy: 'instructor' | 'system' | null;
  versions: { content: string; savedAt: string }[];
  createdAt: string;
  updatedAt: string;
}

export interface LocalLesson {
  id: string;
  courseId: string;
  title: string;
  status: 'draft' | 'published';
  blocks: LessonBlock[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface LessonBlock {
  id: string;
  type: 'text' | 'audio' | 'quiz';
  content: string;
  options?: string[]; // for quiz
  correctAnswer?: number; // for quiz
}

export interface LocalGrade {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  score: number | null;
  syncStatus: 'synced' | 'pending' | 'conflict';
  conflictValue?: number;
  updatedAt: string;
}

// Marketplace tables
export interface LocalMasterclass {
  id: string;
  title: string;
  description: string;
  creatorId: string;
  creatorName: string;
  creatorBio: string;
  category: 'history' | 'music' | 'crafts' | 'storytelling';
  price: number;
  currency: string;
  colorIndex: number;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
}

export interface LocalCartItem {
  id: string;
  masterclassId: string;
  addedAt: string;
}

export interface LocalOrder {
  id: string;
  items: { masterclassId: string; title: string; price: number; currency: string }[];
  total: number;
  currency: string;
  referenceNumber: string;
  status: 'completed' | 'pending' | 'refunded';
  createdAt: string;
}

export interface LocalTransaction {
  id: string;
  masterclassId: string;
  masterclassTitle: string;
  buyerName: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'refunded';
  createdAt: string;
}

// Sync tables
export interface LocalTransactionLog {
  id: string;
  userId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  clientTimestamp: string;
  syncedAt: string | null;
  retryCount: number;
  errorMessage: string | null;
}

// App state
export interface AppStateEntry {
  key: string;
  value: string;
}

export class AsalaDatabase extends Dexie {
  courses!: Table<LocalCourse, string>;
  modules!: Table<LocalModule, string>;
  assignments!: Table<LocalAssignment, string>;
  submissions!: Table<LocalSubmission, string>;
  lessons!: Table<LocalLesson, string>;
  grades!: Table<LocalGrade, string>;
  masterclasses!: Table<LocalMasterclass, string>;
  cartItems!: Table<LocalCartItem, string>;
  orders!: Table<LocalOrder, string>;
  transactions!: Table<LocalTransaction, string>;
  transactionLogs!: Table<LocalTransactionLog, string>;
  appState!: Table<AppStateEntry, string>;

  constructor() {
    super('AsalaHubDB');
    this.version(1).stores({
      courses: 'id, title, updatedAt',
      modules: 'id, courseId, orderIndex, updatedAt',
      assignments: 'id, courseId, dueDate',
      submissions: 'id, assignmentId, studentId, syncStatus',
      lessons: 'id, courseId, orderIndex, status',
      grades: 'id, assignmentId, studentId, syncStatus',
      masterclasses: 'id, category, creatorId, status',
      cartItems: 'id, masterclassId',
      orders: 'id, status, createdAt',
      transactions: 'id, masterclassId, status, createdAt',
      transactionLogs: 'id, userId, entityType, entityId, clientTimestamp, syncedAt',
      appState: 'key',
    });
  }
}

export const db = new AsalaDatabase();
