'use client';

import React, { useState } from 'react';
import { useSync, type SyncState } from '@/context/SyncContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatusPill, type StatusVariant } from '@/components/ui/StatusPill';
import { RefreshCw, Database, Trash2, PlusCircle } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { isDebugMode } from '@/lib/debug';

const syncVariantMap: Record<SyncState, { variant: StatusVariant; key: string; animate: boolean }> = {
  synced: { variant: 'success', key: 'synced', animate: false },
  offline: { variant: 'warning', key: 'offline', animate: false },
  pending: { variant: 'info', key: 'pending', animate: true },
  syncing: { variant: 'info', key: 'syncing', animate: true },
  error: { variant: 'danger', key: 'error', animate: false },
};

export const SyncIndicator: React.FC = () => {
  const { syncState, pendingCount, pendingLogs, syncNow, addMockOfflineTransaction, clearSyncedLogs } = useSync();
  const { t } = useI18n();
  const { showToast } = useOverlay();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const { variant, key, animate } = syncVariantMap[syncState];
  const labelText = syncState === 'pending' ? `${t.syncStatus.pending} (${pendingCount})` : t.syncStatus[key as keyof typeof t.syncStatus];

  const handleSyncClick = async () => {
    showToast(t.syncStatus.syncing, 'info');
    await syncNow();
    if (navigator.onLine) {
      showToast(t.syncStatus.synced, 'success', 'All transaction logs flushed to server.');
    } else {
      showToast(t.syncStatus.offline, 'warning', 'Unable to sync while offline.');
    }
  };

  const handleAddMock = async () => {
    await addMockOfflineTransaction('CREATE_SUBMISSION');
    showToast('Buffered in IndexedDB', 'info', 'New submission saved to local queue.');
  };

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="cursor-pointer hover:opacity-80 transition-opacity"
        title="Global Campus Intranet Status: Connection & Sync Engine State"
      >
        <StatusPill
          label={labelText}
          variant={variant}
          dotAnimation={animate}
        />
      </button>

      <Dialog.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in-0" />
          <Dialog.Content className="fixed inset-y-0 right-0 ltr:right-0 rtl:left-0 z-50 w-full max-w-md bg-card border-l rtl:border-r border-border p-6 shadow-2xl flex flex-col gap-5 animate-in slide-in-from-right rtl:slide-in-from-left duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <Dialog.Title className="text-lg font-semibold font-heading text-foreground">
                  {t.syncStatus.queueDrawerTitle}
                </Dialog.Title>
              </div>
              <Dialog.Close className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <Dialog.Description className="text-xs text-muted-foreground">
              {t.syncStatus.queueDrawerSubtitle}
            </Dialog.Description>

            <div className="flex items-center justify-between bg-muted/50 p-3 rounded-xl border border-border">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">
                  Status:
                </span>
                <StatusPill label={labelText} variant={variant} />
              </div>
              <button
                onClick={handleSyncClick}
                disabled={syncState === 'syncing' || pendingCount === 0}
                title={pendingCount === 0 ? 'Queue is clean — Nothing to sync' : 'Trigger Sync'}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncState === 'syncing' ? 'animate-spin' : ''}`} />
                {t.syncStatus.syncNow}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {isDebugMode() && (
                <button
                  onClick={handleAddMock}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-500" />
                  {t.syncStatus.simulateOfflineSubmission}
                </button>
              )}
              <button
                onClick={async () => {
                  await clearSyncedLogs();
                  showToast('Queue cleaned', 'info');
                }}
                className="inline-flex items-center justify-center p-2 rounded-lg border border-border bg-background text-xs text-muted-foreground hover:text-destructive hover:bg-muted transition-colors cursor-pointer"
                title={t.syncStatus.clearCompleted}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
              {pendingLogs.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  {t.syncStatus.emptyQueue}
                </div>
              ) : (
                pendingLogs.map(log => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-border bg-background flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">
                        {log.action}
                      </span>
                      <StatusPill
                        label={log.status}
                        variant={log.status === 'synced' ? 'success' : 'warning'}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {JSON.stringify(log.payload)}
                    </p>
                    <span className="text-[10px] text-muted-foreground/70">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
};
