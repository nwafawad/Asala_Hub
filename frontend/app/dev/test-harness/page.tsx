"use client";

import { useState } from 'react';
import { AppShell, useSyncMock } from '@/app/components/AppShell';
import { UIRole } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/context';
import { useNotification } from '@/app/components/NotificationProvider';
import { SkeletonCard } from '@/app/components/SkeletonScreen';

function TestControls({ role, setRole }: { role: UIRole, setRole: (r: UIRole) => void }) {
  const { t, locale, dir } = useTranslation();
  const { setSyncStatus, setQueuedCount } = useSyncMock();
  const { showToast, showModal } = useNotification();
  const [showSkeleton, setShowSkeleton] = useState(false);

  const roles: UIRole[] = ['student', 'educator', 'admin', 'learner', 'creator'];

  return (
    <div className="space-y-8 pb-12">
      <h1 className="text-3xl font-bold mb-6">{t('dev.test_harness', { defaultValue: 'Shell Test Harness' })}</h1>
      
      {/* Section 1: Role Switcher */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Role Switcher</h2>
        <p className="text-sm text-text-secondary mb-4">Switch the current role to test shell navigation</p>
        <div className="flex flex-wrap gap-3">
          {roles.map(r => (
            <button 
              key={r}
              onClick={() => setRole(r)}
              className={`min-h-[44px] px-4 rounded-lg border transition-colors ${
                role === r ? 'bg-primary text-white border-primary' : 'bg-surface border-border hover:bg-surface-hover'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </section>

      {/* Section 2: Sync Status Controls */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Sync Status Controls</h2>
        <p className="text-sm text-text-secondary mb-4">Update the sync indicator in the top bar</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => { setSyncStatus('synced'); setQueuedCount(0); }} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Set Synced</button>
          <button onClick={() => { setSyncStatus('offline'); setQueuedCount(5); }} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Set Offline (5 queued)</button>
          <button onClick={() => { setSyncStatus('syncing'); }} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Set Syncing</button>
        </div>
      </section>

      {/* Section 3: Toast Triggers */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Toast Triggers</h2>
        <p className="text-sm text-text-secondary mb-4">Test non-blocking notifications</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => showToast('This is an info message', 'info')} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-info">Info</button>
          <button onClick={() => showToast('Operation successful!', 'success')} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-success">Success</button>
          <button onClick={() => showToast('Warning: Please check this', 'warning')} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-warning">Warning</button>
          <button onClick={() => showToast('Error: Something went wrong', 'error')} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover text-error">Error</button>
        </div>
      </section>

      {/* Section 4: Modal Triggers */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Modal Triggers</h2>
        <p className="text-sm text-text-secondary mb-4">Test blocking modals requiring user interaction</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => showModal({
            title: 'Storage Full',
            message: 'Your device storage is full. Please free up space to continue downloading courses.',
            type: 'error',
            primaryAction: { label: 'Got it', onClick: () => {} }
          })} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Storage Full</button>
          <button onClick={() => showModal({
            title: 'Save Failed',
            message: 'Failed to save changes. Would you like to retry?',
            type: 'warning',
            primaryAction: { label: 'Retry', onClick: () => {} },
            secondaryAction: { label: 'Cancel', onClick: () => {} }
          })} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Save Failed</button>
          <button onClick={() => showModal({
            title: 'Session Expired',
            message: 'Your session has expired. Please log in again.',
            type: 'warning',
            primaryAction: { label: 'Log In', onClick: () => {} }
          })} className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover">Session Expired</button>
        </div>
      </section>

      {/* Section 5: Skeleton Preview */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">Skeleton Preview</h2>
        <p className="text-sm text-text-secondary mb-4">Test the loading skeleton state</p>
        <button 
          onClick={() => setShowSkeleton(!showSkeleton)} 
          className="min-h-[44px] px-4 rounded-lg border border-border bg-surface hover:bg-surface-hover mb-6"
        >
          {showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
        </button>

        {showSkeleton && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}
      </section>

      {/* Section 6: Info */}
      <section className="bg-surface p-6 rounded-xl border border-border shadow-sm">
        <h2 className="text-xl font-semibold mb-2">System Info</h2>
        <ul className="space-y-2 text-sm">
          <li><strong>Locale:</strong> {locale}</li>
          <li><strong>Direction:</strong> {dir}</li>
          <li><strong>Current Role:</strong> {role}</li>
        </ul>
      </section>
    </div>
  );
}

export default function TestHarnessPage() {
  const [role, setRole] = useState<UIRole>('student');

  return (
    <AppShell role={role}>
      <TestControls role={role} setRole={setRole} />
    </AppShell>
  );
}
