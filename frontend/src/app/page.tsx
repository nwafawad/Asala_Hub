'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { LoginForm } from '@/components/auth/LoginForm';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeletons';
import { CourseBrowser } from '@/components/student/CourseBrowser';
import { AssignmentWorkspace } from '@/components/student/AssignmentWorkspace';
import { ProgressTracker } from '@/components/student/ProgressTracker';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';
import { BookOpen, FileText, Database, ShieldCheck, Plus, RefreshCw, Layers } from 'lucide-react';

export default function Home() {
  const { t } = useI18n();
  const { isAuthenticated, user } = useAuth();
  const { pendingCount, isOnline, syncState, addMockOfflineTransaction, syncNow } = useSync();
  const { showToast } = useOverlay();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [overrideTab, setOverrideTab] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (!isAuthenticated) {
    return (
      <LoginForm
        onSuccess={role => {
          showToast('Authentication Successful', 'success', `Welcome back, ${role}!`);
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
          return <AssignmentWorkspace />;
        }
        if (currentTab === 'progress') {
          return <ProgressTracker />;
        }

        // Default Dashboard View
        return (
          <div className="flex flex-col gap-8 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-bold font-heading text-foreground">
                    {t.appName} — {user?.role === 'educator' ? 'Educator Control Center' : 'Student Portal'}
                  </h2>
                  <StatusPill
                    label={isOnline ? 'Network Connected' : 'Campus Intranet Offline'}
                    variant={isOnline ? 'success' : 'warning'}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Signed in as <strong className="text-foreground">{user?.fullName}</strong> ({user?.email}) · Role: <strong className="uppercase text-primary">{user?.role}</strong>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await addMockOfflineTransaction('CREATE_SUBMISSION');
                    showToast('Log added to IndexedDB', 'info', 'Saved transaction log offline.');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Simulate Offline Log</span>
                </button>
                <button
                  onClick={async () => {
                    showToast('Syncing deltas...', 'info');
                    await syncNow();
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 text-primary" />
                  <span>Trigger Sync</span>
                </button>
              </div>
            </div>

            {/* Metric Cards Grid */}
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
                    value={3}
                    subtitle="Cached for offline access"
                    icon={BookOpen}
                    trend={{ value: 'CS101, SE202', isPositive: true }}
                  />
                  <StatCard
                    title={t.stats.offlineDrafts}
                    value={pendingCount}
                    subtitle="In IndexedDB transaction queue"
                    icon={FileText}
                    trend={{ value: `${pendingCount} pending`, isPositive: pendingCount === 0 }}
                  />
                  <StatCard
                    title={t.stats.queuedDeltas}
                    value={pendingCount > 0 ? `${pendingCount} payloads` : 'Clean'}
                    subtitle="Compressed flat JSON"
                    icon={Database}
                  />
                  <StatCard
                    title={t.stats.systemHealth}
                    value={syncState.toUpperCase()}
                    subtitle="SRS TLS 1.2+ / LAN HTTP protocol"
                    icon={ShieldCheck}
                    trend={{ value: '100% stable', isPositive: true }}
                  />
                </>
              )}
            </div>

            {/* Overview Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    Active Navigation View
                  </h3>
                  <StatusPill label={currentTab} variant="info" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Use the navigation sidebar to explore enrolled courses, offline assignment workspace, and progress sync tracker.
                </p>
              </div>

              <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4 lg:col-span-2">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-semibold font-heading text-foreground">
                    Phase 1 & Phase 2 Integrated Engine
                  </h3>
                  <span className="text-xs text-muted-foreground">Offline LMS Features</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusPill label="Auth Gate & Role Auto-Route" variant="success" />
                  <StatusPill label="2s IndexedDB Auto-Save" variant="info" />
                  <StatusPill label="Offline Blob Attachments" variant="warning" />
                  <StatusPill label="In-Place Re-Auth Modal" variant="info" dotAnimation />
                  <StatusPill label="Printable Submission Receipts" variant="neutral" />
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </AppShell>
  );
}
