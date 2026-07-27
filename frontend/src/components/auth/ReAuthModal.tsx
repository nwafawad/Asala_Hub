'use client';

import React, { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { KeyRound, Lock, ArrowRight } from 'lucide-react';

export const ReAuthModal: React.FC = () => {
  const { isReAuthModalOpen, renewSession, closeReAuthModal } = useAuth();
  const { t } = useI18n();

  const [pinOrPass, setPinOrPass] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinOrPass) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    const success = await renewSession(pinOrPass);
    setIsSubmitting(false);
    if (success) {
      setPinOrPass('');
    } else {
      setErrorMsg('Incorrect PIN code. Please try again.');
    }
  };

  return (
    <Dialog.Root open={isReAuthModalOpen} onOpenChange={open => !open && closeReAuthModal()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-2xl rounded-2xl animate-in fade-in-0 zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                {t.auth.reAuthTitle}
              </Dialog.Title>
              <Dialog.Description className="text-xs text-muted-foreground mt-0.5">
                {t.auth.reAuthDesc}
              </Dialog.Description>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t.auth.pinPrompt}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                <input
                  type="password"
                  required
                  dir="ltr"
                  value={pinOrPass}
                  onChange={e => setPinOrPass(e.target.value)}
                  placeholder="••••"
                  className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 text-left rtl:text-right rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                />
              </div>
              {errorMsg && (
                <p className="text-xs font-semibold text-rose-500 animate-in fade-in-0 mt-0.5">
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>{t.auth.renewButton}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
