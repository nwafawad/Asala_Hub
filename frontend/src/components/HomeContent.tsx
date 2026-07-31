'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/shell/AppShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppShellSkeleton, SkeletonCard } from '@/components/ui/Skeletons';
import { CourseBrowser } from '@/components/student/CourseBrowser';
import { AssignmentListView } from '@/components/student/AssignmentListView';
import { AssignmentWorkspace } from '@/components/student/AssignmentWorkspace';
import { ProgressTracker } from '@/components/student/ProgressTracker';
import { DashboardView } from '@/components/student/DashboardView';
import { SyncQueueView } from '@/components/student/SyncQueueView';
import { SettingsView } from '@/components/shell/SettingsView';

const CourseBuilder = dynamic(() => import('@/components/educator/CourseBuilder').then(m => m.CourseBuilder), {
  loading: () => <SkeletonCard />,
});
const GradeBook = dynamic(() => import('@/components/educator/GradeBook').then(m => m.GradeBook), {
  loading: () => <SkeletonCard />,
});
const CohortRoster = dynamic(() => import('@/components/educator/CohortRoster').then(m => m.CohortRoster), {
  loading: () => <SkeletonCard />,
});
const PerformanceDashboard = dynamic(() => import('@/components/educator/PerformanceDashboard').then(m => m.PerformanceDashboard), {
  loading: () => <SkeletonCard />,
});
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';
import { isEducatorUser } from '@/lib/utils';

export function HomeContent() {
  const { t } = useI18n();
  const { isAuthenticated, user, isRestoring, extendSession } = useAuth();
  const { isOnline } = useSync();
  const { showToast } = useOverlay();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [overrideTab, setOverrideTabState] = useState<string | null>(null);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const isEducator = isEducatorUser(user);

  // Admin Role Guard: redirect to /admin console
  useEffect(() => {
    if (user && user.role === 'admin') {
      router.replace('/admin');
    }
  }, [user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && !searchParams.get('tab')) {
      const savedTab = isEducator
        ? localStorage.getItem('asala_educator_tab')
        : localStorage.getItem('asala_student_tab');
      if (savedTab) {
        setOverrideTabState(savedTab);
      }
    }
  }, [isEducator, searchParams]);

  const handleTabNavigate = (tab: string, setActiveTab?: (t: string) => void) => {
    if (setActiveTab) setActiveTab(tab);
    if (extendSession) extendSession();
    if (isEducator) {
      localStorage.setItem('asala_educator_tab', tab);
    } else {
      localStorage.setItem('asala_student_tab', tab);
    }
    setOverrideTabState(tab);
    router.replace(`/?tab=${tab}`, { scroll: false });
  };

  // Restoring & Zero-FOUC Guard
  if (isRestoring && !user) {
    return <AppShellSkeleton />;
  }

  // Admin Role Guard render check
  if (user && user.role === 'admin') {
    return null;
  }

  if (!isAuthenticated && !user) {
    return (
      <LoginForm
        onSuccess={role => {
          showToast('Authentication Successful', 'success', 'Welcome back!');
          if (role === 'admin') {
            router.replace('/admin', { scroll: false });
          } else {
            const targetTab = role === 'student' ? 'courses' : 'curriculum';
            router.replace(`/?tab=${targetTab}`, { scroll: false });
          }
        }}
      />
    );
  }

  const rawTab = searchParams.get('tab');
  const defaultTab = isEducator ? 'curriculum' : 'courses';
  let currentTab = overrideTab || rawTab || defaultTab;

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
                onOpenAssignment={id => {
                  setSelectedAssignmentId(id);
                  handleTabNavigate('assignments', setActiveTab);
                }}
              />
            );
          case 'assignments':
            return selectedAssignmentId ? (
              <AssignmentWorkspace
                assignmentId={selectedAssignmentId}
                onBack={() => setSelectedAssignmentId(null)}
              />
            ) : (
              <AssignmentListView
                onSelectAssignment={assignId => setSelectedAssignmentId(assignId)}
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
                t={t}
                onNavigate={tab => handleTabNavigate(tab, setActiveTab)}
              />
            );
        }
      }}
    </AppShell>
  );
}
