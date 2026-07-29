'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { db, type TransactionLogItem } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { api } from '@/lib/api';
import { CURRENT_SCHEMA_VERSION } from '@/types/api';
import { useSystemMessage } from '@/hooks/useSystemMessage';
import { SystemModal } from '@/components/ui/SystemModal';

export type SyncState = 'synced' | 'offline' | 'pending' | 'syncing' | 'error';

interface SyncContextType {
  isOnline: boolean;
  syncState: SyncState;
  pendingLogs: TransactionLogItem[];
  pendingCount: number;
  pendingSubmissionsCount: number;
  syncNow: () => Promise<void>;
  addMockOfflineTransaction: (action?: 'CREATE_SUBMISSION' | 'UPDATE_COURSE') => Promise<void>;
  clearSyncedLogs: () => Promise<void>;
  refreshLogs: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncState, setSyncState] = useState<SyncState>('synced');
  const [pendingLogs, setPendingLogs] = useState<TransactionLogItem[]>([]);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState<number>(0);
  const { showSystemMessage, blockingMessage, closeBlockingMessage } = useSystemMessage();
  // Bug #2: mutex ref — prevents concurrent sync requests from rapid clicks or simultaneous online events
  const isSyncingRef = useRef<boolean>(false);
  // Stable ref to always hold the latest syncNow — avoids hoisting/forward-declaration errors in the
  // network useEffect while still calling the most up-to-date version (no stale closure).
  const syncNowRef = useRef<() => Promise<void>>(async () => {});

  // Load and count pending logs from Dexie IndexedDB
  const refreshLogs = useCallback(async () => {
    try {
      const [logs, subs] = await Promise.all([
        db.transactionLogs.toArray(),
        db.cachedSubmissions.toArray(),
      ]);
      setPendingLogs(logs);
      const pendingCount = logs.filter(l => l.status === 'pending').length;
      const pendingSubs = subs.filter(s => s.syncStatus === 'pending').length;
      setPendingSubmissionsCount(pendingSubs);

      if (!navigator.onLine) {
        setSyncState(pendingCount > 0 || pendingSubs > 0 ? 'pending' : 'offline');
      } else if (pendingCount > 0 || pendingSubs > 0) {
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
      // Bug #1: coming back online should trigger a sync, not show the offline modal
      refreshLogs();
      syncNowRef.current();
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
            await db.transactionLogs.update(item.id, {
              status: 'failed',
              errorMessage: errText,
              serverSeqNum: result?.server_sequence || undefined,
            });
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
    // Bug #2: guard against re-entrant concurrent sync operations
    if (isSyncingRef.current || !navigator.onLine) {
      if (!navigator.onLine) {
        setSyncState('offline');
        showSystemMessage('WORKING_OFFLINE');
      }
      return;
    }
    isSyncingRef.current = true;
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
          transaction_id: tx.offlineId,
          entity_type: tx.entityType.toLowerCase(),
          entity_id: tx.entityId,
          action: tx.action,
          payload: tx.payload,
          client_timestamp: tx.timestamp,
          schema_version: CURRENT_SCHEMA_VERSION,
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
    } finally {
      // Bug #2: always release the mutex so future syncs can proceed
      isSyncingRef.current = false;
    }
  }, [refreshLogs, showSystemMessage, handleBatchSuccess, handleBackoffRetry]);

  // Keep syncNowRef current so the network useEffect always calls the latest version
  useEffect(() => {
    syncNowRef.current = syncNow;
  }, [syncNow]);

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

  // Periodic Grade Pull Heartbeat (every 30s when online)
  useEffect(() => {
    if (!isOnline) return;

    const pullGrades = async () => {
      try {
        const token = localStorage.getItem('asala_token') || sessionStorage.getItem('asala_token');
        if (!token || token.startsWith('offline-token-')) return;

        const res = await api.get('/assignments/my-submissions', {
          headers: { 'X-Suppress-401-Event': 'true' },
        }).catch(() => null);

        if (res?.data && Array.isArray(res.data)) {
          for (const sub of res.data) {
            const cached = await db.cachedSubmissions.get(sub.id);
            if (cached && sub.grade !== null && sub.grade !== undefined && cached.score !== sub.grade) {
              await db.cachedSubmissions.update(sub.id, {
                score: sub.grade,
                gradeStatus: 'graded',
                syncStatus: 'synced',
              });
            }
          }
        }
      } catch {
        // Silent catch for background heartbeat
      }
    };

    const interval = setInterval(pullGrades, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

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
      pendingSubmissionsCount,
      syncNow,
      addMockOfflineTransaction,
      clearSyncedLogs,
      refreshLogs,
    }),
    [
      isOnline,
      syncState,
      pendingLogs,
      pendingCount,
      pendingSubmissionsCount,
      syncNow,
      addMockOfflineTransaction,
      clearSyncedLogs,
      refreshLogs,
    ]
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
