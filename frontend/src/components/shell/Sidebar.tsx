'use client';

import React from 'react';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Activity,
  RefreshCw,
  Settings,
  Layers,
  Users,
  BookPlus,
  Award,
} from 'lucide-react';
import { cn, getInitials, isEducatorUser } from '@/lib/utils';

import { useSync } from '@/context/SyncContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = React.memo(({ activeTab, setActiveTab }) => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { pendingCount } = useSync();

  const navItems = React.useMemo(() => {
    if (user?.role === 'admin') {
      return [
        { id: 'adminConsole', label: 'Admin Console', icon: Settings },
        { id: 'settings', label: t.nav.settings, icon: Settings },
      ];
    }

    const isEducator = isEducatorUser(user);
    if (isEducator) {
      return [
        {
          id: 'curriculum',
          label: t.educator?.nav?.curriculumBuilder || 'Curriculum Builder',
          icon: BookPlus,
        },
        {
          id: 'gradeBook',
          label: t.educator?.nav?.gradeBook || 'Grade Book & Grader',
          icon: Award,
        },
        {
          id: 'roster',
          label: t.educator?.nav?.cohortRoster || 'Cohort Roster',
          icon: Users,
        },
        {
          id: 'analytics',
          label: t.educator?.nav?.performanceAnalytics || 'Performance Analytics',
          icon: Activity,
        },
        { id: 'syncQueue', label: t.nav.syncQueue, icon: RefreshCw },
        { id: 'settings', label: t.nav.settings, icon: Settings },
      ];
    }

    return [
      { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
      { id: 'courses', label: t.nav.courses, icon: BookOpen },
      { id: 'assignments', label: t.nav.assignments, icon: FileCheck },
      { id: 'progress', label: t.nav.progress, icon: Activity },
      { id: 'syncQueue', label: t.nav.syncQueue, icon: RefreshCw },
      { id: 'settings', label: t.nav.settings, icon: Settings },
    ];
  }, [t, user?.role]);

  return (
    <aside className="sticky top-0 h-screen w-64 border-r rtl:border-r-0 rtl:border-l border-border bg-card flex flex-col justify-between shrink-0 transition-colors overflow-y-auto z-40">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground leading-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] text-muted-foreground">{t.appSubtitle}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all cursor-pointer whitespace-nowrap overflow-hidden',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="truncate whitespace-nowrap">{item.label}</span>
                {item.id === 'syncQueue' && pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 font-mono ms-auto shrink-0">
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold uppercase">
            {getInitials(user?.fullName)}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {user?.fullName || 'Asala User'}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {user?.email || 'user@asalahub.dev'} ({user?.role || 'student'})
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';
