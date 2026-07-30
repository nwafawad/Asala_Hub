import type { Metadata, Viewport } from 'next';
import { Geist, Lora } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { I18nProvider } from '@/context/I18nContext';
import { SyncProvider } from '@/context/SyncContext';
import { OverlayProvider } from '@/context/OverlayContext';
import { AuthProvider } from '@/context/AuthContext';
import { StorageProvider } from '@/context/StorageContext';
import { ServiceWorkerRegister } from '@/components/shell/ServiceWorkerRegister';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist',
  subsets: ['latin'],
});

const loraSerif = Lora({
  variable: '--font-lora',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Asala Hub — Offline-First Campus LMS',
  description: 'Robust offline LMS platform for educational campuses',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf9f6' },
    { media: '(prefers-color-scheme: dark)', color: '#121211' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${loraSerif.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <I18nProvider>
            <OverlayProvider>
              <AuthProvider>
                <StorageProvider>
                  <SyncProvider>
                    <ServiceWorkerRegister />
                    {children}
                  </SyncProvider>
                </StorageProvider>
              </AuthProvider>
            </OverlayProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
