"use client";

import React, { useState, createContext, useContext } from 'react';
import { UIRole, SyncStatus } from '@/lib/types';
import { TopBar } from './TopBar';
import { Sidebar } from './Sidebar';
import { BottomNav } from './BottomNav';

interface SyncMockContextType {
  syncStatus: SyncStatus;
  queuedCount: number;
  lastSyncTime: string | null;
  setSyncStatus: (status: SyncStatus) => void;
  setQueuedCount: (count: number) => void;
}

export const SyncMockContext = createContext<SyncMockContextType | undefined>(undefined);

export const useSyncMock = () => {
  const context = useContext(SyncMockContext);
  if (!context) {
    throw new Error('useSyncMock must be used within AppShell');
  }
  return context;
};

interface AppShellProps {
  role: UIRole;
  children: React.ReactNode;
}

export const AppShell = ({ role, children }: AppShellProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [queuedCount, setQueuedCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(new Date().toLocaleTimeString());

  const handleForceSync = () => {
    setSyncStatus('syncing');
    // Mock sync duration
    setTimeout(() => {
      setSyncStatus('synced');
      setQueuedCount(0);
      setLastSyncTime(new Date().toLocaleTimeString());
    }, 2000);
  };

  const syncContextValue = {
    syncStatus,
    queuedCount,
    lastSyncTime,
    setSyncStatus,
    setQueuedCount
  };

  return (
    <SyncMockContext.Provider value={syncContextValue}>
      <div className="min-h-screen bg-surface dark:bg-surface-dark text-text-primary dark:text-text-primary-dark transition-colors duration-300">
        <TopBar 
          onToggleSidebar={() => {}} // Could be used for mobile drawer later
          syncStatus={syncStatus}
          queuedCount={queuedCount}
          lastSyncTime={lastSyncTime}
          onForceSync={handleForceSync}
        />
        
        <Sidebar 
          role={role}
          collapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        
        <main 
          id="main-content"
          className={`
            pt-[56px] pb-[56px] lg:pb-0 min-h-screen
            transition-all duration-200 ease-in-out
            ${isSidebarCollapsed ? 'lg:ps-[64px]' : 'lg:ps-[240px]'}
          `}
        >
          <div className="p-4 lg:p-6 mx-auto max-w-7xl">
            {children}
          </div>
        </main>
        
        <BottomNav role={role} />
      </div>
    </SyncMockContext.Provider>
  );
};
