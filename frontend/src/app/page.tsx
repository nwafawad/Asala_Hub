'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/shell/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard, SkeletonList } from '@/components/ui/Skeletons';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { BookOpen, FileText, Database, ShieldCheck, Plus, RefreshCw, Layers } from 'lucide-react';

export default function Home() {
  const { t } = useI18n();
  const { pendingCount, isOnline, syncState, addMockOfflineTransaction, syncNow } = useSync();
  const { showToast } = useOverlay();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AppShell>
      {(activeTab) => (
        <div className="flex flex-col gap-8 max-w-7xl mx-auto">
          {/* Header Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold font-heading text-foreground">
                  {t.appName} — Phase 1 Shell Foundation
                </h2>
                <StatusPill
                  label={isOnline ? 'Network Connected' : 'Campus Intranet Offline'}
                  variant={isOnline ? 'success' : 'warning'}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                IndexedDB browser storage active · Workbox Service Worker ready · Flat compressed JSON sync engine
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={async () => {
                  await addMockOfflineTransaction('CREATE_SUBMISSION');
                  showToast('Log added to IndexedDB', 'info', 'Saved transaction log offline.');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Simulate Offline Draft</span>
              </button>
              <button
                onClick={async () => {
                  showToast('Syncing deltas...', 'info');
                  await syncNow();
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-foreground text-xs font-semibold hover:bg-muted transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 text-primary" />
                <span>Trigger Sync</span>
              </button>
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {isLoading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : (
              <>
                <StatCard
                  title={t.stats.totalCourses}
                  value={12}
                  subtitle="Cached for offline access"
                  icon={BookOpen}
                  trend={{ value: '2 new', isPositive: true }}
                />
                <StatCard
                  title={t.stats.offlineDrafts}
                  value={pendingCount}
                  subtitle="In IndexedDB transaction queue"
                  icon={FileText}
                  trend={{ value: `${pendingCount} pending`, isPositive: pendingCount === 0 }}
                />
                <StatCard
                  title={t.stats.queuedDeltas}
                  value={pendingCount > 0 ? `${pendingCount} payloads` : 'Clean'}
                  subtitle="Compressed flat JSON"
                  icon={Database}
                />
                <StatCard
                  title={t.stats.systemHealth}
                  value={syncState.toUpperCase()}
                  subtitle="SRS TLS 1.2+ / LAN HTTP protocol"
                  icon={ShieldCheck}
                  trend={{ value: '100% stable', isPositive: true }}
                />
              </>
            )}
          </div>

          {/* Foundation Shell Demonstrations */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Navigation Preview */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
                  <Layers className="w-4 h-4 text-primary" />
                  Active View State
                </h3>
                <StatusPill label={activeTab} variant="info" />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Navigation tab toggles seamless view rendering inside the shell layout container with support for full RTL/LTR dynamic text direction.
              </p>
              <div className="p-4 rounded-xl bg-muted/40 border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Current Language:</span>
                  <span className="font-semibold text-foreground">
                    {t.actions.switchLanguage === 'English' ? 'العربية (Arabic)' : 'English'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Text Direction:</span>
                  <span className="font-semibold text-foreground">
                    {t.actions.switchLanguage === 'English' ? 'RTL' : 'LTR'}
                  </span>
                </div>
              </div>
            </div>

            {/* Skeleton & UI Primitives */}
            <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4 lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <h3 className="text-base font-semibold font-heading text-foreground">
                  Design Tokens & UI Status Pills
                </h3>
                <span className="text-xs text-muted-foreground">Component Library</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusPill label="Synced (Success)" variant="success" />
                <StatusPill label="Pending Sync (Warning)" variant="warning" dotAnimation />
                <StatusPill label="Sync Error (Danger)" variant="danger" />
                <StatusPill label="Syncing... (Info)" variant="info" dotAnimation />
                <StatusPill label="Offline Cache (Neutral)" variant="neutral" />
              </div>

              <div className="mt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Skeleton Loading Placeholder State
                </h4>
                <SkeletonList count={2} />
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
