'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { db } from '@/lib/db';
import { useOverlay } from './OverlayContext';

interface StorageContextType {
  usedMb: number;
  quotaMb: number;
  usagePercent: number;
  isNearFull: boolean;       // > 80% usage OR < 50MB remaining (NFR-13)
  queueSize: number;
  isQueueFull: boolean;      // >= 150 pending transactions (FR-18)
  isPersisted: boolean;
  daysSinceLastSync: number;
  refreshStorageEstimate: () => Promise<void>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [usedMb, setUsedMb] = useState<number>(0);
  const [quotaMb, setQuotaMb] = useState<number>(500);
  const [usagePercent, setUsagePercent] = useState<number>(0);
  const [isNearFull, setIsNearFull] = useState<boolean>(false);
  const [queueSize, setQueueSize] = useState<number>(0);
  const [isQueueFull, setIsQueueFull] = useState<boolean>(false);
  const [isPersisted, setIsPersisted] = useState<boolean>(false);
  const [daysSinceLastSync, setDaysSinceLastSync] = useState<number>(0);
  const { showToast } = useOverlay();

  const refreshStorageEstimate = useCallback(async () => {
    try {
      // 1. Storage Quota Estimate via Web Storage API
      if (typeof window !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const used = Math.round(((estimate.usage || 0) / (1024 * 1024)) * 10) / 10;
        const rawQuota = Math.round(((estimate.quota || 524288000) / (1024 * 1024)) * 10) / 10;
        const quota = Math.min(500, rawQuota > 0 ? rawQuota : 500); // SRS app storage budget cap: 500 MB
        const remainingMb = quota - used;
        const percent = Math.min(100, Math.round((used / quota) * 100));

        setUsedMb(used);
        setQuotaMb(quota);
        setUsagePercent(percent);

        // Blocking trigger criteria: usage > 80% OR remaining disk space < 50MB
        const nearFull = percent > 80 || remainingMb < 50;
        setIsNearFull(nearFull);
      }

      // 2. Request Persistent Storage on First Launch (FR-18)
      if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
        const persisted = await navigator.storage.persisted();
        if (!persisted) {
          const granted = await navigator.storage.persist();
          setIsPersisted(granted);
        } else {
          setIsPersisted(true);
        }
      }

      // 3. Monitor Dexie IndexedDB Transaction Queue Size
      const pendingCount = await db.transactionLogs.where('status').equals('pending').count();
      setQueueSize(pendingCount);
      setIsQueueFull(pendingCount >= 150);

      // 4. Track Days Since Last Successful Sync (30-day offline cap per FR-18)
      const syncedItems = await db.transactionLogs
        .where('status')
        .equals('synced')
        .sortBy('id');
      // Take the item with the highest id for strict sequence ordering (Security #3)
      const lastSyncedItem = syncedItems[syncedItems.length - 1];

      if (lastSyncedItem && lastSyncedItem.timestamp) {
        const diffMs = Date.now() - new Date(lastSyncedItem.timestamp).getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        setDaysSinceLastSync(days);
      } else {
        setDaysSinceLastSync(0);
      }
    } catch (err) {
      console.warn('Storage estimate refresh notice:', err);
    }
  }, []);

  useEffect(() => {
    refreshStorageEstimate();

    // Periodic storage monitoring interval (every 60s)
    const intervalId = setInterval(refreshStorageEstimate, 60000);
    return () => clearInterval(intervalId);
  }, [refreshStorageEstimate]);

  const value = useMemo(
    () => ({
      usedMb,
      quotaMb,
      usagePercent,
      isNearFull,
      queueSize,
      isQueueFull,
      isPersisted,
      daysSinceLastSync,
      refreshStorageEstimate,
    }),
    [
      usedMb,
      quotaMb,
      usagePercent,
      isNearFull,
      queueSize,
      isQueueFull,
      isPersisted,
      daysSinceLastSync,
      refreshStorageEstimate,
    ]
  );

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

export const useStorage = () => {
  const context = useContext(StorageContext);
  if (!context) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
