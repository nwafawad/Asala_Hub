'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { startViewTransition } from '@/lib/view-transition';
import { useStorage } from '@/context/StorageContext';
import { useSync } from '@/context/SyncContext';
import { AlertTriangle, HardDrive, RefreshCw } from 'lucide-react';

interface AppShellProps {
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>('dashboard');
  const { isNearFull, isQueueFull, usedMb, quotaMb } = useStorage();
  const { syncNow } = useSync();

  const handleSetActiveTab = (tab: string) => {
    startViewTransition(() => {
      setActiveTabState(tab);
    });
  };

  const showBlockingModal = isNearFull || isQueueFull;

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary transition-colors">
      <Sidebar activeTab={activeTab} setActiveTab={handleSetActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
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
