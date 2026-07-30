'use client';

import React from 'react';
import { useSync } from '@/context/SyncContext';
import { StatCard } from '@/components/ui/StatCard';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { BookOpen, FileText, CheckCircle2, Award, Clock, ArrowRight, Play, Sparkles } from 'lucide-react';
import { DashboardViewProps } from '@/types/dashboard';
import { useDashboardData } from '@/hooks/useDashboardData';

export const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  isOnline,
  t,
  onNavigate,
}) => {
  const { pendingCount, pendingSubmissionsCount } = useSync();
  const { isLoading, stats, courses, assignments, recentLogs } = useDashboardData();
  const activeCourse = courses[0];

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Greeting Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              Welcome back, {user?.fullName || 'Student'} 👋
            </h2>
            <InfoTooltip
              title={isOnline ? 'Network Connected' : 'Campus Intranet Offline'}
              content={
                isOnline
                  ? 'Connected to central server. All progress and drafts automatically sync in real-time.'
                  : 'Operating offline. Your progress, drafts, and notes are securely saved locally to your device.'
              }
              position="bottom"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Track your course progress, upcoming assignment deadlines, and offline study materials.
          </p>
        </div>
      </div>

      {/* Hero Card: "Continue Learning" Quick-Resume Trigger */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shrink-0">
            <Play className="w-6 h-6 rtl:rotate-180" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                {activeCourse ? activeCourse.code : 'COURSE CATALOG'}
              </span>
              <span className="text-xs text-muted-foreground">Active Learning Workspace</span>
            </div>
            <h3 className="text-lg font-bold font-heading text-foreground">
              {activeCourse ? activeCourse.title : 'Explore Available Campus Courses'}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {activeCourse
                ? `Educator: ${activeCourse.educatorName} · ${activeCourse.moduleCount || 0} Modules Available`
                : 'Connect to campus network or sync offline modules to begin studying.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => onNavigate('courses')}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start md:self-center shrink-0"
        >
          <span>{activeCourse ? 'Continue Reading' : 'Browse Courses'}</span>
          <ArrowRight className="w-4 h-4 rtl:rotate-180" />
        </button>
      </div>

      {/* Live Student Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title={t.stats.totalCourses}
              value={stats.courseCount}
              subtitle="Enrolled active courses"
              icon={BookOpen}
              trend={{
                value: courses.length > 0 ? courses.map(c => c.code).join(', ') : 'No Courses',
                isPositive: courses.length > 0,
              }}
            />
            <StatCard
              title="Overall Completion"
              value={`${stats.completionRate}%`}
              subtitle={`${stats.completedModules} of ${stats.totalModules} modules completed`}
              icon={CheckCircle2}
              trend={{ value: `${stats.completedModules} Completed`, isPositive: true }}
            />
            <StatCard
              title="Submitted Assignments"
              value={stats.submissionCount}
              subtitle={
                pendingSubmissionsCount > 0 || pendingCount > 0
                  ? `${pendingSubmissionsCount} submission / ${pendingCount} tx pending`
                  : 'All submissions synced'
              }
              icon={FileText}
              trend={{
                value: pendingSubmissionsCount > 0 ? `${pendingSubmissionsCount} pending` : 'Synced',
                isPositive: pendingSubmissionsCount === 0,
              }}
            />
            <StatCard
              title="Academic Standing"
              value="Active"
              subtitle="Connected to Asala Campus Hub"
              icon={Award}
              trend={{ value: 'Good Standing', isPositive: true }}
            />
          </>
        )}
      </div>

      {/* Upcoming Assignments & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Deadlines Widget */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              Upcoming Assignment Deadlines
            </h3>
            <button
              onClick={() => onNavigate('assignments')}
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              View All Workspace
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {assignments.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                No active assignment deadlines pending.
              </div>
            ) : (
              assignments.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                        ASSIGNMENT
                      </span>
                      <span className="text-xs font-semibold text-foreground">{item.title}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      Due: {item.dueDate || '2026-08-30'} · {item.points || 100} Points
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigate('assignments')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0 self-start sm:self-center"
                  >
                    <span>Open Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Student Activity Timeline */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Recent Sync Activity
            </h3>
          </div>

          <div className="flex flex-col gap-3">
            {recentLogs.length === 0 ? (
              <div className="text-xs text-muted-foreground italic py-2">
                No recent offline transactions recorded.
              </div>
            ) : (
              recentLogs.map((log, idx) => (
                <div key={log.id || idx} className="flex items-start gap-3 text-xs">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-foreground">{log.action}</span>
                    <span className="text-muted-foreground text-[11px]">
                      Entity: {log.entityType} ({log.status})
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
