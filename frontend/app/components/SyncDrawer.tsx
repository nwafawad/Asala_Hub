"use client";

import React, { useEffect, useRef } from 'react';
import { SyncStatus } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/context';

interface SyncDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  status: SyncStatus;
  queuedCount: number;
  lastSyncTime: string | null;
  onForceSync: () => void;
}

export const SyncDrawer = ({ isOpen, onClose, status, queuedCount, lastSyncTime, onForceSync }: SyncDrawerProps) => {
  const { t } = useTranslation();
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (drawerRef.current && !drawerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isSyncing = status === 'syncing';
  const isOffline = status === 'offline';
  const canSync = !isSyncing && !isOffline;

  return (
    <div
      ref={drawerRef}
      className="absolute top-[64px] end-4 z-50 w-[280px] bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-lg shadow-lg p-4 animate-in slide-in-from-top-2 fade-in duration-200"
    >
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
            {t('sync.queued_items', { count: queuedCount })}
          </p>
          <p className="text-xs text-text-secondary dark:text-text-secondary-dark mt-1">
            {lastSyncTime ? t('sync.last_sync', { time: lastSyncTime }) : t('sync.never_synced')}
          </p>
        </div>

        <button
          onClick={() => {
            onForceSync();
            onClose();
          }}
          disabled={!canSync}
          className={`
            min-h-[44px] w-full flex items-center justify-center rounded-md text-sm font-medium transition-colors text-white
            ${!canSync
              ? 'bg-primary/50 cursor-not-allowed' 
              : 'bg-primary hover:bg-primary-light'}
          `}
        >
          {isSyncing ? t('sync.syncing') : t('sync.force_sync')}
        </button>
      </div>
    </div>
  );
};
