'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { UserManagementView } from '@/components/admin/UserManagementView';
import { LoginForm } from '@/components/auth/LoginForm';
import { AppShellSkeleton } from '@/components/ui/Skeletons';
import { useAuth } from '@/context/AuthContext';
import { useOverlay } from '@/context/OverlayContext';

export function AdminContent() {
  const { isAuthenticated, user, isRestoring } = useAuth();
  const { showToast } = useOverlay();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [overrideTab, setOverrideTab] = useState<string | null>(null);

  // RBAC Guard Effect: Non-admin users redirected back to main portal
  useEffect(() => {
    if (user && user.role !== 'admin') {
      router.replace('/');
    }
  }, [user, router]);

  // Tab restoration effect
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTab = localStorage.getItem('asala_admin_tab');
      if (savedTab && !searchParams.get('tab')) {
        setOverrideTab(savedTab);
      }
    }
  }, [searchParams]);

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
    return null;
  }

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
          default:
            return <AdminDashboardView onNavigateTab={tab => handleTabNavigate(tab, setActiveTab)} />;
        }
      }}
    </AdminShell>
  );
}
