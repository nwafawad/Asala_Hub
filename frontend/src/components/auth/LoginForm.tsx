'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { Layers, Lock, Mail, AlertCircle, CheckSquare, Square, LogIn } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (role: 'student' | 'educator') => void;
}

export const LoginForm: React.FC<LoginFormProps> = React.memo(({ onSuccess }) => {
  const { login } = useAuth();
  const { t } = useI18n();

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email, password, rememberMe);
      if (result.success) {
        const role = email.includes('layla') ? 'educator' : 'student';
        onSuccess(role);
      } else {
        setError(result.error || t.auth.invalidCredentials);
      }
    } catch (err) {
      setError(t.auth.invalidCredentials);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6 antialiased">
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
              <Mail className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="email@asalahub.dev"
                className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.auth.passwordLabel}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <button
            type="button"
            onClick={() => setRememberMe(!rememberMe)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer self-start my-1"
          >
            {rememberMe ? (
              <CheckSquare className="w-4 h-4 text-primary" />
            ) : (
              <Square className="w-4 h-4 text-muted-foreground" />
            )}
            <span>{t.auth.rememberMe}</span>
          </button>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full h-10 mt-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4" />
            <span>{isSubmitting ? t.auth.signingIn : t.auth.signInButton}</span>
          </button>
        </form>
      </div>
    </div>
  );
});

LoginForm.displayName = 'LoginForm';
