"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

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

  const checkConnection = async () => {
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOnline(false);
      return;
    }
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(`${apiBase}/health`, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(id);
      
      if (response.ok) {
        setIsOnline(true);
        setLastOnlineAt(new Date());
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    }
  };

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
  }, []);

  const triggerSync = async () => {
    if (!isOnline) return;
    setSyncStatus("syncing");
    
    // Simulate sync time (Sprint 2/3 will implement the actual queue sync)
    setTimeout(() => {
      setSyncStatus("synced");
      
      // Dispatch a custom sync success event for banners
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("asala-sync-success"));
      }
    }, 1500);
  };

  // Automatically trigger sync when turning back online
  useEffect(() => {
    if (isOnline) {
      triggerSync();
    }
  }, [isOnline]);

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
