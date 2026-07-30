'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { dictionary, type Language } from '@/lib/dictionary';

interface I18nContextType {
  language: Language;
  direction: 'ltr' | 'rtl';
  t: typeof dictionary['en'];
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    const savedLang = localStorage.getItem('asala_lang') as Language;
    if (savedLang === 'ar' || savedLang === 'en') {
      setLanguageState(savedLang);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('asala_lang', lang);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState(prev => {
      const next = prev === 'en' ? 'ar' : 'en';
      localStorage.setItem('asala_lang', next);
      return next;
    });
  }, []);

  const direction: 'ltr' | 'rtl' = language === 'ar' ? 'rtl' : 'ltr';
  const t = dictionary[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = direction;
  }, [language, direction]);

  const value = React.useMemo(
    () => ({ language, direction, t, setLanguage, toggleLanguage }),
    [language, direction, t, setLanguage, toggleLanguage]
  );

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
