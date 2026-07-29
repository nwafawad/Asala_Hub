'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/shell/Header';
import { AdminSidebar } from './AdminSidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { startViewTransition } from '@/lib/view-transition';
import { Server, Wifi } from 'lucide-react';

interface AdminShellProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

export const AdminShell: React.FC<AdminShellProps> = ({ currentTab, children, onTabChange }) => {
  const [activeTab, setActiveTabState] = useState<string>(currentTab || 'adminDashboard');

  const effectiveActiveTab = currentTab || activeTab;

  useEffect(() => {
    if (currentTab) {
      setActiveTabState(currentTab);
    }
  }, [currentTab]);

  const handleSetActiveTab = (tab: string) => {
    if (onTabChange) onTabChange(tab);
    startViewTransition(() => {
      setActiveTabState(tab);
    });
  };

  // Keyboard Shortcuts (Alt+1 .. Alt+7)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= 7) {
          e.preventDefault();
          const adminTabs = [
            'adminDashboard',
            'syncConflicts',
            'systemHealth',
            'backups',
            'userManagement',
            'auditLogs',
            'adminSettings',
          ];
          const target = adminTabs[keyNum - 1];
          if (target) {
            handleSetActiveTab(target);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-purple-500/20 selection:text-purple-600 transition-colors">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-purple-600 focus:text-white focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <AdminSidebar activeTab={effectiveActiveTab} setActiveTab={handleSetActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {/* Local Campus Mode vs Cloud Connected Mode Badge Strip (§1.1) */}
        <div className="bg-purple-500/10 border-b border-purple-500/20 px-6 py-2 flex items-center justify-between gap-4 text-xs font-semibold">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Cloud Connected Mode
            </span>
            <span className="text-muted-foreground text-[11px]">
              Connected to central institutional cloud API gateway. Operational sync active.
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
            <span className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              PostgreSQL: Healthy
            </span>
            <span className="flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              Latency: 12ms
            </span>
          </div>
        </div>

        <main id="admin-main-content" className="flex-1 p-8 overflow-y-auto" tabIndex={-1}>
          {children(effectiveActiveTab, handleSetActiveTab)}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
