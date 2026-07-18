"use client";

import React from "react";
import Link from "next/link";
import { AuthProvider, useAuth } from "@/lib/auth-context";

function NavigationContent({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  // Helper to extract initials
  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  return (
    <>
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0b0c10]/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            
            {/* Brand Logo & Name */}
            <Link href="/" className="flex items-center gap-3 cursor-pointer">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-purple-500/20">
                A
              </div>
              <span className="font-outfit text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-wide">
                Asala Hub
              </span>
            </Link>

            {/* Navigation Links */}
            {user && (
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                <Link href="/dashboard" className="hover:text-white transition-colors duration-200">
                  Dashboard
                </Link>
                <Link href="/dashboard" className="hover:text-white transition-colors duration-200">
                  Courses
                </Link>
                <span className="text-slate-600">|</span>
                <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider bg-slate-800/40 px-2 py-0.5 rounded border border-white/5">
                  {user.role}
                </span>
              </nav>
            )}

            {/* Status & Action Area */}
            <div className="flex items-center gap-4">
              {/* Sync Indicator */}
              <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase select-none">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Online
              </div>
              
              {user ? (
                <div className="flex items-center gap-3">
                  {/* Profile Indicator */}
                  <div className="h-8 w-8 rounded-full bg-indigo-600/30 border border-indigo-500/20 flex items-center justify-center font-semibold text-xs text-indigo-200" title={user.full_name}>
                    {getInitials(user.full_name)}
                  </div>
                  
                  {/* Logout Button */}
                  <button
                    onClick={logout}
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:border-rose-500/25 hover:text-rose-400 text-slate-300 font-medium transition-all duration-200 cursor-pointer"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link
                    href="/login"
                    className="text-xs px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 font-medium transition-all duration-200"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/15 transition-all duration-200"
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow flex flex-col">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-[#08090d] py-6 text-center text-xs text-slate-500">
        <p>© {new Date().getFullYear()} Asala Hub. Built for offline resilience.</p>
      </footer>
    </>
  );
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NavigationContent>{children}</NavigationContent>
    </AuthProvider>
  );
}
