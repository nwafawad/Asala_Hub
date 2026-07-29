'use client';

import React, { useEffect, useState } from 'react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { AdminDashboardStats, AdminHealthResponse } from '@/types/admin';
import { StatCard } from '@/components/ui/StatCard';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard } from '@/components/ui/Skeletons';
import {
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Activity,
  ScrollText,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AdminDashboardViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ onNavigateTab }) => {
  const { getDashboardStats, getHealth } = useAdminApi();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [health, setHealth] = useState<AdminHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, healthData] = await Promise.all([getDashboardStats(), getHealth()]);
      setStats(statsData);
      setHealth(healthData);
    } catch (err) {
      console.error('Error loading admin dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-500/15 via-purple-500/5 to-transparent border border-purple-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              System Health & Operational Overview
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
              Campus Root Admin
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Monitor infrastructure status, database background sync metrics, and manage institutional user accounts.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors cursor-pointer shrink-0 self-start md:self-center shadow-xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {/* Infrastructure Service Status Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">API Gateway</span>
              <span className="text-[10px] text-muted-foreground">FastAPI REST /api/admin</span>
            </div>
          </div>
          <StatusPill status="synced">OPERATIONAL</StatusPill>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full ${health?.database === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">PostgreSQL DB</span>
              <span className="text-[10px] text-muted-foreground">SQLModel Connection Pool</span>
            </div>
          </div>
          <StatusPill status={health?.database === 'connected' ? 'synced' : 'error'}>
            {health?.database === 'connected' ? 'HEALTHY' : 'DEGRADED'}
          </StatusPill>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">Sync Engine</span>
              <span className="text-[10px] text-muted-foreground">Seq #{health?.max_server_sequence || 0}</span>
            </div>
          </div>
          <StatusPill status="synced font-mono">SEQ {health?.max_server_sequence || 0}</StatusPill>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs font-bold text-foreground">Media Pipeline</span>
              <span className="text-[10px] text-muted-foreground">FFmpeg Transcoder</span>
            </div>
          </div>
          <StatusPill status="synced">IDLE</StatusPill>
        </div>
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

      {/* Quick Action Navigation & Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions Panel */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
          <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2 border-b border-border pb-3">
            <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Quick Admin Shortcuts
          </h3>

          <div className="flex flex-col gap-2.5">
            <button
              onClick={() => onNavigateTab?.('userManagement')}
              className="p-3.5 rounded-xl border border-border bg-background hover:bg-purple-500/10 hover:border-purple-500/30 flex items-center justify-between text-xs font-semibold text-foreground transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Users className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span>Manage User Directory</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    Reset passwords, suspend/reactivate accounts
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-purple-600 transition-colors" />
            </button>

            <button
              onClick={() => onNavigateTab?.('userManagement')}
              className="p-3.5 rounded-xl border border-border bg-background hover:bg-rose-500/10 hover:border-rose-500/30 flex items-center justify-between text-xs font-semibold text-foreground transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  <UserX className="w-4 h-4" />
                </div>
                <div className="flex flex-col text-left">
                  <span>View Suspended Accounts</span>
                  <span className="text-[10px] text-muted-foreground font-normal">
                    {stats?.suspended_accounts || 0} accounts currently blocked
                  </span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-600 transition-colors" />
            </button>
          </div>
        </div>

        {/* Audit Activity Feed */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Recent Administrative Activity Log
            </h3>
            <span className="text-xs text-muted-foreground font-mono">CR-3 Audit Trail</span>
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
                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 shrink-0">
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
    </div>
  );
};
