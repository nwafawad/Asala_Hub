"use client";

import React from 'react';
import { useTheme } from '@/lib/theme';
import { Sun, Moon } from 'lucide-react';
import { useTranslation } from '@/lib/i18n/context';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation();

  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark hover:bg-surface dark:hover:bg-surface-dark transition-all duration-300 group"
      aria-label={isDark ? t('switch_to_light') : t('switch_to_dark')}
      title={isDark ? t('switch_to_light') : t('switch_to_dark')}
    >
      <div className="relative w-5 h-5 flex items-center justify-center transition-transform duration-500 group-hover:rotate-12">
        {isDark ? (
          <Moon size={20} className="absolute animate-in zoom-in fade-in duration-300" />
        ) : (
          <Sun size={20} className="absolute animate-in zoom-in fade-in duration-300" />
        )}
      </div>
    </button>
  );
};
