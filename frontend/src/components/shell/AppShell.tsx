'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';
import { startViewTransition } from '@/lib/view-transition';

interface AppShellProps {
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [activeTab, setActiveTabState] = useState<string>('dashboard');

  const handleSetActiveTab = (tab: string) => {
    startViewTransition(() => {
      setActiveTabState(tab);
    });
  };

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
    </div>
  );
};
