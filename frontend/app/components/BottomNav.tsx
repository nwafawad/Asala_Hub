"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UIRole, NAV_CONFIG } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/context';
import { 
  BookOpen, FileEdit, BarChart3, LayoutDashboard, Table, 
  TrendingUp, Activity, AlertTriangle, Search, ShoppingCart, 
  Package, Film, DollarSign 
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  BookOpen, FileEdit, BarChart3, LayoutDashboard, Table, 
  TrendingUp, Activity, AlertTriangle, Search, ShoppingCart, 
  Package, Film, DollarSign
};

interface BottomNavProps {
  role: UIRole;
}

export const BottomNav = ({ role }: BottomNavProps) => {
  const pathname = usePathname();
  const { t } = useTranslation();
  const navItems = NAV_CONFIG[role] || [];

  return (
    <nav className="fixed bottom-0 start-0 end-0 h-[56px] bg-surface-elevated dark:bg-surface-elevated-dark border-t border-border dark:border-border-dark z-40 flex lg:hidden items-center justify-around px-2 pb-safe">
      {navItems.map((item) => {
        const Icon = ICON_MAP[item.icon] || LayoutDashboard;
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.key}
            href={item.href}
            className={`
              flex flex-col items-center justify-center min-w-[64px] h-full relative px-1 transition-colors
              ${isActive ? 'text-primary' : 'text-text-secondary dark:text-text-secondary-dark hover:text-primary dark:hover:text-primary'}
            `}
          >
            {isActive && (
              <div className="absolute top-0 start-1/2 -translate-x-1/2 w-8 h-[2px] bg-primary rounded-b-full" />
            )}
            <Icon size={20} className="mb-1" />
            <span className="text-[10px] font-medium leading-none text-center truncate w-full">
              {t(item.key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
};
