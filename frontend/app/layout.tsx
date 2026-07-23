import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { I18nProvider } from '@/lib/i18n/context';
import { NotificationProvider } from './components/NotificationProvider';
import { DatabaseSeeder } from './components/DatabaseSeeder';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Asala Hub — Offline-First E-Learning',
  description: 'An offline-first e-learning platform providing continuous access to education resources anytime, anywhere.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider>
          <I18nProvider>
            <NotificationProvider>
              <DatabaseSeeder />
              {children}
            </NotificationProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
