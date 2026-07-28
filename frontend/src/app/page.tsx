'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { CourseBrowser } from '@/components/student/CourseBrowser';
import { AssignmentWorkspace } from '@/components/student/AssignmentWorkspace';
import { ProgressTracker } from '@/components/student/ProgressTracker';
import { CourseBuilder } from '@/components/educator/CourseBuilder';
import { GradeBook } from '@/components/educator/GradeBook';
import { CohortRoster } from '@/components/educator/CohortRoster';
import { PerformanceDashboard } from '@/components/educator/PerformanceDashboard';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';
import { startViewTransition } from '@/lib/view-transition';
import { isEducatorUser } from '@/lib/utils';
import { SettingsView } from '@/components/shell/SettingsView';
import { db, seedInitialMockData } from '@/lib/db';
import { BookOpen, FileText, CheckCircle2, Award, Clock, ArrowRight, Play, Sparkles, Layers } from 'lucide-react';

import { SyncQueueView } from '@/components/student/SyncQueueView';

import { useSearchParams, useRouter } from 'next/navigation';
import { AppShellSkeleton } from '@/components/ui/Skeletons';

export default function Home() {
  return (
    <React.Suspense fallback={<AppShellSkeleton />}>
      <HomeContent />
    </React.Suspense>
  );
}

function HomeContent() {
  const { t, language } = useI18n();
  const { isAuthenticated, user, isRestoring } = useAuth();
  const { isOnline } = useSync();
  const { showToast } = useOverlay();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overrideTab, setOverrideTabState] = useState<string | null>(null);

  const isEducator = isEducatorUser(user);

  const [stats, setStats] = useState({
    courseCount: 2,
    completedModules: 3,
    totalModules: 8,
    submissionCount: 2,
    completionRate: 38,
  });

  useEffect(() => {
    async function loadDashboardData() {
      try {
        await seedInitialMockData();
        const courseCount = await db.cachedCourses.count();
        const moduleCount = await db.cachedModules.count();
        const subCount = await db.cachedSubmissions.count();

        setStats({
          courseCount: courseCount || 2,
          completedModules: 3,
          totalModules: moduleCount || 8,
          submissionCount: subCount || 2,
          completionRate: Math.round((3 / (moduleCount || 8)) * 100),
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const handleTabNavigate = (tab: string, setActiveTab?: (t: string) => void) => {
    if (setActiveTab) setActiveTab(tab);
    if (isEducator) {
      localStorage.setItem('asala_educator_tab', tab);
    } else {
      localStorage.setItem('asala_student_tab', tab);
    }
    startViewTransition(() => {
      router.replace(`/?tab=${tab}`, { scroll: false });
      setOverrideTabState(null);
    });
  };

  // Zero-FOUC Session Hydration Guard
  if (isRestoring && !user) {
    return <AppShellSkeleton />;
  }

  if (!isAuthenticated && !user) {
    return (
      <LoginForm
        onSuccess={role => {
          showToast('Authentication Successful', 'success', `Welcome back!`);
          const targetTab = role === 'student' ? 'courses' : 'curriculum';
          router.replace(`/?tab=${targetTab}`, { scroll: false });
        }}
      />
    );
  }

  const rawTab = searchParams.get('tab');
  const savedTab = isEducator
    ? (typeof window !== 'undefined' && localStorage.getItem('asala_educator_tab')) || 'curriculum'
    : (typeof window !== 'undefined' && localStorage.getItem('asala_student_tab')) || 'courses';

  let currentTab = overrideTab || rawTab || savedTab;

  // Role Sanitization Guard
  if (isEducator && (currentTab === 'courses' || currentTab === 'dashboard')) {
    currentTab = 'curriculum';
  } else if (
    !isEducator &&
    (currentTab === 'curriculum' || currentTab === 'gradeBook' || currentTab === 'roster' || currentTab === 'analytics')
  ) {
    currentTab = 'courses';
  }

  return (
    <AppShell
      currentTab={currentTab}
      onTabChange={tab => handleTabNavigate(tab)}
    >
      {(activeTab, setActiveTab) => {
        const effectiveTab = currentTab || activeTab;

        switch (effectiveTab) {
          case 'curriculum':
            return <CourseBuilder />;
          case 'gradeBook':
            return <GradeBook />;
          case 'roster':
            return <CohortRoster />;
          case 'analytics':
            return <PerformanceDashboard />;
          case 'courses':
            return (
              <CourseBrowser
                onOpenAssignment={_id => handleTabNavigate('assignments', setActiveTab)}
              />
            );
          case 'assignments':
            return (
              <AssignmentWorkspace
                onBack={() => handleTabNavigate('courses', setActiveTab)}
              />
            );
          case 'progress':
            return <ProgressTracker />;
          case 'syncQueue':
            return <SyncQueueView />;
          case 'settings':
            return <SettingsView />;
          case 'dashboard':
          default:
            return isEducator ? (
              <CourseBuilder />
            ) : (
              <DashboardView
                user={user}
                isOnline={isOnline}
                isLoading={isLoading}
                stats={stats}
                t={t}
                onNavigate={tab => handleTabNavigate(tab, setActiveTab)}
              />
            );
        }
      }}
    </AppShell>
  );
}

// Extracted Sub-component for Dashboard View readability
interface DashboardViewProps {
  user: any;
  isOnline: boolean;
  isLoading: boolean;
  stats: {
    courseCount: number;
    completedModules: number;
    totalModules: number;
    submissionCount: number;
    completionRate: number;
  };
  t: any;
  onNavigate: (tab: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({
  user,
  isOnline,
  isLoading,
  stats,
  t,
  onNavigate,
}) => {
  const { pendingCount, pendingSubmissionsCount } = useSync();
  const [courses, setCourses] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const [cList, mList, logsList, subList] = await Promise.all([
          db.cachedCourses.toArray(),
          db.cachedModules.toArray(),
          db.transactionLogs.toArray(),
          db.cachedSubmissions.toArray(),
        ]);
        setCourses(cList);
        const assignMods = mList.filter(m => m.type === 'assignment');
        setAssignments(assignMods);
        setRecentLogs(logsList.slice(-3).reverse());
      } catch (err) {
        console.error('Error reading dashboard live state:', err);
      }
    }
    loadLiveData();
  }, []);

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
            <StatusPill
              label={isOnline ? 'Network Connected' : 'Campus Intranet Offline'}
              variant={isOnline ? 'success' : 'warning'}
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
