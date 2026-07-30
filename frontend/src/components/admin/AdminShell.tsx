'use client';

import React, { useState, useEffect } from 'react';
import { Header } from '@/components/shell/Header';
import { AdminSidebar } from './AdminSidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { startViewTransition } from '@/lib/view-transition';

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

  // Keyboard Shortcuts (Alt+1 .. Alt+2)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= 2) {
          e.preventDefault();
          const adminTabs = [
            'adminDashboard',
            'userManagement',
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
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary transition-colors">
      <a
        href="#admin-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <AdminSidebar activeTab={effectiveActiveTab} setActiveTab={handleSetActiveTab} />

      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        <main id="admin-main-content" className="flex-1 p-8 overflow-y-auto" tabIndex={-1}>
          {children(effectiveActiveTab, handleSetActiveTab)}
        </main>
      </div>

      <ToastContainer />
    </div>
  );
};
