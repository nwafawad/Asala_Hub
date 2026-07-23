"use client";

import React from 'react';
import { SyncStatus } from '@/lib/types';
import { CheckCircle, CloudOff, RefreshCw } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

interface SyncIndicatorProps {
  status: SyncStatus;
  queuedCount: number;
  onClick: () => void;
}

export const SyncIndicator = ({ status, queuedCount, onClick }: SyncIndicatorProps) => {
  const { t } = useTranslation();

  const getStatusContent = () => {
    switch (status) {
      case 'synced':
        return {
          icon: <CheckCircle size={18} className="text-success" />,
          text: t('sync.all_synced'),
          textClass: 'text-success'
        };
      case 'offline':
        return {
          icon: <CloudOff size={18} className="text-warning" />,
          text: t('sync.offline', { count: queuedCount }),
          textClass: 'text-warning'
        };
      case 'syncing':
        return {
          icon: <RefreshCw size={18} className="text-primary animate-spin" />,
          text: t('sync.syncing'),
          textClass: 'text-primary'
        };
      default:
        return {
          icon: <CheckCircle size={18} className="text-success" />,
          text: t('sync.all_synced'),
          textClass: 'text-success'
        };
    }
  };

  const content = getStatusContent();

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 min-h-[44px] rounded-full hover:bg-surface dark:hover:bg-surface-dark transition-colors border border-transparent hover:border-border dark:hover:border-border-dark cursor-pointer"
      aria-label={content.text}
    >
      {content.icon}
      <span className={`text-xs font-medium hidden md:block ${content.textClass}`}>
        {content.text}
      </span>
    </button>
  );
};
