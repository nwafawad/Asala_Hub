'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { db, type TransactionLogItem } from '@/lib/db';

export type SyncState = 'synced' | 'offline' | 'pending' | 'syncing' | 'error';

interface SyncContextType {
  isOnline: boolean;
  syncState: SyncState;
  pendingLogs: TransactionLogItem[];
  pendingCount: number;
  syncNow: () => Promise<void>;
  addMockOfflineTransaction: (action?: 'CREATE_SUBMISSION' | 'UPDATE_COURSE') => Promise<void>;
  clearSyncedLogs: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingLogs, setPendingLogs] = useState<TransactionLogItem[]>([]);

  // Load logs from Dexie IndexedDB
  const refreshLogs = useCallback(async () => {
    try {
      const logs = await db.transactionLogs.toArray();
      setPendingLogs(logs);
      const pendingCount = logs.filter(l => l.status === 'pending').length;

      if (!navigator.onLine) {
        setSyncState(pendingCount > 0 ? 'pending' : 'offline');
      } else if (pendingCount > 0) {
        setSyncState('pending');
      } else {
        setSyncState('synced');
      }
    } catch (err) {
      console.error('IndexedDB read error:', err);
    }
  }, []);

  useEffect(() => {
    setIsOnline(typeof window !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      refreshLogs();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshLogs();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for PWA Offline Caching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('Asala PWA ServiceWorker registered with scope:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration notice:', err));
    }

    refreshLogs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshLogs]);

  const syncNow = async () => {
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }

    setSyncState('syncing');

    try {
      // Fetch all pending logs
      const pending = await db.transactionLogs.where('status').equals('pending').toArray();

      if (pending.length === 0) {
        setSyncState('synced');
        return;
      }

      // Simulate compressed JSON payload transmission over network
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Mark all pending logs as synced in IndexedDB
      await db.transactionLogs.where('status').equals('pending').modify({ status: 'synced' });

      await refreshLogs();
      setSyncState('synced');
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncState('error');
    }
  };

  const addMockOfflineTransaction = async (action: 'CREATE_SUBMISSION' | 'UPDATE_COURSE' = 'CREATE_SUBMISSION') => {
    const newItem: TransactionLogItem = {
      action,
      entityType: action === 'CREATE_SUBMISSION' ? 'Submission' : 'Course',
      entityId: `entity-${Math.floor(Math.random() * 1000)}`,
      payload: {
        title: action === 'CREATE_SUBMISSION' ? 'Assignment 1 Draft Submission' : 'Updated Course Syllabus',
        note: 'Buffered locally in IndexedDB',
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    await db.transactionLogs.add(newItem);
    await refreshLogs();
  };

  const clearSyncedLogs = async () => {
    await db.transactionLogs.where('status').equals('synced').delete();
    await refreshLogs();
  };

  const pendingCount = useMemo(
    () => pendingLogs.filter(l => l.status === 'pending').length,
    [pendingLogs]
  );

  const contextValue = useMemo(
    () => ({
      isOnline,
      syncState,
      pendingLogs,
      pendingCount,
      syncNow,
      addMockOfflineTransaction,
      clearSyncedLogs,
    }),
    [isOnline, syncState, pendingLogs, pendingCount, syncNow, addMockOfflineTransaction, clearSyncedLogs]
  );

  return (
    <SyncContext.Provider value={contextValue}>
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};
