'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { KeyRound, Lock, ShieldCheck, Check, Sparkles, User, HardDrive } from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';

export const SettingsView: React.FC = () => {
  const { user, setQuickPin } = useAuth();
  const { t } = useI18n();
  const { showToast } = useOverlay();

  const [pin, setPin] = useState<string>('');
  const [isSaved, setIsSaved] = useState<boolean>(false);

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || pin.length < 4) {
      showToast('Invalid PIN', 'warning', 'Please enter a 4-digit PIN code.');
      return;
    }

    try {
      await setQuickPin(pin);
      setIsSaved(true);
      setPin('');
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      showToast('Failed to Save PIN', 'error', 'Could not update your security settings.');
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Settings Header */}
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold font-heading text-foreground">
          {t.nav.settings} & Security Preferences
        </h2>
        <p className="text-xs text-muted-foreground">
          Manage your offline quick re-authentication PIN, local storage limits, and account preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick PIN Setup Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <KeyRound className="w-6 h-6" />
              </div>
              <StatusPill label="Offline Quick Access" variant="info" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                Set 4-Digit Quick PIN
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Configure a 4-digit passcode for instant offline session renewal without needing your full password when disconnected.
              </p>
            </div>

            <form onSubmit={handleSavePin} className="flex flex-col gap-3 mt-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-foreground">
                  4-Digit PIN Code
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••"
                    className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 cursor-pointer shadow-xs mt-1"
              >
                {isSaved ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>PIN Updated Successfully!</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Save 4-Digit PIN</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span>PIN is encrypted and stored locally in IndexedDB for offline authentication.</span>
          </div>
        </div>

        {/* Account Info & Local Session Card */}
        <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <User className="w-6 h-6" />
              </div>
              <StatusPill label={user?.role?.toUpperCase() || 'STUDENT'} variant="success" />
            </div>

            <div className="flex flex-col gap-1">
              <h3 className="text-base font-bold font-heading text-foreground">
                Account & Local Vault
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Active local profile details stored securely in browser cache.
              </p>
            </div>

            <div className="flex flex-col gap-3.5 pt-2">
              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Full Name:</span>
                <span className="font-semibold text-foreground">{user?.fullName || 'Asala Student'}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Email Address:</span>
                <span className="font-mono text-foreground">{user?.email || 'user@asalahub.dev'}</span>
              </div>

              <div className="flex items-center justify-between text-xs border-b border-border pb-2.5">
                <span className="text-muted-foreground">Offline Storage:</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">IndexedDB Active</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-muted/40 border border-border/50 text-[11px] text-muted-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-primary shrink-0" />
            <span>Session auto-renews smoothly upon entering your 4-digit PIN.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
