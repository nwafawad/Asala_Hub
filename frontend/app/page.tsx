"use client";

import { useEffect, useState } from "react";

interface HealthStatus {
  status: string;
  [key: string]: any;
}

export default function HomePage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("http://localhost:8000/health");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
    } catch (err: any) {
      setError(err.message || "Failed to reach backend API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 py-16 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]">
      <div className="w-full max-w-2xl text-center space-y-8">
        
        {/* Hero Section */}
        <div className="space-y-4">
          <h1 className="font-outfit text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-none">
            Welcome to <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">Asala Hub</span>
          </h1>
          <p className="max-w-md mx-auto text-slate-400 text-sm sm:text-base leading-relaxed">
            Day 1 Scaffold: Testing cross-container database integration and application framework setup.
          </p>
        </div>

        {/* Integration Status Card */}
        <div className="relative group rounded-2xl border border-white/5 bg-[#12131a]/85 p-8 shadow-2xl backdrop-blur-sm overflow-hidden">
          {/* Decorative background glow */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-indigo-500/10 blur-3xl group-hover:bg-indigo-500/20 transition-all duration-500"></div>
          
          <div className="relative space-y-6">
            <h2 className="font-outfit text-lg font-semibold text-white tracking-wide">
              Backend Integration Status
            </h2>

            {/* API Fetch States */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-6 space-y-3">
                <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <span className="text-xs text-slate-400 font-medium">Checking connection to http://localhost:8000/health...</span>
              </div>
            )}

            {!loading && error && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-5 text-left space-y-3">
                <div className="flex items-center gap-3 text-rose-400 font-semibold text-sm">
                  <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>Backend Unreachable</span>
                </div>
                <p className="text-xs text-rose-300/80 leading-relaxed">
                  Could not fetch health check from <code className="bg-rose-950/40 px-1 py-0.5 rounded text-rose-300 font-mono text-[11px]">http://localhost:8000/health</code>. Ensure that Docker containers are running and the port mapping is active.
                </p>
                <div className="pt-2">
                  <button 
                    onClick={fetchHealth}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-semibold transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              </div>
            )}

            {!loading && health && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-5 text-left flex items-start gap-4">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-semibold text-emerald-400 text-sm">Successfully Connected</h3>
                    <p className="text-xs text-emerald-300/80">
                      The Next.js container has successfully resolved communication with the FastAPI container!
                    </p>
                  </div>
                </div>

                {/* API Payload View */}
                <div className="text-left space-y-2">
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payload Response</span>
                  <pre className="rounded-xl border border-white/5 bg-black/40 p-4 font-mono text-xs text-indigo-300 overflow-x-auto">
                    {JSON.stringify(health, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Next Steps / Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div className="p-5 rounded-xl border border-white/5 bg-[#12131a]/40 hover:bg-[#12131a]/60 transition-colors">
            <h4 className="font-semibold text-white text-sm mb-1">SQLModel & Alembic</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Schema migrations ready. Postgres initialized with 6 core tables.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-[#12131a]/40 hover:bg-[#12131a]/60 transition-colors">
            <h4 className="font-semibold text-white text-sm mb-1">Docker Environment</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Hot-reloaded frontend, backend and database services configured.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
