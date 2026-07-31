import type { Metadata, Viewport } from 'next';
import { Geist, Lora, Noto_Sans_Arabic } from 'next/font/google';
import { cookies } from 'next/headers';
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

const notoSansArabic = Noto_Sans_Arabic({
  variable: '--font-arabic',
  subsets: ['arabic'],
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const langCookie = cookieStore.get('asala_lang')?.value;
  const lang = langCookie === 'ar' ? 'ar' : 'en';
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  return (
    <html lang={lang} dir={dir} suppressHydrationWarning className={`${geistSans.variable} ${loraSerif.variable} ${notoSansArabic.variable}`}>
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
