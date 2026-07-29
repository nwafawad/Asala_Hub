'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useTheme } from 'next-themes';
import { Layers, Lock, Mail, AlertCircle, CheckSquare, Square, LogIn, Languages, Sun, Moon } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (role: 'student' | 'educator' | 'admin') => void;
}

export const LoginForm: React.FC<LoginFormProps> = React.memo(({ onSuccess }) => {
  const { login } = useAuth();
  const { t, toggleLanguage } = useI18n();
  const { theme, setTheme } = useTheme();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const [hasAcceptedConsent, setHasAcceptedConsent] = useState<boolean>(true);
  const [isMinor, setIsMinor] = useState<boolean>(false);
  const [guardianEmail, setGuardianEmail] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAcceptedConsent) return;
    if (isMinor && !guardianEmail) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        const cleanEmail = email.trim().toLowerCase();
        const userObj = await db.users.where('email').equalsIgnoreCase(cleanEmail).first();
        const isEducatorEmail = cleanEmail.includes('educator') || cleanEmail.includes('prof') || cleanEmail.includes('teacher');
        const isAdminEmail = cleanEmail.includes('admin');
        const role = userObj?.role || (isAdminEmail ? 'admin' : isEducatorEmail ? 'educator' : 'student');
        onSuccess(role);
      } else {
        if (result.error === 'ACCOUNT_SUSPENDED') {
          setError('Your account has been suspended. Contact your administrator.');
        } else {
          setError(result.error || t.auth.invalidCredentials);
        }
      }
    } catch (err) {
      setError(t.auth.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased relative">
      {/* Top Header Actions: Language Switcher & Theme Toggle */}
      <div className="absolute top-6 right-6 rtl:right-auto rtl:left-6 flex items-center gap-2">
        <button
          onClick={toggleLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-card text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
          title="Switch Language"
        >
          <Languages className="w-3.5 h-3.5 text-primary" />
          <span>{t.actions.switchLanguage}</span>
        </button>

        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-2 rounded-lg border border-border bg-card text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
          title={t.actions.toggleTheme}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-amber-400" />
          ) : (
            <Moon className="w-4 h-4 text-slate-700" />
          )}
        </button>
      </div>

      <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl p-8 flex flex-col gap-6 animate-in fade-in-0 zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="p-3 rounded-2xl bg-primary text-primary-foreground shadow-md">
            <Layers className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold font-heading text-foreground mt-2">
            {t.auth.loginTitle}
          </h1>
          <p className="text-xs text-muted-foreground">{t.auth.loginSubtitle}</p>
        </div>

        {/* Inline Non-Blocking Credential Error Alert */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium flex items-center gap-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.auth.emailLabel}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="email"
                required
                dir="ltr"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 text-left rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-sans"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.auth.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                type="password"
                required
                dir="ltr"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 text-left rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="flex flex-col gap-2 pt-1 border-t border-border/60">
            <button
              type="button"
              onClick={() => setHasAcceptedConsent(!hasAcceptedConsent)}
              className="flex items-start gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
            >
              {hasAcceptedConsent ? (
                <CheckSquare className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <span>I agree to the Asala Hub Offline Data Policy & Terms</span>
            </button>

            {/* Minor / Guardian Toggle */}
            <button
              type="button"
              onClick={() => setIsMinor(!isMinor)}
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer text-left"
            >
              {isMinor ? (
                <CheckSquare className="w-4 h-4 text-primary shrink-0" />
              ) : (
                <Square className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              <span>I am under 18 years old (Minor Account)</span>
            </button>

            {isMinor && (
              <div className="flex flex-col gap-1 pl-6 pt-1 animate-in fade-in duration-150">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  Guardian / Institution Email for Consent
                </label>
                <input
                  type="email"
                  required={isMinor}
                  value={guardianEmail}
                  onChange={e => setGuardianEmail(e.target.value)}
                  placeholder="guardian@school.edu"
                  className="w-full h-8 px-3 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            )}
          </div>

          {/* Remember Me Checkbox */}
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start"
          >
            {rememberMe ? (
              <CheckSquare className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <span>{t.auth.rememberMe}</span>
          </button>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting || !hasAcceptedConsent || (isMinor && !guardianEmail)}
            className="w-full h-10 mt-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4 rtl:rotate-180" />
            <span>{isSubmitting ? t.auth.signingIn : t.auth.signInButton}</span>
          </button>
        </form>
      </div>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';
