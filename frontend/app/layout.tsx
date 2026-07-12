import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "Asala Hub - Offline-First E-Learning PWA",
  description: "Empowering education anywhere, anytime, completely offline.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-[#0b0c10] text-[#c5c6c7] font-sans antialiased">
        {/* Navigation Bar */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0b0c10]/70 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 items-center justify-between">
              
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-purple-500/20">
                  A
                </div>
                <span className="font-outfit text-xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-wide">
                  Asala Hub
                </span>
              </div>

              {/* Navigation Placeholder Links */}
              <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
                <a href="#" className="hover:text-white transition-colors duration-200">Dashboard</a>
                <a href="#" className="hover:text-white transition-colors duration-200">Courses</a>
                <a href="#" className="hover:text-white transition-colors duration-200">Library</a>
              </nav>

              {/* Status & Action Area */}
              <div className="flex items-center gap-4">
                {/* Sync Indicator */}
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold tracking-wider uppercase select-none">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  Online
                </div>
                
                {/* Profile Placeholder */}
                <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center font-semibold text-xs text-slate-300">
                  JD
                </div>
              </div>

            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 bg-[#08090d] py-6 text-center text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Asala Hub. Built for offline resilience.</p>
        </footer>
      </body>
    </html>
  );
}
