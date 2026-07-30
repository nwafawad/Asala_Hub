import { useState, useEffect, useCallback } from 'react';
import { db, seedInitialMockData, type CachedCourse, type CachedModule, type TransactionLogItem } from '@/lib/db';
import { DashboardStats } from '@/types/dashboard';
import { rehydrateStorage } from '@/lib/rehydrate';

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

      // 2. Background sync with backend API if online (via shared rehydration helper)
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          await rehydrateStorage();

          // Re-read all tables so module stats and assignment list reflect server data
          const [updatedCourses, updatedModules, updatedSubCount] = await Promise.all([
            db.cachedCourses.toArray(),
            db.cachedModules.toArray(),
            db.cachedSubmissions.count(),
          ]);

          const updatedCompleted = updatedModules.filter(m => m.isCompleted).length;
          const updatedTotal = updatedModules.length;

          setCourses(updatedCourses);
          setAssignments(updatedModules.filter(m => m.type === 'assignment'));
          setStats(prev => ({
            ...prev,
            courseCount: updatedCourses.length,
            totalModules: updatedTotal,
            completedModules: updatedCompleted,
            completionRate: updatedTotal > 0 ? Math.round((updatedCompleted / updatedTotal) * 100) : 0,
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
