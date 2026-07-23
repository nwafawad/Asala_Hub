"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UIRole, NAV_CONFIG } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/context';
import { 
  BookOpen, FileEdit, BarChart3, LayoutDashboard, Table, 
  TrendingUp, Activity, AlertTriangle, Search, ShoppingCart, 
  Package, Film, DollarSign, ChevronLeft, ChevronRight 
} from 'lucide-react';

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  BookOpen, FileEdit, BarChart3, LayoutDashboard, Table, 
  TrendingUp, Activity, AlertTriangle, Search, ShoppingCart, 
  Package, Film, DollarSign
};

interface SidebarProps {
  role: UIRole;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar = ({ role, collapsed, onToggleCollapse }: SidebarProps) => {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const navItems = NAV_CONFIG[role] || [];
  const isRtl = locale === 'ar';

  return (
    <aside 
      className={`
        fixed top-[56px] start-0 h-[calc(100vh-56px)] bg-surface-elevated dark:bg-surface-elevated-dark border-e border-border dark:border-border-dark
        transition-all duration-200 ease-in-out z-40 hidden lg:flex flex-col
        ${collapsed ? 'w-[64px]' : 'w-[240px]'}
      `}
    >
      <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => {
          const Icon = ICON_MAP[item.icon] || LayoutDashboard;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                min-h-[44px] flex items-center px-3 rounded-lg transition-colors group relative overflow-hidden
                ${isActive ? 'bg-primary/10 text-primary dark:text-primary' : 'text-text-secondary dark:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark'}
              `}
              title={collapsed ? t(item.key) : undefined}
            >
              {isActive && (
                <div className="absolute start-0 top-1/2 -translate-y-1/2 w-[3px] h-2/3 bg-primary rounded-e-full" />
              )}
              
              <div className="flex-shrink-0 flex items-center justify-center min-w-[24px]">
                <Icon size={24} className={isActive ? 'text-primary' : 'text-text-secondary dark:text-text-secondary-dark group-hover:text-text-primary dark:group-hover:text-text-primary-dark'} />
              </div>
              
              <span 
                className={`
                  ms-3 text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${collapsed ? 'opacity-0 w-0 hidden' : 'opacity-100 w-auto'}
                  ${isActive ? 'text-primary' : 'text-text-primary dark:text-text-primary-dark'}
                `}
              >
                {t(item.key)}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="p-2 border-t border-border dark:border-border-dark mt-auto">
        <button
          onClick={onToggleCollapse}
          className="min-h-[44px] w-full flex items-center justify-center rounded-lg hover:bg-surface dark:hover:bg-surface-dark text-text-secondary dark:text-text-secondary-dark transition-colors"
          aria-label={collapsed ? t('expand_sidebar') : t('collapse_sidebar')}
        >
          {isRtl ? (
            <ChevronRight size={20} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          ) : (
            <ChevronLeft size={20} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
          )}
        </button>
      </div>
    </aside>
  );
};
