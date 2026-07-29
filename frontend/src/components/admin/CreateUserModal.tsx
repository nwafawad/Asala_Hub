'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { UserRoleType } from '@/types/admin';
import { UserPlus, Copy, Check, Loader2, ShieldCheck } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createUser } = useAdminApi();
  const { showToast } = useOverlay();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRoleType>('student');
  const [mode, setMode] = useState<'generate' | 'custom'>('generate');
  const [customPassword, setCustomPassword] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Result popup state (for temporary password display)
  const [creationResult, setCreationResult] = useState<{
    fullName: string;
    email: string;
    role: string;
    tempPassword: string;
  } | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Validation Error', 'error', 'Full Name is required.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showToast('Validation Error', 'error', 'A valid email address is required.');
      return;
    }
    if (mode === 'custom' && customPassword.length < 6) {
      showToast('Validation Error', 'error', 'Custom initial password must be at least 6 characters.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setIsSubmitting(true);

    try {
      const res = await createUser({
        full_name: fullName.trim(),
        email: cleanEmail,
        role,
        mode,
        custom_password: mode === 'custom' ? customPassword : undefined,
      });

      showToast('Account Created', 'success', `Created ${role} account for ${fullName.trim()}.`);
      setCreationResult({
        fullName: fullName.trim(),
        email: cleanEmail,
        role,
        tempPassword: res.temporary_password,
      });
      onSuccess();
    } catch (err: any) {
      showToast('Creation Failed', 'error', err?.response?.data?.detail || err?.message || 'Unable to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setRole('student');
    setMode('generate');
    setCustomPassword('');
    setCreationResult(null);
    setIsCopied(false);
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
          {creationResult ? (
            /* Result View: Temporary Password Display */
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-bold text-foreground">
                    Account Created Successfully
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground">
                    Copy the temporary credentials below for {creationResult.fullName}.
                  </Dialog.Description>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col gap-2.5 my-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-semibold text-foreground">{creationResult.fullName}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="font-mono text-foreground">{creationResult.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">Role:</span>
                  <span className="font-semibold text-purple-600 capitalize">{creationResult.role}</span>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">Temporary Password</span>
                    <span className="font-mono font-bold text-sm text-foreground truncate">{creationResult.tempPassword}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(creationResult.tempPassword);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000);
                    }}
                    className="p-2 rounded-lg bg-background border border-border hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0"
                    title="Copy Password"
                  >
                    {isCopied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Creation Form View */
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <Dialog.Title className="text-base font-bold text-foreground">
                    Create New Account
                  </Dialog.Title>
                  <Dialog.Description className="text-xs text-muted-foreground">
                    Directly provision a new student or educator profile.
                  </Dialog.Description>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Layla Al-Mansoor"
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="layla@asala.edu"
                    className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Assigned Role
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRole('student')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        role === 'student'
                          ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole('educator')}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        role === 'educator'
                          ? 'border-purple-600 bg-purple-500/10 text-purple-600 dark:text-purple-400'
                          : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      Educator
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Initial Credentials Mode
                  </label>
                  <div className="flex items-center gap-4 mb-2">
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'generate'}
                        onChange={() => setMode('generate')}
                        className="accent-purple-600"
                      />
                      <span>Auto-generate temporary password</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                      <input
                        type="radio"
                        name="mode"
                        checked={mode === 'custom'}
                        onChange={() => setMode('custom')}
                        className="accent-purple-600"
                      />
                      <span>Set custom password</span>
                    </label>
                  </div>

                  {mode === 'custom' && (
                    <input
                      type="password"
                      value={customPassword}
                      onChange={e => setCustomPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      className="w-full h-10 px-3.5 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-mono mt-1"
                    />
                  )}
                </div>

                <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-[11px] text-purple-700 dark:text-purple-300">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-purple-600" />
                  <span>
                    User will be required to update their password on first login (`must_change_password`).
                  </span>
                </div>

                <div className="flex justify-end gap-2.5 mt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-xl border border-border bg-background text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <span>Create Account</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
