import { api } from './api';
import { db } from './db';
import { mapCourseReadToCached, mapModuleReadToCached, mapSubmissionReadToCached } from './mappers';
import { CourseReadDTO, ModuleReadDTO, SubmissionReadDTO } from '@/types/api';

import { notifyStorageUpdated } from './events';

let lastRehydrateTime = 0;
const REHYDRATE_THROTTLE_MS = 10_000; // 10s throttle window to eliminate duplicate network bursts

/**
 * Rehydrates local IndexedDB caches (cachedCourses, cachedModules, cachedSubmissions)
 * from server API endpoints using parallel network requests and atomic Dexie transactions.
 */
export async function rehydrateStorage(force = false): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  const now = Date.now();
  if (!force && now - lastRehydrateTime < REHYDRATE_THROTTLE_MS) {
    return;
  }
  lastRehydrateTime = now;

  try {
    const [resCourses, resSubs] = await Promise.all([
      api.get('/courses/', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null),
      api.get('/assignments/my-submissions', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null),
    ]);

    // Fetch modules for each course in parallel
    let allModules: ReturnType<typeof mapModuleReadToCached>[] = [];
    if (resCourses?.data && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
      const moduleResponses = await Promise.all(
        resCourses.data.map((c: CourseReadDTO) =>
          api
            .get(`/courses/${c.id}/modules`, { headers: { 'X-Suppress-401-Event': 'true' } })
            .catch(() => null)
        )
      );

      for (const modRes of moduleResponses) {
        if (modRes?.data && Array.isArray(modRes.data)) {
          const mapped = modRes.data.map((m: ModuleReadDTO) => mapModuleReadToCached(m));
          allModules = allModules.concat(mapped);
        }
      }
    }

    await db.transaction('rw', [db.cachedCourses, db.cachedModules, db.cachedSubmissions], async () => {
      if (resCourses?.data && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
        const freshCourses = resCourses.data.map((c: CourseReadDTO) => mapCourseReadToCached(c));
        const existingCourses = await db.cachedCourses.bulkGet(freshCourses.map(c => c.id));
        const mergedCourses = freshCourses.map((course, idx) => {
          const existing = existingCourses[idx];
          // Preserve locally-tracked offline caching state — the server has no concept of it
          return existing
            ? { ...course, isCachedOffline: existing.isCachedOffline, sizeMb: existing.sizeMb }
            : course;
        });
        await db.cachedCourses.bulkPut(mergedCourses);
      }

      if (allModules.length > 0) {
        const existingModules = await db.cachedModules.bulkGet(allModules.map(m => m.id));
        const mergedModules = allModules.map((mod, idx) => {
          const existing = existingModules[idx];
          // Preserve locally-cached offline content & progress — the server response doesn't carry it
          return existing
            ? {
                ...mod,
                isCachedOffline: existing.isCachedOffline,
                sizeMb: existing.sizeMb,
                isCompleted: existing.isCompleted,
                userNotes: existing.userNotes,
                audioArrayBuffer: existing.audioArrayBuffer,
                videoOfflineText: existing.videoOfflineText,
                attachmentFile: existing.attachmentFile,
              }
            : mod;
        });
        await db.cachedModules.bulkPut(mergedModules);
      }

      if (resSubs?.data && Array.isArray(resSubs.data) && resSubs.data.length > 0) {
        const freshSubs = resSubs.data.map((s: SubmissionReadDTO) => mapSubmissionReadToCached(s));
        const existingSubs = await db.cachedSubmissions.bulkGet(freshSubs.map(s => s.id));
        const mergedSubs = freshSubs.map((sub, idx) => {
          const existing = existingSubs[idx];
          // Preserve local draft history / conflict metadata that the server doesn't return
          return existing
            ? {
                ...sub,
                attachments: existing.attachments,
                draftHistory: existing.draftHistory,
                deviceConflictDrafts: existing.deviceConflictDrafts,
                conflictStatus: existing.conflictStatus,
                receiptHash: existing.receiptHash,
              }
            : sub;
        });
        await db.cachedSubmissions.bulkPut(mergedSubs);
      }
    });
    notifyStorageUpdated();
  } catch (err) {
    console.warn('Automatic storage re-hydration notice:', err);
  }
}

