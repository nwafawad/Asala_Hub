'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { AdminUserRead } from '@/types/admin';
import { KeyRound, Copy, Check, AlertTriangle, Loader2 } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AdminUserRead | null;
  onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { resetPassword } = useAdminApi();
  const { showToast } = useOverlay();

  const [mode, setMode] = useState<'generate' | 'custom'>('generate');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (mode === 'custom' && customPassword.length < 6) {
      showToast('Validation Error', 'error', 'Custom password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(user.id, {
        mode,
        custom_password: mode === 'custom' ? customPassword : undefined,
      });

      if (res.temporary_password) {
        setGeneratedPassword(res.temporary_password);
      } else {
        showToast('Password Reset Complete', 'success', `Password updated for ${user.full_name}.`);
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      showToast('Reset Failed', 'error', err?.response?.data?.detail || 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      showToast('Copied', 'info', 'Temporary password copied to clipboard.');
    }
  };

  const handleDone = () => {
    setGeneratedPassword(null);
    setCustomPassword('');
    setMode('generate');
    onSuccess();
    onClose();
  };

  if (!user) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && handleDone()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card/95 backdrop-blur-md p-6 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                Reset Account Password
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Target account: <strong className="text-foreground">{user.full_name}</strong> ({user.email})
              </Dialog.Description>
            </div>
          </div>

          {generatedPassword ? (
            <div className="flex flex-col gap-4 py-2 animate-in fade-in-0">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-2">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                  Temporary Password Generated (Show Once)
                </span>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Communicate this temporary password to the user verbally or in person. It will not be displayed again.
                </p>

                <div className="mt-2 flex items-center justify-between p-3 rounded-xl bg-background border border-border font-mono text-sm font-bold text-foreground select-all">
                  <span>{generatedPassword}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground transition-colors cursor-pointer"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border border-border text-xs text-muted-foreground">
                📌 User will be required to change this password upon their next successful login.
              </div>

              <button
                onClick={handleDone}
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                Done & Close
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-foreground">Password Reset Method</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('generate')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'generate'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Generate Random Temp Password
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('custom')}
                    className={`p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      mode === 'custom'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Set Custom Password
                  </button>
                </div>
              </div>

              {mode === 'custom' && (
                <div className="flex flex-col gap-1.5 animate-in fade-in-0">
                  <label htmlFor="custom-pass-input" className="text-xs font-semibold text-foreground">
                    Custom Password
                  </label>
                  <input
                    id="custom-pass-input"
                    type="text"
                    required
                    value={customPassword}
                    onChange={e => setCustomPassword(e.target.value)}
                    placeholder="Enter custom password (min 6 chars)"
                    className="w-full h-10 px-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-primary hover:bg-accent-hover text-primary-foreground text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset Password'}
                </button>
              </div>
            </form>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
