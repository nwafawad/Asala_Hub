'use client';

import React from 'react';
import { useI18n } from '@/context/I18nContext';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from 'next-themes';
import { SyncIndicator } from './SyncIndicator';
import { ReAuthModal } from '@/components/auth/ReAuthModal';
import { StatusPill } from '@/components/ui/StatusPill';
import { startViewTransition } from '@/lib/view-transition';
import { Search, Sun, Moon, Languages, LogOut, User } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { getInitials, isEducatorUser } from '@/lib/utils';

export const Header: React.FC = () => {
  const { t, toggleLanguage } = useI18n();
  const { user, isOfflineSession, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isEducator = isEducatorUser(user);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleTheme = () => {
    startViewTransition(() => {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    });
  };

  const handleToggleLanguage = () => {
    startViewTransition(() => {
      toggleLanguage();
    });
  };

  return (
    <>
      <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 transition-colors">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full h-9 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOfflineSession && (
            <StatusPill label={t.auth.signedInOffline} variant="warning" />
          )}

          <SyncIndicator />

          <button
            onClick={handleToggleLanguage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer focus:ring-2 focus:ring-primary/20"
            aria-label="Switch interface language"
            title="Switch Language"
          >
            <Languages className="w-3.5 h-3.5 text-primary" />
            <span>{t.actions.switchLanguage}</span>
          </button>

          <button
            onClick={handleToggleTheme}
            className="p-2 rounded-lg border border-border bg-background text-foreground hover:bg-muted transition-colors cursor-pointer focus:ring-2 focus:ring-primary/20"
            aria-label="Toggle light and dark color theme"
            title={t.actions.toggleTheme}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          {/* User Profile Menu */}
          {user && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  aria-label="Open user profile menu"
                  className="flex items-center gap-2 p-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors cursor-pointer focus:ring-2 focus:ring-primary/20"
                >
                  <div className="w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                    {getInitials(user.fullName)}
                  </div>
                  <span className="text-xs font-semibold text-foreground hidden sm:inline">
                    {user.fullName}
                  </span>
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content className="z-50 min-w-[200px] bg-card border border-border p-2 rounded-xl shadow-lg animate-in fade-in-0 zoom-in-95">
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-bold text-foreground">{user.fullName}</p>
                    <p className="text-[10px] text-muted-foreground">{user.email} ({isEducator ? 'Educator' : 'Student'})</p>
                  </div>
                  <DropdownMenu.Item
                    onClick={logout}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer outline-none"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t.auth.signOut}</span>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          )}
        </div>
      </header>

      <ReAuthModal />
    </>
  );
};
