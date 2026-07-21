import { db, LocalCourse, LocalModule, LocalSubmission, LocalTransactionLog } from "./db";
import { CourseRead, ModuleRead, ModuleSyllabusRead } from "./api";

/**
 * Submit an assignment offline, saving the submission locally in Dexie
 * and logging a transaction log entry in an atomic transaction.
 */
export async function submitAssignmentOffline(params: {
  assignmentId: string;
  studentId: string;
  content: string;
}): Promise<LocalSubmission> {
  const submissionId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  const newSubmission: LocalSubmission = {
    id: submissionId,
    assignment_id: params.assignmentId,
    student_id: params.studentId,
    content: params.content,
    submitted_at: timestamp,
    sync_status: "pending",
    created_at: timestamp,
    updated_at: timestamp,
  };

  const transactionLog: LocalTransactionLog = {
    id: crypto.randomUUID(),
    user_id: params.studentId,
    entity_type: "submission",
    entity_id: submissionId,
    action: "CREATE",
    payload: {
      id: submissionId,
      assignment_id: params.assignmentId,
      student_id: params.studentId,
      content: params.content,
      submitted_at: timestamp,
    },
    client_timestamp: timestamp,
    synced_at: null,
    retry_count: 0,
  };

  await db.transaction("rw", [db.submissions, db.transactionLogs], async () => {
    await db.submissions.put(newSubmission);
    await db.transactionLogs.put(transactionLog);
  });

  return newSubmission;
}

/**
 * Cache fetched courses in Dexie for offline access.
 */
export async function cacheCoursesLocally(courses: CourseRead[]): Promise<void> {
  if (typeof window === "undefined" || !courses.length) return;

  const localCourses: LocalCourse[] = courses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    educator_id: c.educator_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  await db.courses.bulkPut(localCourses);
}

/**
 * Get locally cached courses from Dexie.
 */
export async function getLocalCourses(): Promise<CourseRead[]> {
  if (typeof window === "undefined") return [];
  const items = await db.courses.toArray();
  return items.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    educator_id: c.educator_id,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));
}

/**
 * Cache fetched full module in Dexie for offline access.
 */
export async function cacheModuleLocally(moduleData: ModuleRead): Promise<void> {
  if (typeof window === "undefined" || !moduleData) return;

  const localModule: LocalModule = {
    id: moduleData.id,
    course_id: moduleData.course_id,
    title: moduleData.title,
    content_type: moduleData.content_type,
    content: moduleData.content,
    order_index: moduleData.order_index,
    created_at: moduleData.created_at,
    updated_at: moduleData.updated_at,
  };

  await db.modules.put(localModule);
}

/**
 * Cache syllabus module list locally in Dexie.
 */
export async function cacheSyllabusLocally(
  courseId: string,
  syllabusItems: ModuleSyllabusRead[]
): Promise<void> {
  if (typeof window === "undefined" || !syllabusItems.length) return;

  const existingModules = await db.modules.where("course_id").equals(courseId).toArray();
  const existingMap = new Map(existingModules.map((m) => [m.id, m]));

  const localModules: LocalModule[] = syllabusItems.map((item) => {
    const existing = existingMap.get(item.id);
    return {
      id: item.id,
      course_id: item.course_id,
      title: item.title,
      content_type: item.content_type,
      content: existing ? existing.content : "",
      order_index: item.order_index,
      created_at: item.created_at,
      updated_at: item.updated_at,
    };
  });

  await db.modules.bulkPut(localModules);
}

/**
 * Get locally cached module syllabus for a course.
 */
export async function getLocalSyllabus(courseId: string): Promise<ModuleSyllabusRead[]> {
  if (typeof window === "undefined") return [];
  const items = await db.modules.where("course_id").equals(courseId).sortBy("order_index");
  return items.map((m) => ({
    id: m.id,
    course_id: m.course_id,
    title: m.title,
    content_type: m.content_type,
    order_index: m.order_index,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));
}

/**
 * Get locally cached full module detail by courseId and moduleId.
 */
export async function getLocalModule(courseId: string, moduleId: string): Promise<ModuleRead | null> {
  if (typeof window === "undefined") return null;
  const item = await db.modules.get(moduleId);
  if (!item || item.course_id !== courseId) return null;
  return {
    id: item.id,
    course_id: item.course_id,
    title: item.title,
    content_type: item.content_type,
    content: item.content,
    order_index: item.order_index,
    created_at: item.created_at,
    updated_at: item.updated_at,
  };
}

/**
 * Clear user mutation queue and runtime Cache Storage on logout to avoid cross-user data leakage.
 */
export async function clearUserOfflineData(): Promise<void> {
  if (typeof window === "undefined") return;

  await db.transaction("rw", [db.submissions, db.transactionLogs], async () => {
    await db.submissions.clear();
    await db.transactionLogs.clear();
  });

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      for (const key of keys) {
        if (key.includes("api-course-cache")) {
          await caches.delete(key);
        }
      }
    } catch (err) {
      console.warn("Could not clear Cache Storage on logout:", err);
    }
  }
}

/**
 * Remove transaction logs that have exceeded max retry attempts.
 */
export async function clearFailedTransactions(maxRetries = 5): Promise<number> {
  if (typeof window === "undefined") return 0;

  const failed = await db.transactionLogs.filter((log) => log.retry_count >= maxRetries).toArray();
  const failedIds = failed.map((f) => f.id);

  if (failedIds.length > 0) {
    await db.transactionLogs.bulkDelete(failedIds);
  }
  return failedIds.length;
}

/**
 * Estimate browser storage quota and usage for health monitoring.
 */
export async function getStorageEstimate(): Promise<{ quotaMB: number; usageMB: number; percentUsed: number } | null> {
  if (typeof window !== "undefined" && navigator.storage && navigator.storage.estimate) {
    try {
      const { quota, usage } = await navigator.storage.estimate();
      if (quota && usage !== undefined) {
        const quotaMB = Math.round(quota / (1024 * 1024));
        const usageMB = Math.round(usage / (1024 * 1024));
        const percentUsed = Math.round((usage / quota) * 100);
        return { quotaMB, usageMB, percentUsed };
      }
    } catch {
      return null;
    }
  }
  return null;
}
