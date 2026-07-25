'use client';

import React from 'react';
import { useI18n } from '@/context/I18nContext';
import { LayoutDashboard, BookOpen, FileCheck, RefreshCw, Settings, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
  const { t } = useI18n();

  const navItems = [
    { id: 'dashboard', label: t.nav.dashboard, icon: LayoutDashboard },
    { id: 'courses', label: t.nav.courses, icon: BookOpen },
    { id: 'assignments', label: t.nav.assignments, icon: FileCheck },
    { id: 'syncQueue', label: t.nav.syncQueue, icon: RefreshCw },
    { id: 'settings', label: t.nav.settings, icon: Settings },
  ];

  return (
    <aside className="w-64 border-r rtl:border-r-0 rtl:border-l border-border bg-card flex flex-col justify-between shrink-0 transition-colors">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold font-heading text-foreground leading-tight">
              {t.appName}
            </h1>
            <p className="text-[11px] text-muted-foreground">{t.appSubtitle}</p>
          </div>
        </div>

        <nav className="mt-8 flex flex-col gap-1.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all cursor-pointer',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
            AH
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-foreground">Asala Educator</span>
            <span className="text-[10px] text-muted-foreground">educator@asala.edu</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
