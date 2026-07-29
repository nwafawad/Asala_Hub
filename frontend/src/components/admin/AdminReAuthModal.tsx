'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Lock, ArrowRight, Eye, EyeOff, Loader2, ShieldAlert } from 'lucide-react';

interface AdminReAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  actionTitle: string;
  actionDescription: string;
}

export const AdminReAuthModal: React.FC<AdminReAuthModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionTitle,
  actionDescription,
}) => {
  const { renewSession } = useAuth();
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setErrorMsg(null);
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const startTime = Date.now();
    const success = await renewSession(password);
    const elapsed = Date.now() - startTime;
    const minDelay = 1000; // 1-second deliberate verification delay
    if (elapsed < minDelay) {
      await new Promise(r => setTimeout(r, minDelay - elapsed));
    }

    setIsSubmitting(false);

    if (success) {
      setPassword('');
      onConfirm();
    } else {
      setErrorMsg('Elevated authentication failed. Incorrect password.');
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-purple-500/30 bg-card/95 backdrop-blur-md p-6 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                Elevated Administrator Authorization Required
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {actionDescription}
              </Dialog.Description>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
            <span className="font-semibold text-purple-700 dark:text-purple-300">Action: </span>
            <span className="text-foreground font-medium">{actionTitle}</span>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="admin-reauth-input" className="text-xs font-semibold text-foreground">
                Enter Administrator Password
              </label>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 text-muted-foreground pointer-events-none" />
                <input
                  id="admin-reauth-input"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Enter your account password"
                  className="w-full h-10 pl-9 pr-9 text-left rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs font-semibold text-rose-500 animate-in fade-in-0 mt-0.5">
                  {errorMsg}
                </p>
              )}
            </div>

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
                disabled={isSubmitting || !password.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Confirm & Authorize</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
