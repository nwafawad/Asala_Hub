import { useState, useEffect, useCallback } from 'react';
import { db, seedInitialMockData, type CachedCourse, type CachedModule, type TransactionLogItem } from '@/lib/db';
import { DashboardStats } from '@/types/dashboard';
import { api } from '@/lib/api';
import { mapCourseReadToCached, mapSubmissionReadToCached } from '@/lib/mappers';
import { CourseReadDTO, SubmissionReadDTO } from '@/types/api';

export function useDashboardData() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<DashboardStats>({
    courseCount: 0,
    completedModules: 0,
    totalModules: 0,
    submissionCount: 0,
    completionRate: 0,
  });
  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [assignments, setAssignments] = useState<CachedModule[]>([]);
  const [recentLogs, setRecentLogs] = useState<TransactionLogItem[]>([]);

  const loadData = useCallback(async () => {
    try {
      await seedInitialMockData();
      // 1. Instant Load from IndexedDB cache
      let [cList, mList, logsList, subCount] = await Promise.all([
        db.cachedCourses.toArray(),
        db.cachedModules.toArray(),
        db.transactionLogs.toArray(),
        db.cachedSubmissions.count(),
      ]);

      let completedCount = mList.filter(m => m.isCompleted).length;
      let totalCount = mList.length;
      let rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

      setCourses(cList);
      setAssignments(mList.filter(m => m.type === 'assignment'));
      setRecentLogs(logsList.slice(-3).reverse());
      setStats({
        courseCount: cList.length,
        completedModules: completedCount,
        totalModules: totalCount,
        submissionCount: subCount,
        completionRate: rate,
      });

      // 2. Background sync with backend API if online
      if (typeof window !== 'undefined' && navigator.onLine) {
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

          // Re-fetch updated IndexedDB data for UI
          const [updatedCourses, updatedSubCount] = await Promise.all([
            db.cachedCourses.toArray(),
            db.cachedSubmissions.count(),
          ]);

          setCourses(updatedCourses);
          setStats(prev => ({
            ...prev,
            courseCount: updatedCourses.length,
            submissionCount: updatedSubCount,
          }));
        } catch (syncErr) {
          // Suppress sync errors in background
        }
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    stats,
    courses,
    assignments,
    recentLogs,
    refreshDashboard: loadData,
  };
}
