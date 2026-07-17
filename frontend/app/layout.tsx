import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Asala Hub — Offline-First Learning Platform",
  description: "Empowering education anywhere, anytime, with robust offline capabilities.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-slate-50 text-slate-900 dark:bg-zinc-950 dark:text-zinc-50 flex flex-col transition-colors duration-300">
        
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/70 dark:bg-zinc-950/70 border-b border-slate-200/80 dark:border-zinc-800/80 transition-colors duration-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                Asala Hub
              </span>
            </div>

            {/* Navigation links & status */}
            <div className="flex items-center space-x-6">
              <nav className="hidden md:flex space-x-1">
                <a href="#" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 transition-all">
                  Dashboard
                </a>
                <a href="#" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 transition-all">
                  Courses
                </a>
                <a href="#" className="px-3 py-2 rounded-lg text-sm font-semibold text-slate-600 dark:text-zinc-300 hover:bg-slate-100/50 dark:hover:bg-zinc-800/50 transition-all">
                  Assignments
                </a>
              </nav>

              {/* Status Badge */}
              <div className="flex items-center space-x-2 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/20 px-3.5 py-1.5 rounded-full text-emerald-600 dark:text-emerald-400 text-xs font-semibold select-none shadow-sm shadow-emerald-500/5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Online</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
