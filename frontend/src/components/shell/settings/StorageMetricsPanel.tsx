'use client';

import React from 'react';
import { Database, HardDrive, RefreshCw } from 'lucide-react';

interface StorageMetricsPanelProps {
  usedMb: number;
  quotaMb: number;
  usagePercent: number;
  queueSize: number;
  daysSinceLastSync: number;
  onRefreshStorage: () => void;
}

export const StorageMetricsPanel: React.FC<StorageMetricsPanelProps> = ({
  usedMb,
  quotaMb,
  usagePercent,
  queueSize,
  daysSinceLastSync,
  onRefreshStorage,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold font-heading text-foreground">
            Local Storage & Offline Vault (IndexedDB)
          </h3>
        </div>
        <button
          onClick={onRefreshStorage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-primary" />
          <span>Refresh Storage</span>
        </button>
      </div>

      {/* Storage Quota Progress Bar */}
      <div className="flex flex-col gap-2 p-4 rounded-xl bg-background border border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-foreground flex items-center gap-1.5">
            <HardDrive className="w-4 h-4 text-primary" />
            Device Quota Used
          </span>
          <span className="font-bold text-foreground">
            {usedMb} MB / {quotaMb} MB ({usagePercent}%)
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              usagePercent > 80 ? 'bg-rose-500' : usagePercent > 50 ? 'bg-amber-500' : 'bg-primary'
            }`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Storage Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl border border-border bg-background flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Pending Sync Transactions</span>
          <span className="text-lg font-bold text-foreground">{queueSize} Items</span>
        </div>
        <div className="p-4 rounded-xl border border-border bg-background flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Days Since Last Server Sync</span>
          <span className="text-lg font-bold text-foreground">{daysSinceLastSync} Days</span>
        </div>
      </div>
    </div>
  );
};
