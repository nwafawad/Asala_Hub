"use client";

import React, { useState } from 'react';
import { SyncStatus } from '@/lib/types';
import { SyncIndicator } from './SyncIndicator';
import { SyncDrawer } from './SyncDrawer';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { Menu } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface TopBarProps {
  onToggleSidebar?: () => void;
  syncStatus: SyncStatus;
  queuedCount: number;
  lastSyncTime: string | null;
  onForceSync: () => void;
}

export const TopBar = ({ 
  onToggleSidebar, 
  syncStatus, 
  queuedCount, 
  lastSyncTime, 
  onForceSync 
}: TopBarProps) => {
  const [isSyncDrawerOpen, setIsSyncDrawerOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <header className="fixed top-0 start-0 end-0 h-[56px] bg-surface-elevated dark:bg-surface-elevated-dark border-b border-border dark:border-border-dark z-50 px-4 flex items-center justify-between">
      
      {/* Start Section */}
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <button 
            onClick={onToggleSidebar}
            className="lg:hidden min-h-[44px] min-w-[44px] flex items-center justify-center text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface dark:hover:bg-surface-dark rounded-full transition-colors -ms-2"
            aria-label={t('toggle_menu')}
          >
            <Menu size={24} />
          </button>
        )}
        <h1 className="text-lg font-semibold text-primary">
          Asala Hub
        </h1>
      </div>

      {/* Center/End Section - Sync */}
      <div className="flex-1 flex justify-end items-center mx-2 relative">
        <SyncIndicator 
          status={syncStatus} 
          queuedCount={queuedCount} 
          onClick={() => setIsSyncDrawerOpen(!isSyncDrawerOpen)} 
        />
        <SyncDrawer
          isOpen={isSyncDrawerOpen}
          onClose={() => setIsSyncDrawerOpen(false)}
          status={syncStatus}
          queuedCount={queuedCount}
          lastSyncTime={lastSyncTime}
          onForceSync={onForceSync}
        />
      </div>

      {/* End Section - Actions */}
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>

    </header>
  );
};
