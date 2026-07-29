'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { UserRoleType, AdminUserCreateResponse } from '@/types/admin';
import { UserPlus, Copy, Check, Loader2, ShieldCheck, KeyRound } from 'lucide-react';

interface CreateUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onRequestReAuth: (pendingPayload: {
    fullName: string;
    email: string;
    role: UserRoleType;
    mode: 'generate' | 'custom';
    customPassword?: string;
  }) => void;
}

export const CreateUserModal: React.FC<CreateUserModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onRequestReAuth,
}) => {
  const { showToast } = useOverlay();

  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<UserRoleType>('student');
  const [mode, setMode] = useState<'generate' | 'custom'>('generate');
  const [customPassword, setCustomPassword] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
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

    // Trigger elevated re-auth step-up
    onRequestReAuth({
      fullName: fullName.trim(),
      email: email.trim(),
      role,
      mode,
      customPassword: mode === 'custom' ? customPassword : undefined,
    });
  };

  const handleClose = () => {
    setFullName('');
    setEmail('');
    setRole('student');
    setMode('generate');
    setCustomPassword('');
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-in fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl z-50 animate-in fade-in-0 zoom-in-95">
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
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors shadow-xs cursor-pointer"
              >
                Proceed to Re-Auth
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
