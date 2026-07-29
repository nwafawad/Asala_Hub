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

  const rawTab = searchParams.get('tab');
  const savedTab = typeof window !== 'undefined' ? localStorage.getItem('asala_admin_tab') : 'adminDashboard';
  const currentTab = overrideTab || rawTab || savedTab || 'adminDashboard';

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
              <ComingSoonStub
                title="Sync & Conflict Resolution Queue (§3.2)"
                description="Rule-engine suggestions, diff inspection drawer, campus node reconciliation, and bulk conflict resolution for offline student submissions and educator grades."
                icon={GitMerge}
                plannedFeatures={[
                  'Student submission version conflict resolution',
                  'Educator grade precedence review',
                  'Campus node delta reconciliation (FR-19)',
                  'Rule-engine merge recommendation chips',
                ]}
              />
            );
          case 'systemHealth':
            return (
              <ComingSoonStub
                title="System Health & Infrastructure Monitor (§3.3)"
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
              <ComingSoonStub
                title="Backups & Disaster Recovery (§3.4)"
                description="Automated database backup history, trigger backup workflow, RTO/RPO dashboard, and database migration rollback tools."
                icon={Database}
                plannedFeatures={[
                  'Trigger instant PostgreSQL backup (NFR-9, NFR-16)',
                  'RTO (< 1 hour) & RPO (< 15 min) compliance metrics',
                  'Automated backup freshness verification (< 24h)',
                  'Point-in-time database restoration & rollback',
                ]}
              />
            );
          case 'auditLogs':
            return (
              <ComingSoonStub
                title="Audit & Compliance (§3.6)"
                description="Compliance audit trail logging, data retention/purge governance (NFR-14, CR-3), and student personal data breach response panel (CR-6)."
                icon={ScrollText}
                plannedFeatures={[
                  'Complete administrative audit log search & export',
                  'Student PII protection & encryption verification (CR-1, CR-2)',
                  'Data retention schedule & automated purge (NFR-14)',
                  'Data breach incident response & quarantine workflow (CR-6)',
                ]}
              />
            );
          case 'adminSettings':
            return (
              <ComingSoonStub
                title="Admin Settings & Alerting Config (§3.7)"
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
