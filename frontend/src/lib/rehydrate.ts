import { api } from './api';
import { db } from './db';
import { mapCourseReadToCached, mapSubmissionReadToCached } from './mappers';
import { CourseReadDTO, SubmissionReadDTO } from '@/types/api';

let lastRehydrateTime = 0;
const REHYDRATE_THROTTLE_MS = 10_000; // 10s throttle window to eliminate duplicate network bursts

/**
 * Rehydrates local IndexedDB caches (cachedCourses, cachedSubmissions)
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

    await db.transaction('rw', [db.cachedCourses, db.cachedSubmissions], async () => {
      if (resCourses?.data && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
        const cachedCourses = resCourses.data.map((c: CourseReadDTO) => mapCourseReadToCached(c));
        await db.cachedCourses.bulkPut(cachedCourses);
      }

      if (resSubs?.data && Array.isArray(resSubs.data) && resSubs.data.length > 0) {
        const cachedSubs = resSubs.data.map((s: SubmissionReadDTO) => mapSubmissionReadToCached(s));
        await db.cachedSubmissions.bulkPut(cachedSubs);
      }
    });
  } catch (err) {
    console.warn('Automatic storage re-hydration notice:', err);
  }
}
