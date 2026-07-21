"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { syncPendingTransactions } from "./sync";

export type SyncStatusType = "synced" | "pending" | "syncing" | "error";

interface ConnectivityContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  syncStatus: SyncStatusType;
  pendingSyncCount: number;
  triggerSync: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof window !== "undefined" ? navigator.onLine : true
  );
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>("synced");

  // Live query to track count of pending unsynced logs in IndexedDB
  const pendingSyncCount =
    useLiveQuery(
      () => (typeof window !== "undefined" ? db.transactionLogs.filter((log) => log.synced_at == null).count() : 0),
      []
    ) ?? 0;

  const checkConnection = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }

    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const controller = new AbortController();

      timeoutId = setTimeout(() => controller.abort(), 4000);

      const response = await fetch(`${apiBase}/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });

      if (response.ok) {
        setIsOnline(true);
        setLastOnlineAt(new Date());
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => {
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const initialCheckId = window.setTimeout(() => {
      checkConnection();
    }, 0);

    const intervalId = setInterval(checkConnection, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.clearTimeout(initialCheckId);
      clearInterval(intervalId);
    };
  }, [checkConnection]);

  const triggerSync = useCallback(async () => {
    if (typeof window === "undefined" || !navigator.onLine) return;

    setSyncStatus("syncing");

    try {
      const { syncedCount, errors } = await syncPendingTransactions();

      if (errors > 0) {
        setSyncStatus("error");
      } else {
        setSyncStatus("synced");
      }

      if (syncedCount > 0 && typeof window !== "undefined") {
        window.dispatchEvent(new Event("asala-sync-success"));
      }
    } catch (err) {
      console.error("[ConnectivityContext] Failed to trigger sync:", err);
      setSyncStatus("error");
    }
  }, []);

  const prevOnlineRef = useRef(isOnline);

  // Automatically trigger sync when transitioning from offline to online
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (wasOffline && isOnline) {
      const timeoutId = window.setTimeout(() => {
        triggerSync();
      }, 500);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isOnline, triggerSync]);

  // Periodic background auto-sync check if online and there are pending items queued
  useEffect(() => {
    if (typeof window === "undefined" || !isOnline || pendingSyncCount === 0) return;

    const syncIntervalId = setInterval(() => {
      triggerSync();
    }, 60000);

    return () => clearInterval(syncIntervalId);
  }, [isOnline, pendingSyncCount, triggerSync]);

  return (
    <ConnectivityContext.Provider
      value={{
        isOnline,
        lastOnlineAt,
        syncStatus,
        pendingSyncCount,
        triggerSync,
      }}
    >
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error("useConnectivity must be used within a ConnectivityProvider");
  }
  return context;
}
