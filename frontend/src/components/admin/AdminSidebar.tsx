'use client';

import React from 'react';
import Link from 'next/link';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  ArrowLeftRight,
} from 'lucide-react';
import { cn, getInitials } from '@/lib/utils';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = React.memo(({ activeTab, setActiveTab }) => {
  const { t } = useI18n();
  const { user } = useAuth();

  const navItems = React.useMemo(
    () => [
      { id: 'adminDashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'userManagement', label: 'Users & Accounts', icon: Users },
    ],
    []
  );

  return (
    <aside className="sticky top-0 h-screen w-64 border-r rtl:border-r-0 rtl:border-l border-border bg-card flex flex-col justify-between shrink-0 transition-colors overflow-y-auto z-40">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600 text-white shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground leading-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold uppercase tracking-wider">
              System Admin Console
            </p>
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
                    ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300 font-semibold border border-purple-500/20'
                    : 'text-muted-foreground font-medium hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    isActive ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                  )}
                />
                <span className="truncate whitespace-nowrap">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-muted/30 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-xs font-bold uppercase">
            {getInitials(user?.fullName || 'Admin')}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-foreground truncate">
              {user?.fullName || 'Administrator'}
            </span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold uppercase tracking-wider">
              System Admin
            </span>
          </div>
        </div>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-background border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>Back to Learning Portal</span>
        </Link>
      </div>
    </aside>
  );
});

AdminSidebar.displayName = 'AdminSidebar';
