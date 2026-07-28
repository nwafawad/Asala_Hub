'use client';

import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { startViewTransition } from '@/lib/view-transition';
import { useStorage } from '@/context/StorageContext';
import { useSync } from '@/context/SyncContext';
import { useAuth } from '@/context/AuthContext';
import { isEducatorUser } from '@/lib/utils';
import { AlertTriangle, HardDrive, RefreshCw, WifiOff } from 'lucide-react';

interface AppShellProps {
  currentTab?: string;
  onTabChange?: (tab: string) => void;
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ currentTab, children, onTabChange }) => {
  const { user } = useAuth();
  const isEducator = isEducatorUser(user);
  const defaultTab = isEducator ? 'curriculum' : 'dashboard';
  const [activeTab, setActiveTabState] = useState<string>(currentTab || defaultTab);
  const { isNearFull, isQueueFull, usedMb, quotaMb } = useStorage();
  const { syncNow, isOnline } = useSync();

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

  // Desktop Keyboard Shortcuts (Alt+1 .. Alt+6) for power navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const keyNum = parseInt(e.key, 10);
        if (keyNum >= 1 && keyNum <= 6) {
          e.preventDefault();
          const educatorTabs = ['curriculum', 'gradeBook', 'roster', 'analytics', 'syncQueue', 'settings'];
          const studentTabs = ['courses', 'assignments', 'progress', 'syncQueue', 'settings'];
          const targetTabs = isEducator ? educatorTabs : studentTabs;
          const target = targetTabs[keyNum - 1];
          if (target) {
            handleSetActiveTab(target);
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEducator]);

  useEffect(() => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.focus();
    }
  }, [effectiveActiveTab]);

  const showBlockingModal = isNearFull || isQueueFull;

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary transition-colors">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-xl focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>
      <Sidebar activeTab={effectiveActiveTab} setActiveTab={handleSetActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />

        {!isOnline && (
          <div className="bg-amber-500/15 text-amber-900 dark:text-amber-300 border-b border-amber-500/30 px-6 py-2.5 flex items-center justify-between gap-4 text-xs font-semibold animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-2.5">
              <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>
                <strong>Working Offline:</strong> Campus intranet network disconnected. Your assignment drafts and changes are saved locally to IndexedDB and will sync automatically when reconnected.
              </span>
            </div>
            <button
              onClick={() => handleSetActiveTab('syncQueue')}
              className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-900 dark:text-amber-200 text-[11px] font-bold shrink-0 transition-colors cursor-pointer"
            >
              <span>Inspect Sync Queue</span>
            </button>
          </div>
        )}

        <main id="main-content" className="flex-1 p-8 overflow-y-auto" tabIndex={-1}>
          {children(activeTab, handleSetActiveTab)}
        </main>
      </div>
      <ToastContainer />

      {/* Blocking Storage / Queue Governance Overlay Modal (FR-18, NFR-13, Section 5.9) */}
      {showBlockingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-destructive/30 shadow-2xl flex flex-col gap-4 text-center">
            <div className="p-3.5 rounded-full bg-destructive/10 text-destructive w-14 h-14 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-bold font-heading text-foreground">
                {isQueueFull ? 'Maximum Offline Queue Reached' : 'Device Storage Low'}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isQueueFull
                  ? "You've reached the maximum offline transaction queue (150 items). Please connect to sync before submitting more work."
                  : 'Your device is low on storage. Please connect to sync before adding more work.'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs font-mono flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <HardDrive className="w-4 h-4 text-primary" />
                Storage Usage
              </span>
              <span className="font-bold text-foreground">
                {usedMb} MB / {quotaMb} MB
              </span>
            </div>

            <button
              onClick={() => syncNow()}
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Trigger Sync & Free Space</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
