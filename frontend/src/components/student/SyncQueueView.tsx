'use client';

import React, { useState, useMemo } from 'react';
import { useSync } from '@/context/SyncContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { type TransactionLogItem, db } from '@/lib/db';
import {
  RefreshCw,
  PlusCircle,
  Trash2,
  Database,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Filter,
  Layers,
  LayoutList,
  LayoutGrid,
  ExternalLink,
} from 'lucide-react';

export const SyncQueueView: React.FC = () => {
  const { t } = useI18n();
  const {
    pendingLogs,
    pendingCount,
    isOnline,
    syncState,
    syncNow,
    addMockOfflineTransaction,
    clearSyncedLogs,
  } = useSync();
  const { showToast } = useOverlay();

  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'synced' | 'failed'>('all');
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');
  const [expandedLogId, setExpandedLogId] = useState<number | string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const syncedCount = useMemo(
    () => pendingLogs.filter(l => l.status === 'synced').length,
    [pendingLogs]
  );
  const failedCount = useMemo(
    () => pendingLogs.filter(l => l.status === 'failed').length,
    [pendingLogs]
  );

  const filteredLogs = useMemo(() => {
    if (filterStatus === 'all') return pendingLogs;
    return pendingLogs.filter(l => l.status === filterStatus);
  }, [pendingLogs, filterStatus]);

  const handleManualSync = async () => {
    setIsActionLoading(true);
    try {
      await syncNow();
      showToast('Sync Triggered', 'info', 'Processing pending queue over campus network...');
    } catch (err) {
      showToast('Sync Error', 'error', 'Failed to execute manual sync.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSimulateLog = async () => {
    setIsActionLoading(true);
    try {
      await addMockOfflineTransaction('CREATE_SUBMISSION');
      showToast('Transaction Queued', 'success', 'New offline submission log added to IndexedDB.');
    } catch (err) {
      showToast('Error', 'error', 'Could not create mock transaction.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClearSynced = async () => {
    setIsActionLoading(true);
    try {
      await clearSyncedLogs();
      showToast('Queue Cleared', 'success', 'Removed all synced transaction records.');
    } catch (err) {
      showToast('Error', 'error', 'Failed to clear synced logs.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRetryItem = async (logItem: TransactionLogItem) => {
    if (!logItem.id) return;
    try {
      await db.transactionLogs.update(logItem.id, {
        status: 'pending',
        retryCount: 0,
        errorMessage: undefined,
        nextRetryAt: undefined,
      });
      showToast('Retry Scheduled', 'info', `Transaction ${logItem.offlineId?.slice(0, 8)} reset to pending.`);
      if (isOnline) {
        await syncNow();
      }
    } catch (err) {
      showToast('Retry Failed', 'error', 'Could not reset log status.');
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              {t.syncStatus.queueDrawerTitle || 'Offline Transaction Queue'}
            </h2>
            <StatusPill
              label={isOnline ? 'Online — Auto Sync Active' : 'Offline — Queueing Locally'}
              variant={isOnline ? 'success' : 'warning'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.syncStatus.queueDrawerSubtitle ||
              'Itemized transaction logs stored in IndexedDB awaiting backend synchronization.'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleManualSync}
            disabled={isActionLoading || syncState === 'syncing' || pendingCount === 0}
            title={pendingCount === 0 ? 'Queue is clean — Nothing to sync' : 'Trigger Sync'}
            className="inline-flex items-center justify-center min-h-[44px] gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
            <span>{t.syncStatus.syncNow || 'Trigger Sync'}</span>
          </button>

          <button
            onClick={handleSimulateLog}
            disabled={isActionLoading}
            className="inline-flex items-center justify-center min-h-[44px] gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground border border-border text-xs font-semibold hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5 text-primary" />
            <span>Simulate Offline Log</span>
          </button>

          {syncedCount > 0 && (
            <button
              onClick={handleClearSynced}
              disabled={isActionLoading}
              className="inline-flex items-center justify-center min-h-[44px] gap-2 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 text-xs font-semibold hover:bg-destructive/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t.syncStatus.clearCompleted || 'Clear Synced'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        <StatCard
          title="Total Queue Items"
          value={pendingLogs.length}
          subtitle="IndexedDB transactionLogs"
          icon={Layers}
        />
        <StatCard
          title="Pending Sync"
          value={pendingCount}
          subtitle="Awaiting server ACK"
          icon={Clock}
          trend={{ value: `${pendingCount} queued`, isPositive: pendingCount === 0 }}
        />
        <StatCard
          title="Synced Successfully"
          value={syncedCount}
          subtitle="Acknowledged by backend"
          icon={CheckCircle2}
          trend={{ value: 'Synced', isPositive: true }}
        />
        <StatCard
          title="Failed / Rejections"
          value={failedCount}
          subtitle="Conflict or validation fail"
          icon={AlertCircle}
          trend={{ value: `${failedCount} failed`, isPositive: failedCount === 0 }}
        />
      </div>

      {/* Queue Inspector Table / List Section */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
        {/* Table Toolbar / Filter & View Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">Filter:</span>
              <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                {(['all', 'pending', 'synced', 'failed'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                      filterStatus === st
                        ? 'bg-background text-foreground shadow-xs font-bold'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 6 View Mode Switcher */}
            <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Table View (Section 6 Specs)"
              >
                <LayoutList className="w-3.5 h-3.5 text-primary" />
                <span>Table</span>
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'card'
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title="Card Inspector View"
              >
                <LayoutGrid className="w-3.5 h-3.5 text-primary" />
                <span>Cards</span>
              </button>
            </div>
          </div>

          <span className="text-xs text-muted-foreground font-mono">
            Showing {filteredLogs.length} of {pendingLogs.length} records
          </span>
        </div>

        {/* Itemized Display */}
        {filteredLogs.length === 0 ? (
          <div className="py-12 px-4 rounded-xl border border-dashed border-border bg-muted/20 text-center flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
            <p className="text-xs font-semibold text-foreground">
              {filterStatus === 'all'
                ? t.syncStatus.emptyQueue || 'No transaction logs found in local storage.'
                : `No transaction logs matching status "${filterStatus}".`}
            </p>
            <p className="text-[11px] text-muted-foreground">
              New user edits will automatically create collision-safe UUID v4 transaction records.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Section 6 HTML Table View Structure */
          <div className="overflow-x-auto border border-border rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Target Item</th>
                  <th className="py-3 px-4">Queued At</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {filteredLogs.map(log => {
                  const logKey = log.id ?? log.offlineId ?? log.timestamp;
                  const isExpanded = expandedLogId === logKey;
                  const isPendingOrFailed = log.status === 'pending' || log.status === 'failed';

                  return (
                    <React.Fragment key={logKey}>
                      <tr className="hover:bg-muted/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-2">
                            <span className="p-1 rounded bg-primary/10 text-primary">
                              <Database className="w-3.5 h-3.5" />
                            </span>
                            <span>{log.action}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-muted-foreground font-mono">
                          <span className="px-2 py-0.5 rounded bg-muted text-foreground font-medium">
                            {log.entityType}: {log.entityId.slice(0, 14)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-muted-foreground text-[11px]">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusPill
                            label={log.status}
                            variant={
                              log.status === 'synced'
                                ? 'success'
                                : log.status === 'failed'
                                ? 'danger'
                                : 'warning'
                            }
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isPendingOrFailed && (
                              <button
                                onClick={() => handleRetryItem(log)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                                title="Force Retry Transaction"
                              >
                                <RefreshCw className="w-3 h-3" />
                                <span>Retry Now</span>
                              </button>
                            )}

                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : logKey)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground text-[11px] font-medium transition-colors cursor-pointer"
                            >
                              <span>{isExpanded ? 'Hide Payload' : 'Inspect'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-muted/20 border-b border-border">
                          <td colSpan={5} className="p-4">
                            <div className="flex flex-col gap-2 font-mono text-xs">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-foreground">
                                  Payload Inspection (Offline UUID: {log.offlineId || 'N/A'})
                                </span>
                                {log.nextRetryAt && (
                                  <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    Next Retry Schedule: {new Date(log.nextRetryAt).toLocaleTimeString()}
                                  </span>
                                )}
                              </div>
                              <pre className="p-3 rounded-lg bg-card border border-border text-[11px] font-mono text-foreground overflow-x-auto leading-relaxed">
                                {JSON.stringify(log.payload || log, null, 2)}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredLogs.map(log => {
              const logKey = log.id ?? log.offlineId ?? log.timestamp;
              const isExpanded = expandedLogId === logKey;

              return (
                <div
                  key={logKey}
                  className={`p-4 rounded-xl border transition-all ${
                    log.status === 'failed'
                      ? 'border-destructive/30 bg-destructive/5'
                      : log.status === 'pending'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border bg-background hover:bg-muted/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0 mt-0.5 sm:mt-0">
                        <Database className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-bold text-foreground">
                            {log.action}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground">
                            {log.entityType} ({log.entityId.slice(0, 12)})
                          </span>
                          <StatusPill
                            label={log.status}
                            variant={
                              log.status === 'synced'
                                ? 'success'
                                : log.status === 'failed'
                                ? 'danger'
                                : 'warning'
                            }
                          />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono flex-wrap">
                          <span>ID: {log.offlineId ? log.offlineId.slice(0, 18) + '...' : `pk:${log.id}`}</span>
                          <span>Time: {new Date(log.timestamp).toLocaleString()}</span>
                          {log.serverSeqNum != null && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                              Seq #{log.serverSeqNum}
                            </span>
                          )}
                          {(log.retryCount ?? 0) > 0 && (
                            <span className="text-amber-600 dark:text-amber-400">
                              Retries: {log.retryCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      {(log.status === 'failed' || log.status === 'pending') && (
                        <button
                          onClick={() => handleRetryItem(log)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted text-foreground text-[11px] font-medium hover:bg-muted/80 transition-colors cursor-pointer"
                          title="Force Retry Transaction"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Retry</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : logKey)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-muted/60 text-muted-foreground text-[11px] font-medium hover:text-foreground transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Payload' : 'Inspect Payload'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {log.errorMessage && (
                    <div className="mt-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{log.errorMessage}</span>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2">
                      <span className="text-[11px] font-semibold text-foreground flex items-center justify-between">
                        <span>Payload JSON Inspection:</span>
                        <span className="text-muted-foreground font-mono text-[10px]">
                          {log.nextRetryAt ? `Next Retry At: ${new Date(log.nextRetryAt).toLocaleTimeString()}` : ''}
                        </span>
                      </span>
                      <pre className="p-3.5 rounded-xl bg-muted/60 border border-border text-[11px] font-mono text-foreground overflow-x-auto max-h-60">
                        {JSON.stringify(log.payload || log, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
