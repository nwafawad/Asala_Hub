'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/db';
import { api } from '@/lib/api';
import { mapSubmissionReadToCached } from '@/lib/mappers';
import { SubmissionReadDTO } from '@/types/api';
import { useI18n } from '@/context/I18nContext';
import {
  Activity,
  Users,
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  Layers,
} from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export const PerformanceDashboard: React.FC = () => {
  const { t } = useI18n();
  const [stats, setStats] = useState({
    totalEnrolled: 0,
    avgCompletion: 0,
    passRate: 0,
    pendingGrading: 0,
    gradeDist: [
      { range: '90-100% (A)', count: 0, percentage: 0 },
      { range: '80-89% (B)', count: 0, percentage: 0 },
      { range: '70-79% (C)', count: 0, percentage: 0 },
      { range: '<70% (Needs Revision)', count: 0, percentage: 0 },
    ],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setIsLoading(true);
      // 1. Instant Load from IndexedDB cache
      let [enrollments, submissions, modules] = await Promise.all([
        db.cohortEnrollments.toArray(),
        db.cachedSubmissions.toArray(),
        db.cachedModules.toArray(),
      ]);

      const calculateAndSetStats = (currentEnrollments: typeof enrollments, currentSubs: typeof submissions, currentMods: typeof modules) => {
        const totalStudents = currentEnrollments.length;
        const graded = currentSubs.filter(s => s.score !== undefined && s.score !== null);
        const pending = currentSubs.length - graded.length;

        let aCount = 0, bCount = 0, cCount = 0, fCount = 0;
        graded.forEach(s => {
          const pct = ((s.score || 0) / (s.maxScore || 100)) * 100;
          if (pct >= 90) aCount++;
          else if (pct >= 80) bCount++;
          else if (pct >= 70) cCount++;
          else fCount++;
        });

        const totalGraded = graded.length;
        const passRate = totalGraded > 0 ? Math.round(((aCount + bCount + cCount) / totalGraded) * 100) : 0;
        const completedMods = currentMods.filter(m => m.isCompleted).length;
        const totalMods = currentMods.length;
        const avgCompletion = totalMods > 0 ? Math.round((completedMods / totalMods) * 100) : 0;

        setStats({
          totalEnrolled: totalStudents,
          avgCompletion,
          passRate,
          pendingGrading: pending,
          gradeDist: [
            { range: '90-100% (A)', count: aCount, percentage: totalGraded > 0 ? Math.round((aCount / totalGraded) * 100) : 0 },
            { range: '80-89% (B)', count: bCount, percentage: totalGraded > 0 ? Math.round((bCount / totalGraded) * 100) : 0 },
            { range: '70-79% (C)', count: cCount, percentage: totalGraded > 0 ? Math.round((cCount / totalGraded) * 100) : 0 },
            { range: '<70% (Needs Revision)', count: fCount, percentage: totalGraded > 0 ? Math.round((fCount / totalGraded) * 100) : 0 },
          ],
        });
      };

      calculateAndSetStats(enrollments, submissions, modules);
      setIsLoading(false);

      // 2. Background sync with server API if online
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await api.get('/assignments/my-submissions', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null);
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const cachedSubs = res.data.map((s: SubmissionReadDTO) => mapSubmissionReadToCached(s));
            await db.cachedSubmissions.bulkPut(cachedSubs);

            const updatedSubs = await db.cachedSubmissions.toArray();
            calculateAndSetStats(enrollments, updatedSubs, modules);
          }
        } catch (syncErr) {
          // Suppress sync errors in background
        }
      }
    } catch (err) {
      console.error('Error loading performance analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.educator?.analytics?.title || 'Cohort Performance Dashboard'}
            </h2>
            <InfoTooltip
              title="Low-Power Render Engine"
              content="Flat CSS and SVG graphics rendering engine optimized for low-power offline hardware."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.educator?.analytics?.subtitle ||
              'Low-power offline analytics rendering completion rates and score distributions.'}
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title={t.educator?.analytics?.totalEnrolled || 'Total Enrolled Students'}
          value={stats.totalEnrolled}
          subtitle="Across assigned cohorts"
          icon={Users}
        />
        <StatCard
          title={t.educator?.analytics?.avgCompletion || 'Avg Course Completion'}
          value={`${stats.avgCompletion}%`}
          subtitle="IndexedDB Module Progress"
          icon={TrendingUp}
        />
        <StatCard
          title={t.educator?.analytics?.passRate || 'Cohort Pass Rate'}
          value={`${stats.passRate}%`}
          subtitle="Graded Submissions >= 70%"
          icon={Award}
        />
        <StatCard
          title={t.educator?.analytics?.pendingGrading || 'Pending Submissions'}
          value={stats.pendingGrading}
          subtitle="Awaiting Educator Review"
          icon={Clock}
        />
      </div>

      {/* Low-Power Flat CSS/SVG Chart Section */}
      <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold font-heading text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              {t.educator?.analytics?.gradeDistribution || 'Grade Distribution Breakdown'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Flat, lightweight CSS bars optimized for low-power campus hardware.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-muted-foreground px-2.5 py-1 rounded-lg bg-muted">
            GPU Acceleration Off
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {stats.gradeDist.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-foreground">{item.range}</span>
                <span className="font-mono text-muted-foreground font-bold">
                  {item.count} students ({item.percentage}%)
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(item.percentage, 5)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
