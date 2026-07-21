"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

export type SyncStatusType = "synced" | "pending" | "syncing" | "error";

interface ConnectivityContextType {
  isOnline: boolean;
  lastOnlineAt: Date | null;
  syncStatus: SyncStatusType;
  triggerSync: () => Promise<void>;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusType>("synced");
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize checkConnection to avoid recreating it on every render
  const checkConnection = useCallback(async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    
    let timeoutId: NodeJS.Timeout | undefined;
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const controller = new AbortController();
      
      // Setup connection timeout
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
      // Ensure the timeout is cleared even if fetch throws/rejects
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
      
      const handleOnline = () => {
        checkConnection();
      };
      
      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Perform initial check
      checkConnection();

      // Setup heartbeat check every 30 seconds
      const interval = setInterval(checkConnection, 30000);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        clearInterval(interval);
      };
    }
  }, [checkConnection]);

  // Memoize triggerSync to prevent referential changes from triggering child renders
  const triggerSync = useCallback(async () => {
    if (!isOnline) return;
    setSyncStatus("syncing");
    
    // Clear any existing sync simulation timer
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Simulate sync time (Sprint 2/3 will implement the actual queue sync)
    syncTimeoutRef.current = setTimeout(() => {
      setSyncStatus("synced");
      
      // Dispatch a custom sync success event for banners
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asala-sync-success"));
      }
    }, 1500);
  }, [isOnline]);

  const prevOnlineRef = useRef(isOnline);

  // Automatically trigger sync only when transitioning from offline -> online
  useEffect(() => {
    const wasOffline = !prevOnlineRef.current;
    prevOnlineRef.current = isOnline;

    if (wasOffline && isOnline) {
      const timeoutId = window.setTimeout(() => {
        triggerSync();
      }, 0);

      return () => window.clearTimeout(timeoutId);
    }
  }, [isOnline, triggerSync]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ConnectivityContext.Provider value={{ isOnline, lastOnlineAt, syncStatus, triggerSync }}>
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
