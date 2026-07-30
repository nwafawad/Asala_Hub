'use client';

import React from 'react';
import { ShieldCheck, KeyRound, Lock, Clock } from 'lucide-react';

interface SecuritySettingsPanelProps {
  hasPinConfigured: boolean;
  onConfigurePin: () => void;
  idleTimeoutMinutes: number;
}

export const SecuritySettingsPanel: React.FC<SecuritySettingsPanelProps> = ({
  hasPinConfigured,
  onConfigurePin,
  idleTimeoutMinutes,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="text-base font-bold font-heading text-foreground">
            Security & Authentication Policy
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick PIN Card */}
        <div className="p-4 rounded-xl border border-border bg-background flex flex-col gap-3 justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
              <KeyRound className="w-4 h-4" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-foreground">Quick Unlock PIN</span>
              <p className="text-xs text-muted-foreground">
                {hasPinConfigured
                  ? '4-Digit PIN configured for offline quick-resume.'
                  : 'No Quick PIN set. Require full password on re-auth.'}
              </p>
            </div>
          </div>

          <button
            onClick={onConfigurePin}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer self-start"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{hasPinConfigured ? 'Change PIN' : 'Configure PIN'}</span>
          </button>
        </div>

        {/* Inactivity Timeout Info Card */}
        <div className="p-4 rounded-xl border border-border bg-background flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-foreground">Role Session Timeout</span>
            <p className="text-xs text-muted-foreground">
              Automatic session lock after <strong className="text-foreground">{idleTimeoutMinutes} minutes</strong> of inactivity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
