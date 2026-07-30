import { api } from './api';
import { db } from './db';
import { mapCourseReadToCached, mapSubmissionReadToCached } from './mappers';
import { CourseReadDTO, SubmissionReadDTO } from '@/types/api';

/**
 * Rehydrates local IndexedDB caches (cachedCourses, cachedSubmissions)
 * from server API endpoints if tables are empty (e.g. after storage eviction).
 */
export async function rehydrateStorage(): Promise<void> {
  if (typeof window === 'undefined' || !navigator.onLine) return;

  try {
    const resCourses = await api.get('/courses/', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null);
    if (resCourses?.data && Array.isArray(resCourses.data) && resCourses.data.length > 0) {
      const cachedCourses = resCourses.data.map((c: CourseReadDTO) => mapCourseReadToCached(c));
      await db.cachedCourses.bulkPut(cachedCourses);
    }

    const resSubs = await api.get('/assignments/my-submissions', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null);
    if (resSubs?.data && Array.isArray(resSubs.data) && resSubs.data.length > 0) {
      const cachedSubs = resSubs.data.map((s: SubmissionReadDTO) => mapSubmissionReadToCached(s));
      await db.cachedSubmissions.bulkPut(cachedSubs);
    }
  } catch (err) {
    console.warn('Automatic storage re-hydration notice:', err);
  }
}
