'use client';

import React, { useEffect, useState } from 'react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { AdminDashboardStats } from '@/types/admin';
import { StatCard } from '@/components/ui/StatCard';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { startViewTransition } from '@/lib/view-transition';
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Activity,
  ScrollText,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = () => {
  const { getDashboardStats } = useAdminApi();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const statsRes = await getDashboardStats();
      setStats(statsRes);
    } catch (err) {
      console.error('Error loading admin dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    startViewTransition(() => {
      loadData();
    });
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div
        style={{ viewTransitionName: 'admin-header-banner' }}
        className="p-6 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold font-heading text-foreground">
            System Operational Overview
          </h2>
          <p className="text-xs text-muted-foreground">
            Monitor institutional user metrics and recent administrative activity logs.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0 self-start md:self-center shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-primary ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Live Counter Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard
              title="Total Enrolled Students"
              value={stats?.total_students || 0}
              subtitle="Active campus learners"
              icon={GraduationCap}
              trend={{ value: 'Students', isPositive: true }}
            />
            <StatCard
              title="Total Educators"
              value={stats?.total_educators || 0}
              subtitle="Assigned faculty & instructors"
              icon={Users}
              trend={{ value: 'Faculty', isPositive: true }}
            />
            <StatCard
              title="Active Accounts"
              value={stats?.active_accounts || 0}
              subtitle="Full system access permitted"
              icon={UserCheck}
              trend={{ value: 'Active', isPositive: true }}
            />
            <StatCard
              title="Suspended Accounts"
              value={stats?.suspended_accounts || 0}
              subtitle="Blocked from central sync"
              icon={UserX}
              trend={{
                value: `${stats?.suspended_accounts || 0} Suspended`,
                isPositive: (stats?.suspended_accounts || 0) === 0,
              }}
            />
          </>
        )}
      </div>

      {/* Audit Activity Feed */}
      <div
        style={{ viewTransitionName: 'admin-audit-log' }}
        className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4"
      >
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
            <ScrollText className="w-4 h-4 text-primary" />
            Recent Administrative Activity Log
          </h3>
        </div>

        <div className="flex flex-col gap-2.5">
          {!stats?.recent_audit_events || stats.recent_audit_events.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground italic">
              No recent administrative actions recorded in the audit trail.
            </div>
          ) : (
            stats.recent_audit_events.map(event => (
              <div
                key={event.id}
                className="p-3 rounded-xl border border-border bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <Activity className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-foreground uppercase tracking-wider text-[11px]">
                      {event.action_type.replace('_', ' ')}
                    </span>
                    <span className="text-muted-foreground text-[11px]">
                      Actor: <strong className="text-foreground">{event.actor_name}</strong>
                      {event.target_user_name && (
                        <>
                          {' '}→ Target: <strong className="text-foreground">{event.target_user_name}</strong>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1 shrink-0">
                  <Clock className="w-3 h-3 text-amber-500" />
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
