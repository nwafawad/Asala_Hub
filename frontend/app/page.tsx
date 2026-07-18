"use client";

import { useEffect, useState } from "react";

interface HealthResponse {
  status: string;
}

export default function Home() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        // Next.js client-side call to the backend API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const res = await fetch(`${apiUrl}/health`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        setHealth(data);
        setError(null);
      } catch (err: any) {
        console.error("Health check fetch failed:", err);
        setError(err.message || "Failed to connect to the backend server.");
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
  }, []);

  return (
    <div className="space-y-12 py-6">
      
      {/* Hero Welcome Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-900 via-indigo-950 to-zinc-950 text-white p-8 md:p-12 shadow-2xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-400/20">
            Sprint 1: Architecture & Scaffold
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Education has <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              No Boundaries
            </span>
          </h1>
          <p className="text-slate-300 text-lg leading-relaxed">
            Welcome to Asala Hub's initial skeleton. We are establishing the bedrock structure for a high-performance, offline-capable learning experience.
          </p>
        </div>
      </div>

      {/* Connection Verification Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* API Connection Health Panel */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Backend Connectivity Test</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
              Proving communication between Next.js and FastAPI containerized services.
            </p>
            
            {/* Status display */}
            <div className="mt-6 p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 min-h-[100px] flex items-center justify-center">
              {loading ? (
                <div className="flex items-center space-x-2 text-indigo-400">
                  <svg className="animate-spin h-5 w-5 text-indigo-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Pinging API server...</span>
                </div>
              ) : error ? (
                <div className="space-y-2 text-rose-400 w-full text-left">
                  <div className="font-bold">❌ Connection Failed</div>
                  <div className="opacity-95">{error}</div>
                  <div className="text-[10px] text-slate-500 mt-2">
                    Check if the docker services are fully up: <code className="bg-slate-800 px-1 py-0.5 rounded text-slate-300">docker compose up</code>.
                  </div>
                </div>
              ) : (
                <div className="w-full text-left space-y-2">
                  <div className="text-emerald-400 font-bold flex items-center space-x-1">
                    <span>⚡ Connection Successful</span>
                  </div>
                  <pre className="text-slate-300 bg-slate-950 p-3 rounded-lg overflow-x-auto">
                    {JSON.stringify(health, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center text-xs text-slate-500 dark:text-zinc-400">
            <span>Target: <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">/health</code></span>
            <span>Method: <code className="bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded font-mono">GET</code></span>
          </div>
        </div>

        {/* Database Status Panel */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl p-6 shadow-sm border border-slate-200/50 dark:border-zinc-800/50 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 flex items-center space-x-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <span>Database Schema</span>
            </h2>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mt-2">
              PostgreSQL schema entities configured for SQLModel auto-migration.
            </p>
            
            <ul className="mt-6 space-y-2">
              {["User", "Course", "Module", "Assignment", "Submission", "TransactionLog"].map((table) => (
                <li key={table} className="flex items-center justify-between text-sm px-3 py-2 rounded-lg bg-slate-50 dark:bg-zinc-800/30 border border-slate-100 dark:border-zinc-800/30">
                  <span className="font-semibold text-slate-700 dark:text-zinc-300">{table}</span>
                  <span className="text-xs bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
                    UUID Key
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-zinc-800 text-xs text-slate-500 dark:text-zinc-400">
            <span>Provider: PostgreSQL 16</span>
          </div>
        </div>

      </div>

      {/* Feature Preview Grid */}
      <div>
        <h3 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mb-6">Upcoming Offline Features</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-zinc-100">Local Transaction Log</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Mutations are captured locally in IndexedDB as append-only transaction logs while network connectivity is unavailable.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-zinc-100">Sync Manager</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              When network connection returns, the Sync Engine pushes pending transactions in order, resolving conflicts gracefully.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800/50 space-y-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h4 className="font-bold text-slate-800 dark:text-zinc-100">Asset Cache</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
              Service worker caching for offline access to static scripts, styles, and structured text lessons.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
