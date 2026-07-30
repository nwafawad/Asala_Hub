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
    const courseCount = await db.cachedCourses.count();
    const subCount = await db.cachedSubmissions.count();

    const res = await api.get('/courses/').catch(() => null);
    if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
      const cachedCourses = res.data.map((c: CourseReadDTO) => mapCourseReadToCached(c));
      await db.cachedCourses.bulkPut(cachedCourses);
    }

    if (subCount === 0) {
      const res = await api.get('/assignments/my-submissions').catch(() => null);
      if (res?.data && Array.isArray(res.data)) {
        const cachedSubs = res.data.map((s: SubmissionReadDTO) => mapSubmissionReadToCached(s));
        await db.cachedSubmissions.bulkPut(cachedSubs);
      }
    }
  } catch (err) {
    console.warn('Automatic storage re-hydration notice:', err);
  }
}
