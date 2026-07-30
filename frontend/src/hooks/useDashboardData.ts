import { useState, useEffect, useCallback } from 'react';
import { db, seedInitialMockData, type CachedCourse, type CachedModule, type TransactionLogItem } from '@/lib/db';
import { DashboardStats } from '@/types/dashboard';

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
      const [cList, mList, logsList, subCount] = await Promise.all([
        db.cachedCourses.toArray(),
        db.cachedModules.toArray(),
        db.transactionLogs.toArray(),
        db.cachedSubmissions.count(),
      ]);

      const completedCount = mList.filter(m => m.isCompleted).length;
      const totalCount = mList.length;
      const rate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
