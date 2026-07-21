"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ConnectivityProvider, useConnectivity } from "@/lib/connectivity-context";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

function NavigationContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { isOnline, pendingSyncCount, triggerSync } = useConnectivity();
  const pathname = usePathname();
  
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  useEffect(() => {
    const handleSyncSuccess = () => {
      setSyncMessage("Data synchronized successfully!");
      setShowSyncSuccess(true);
      const timer = setTimeout(() => setShowSyncSuccess(false), 5000);
      return () => clearTimeout(timer);
    };

    window.addEventListener("asala-sync-success", handleSyncSuccess);
    return () => {
      window.removeEventListener("asala-sync-success", handleSyncSuccess);
    };
  }, []);

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const isLinkActive = (path: string) => {
    return pathname === path;
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-base text-text-body font-sans antialiased">
      {/* Header Navigation Bar - Flat borders, no blurs/shadows */}
      <header className="sticky top-0 z-50 w-full border-b border-accent-muted bg-surface-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between gap-4">
            
            {/* Brand Logo & Wordmark */}
            <Link href="/" className="flex items-center gap-2 cursor-pointer shrink-0">
              <div className="h-8 w-8 bg-text-heading flex items-center justify-center font-bold text-white text-base">
                A
              </div>
              <span className="font-heading text-lg font-extrabold text-text-heading tracking-wide">
                Asala Hub
              </span>
            </Link>

            {/* Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
                <Link 
                  href="/dashboard" 
                  className={`py-4 hover:text-accent-focus ${
                    isLinkActive("/dashboard") 
                      ? "text-text-heading border-b-2 border-accent-focus font-extrabold" 
                      : "text-text-body"
                  }`}
                >
                  Dashboard
                </Link>
                <span className="text-accent-muted/40">|</span>
                <span className="text-xs font-bold uppercase tracking-wider bg-surface-base border border-accent-muted px-2 py-0.5 rounded text-text-body">
                  {user.role}
                </span>
              </nav>
            )}

            {/* Connectivity Status & User Avatar */}
            <div className="flex items-center gap-4">
              {/* Online/Offline Status Chip */}
              <div className={`px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 ${
                isOnline
                  ? "bg-accent-highlight border-accent-muted text-text-on-highlight"
                  : "bg-surface-base border-accent-muted text-text-body"
              }`}>
                <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-text-on-highlight" : "bg-accent-muted"}`}></span>
                {isOnline ? "Online" : "Offline"}
              </div>

              {/* Pending Queue Count Badge */}
              {pendingSyncCount > 0 && (
                <button
                  onClick={() => triggerSync()}
                  className="px-2.5 py-0.5 border border-accent-muted bg-surface-base text-text-heading text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-surface-card"
                  title="Click to sync queued mutations now"
                >
                  <span>📦</span> {pendingSyncCount} Pending
                </button>
              )}

              {/* User authentication indicators */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div 
                    className="h-7 w-7 bg-surface-base border border-accent-muted flex items-center justify-center font-bold text-xs text-text-heading" 
                    title={user.full_name}
                  >
                    {getInitials(user.full_name)}
                  </div>
                  <button
                    onClick={logout}
                    className="text-xs px-2.5 py-1 rounded border border-accent-muted bg-surface-card hover:bg-accent-danger hover:text-white font-bold cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="text-xs px-2.5 py-1 rounded border border-accent-muted bg-surface-card hover:bg-surface-base text-text-body font-bold"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-xs px-2.5 py-1 rounded bg-text-heading hover:bg-accent-focus text-white font-bold"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Sync Success Alert Banner */}
      {showSyncSuccess && (
        <div role="status" aria-live="polite" className="bg-accent-highlight border-b border-accent-muted px-4 py-2 text-center text-xs text-text-on-highlight font-extrabold flex items-center justify-center gap-2">
          <span>✓</span> {syncMessage}
        </div>
      )}

      {/* Graceful Offline Warning Banner */}
      {!isOnline && (
        <div role="status" aria-live="polite" className="bg-surface-card border-b border-accent-danger px-4 py-2 text-center text-xs text-accent-danger font-bold tracking-wide">
          <span>⚠️</span> Offline Mode — Syllabus is loaded from local memory.
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-accent-muted bg-surface-card py-4 text-center text-[10px] text-accent-muted font-bold">
        <p>© {new Date().getFullYear()} Asala Hub. Built for offline resilience.</p>
      </footer>
    </div>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConnectivityProvider>
        <ServiceWorkerRegister />
        <NavigationContent>{children}</NavigationContent>
      </ConnectivityProvider>
    </AuthProvider>
  );
}
