'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { UserManagementView } from '@/components/admin/UserManagementView';
import { ComingSoonStub } from '@/components/admin/ComingSoonStub';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppShellSkeleton } from '@/components/ui/Skeletons';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';
import { GitMerge, Activity, Database, ScrollText, Settings } from 'lucide-react';

export function AdminContent() {
  const { isAuthenticated, user, isRestoring } = useAuth();
  const { showToast } = useOverlay();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [overrideTab, setOverrideTab] = useState<string | null>(null);

  const handleTabNavigate = (tab: string, setActiveTab?: (t: string) => void) => {
    if (setActiveTab) setActiveTab(tab);
    if (typeof window !== 'undefined') {
      localStorage.setItem('asala_admin_tab', tab);
    }
    setOverrideTab(tab);
    router.replace(`/admin?tab=${tab}`, { scroll: false });
  };

  // Zero-FOUC & Hydration Guard
  if (isRestoring && !user) {
    return <AppShellSkeleton />;
  }

  // Auth Guard: Require Login
  if (!isAuthenticated && !user) {
    return (
      <LoginForm
        onSuccess={role => {
          showToast('Admin Authentication Successful', 'success', 'Welcome back, Administrator!');
          if (role === 'admin') {
            router.replace('/admin', { scroll: false });
          } else {
            router.replace('/', { scroll: false });
          }
        }}
      />
    );
  }

  // RBAC Guard: Non-admin users redirected back to main portal
  if (user && user.role !== 'admin') {
    if (typeof window !== 'undefined') {
      router.replace('/');
    }
    return null;
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('asala_admin_tab');
      if (savedTab && !searchParams.get('tab')) {
        setOverrideTab(savedTab);
      }
    }
  }, [searchParams]);

  const rawTab = searchParams.get('tab');
  const currentTab = overrideTab || rawTab || 'adminDashboard';

  return (
    <AdminShell currentTab={currentTab} onTabChange={tab => handleTabNavigate(tab)}>
      {(activeTab, setActiveTab) => {
        const effectiveTab = currentTab || activeTab;

        switch (effectiveTab) {
          case 'adminDashboard':
            return <AdminDashboardView onNavigateTab={tab => handleTabNavigate(tab, setActiveTab)} />;
          case 'userManagement':
            return <UserManagementView />;
          case 'syncConflicts':
            return (
              /* FR 3.2 (Delta Payload Transmission) & FR 3.3 (Conflict State Resolution) */
              <ComingSoonStub
                title="Sync & Conflict Resolution Queue"
                description="Rule-engine suggestions, diff inspection drawer, campus node reconciliation, and bulk conflict resolution for offline student submissions and educator grades."
                icon={GitMerge}
                plannedFeatures={[
                  'Student submission version conflict resolution',
                  'Educator grade precedence review',
                  'Campus node delta reconciliation',
                  'Rule-engine merge recommendation chips',
                ]}
              />
            );
          case 'systemHealth':
            return (
              /* NFR 2 (Resource-Constrained Execution) & NFR 5 (High-Concurrency Async Sync Processing) */
              <ComingSoonStub
                title="System Health & Infrastructure Monitor"
                description="Docker container health metrics grid, PostgreSQL connection pool telemetry, media transcoding pipeline queue depth, and central API gateway log viewer."
                icon={Activity}
                plannedFeatures={[
                  'Docker container status grid (CPU, Memory, Uptime)',
                  'PostgreSQL connection pool & query latency',
                  'FFmpeg lecture media transcoding queue',
                  'Real-time centralized log viewer & tailing',
                ]}
              />
            );
          case 'backups':
            return (
              /* NFR 7 (Multi-Environment Dockerization & Disaster Recovery) */
              <ComingSoonStub
                title="Backups & Disaster Recovery"
                description="Automated database backup history, trigger backup workflow, RTO/RPO dashboard, and database migration rollback tools."
                icon={Database}
                plannedFeatures={[
                  'Trigger instant PostgreSQL backup',
                  'RTO (< 4 hours) & RPO (< 24 hours) compliance metrics',
                  'Automated backup freshness verification (< 24h)',
                  'Point-in-time database restoration & rollback',
                ]}
              />
            );
          case 'auditLogs':
            return (
              /* NFR 1 (Local Offline Data Security & Audit Compliance) */
              <ComingSoonStub
                title="Audit & Compliance"
                description="Compliance audit trail logging, data retention/purge governance, and student personal data breach response panel."
                icon={ScrollText}
                plannedFeatures={[
                  'Complete administrative audit log search & export',
                  'Student PII protection & encryption verification',
                  'Data retention schedule & automated purge',
                  'Data breach incident response & quarantine workflow',
                ]}
              />
            );
          case 'adminSettings':
            return (
              /* NFR 5 (High-Concurrency Async Sync Processing) & NFR 7 (Multi-Environment Dockerization) */
              <ComingSoonStub
                title="Admin Settings & Alerting Config"
                description="Elevated step-up re-authentication defaults, infrastructure failure alerting webhook configuration, and system maintenance mode toggles."
                icon={Settings}
                plannedFeatures={[
                  'Configure elevated re-auth timeout & requirements',
                  'System failure alerting channels (Log / Webhook)',
                  'Campus Node vs Cloud sync interval settings',
                  'Maintenance mode & campus intranet lockdown',
                ]}
              />
            );
          default:
            return <AdminDashboardView onNavigateTab={tab => handleTabNavigate(tab, setActiveTab)} />;
        }
      }}
    </AdminShell>
  );
}
