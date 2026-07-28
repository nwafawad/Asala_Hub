'use client';

import React, { useState, useEffect, useRef } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { KeyRound, Lock, ArrowRight, Eye, EyeOff, LogOut, User, Loader2 } from 'lucide-react';

export const ReAuthModal: React.FC = () => {
  const { isReAuthModalOpen, renewSession, closeReAuthModal, user, logout } = useAuth();
  const { t } = useI18n();

  const [pinOrPass, setPinOrPass] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens and reset internal state
  useEffect(() => {
    if (isReAuthModalOpen) {
      setPinOrPass('');
      setErrorMsg(null);
      setShowPassword(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isReAuthModalOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinOrPass.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const startTime = Date.now();
    const success = await renewSession(pinOrPass);
    const elapsed = Date.now() - startTime;
    const minDelay = 1000; // Deliberate 1-second verification delay requested by user
    if (elapsed < minDelay) {
      await new Promise(r => setTimeout(r, minDelay - elapsed));
    }

    setIsSubmitting(false);

    if (success) {
      setPinOrPass('');
    } else {
      setErrorMsg(t.auth.invalidPinOrPass || 'Incorrect PIN code or password entered.');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPinOrPass(e.target.value);
    if (errorMsg) setErrorMsg(null);
  };

  return (
    <Dialog.Root open={isReAuthModalOpen} onOpenChange={open => !open && closeReAuthModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card/95 backdrop-blur-md p-6 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                {t.auth.reAuthTitle}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {t.auth.reAuthDesc}
              </Dialog.Description>
            </div>
          </div>

          {/* User Session Profile Header */}
          {user && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/50 border border-border/60 text-xs">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                {user.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{user.fullName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-primary/10 text-primary">
                {user.role}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-1">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="reauth-pin-input" className="text-xs font-semibold text-foreground">
                  {t.auth.pinPrompt || 'Enter Password or 4-Digit Quick PIN'}
                </label>
                <InfoTooltip
                  title="Quick PIN vs Account Password"
                  content="Enter your full account password or your 4-digit Quick PIN. To configure or update your 4-digit PIN for faster unlock, go to Settings → Security Preferences."
                  position="bottom"
                />
              </div>
              <div className="relative flex items-center">
                <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 text-muted-foreground pointer-events-none" />
                <input
                  id="reauth-pin-input"
                  ref={inputRef}
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  dir="ltr"
                  value={pinOrPass}
                  onChange={handleInputChange}
                  placeholder={t.auth.pinPlaceholder}
                  className="w-full h-10 pl-9 rtl:pl-9 rtl:pr-9 pr-9 text-left rtl:text-right rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:right-auto rtl:left-3 text-muted-foreground hover:text-foreground transition-colors p-1"
                  aria-label={showPassword ? 'Hide input' : 'Show input'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <p className="text-xs font-semibold text-rose-500 animate-in fade-in-0 mt-0.5 flex items-center gap-1">
                  <span>{errorMsg}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !pinOrPass.trim()}
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>{t.auth.renewButton}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => logout()}
                className="w-full h-9 rounded-xl text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t.auth.switchAccount}</span>
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
