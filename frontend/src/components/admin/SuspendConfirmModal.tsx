'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { AdminUserRead } from '@/types/admin';
import { AlertTriangle, UserX, Loader2 } from 'lucide-react';

interface SuspendConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserRead | null;
  onSuccess: () => void;
}

export const SuspendConfirmModal: React.FC<SuspendConfirmModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { suspendUser } = useAdminApi();
  const { showToast } = useOverlay();
  const [confirmText, setConfirmText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!user) return null;

  const handleSuspend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmText.trim().toUpperCase() !== 'SUSPEND') return;

    setIsSubmitting(true);
    try {
      const res = await suspendUser(user.id);
      if (res.had_unsynced_work) {
        showToast(
          'Account Suspended',
          'warning',
          `${user.full_name} has unsynced offline work. Local work is preserved on their device.`
        );
      } else {
        showToast('Account Suspended', 'success', `Suspended ${user.full_name}. Active sessions revoked.`);
      }
      setConfirmText('');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('Suspension Failed', 'error', err?.response?.data?.detail || 'Unable to suspend account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-rose-500/30 bg-card/95 backdrop-blur-md p-6 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5">
              <UserX className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                Suspend Account Access
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Target user: <strong className="text-foreground">{user.full_name}</strong> ({user.email})
              </Dialog.Description>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
              <span>Offline Work & Session Revocation Impact</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              • All active session tokens for this user will be revoked immediately (BR-7).
              <br />
              • If the user has <strong>unsynced offline work</strong> stored locally in IndexedDB, their local work will <strong>NOT be deleted</strong> (NFR-10 work protection), but sync operations will be blocked.
              <br />
              • On next login attempt (online or offline), the user will see a blocking message.
            </p>
          </div>

          <form onSubmit={handleSuspend} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-suspend-input" className="text-xs font-semibold text-foreground">
                Type <span className="font-mono font-bold text-rose-600">SUSPEND</span> to confirm
              </label>
              <input
                id="confirm-suspend-input"
                type="text"
                required
                value={confirmText}
                onChange={e => setConfirmText(e.target.value)}
                placeholder="SUSPEND"
                className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30 transition-all font-mono uppercase"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || confirmText.trim().toUpperCase() !== 'SUSPEND'}
                className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Suspension'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
