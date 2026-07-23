"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import enDict from './en.json';
import arDict from './ar.json';

type Locale = 'en' | 'ar';
type Dictionary = Record<string, string>;

interface I18nContextType {
  locale: Locale;
  dir: 'ltr' | 'rtl';
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const dictionaries: Record<Locale, Dictionary> = {
  en: enDict as Dictionary,
  ar: arDict as Dictionary,
};

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const savedLocale = localStorage.getItem('asala-locale') as Locale | null;
    const initialLocale = savedLocale || 'en';
    setLocaleState(initialLocale);
    document.documentElement.dir = initialLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = initialLocale;
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    document.documentElement.dir = newLocale === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = newLocale;
    localStorage.setItem('asala-locale', newLocale);
  };

  const t = (key: string, params?: Record<string, string | number>) => {
    const dict = dictionaries[locale];
    let text = dict[key] || key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{{${k}}}`, 'g'), String(v));
      });
    }
    return text;
  };

  return (
    <I18nContext.Provider value={{ locale, dir: locale === 'ar' ? 'rtl' : 'ltr', setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within an I18nProvider');
  }
  return context;
}
