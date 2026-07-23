"use client";

import React from 'react';
import { useTranslation } from '@/lib/i18n/context';

export const LanguageSwitcher = () => {
  const { locale, setLocale } = useTranslation();

  const handleToggle = () => {
    const newLocale = locale === 'en' ? 'ar' : 'en';
    setLocale(newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
  };

  return (
    <button
      onClick={handleToggle}
      className="flex items-center rounded-full border border-border dark:border-border-dark min-h-[36px] overflow-hidden bg-surface dark:bg-surface-dark transition-colors"
      aria-label="Toggle language"
    >
      <div
        className={`min-w-[44px] h-full flex items-center justify-center px-2 text-sm transition-colors duration-200 ${
          locale === 'en'
            ? 'bg-primary text-white font-medium'
            : 'bg-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark'
        }`}
      >
        EN
      </div>
      <div
        className={`min-w-[44px] h-full flex items-center justify-center px-2 text-sm transition-colors duration-200 ${
          locale === 'ar'
            ? 'bg-primary text-white font-medium'
            : 'bg-transparent text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark'
        }`}
      >
        عربي
      </div>
    </button>
  );
};
