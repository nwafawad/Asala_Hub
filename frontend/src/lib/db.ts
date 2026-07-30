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
    | 'CREATE_ASSIGNMENT'
    | 'UPDATE_ASSIGNMENT'
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
  isGradedAssignment?: boolean;
}

export interface AssignmentSchema {
  instructions: string;
  instructionsAr?: string;
  submissionMethod?: 'online_text' | 'file_upload' | 'graded_quiz';
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

/** Discriminate helper function to check if a module item is a gradable assignment */
export function isAssignmentModule(module: CachedModule): boolean {
  return module.type === 'assignment' || (module.type === 'quiz' && Boolean(module.quizSchema?.isGradedAssignment));
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
    // Session role verification
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

    // Seed sample courses and modules if local IndexedDB is empty
    const courseCount = await db.cachedCourses.count();
    if (courseCount === 0) {
      const sampleCourses: CachedCourse[] = [
        {
          id: 'course-cs101',
          title: 'Introduction to Web Development & System Architecture',
          titleAr: 'مقدمة في تطوير الويب وهندسة الأنظمة',
          code: 'CS101',
          educatorName: 'Dr. Sarah Al-Mansoor',
          moduleCount: 5,
          isCachedOffline: true,
          sizeMb: 14.2,
          updatedAt: new Date().toISOString(),
        },
      ];
      await db.cachedCourses.bulkPut(sampleCourses);

      const sampleModules: CachedModule[] = [
        {
          id: 'mod-1',
          courseId: 'course-cs101',
          title: 'Welcome & Course Syllabus Overview',
          titleAr: 'مرحباً بك ونظرة عامة على المنهج',
          type: 'syllabus',
          sequenceOrder: 1,
          isCachedOffline: true,
          sizeMb: 0.5,
          content: `Welcome to CS101!\n\nIn this course, you will learn web application architecture, offline-first engineering, and responsive UI components.\n\nLearning Objectives:\n1. Understand HTML5, CSS3, and modern TypeScript.\n2. Master client-side storage with IndexedDB and offline transaction logs.\n3. Embed YouTube video playback portals and audio lectures.\n4. Design interactive quizzes and assignments.`,
          durationMinutes: 10,
        },
        {
          id: 'mod-2',
          courseId: 'course-cs101',
          title: 'Video Lecture: Web Application Architecture & Components',
          titleAr: 'محاضرة فيديو: هندسة تطبيقات الويب والمكونات',
          type: 'video',
          sequenceOrder: 2,
          isCachedOffline: true,
          sizeMb: 4.5,
          content: 'Interactive Video Lecture covering web application design and offline-first storage.',
          videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          videoOfflineText: `Key Concepts Covered in Video:\n• Client-Server architecture and API contracts.\n• Offline-First caching with Service Workers and IndexedDB.\n• Event-driven state management and dynamic UI rendering.\n• YouTube video embedding and responsive player controls.`,
          durationMinutes: 25,
        },
        {
          id: 'mod-3',
          courseId: 'course-cs101',
          title: 'Audio Lecture: Principles of Offline-First Engineering',
          titleAr: 'محاضرة صوتية: مبادئ الهندسة المستقلة عن الاتصال',
          type: 'audio',
          sequenceOrder: 3,
          isCachedOffline: true,
          sizeMb: 3.2,
          content: 'Listen to the audio breakdown on building resilient applications.',
          audioUrl: 'https://actions.google.com/sounds/v1/ambiences/rain_heavy.ogg',
          durationMinutes: 15,
        },
        {
          id: 'mod-4',
          courseId: 'course-cs101',
          title: 'Interactive Knowledge Check: Web Basics Quiz',
          titleAr: 'اختبار التقييم التفاعلي: أساسيات الويب',
          type: 'quiz',
          sequenceOrder: 4,
          isCachedOffline: true,
          sizeMb: 0.8,
          content: 'Test your understanding of Web Architecture, TypeScript, and IndexedDB.',
          durationMinutes: 15,
          quizSchema: {
            passingScorePercentage: 70,
            allowRetries: true,
            questions: [
              {
                id: 'q1',
                type: 'multiple_choice',
                prompt: 'Which browser API provides high-capacity, structured offline storage?',
                promptAr: 'ما هي واجهة برمجة تطبيقات المتصفح التي توفر تخزيناً محلياً عالياً وسريعاً؟',
                points: 10,
                options: [
                  { id: 'opt1', text: 'IndexedDB', textAr: 'IndexedDB', isCorrect: true },
                  { id: 'opt2', text: 'Cookies (4KB Limit)', textAr: 'الملفات النصية المؤقتة', isCorrect: false },
                  { id: 'opt3', text: 'RAM Memory only', textAr: 'ذاكرة الوصول العشوائي فقط', isCorrect: false },
                ],
              },
              {
                id: 'q2',
                type: 'multiple_choice',
                prompt: 'What HTTP status code indicates a successful GET request?',
                promptAr: 'ما هو رمز حالة HTTP الذي يمثل استجابة ناجحة؟',
                points: 10,
                options: [
                  { id: 'opt1', text: '200 OK', textAr: '200 OK', isCorrect: true },
                  { id: 'opt2', text: '404 Not Found', textAr: '404 Not Found', isCorrect: false },
                  { id: 'opt3', text: '500 Server Error', textAr: '500 Server Error', isCorrect: false },
                ],
              },
            ],
          },
        },
        {
          id: 'mod-5',
          courseId: 'course-cs101',
          title: 'Assignment #1: Building a Dynamic Web Component',
          titleAr: 'الواجب الأول: بناء مكون ويب تفاعلي',
          type: 'assignment',
          sequenceOrder: 5,
          isCachedOffline: true,
          sizeMb: 1.2,
          content: 'Create a responsive web component adhering to offline standards.',
          points: 100,
          dueDate: '2026-08-15',
          assignmentId: 'assign-mod-5',
          assignmentSchema: {
            instructions: 'Implement a modern web application component adhering to accessibility and offline design standards. Submit your solution file or zip package.',
            instructionsAr: 'قم بإنشاء مكون تفاعلي بتصميم عصري ومتجاوب مع معايير إمكانية الوصول والتخزين المحلي. قم برفع الحل في الملف المخصص.',
            allowedFileTypes: ['pdf', 'zip', 'docx'],
            maxFileSizeMb: 10,
          },
        },
      ];
      await db.cachedModules.bulkPut(sampleModules);
    }
  } catch (err) {
    console.warn('Error initializing database:', err);
  }
}

// Backwards-compatibility alias for initializeDatabase
export const seedInitialMockData = initializeDatabase;


