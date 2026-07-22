"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { ConnectivityProvider, useConnectivity } from "@/lib/connectivity-context";
import { LangProvider } from "@/lib/lang-context";
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

  const getInitials = (name?: string) => {
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

  // Check if we are rendering student dashboard (which has its own mockup shell & signature sync strip)
  const isStudentView = user?.role === "student" && pathname.startsWith("/dashboard");

  return (
    <div className="min-h-screen flex flex-col bg-surface-base text-text-primary font-sans antialiased">
      {/* Header Navigation Bar — Shown when not in dedicated mockup view */}
      {!isStudentView && (
        <header className="sticky top-0 z-50 w-full border-b border-border-card bg-surface-card">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-14 items-center justify-between gap-4">
              
              {/* Brand Logo & Wordmark */}
              <Link href="/" className="flex items-center gap-2 cursor-pointer shrink-0">
                <div className="h-8 w-8 bg-[#1C2321] flex items-center justify-center font-bold text-white text-base rounded">
                  A
                </div>
                <span className="font-heading text-lg font-extrabold text-text-primary tracking-wide">
                  Asala Hub
                </span>
              </Link>

              {/* Navigation Links */}
              {user && (
                <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
                  <Link 
                    href="/dashboard" 
                    className={`py-4 hover:text-accent-teal ${
                      isLinkActive("/dashboard") 
                        ? "text-text-primary border-b-2 border-accent-teal font-extrabold" 
                        : "text-text-secondary"
                    }`}
                  >
                    Dashboard
                  </Link>
                  <span className="text-text-muted/40">|</span>
                  <span className="text-xs font-bold uppercase tracking-wider bg-surface-base border border-border-card px-2 py-0.5 rounded text-text-primary">
                    {user.role}
                  </span>
                </nav>
              )}

              {/* Connectivity Status & User Avatar */}
              <div className="flex items-center gap-4">
                {/* Online/Offline Status Chip */}
                <div className={`px-2.5 py-0.5 border text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 rounded ${
                  isOnline
                    ? "bg-[#E4EEEC] border-[#D6DCD9] text-[#1F4E45]"
                    : "bg-[#FBF1DE] border-[#E4E7E4] text-[#8A5A05]"
                }`}>
                  <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-[#1F4E45]" : "bg-[#8A5A05]"}`}></span>
                  {isOnline ? "Online" : "Offline"}
                </div>

                {/* Pending Queue Count Badge */}
                {pendingSyncCount > 0 && (
                  <button
                    onClick={() => triggerSync()}
                    className="px-2.5 py-0.5 border border-border-input bg-surface-base text-text-primary text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer hover:bg-surface-card rounded"
                    title="Click to sync queued mutations now"
                  >
                    <span>📦</span> {pendingSyncCount} Pending
                  </button>
                )}

                {/* User authentication indicators */}
                {user ? (
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-7 w-7 bg-surface-base border border-border-card flex items-center justify-center font-bold text-xs text-text-primary rounded-full" 
                      title={user.full_name}
                    >
                      {getInitials(user.full_name)}
                    </div>
                    <button
                      onClick={logout}
                      className="text-xs px-2.5 py-1 rounded border border-border-input bg-surface-card hover:bg-accent-danger hover:text-white font-medium cursor-pointer"
                    >
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Link
                      href="/login"
                      className="text-xs px-2.5 py-1 rounded border border-border-input bg-surface-card hover:bg-surface-base text-text-primary font-medium"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="text-xs px-2.5 py-1 rounded bg-[#2F6F63] hover:bg-[#265A50] text-white font-medium"
                    >
                      Register
                    </Link>
                  </div>
                )}
              </div>

            </div>
          </div>
        </header>
      )}

      {/* Sync Success Alert Banner */}
      {showSyncSuccess && !isStudentView && (
        <div role="status" aria-live="polite" className="bg-[#E4EEEC] border-b border-[#D6DCD9] px-4 py-2 text-center text-xs text-[#1F4E45] font-extrabold flex items-center justify-center gap-2">
          <span>✓</span> {syncMessage}
        </div>
      )}

      {/* Graceful Offline Warning Banner (for non-student views) */}
      {!isOnline && !isStudentView && (
        <div role="status" aria-live="polite" className="bg-[#FBF1DE] border-b border-[#E4E7E4] px-4 py-2 text-center text-xs text-[#8A5A05] font-bold tracking-wide">
          <span>⚠️</span> Offline Mode — Syllabus is loaded from local memory.
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer (hidden in dedicated mockup view to avoid duplicate footer) */}
      {!isStudentView && (
        <footer className="border-t border-border-card bg-surface-card py-4 text-center text-[10px] text-text-muted font-medium">
          <p>© {new Date().getFullYear()} Asala Hub. Built for offline resilience.</p>
        </footer>
      )}
    </div>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ConnectivityProvider>
        <LangProvider>
          <ServiceWorkerRegister />
          <NavigationContent>{children}</NavigationContent>
        </LangProvider>
      </ConnectivityProvider>
    </AuthProvider>
  );
}
