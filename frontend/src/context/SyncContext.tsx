'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { db, type TransactionLogItem } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { api } from '@/lib/api';
import { useSystemMessage } from '@/hooks/useSystemMessage';
import { SystemModal } from '@/components/ui/SystemModal';

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
  const { showSystemMessage, blockingMessage, closeBlockingMessage } = useSystemMessage();

  // Load and count pending logs from Dexie IndexedDB
  const refreshLogs = useCallback(async () => {
    try {
      const logs = await db.transactionLogs.toArray();
      setPendingLogs(logs);
      const pendingCount = logs.filter(l => l.status === 'pending').length;

      if (!navigator.onLine) {
        setSyncState(pendingCount > 0 ? 'pending' : 'offline');
      } else if (pendingCount > 0) {
        setSyncState(prev => (prev === 'error' ? 'error' : 'pending'));
      } else {
        setSyncState('synced');
      }
    } catch (err) {
      console.error('IndexedDB read error:', err);
    }
  }, []);

  // Online / Offline network status event listeners
  useEffect(() => {
    setIsOnline(typeof window !== 'undefined' ? navigator.onLine : true);

    const handleOnline = () => {
      setIsOnline(true);
      showSystemMessage('WORKING_OFFLINE');
      refreshLogs();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showSystemMessage('WORKING_OFFLINE');
      refreshLogs();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register Service Worker for PWA Offline Precaching
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(reg => console.log('Asala PWA ServiceWorker registered:', reg.scope))
        .catch(err => console.warn('ServiceWorker registration notice:', err));
    }

    refreshLogs();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshLogs, showSystemMessage]);

  // Handle batch success response from FastAPI /sync/ endpoint
  const handleBatchSuccess = useCallback(
    async (pendingItems: TransactionLogItem[], serverResults: any[], startSeq: number) => {
      let serverSeqCounter = startSeq;

      for (const item of pendingItems) {
        const result = serverResults.find((r: any) => r.transaction_id === item.offlineId);

        if (result && result.status === 'rejected') {
          const errText = result.error || '';
          if (errText.includes('graded') || errText.includes('BR-4')) {
            showSystemMessage('GRADED_REJECTION');
          } else if (errText.includes('version')) {
            showSystemMessage('VERSION_CONFLICT');
            if (typeof window !== 'undefined') {
              window.dispatchEvent(
                new CustomEvent('asala:version-conflict', {
                  detail: { entityId: item.entityId, serverError: errText },
                })
              );
            }
          }
          if (item.id) {
            await db.transactionLogs.update(item.id, { status: 'failed', errorMessage: errText });
          }
        } else {
          serverSeqCounter = result?.server_sequence || serverSeqCounter + 1;
          if (item.id) {
            await db.transactionLogs.update(item.id, {
              status: 'synced',
              serverSeqNum: serverSeqCounter,
              lastAckedId: item.id,
              retryCount: 0,
            });
          }

          if (item.entityType === 'Submission' && item.entityId) {
            const sub = await db.cachedSubmissions.get(item.entityId);
            if (sub) {
              await db.cachedSubmissions.update(item.entityId, {
                syncStatus: 'synced',
                serverSeqNum: serverSeqCounter,
              });
            }
          }
        }
      }

      await refreshLogs();
      setSyncState('synced');
    },
    [refreshLogs, showSystemMessage]
  );

  // Apply exponential backoff schedule on sync failure (FR-16: 2s -> 4s -> 8s -> 16s -> 32s -> 60s)
  const handleBackoffRetry = useCallback(
    async (pendingItems: TransactionLogItem[]) => {
      showSystemMessage('SYNC_FAILED');

      for (const item of pendingItems) {
        const currentRetry = (item.retryCount || 0) + 1;
        if (currentRetry > 5) {
          if (item.id) {
            await db.transactionLogs.update(item.id, { status: 'failed', retryCount: currentRetry });
          }
        } else {
          const backoffMs = Math.min(2000 * Math.pow(2, currentRetry - 1) + Math.random() * 500, 60000);
          const nextRetry = new Date(Date.now() + backoffMs).toISOString();
          if (item.id) {
            await db.transactionLogs.update(item.id, {
              retryCount: currentRetry,
              nextRetryAt: nextRetry,
            });
          }
        }
      }

      await refreshLogs();
      setSyncState('error');
    },
    [refreshLogs, showSystemMessage]
  );

  // Core sync trigger
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      setSyncState('offline');
      showSystemMessage('WORKING_OFFLINE');
      return;
    }

    setSyncState('syncing');
    showSystemMessage('SYNC_IN_PROGRESS');

    try {
      // Find last acknowledged transaction ID for resume-from-last-ack safety (FR-16)
      const lastSynced = await db.transactionLogs
        .where('status')
        .equals('synced')
        .reverse()
        .first();
      const lastAckedId = lastSynced?.id || 0;

      // Fetch pending logs created after lastAckedId
      const pending = await db.transactionLogs
        .where('status')
        .equals('pending')
        .filter(l => (l.id || 0) > lastAckedId)
        .toArray();

      if (pending.length === 0) {
        setSyncState('synced');
        return;
      }

      const payload = {
        client_last_acked_id: lastAckedId,
        transactions: pending.map(tx => ({
          transaction_id: tx.offlineId || generateUUID(),
          entity_type: tx.entityType.toLowerCase(),
          entity_id: tx.entityId,
          action: tx.action,
          payload: tx.payload,
          client_timestamp: tx.timestamp,
          schema_version: 2,
        })),
      };

      try {
        const res = await api.post('/sync/', payload);
        const serverResults = res.data && Array.isArray(res.data.results) ? res.data.results : [];
        const startSeq = (lastSynced?.serverSeqNum || 100) + 1;
        await handleBatchSuccess(pending, serverResults, startSeq);
      } catch (netErr: any) {
        console.warn('Network sync POST failed, activating exponential backoff schedule:', netErr);
        await handleBackoffRetry(pending);
      }
    } catch (err) {
      console.error('Sync process error:', err);
      setSyncState('error');
      showSystemMessage('SYNC_FAILED');
    }
  }, [refreshLogs, showSystemMessage, handleBatchSuccess, handleBackoffRetry]);

  // Backoff retry timer listener (Task 4)
  useEffect(() => {
    if (syncState !== 'error') return;

    const earliestRetryLog = pendingLogs
      .filter(l => l.status === 'pending' && l.nextRetryAt)
      .sort((a, b) => a.nextRetryAt!.localeCompare(b.nextRetryAt!))[0];

    if (!earliestRetryLog || !earliestRetryLog.nextRetryAt) return;

    const delay = Math.max(100, new Date(earliestRetryLog.nextRetryAt).getTime() - Date.now());
    const timer = setTimeout(() => {
      if (navigator.onLine) {
        syncNow();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [syncState, pendingLogs, syncNow]);

  const addMockOfflineTransaction = async (action: 'CREATE_SUBMISSION' | 'UPDATE_COURSE' = 'CREATE_SUBMISSION') => {
    const offlineUuid = generateUUID();
    const newItem: TransactionLogItem = {
      offlineId: offlineUuid,
      action,
      entityType: action === 'CREATE_SUBMISSION' ? 'Submission' : 'Course',
      entityId: offlineUuid,
      payload: {
        title: action === 'CREATE_SUBMISSION' ? 'Assignment Draft Submission' : 'Updated Course Syllabus',
        note: 'Buffered locally in IndexedDB with UUID v4',
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
      {blockingMessage && (
        <SystemModal
          isOpen={blockingMessage.isOpen}
          onClose={closeBlockingMessage}
          title={blockingMessage.title}
          body={blockingMessage.body}
          type={blockingMessage.type}
        />
      )}
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
