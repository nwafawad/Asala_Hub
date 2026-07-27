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
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';
import { startViewTransition } from '@/lib/view-transition';
import { SettingsView } from '@/components/shell/SettingsView';
import { db, seedInitialMockData } from '@/lib/db';
import { BookOpen, FileText, CheckCircle2, Award, Clock, ArrowRight, Play, Sparkles, Layers } from 'lucide-react';

export default function Home() {
  const { t, language } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const { isOnline } = useSync();
  const { showToast } = useOverlay();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overrideTab, setOverrideTabState] = useState<string | null>(null);

  const [stats, setStats] = useState({
    courseCount: 2,
    completedModules: 3,
    totalModules: 8,
    submissionCount: 2,
    completionRate: 38,
  });

  const setOverrideTab = (tab: string | null) => {
    startViewTransition(() => {
      setOverrideTabState(tab);
    });
  };

  useEffect(() => {
    async function loadDashboardData() {
      try {
        await seedInitialMockData();
        const [courses, modules, submissions] = await Promise.all([
          db.cachedCourses.toArray(),
          db.cachedModules.toArray(),
          db.cachedSubmissions.toArray(),
        ]);

        const completedCount = modules.filter(m => m.isCompleted).length;
        const totalCount = Math.max(1, modules.length);
        const rate = Math.round((completedCount / totalCount) * 100);

        setStats({
          courseCount: courses.length || 2,
          completedModules: completedCount,
          totalModules: totalCount,
          submissionCount: submissions.length,
          completionRate: rate,
        });
      } catch (err) {
        console.error('Error loading dashboard stats:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (!isAuthenticated) {
    return (
      <LoginForm
        onSuccess={role => {
          showToast('Authentication Successful', 'success', `Welcome back!`);
          setOverrideTab(role === 'student' ? 'courses' : 'dashboard');
        }}
      />
    );
  }

  return (
    <AppShell>
      {(activeTab, setActiveTab) => {
        const currentTab = overrideTab || activeTab;

        if (currentTab === 'courses') {
          return (
            <CourseBrowser
              onOpenAssignment={_id => setOverrideTab('assignments')}
            />
          );
        }
        if (currentTab === 'assignments') {
          return (
            <AssignmentWorkspace
              onBack={() => setOverrideTab('courses')}
            />
          );
        }
        if (currentTab === 'progress') {
          return <ProgressTracker />;
        }
        if (currentTab === 'settings') {
          return <SettingsView />;
        }

        // Clean, 100% Student-Centric Dashboard View (Zero Technical Jargon)
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
                      CS101 — Module #2
                    </span>
                    <span className="text-xs text-muted-foreground">Audio Lecture</span>
                  </div>
                  <h3 className="text-lg font-bold font-heading text-foreground">
                    Lecture 1: Computing & Data Structures
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Resume where you left off in Computer Science foundations.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOverrideTab('courses')}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs self-start md:self-center shrink-0"
              >
                <span>Continue Reading</span>
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
                    trend={{ value: 'CS101, SE202', isPositive: true }}
                  />
                  <StatCard
                    title="Overall Completion"
                    value={`${stats.completionRate}%`}
                    subtitle={`${stats.completedModules} of ${stats.totalModules} modules completed`}
                    icon={CheckCircle2}
                    trend={{ value: '+12%', isPositive: true }}
                  />
                  <StatCard
                    title="Submitted Assignments"
                    value={stats.submissionCount}
                    subtitle="Ready or synced offline"
                    icon={FileText}
                  />
                  <StatCard
                    title="Academic GPA"
                    value="3.92"
                    subtitle="Top 5% student standing"
                    icon={Award}
                    trend={{ value: 'Honor Roll', isPositive: true }}
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
                    onClick={() => setOverrideTab('assignments')}
                    className="text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    View All Workspace
                  </button>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                          SE202
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          Task #2: Offline Transaction Log Architecture
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Due Tomorrow at 23:59 · 100 Points
                      </span>
                    </div>

                    <button
                      onClick={() => setOverrideTab('assignments')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0 self-start sm:self-center"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                    </button>
                  </div>

                  <div className="p-4 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-80">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase">
                          CS101
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          Task #1: Foundations of Aqeedah & Algorithmic Logic
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Submitted & Saved Locally · 100 Points
                      </span>
                    </div>

                    <StatusPill label="Submitted" variant="success" />
                  </div>
                </div>
              </div>

              {/* Student Activity Timeline */}
              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Recent Activity
                  </h3>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-start gap-3 text-xs">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mt-0.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">Completed Module #1</span>
                      <span className="text-muted-foreground text-[11px]">CS101 Syllabus & Offline Policies</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Today</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-xs">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold text-foreground">Draft Auto-Saved</span>
                      <span className="text-muted-foreground text-[11px]">SE202 Offline Architecture Essay</span>
                      <span className="text-[10px] text-muted-foreground mt-0.5">Saved to browser storage</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}
