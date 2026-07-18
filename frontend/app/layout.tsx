import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/LayoutShell";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${outfit.variable} h-full dark`}>
      <body className="min-h-full flex flex-col bg-[#0b0c10] text-[#c5c6c7] font-sans antialiased">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
