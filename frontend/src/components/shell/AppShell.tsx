'use client';

import React, { useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { ToastContainer } from '@/components/ui/Toast';

interface AppShellProps {
  children: (activeTab: string, setActiveTab: (tab: string) => void) => React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  return (
    <div className="min-h-screen bg-background text-foreground flex antialiased selection:bg-primary/20 selection:text-primary transition-colors">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-8 overflow-y-auto">
          {children(activeTab, setActiveTab)}
        </main>
      </div>
      <ToastContainer />
    </div>
  );
};
