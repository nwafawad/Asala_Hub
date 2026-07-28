'use client';

import React, { useEffect, useState } from 'react';
import { db, seedInitialMockData, type CachedSubmission } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { StatCard } from '@/components/ui/StatCard';
import { FileCheck, ShieldCheck, Printer, CheckCircle2, Clock, Activity, GitCommit, Database, Layers } from 'lucide-react';

export const ProgressTracker: React.FC = () => {
  const { t } = useI18n();
  const { pendingCount, isOnline } = useSync();
  const { showToast } = useOverlay();
  const [submissions, setSubmissions] = useState<CachedSubmission[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; title: string; completed: number; total: number }[]>([]);
  const [txLogs, setTxLogs] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  useEffect(() => {
    async function loadData() {
      await seedInitialMockData();
      const [allSubmissions, allCourses, allModules, logs] = await Promise.all([
        db.cachedSubmissions.toArray(),
        db.cachedCourses.toArray(),
        db.cachedModules.toArray(),
        db.transactionLogs.toArray(),
      ]);

      setSubmissions(allSubmissions);

      const courseStats = allCourses.map(c => {
        const mods = allModules.filter(m => m.courseId === c.id);
        const completed = mods.filter(m => m.isCompleted).length;
        return {
          id: c.id,
          code: c.code,
          title: c.title,
          completed,
          total: mods.length || 1,
        };
      });

      setCourses(courseStats);
      setTxLogs(logs);
    }
    loadData();
  }, [pendingCount]);

  const handlePrintReceipt = React.useCallback(
    (sub: CachedSubmission) => {
      const windowPrint = window.open('', '', 'width=600,height=400');
      if (windowPrint) {
        windowPrint.document.write(`
        <html>
          <head>
            <title>Offline Submission Receipt - ${sub.assignmentTitle}</title>
            <style>
              body { font-family: sans-serif; padding: 24px; color: #1c1b18; }
              h1 { font-size: 18px; margin-bottom: 4px; }
              .box { border: 1px solid #e6e4df; padding: 16px; border-radius: 8px; margin-top: 12px; }
              .hash { font-family: monospace; font-size: 11px; background: #f4f3ef; padding: 6px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>Asala Hub — Offline Submission Receipt</h1>
            <p>Official cryptographic proof of student assignment submission stored in browser IndexedDB.</p>
            <div class="box">
              <p><strong>Assignment:</strong> ${sub.assignmentTitle}</p>
              <p><strong>Student:</strong> ${sub.studentName}</p>
              <p><strong>Submitted At:</strong> ${new Date(sub.submittedAt).toLocaleString()}</p>
              <p><strong>Status:</strong> ${sub.syncStatus.toUpperCase()}</p>
              <p><strong>Receipt Hash:</strong> <span class="hash">${sub.receiptHash || 'hash-8a92bc110f'}</span></p>
            </div>
          </body>
        </html>
      `);
        windowPrint.document.close();
        windowPrint.focus();
        windowPrint.print();
      }
      showToast('Receipt Printed', 'success', 'Official local submission receipt generated.');
    },
    [showToast]
  );

  const timelineSteps = React.useMemo(
    () => [
      { title: t.progressTracker.step1, desc: 'Draft saved in IndexedDB cachedSubmissions', icon: Clock, done: true },
      { title: t.progressTracker.step2, desc: 'Captured in Dexie transactionLogs queue', icon: Database, done: true },
      { title: t.progressTracker.step3, desc: 'Packaged into compressed flat JSON delta', icon: Layers, done: true },
      { title: t.progressTracker.step4, desc: 'Transmitted over TLS 1.2+ / LAN HTTP', icon: ShieldCheck, done: isOnline && pendingCount === 0 },
      { title: t.progressTracker.step5, desc: t.progressTracker.serverValidation, icon: GitCommit, done: true },
    ],
    [t, isOnline, pendingCount]
  );

  const totalCompletedModules = courses.reduce((acc, c) => acc + c.completed, 0);
  const totalCourseModules = Math.max(1, courses.reduce((acc, c) => acc + c.total, 0));
  const overallCompletionRate = Math.round((totalCompletedModules / totalCourseModules) * 100);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              {t.progressTracker.title}
            </h2>
            <StatusPill label={t.progressTracker.intranetTopology} variant="success" />
          </div>
          <p className="text-xs text-muted-foreground">{t.progressTracker.subtitle}</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title={t.progressTracker.completionRate}
          value={`${overallCompletionRate}%`}
          subtitle={`Calculated: ${totalCompletedModules} of ${totalCourseModules} modules`}
          icon={CheckCircle2}
          trend={{ value: '+12%', isPositive: true }}
        />
        <StatCard
          title={t.progressTracker.gpaSummary}
          value="3.92"
          subtitle="Top 5% student rank"
          icon={FileCheck}
        />
        <StatCard
          title="Pending Sync Submissions"
          value={pendingCount}
          subtitle="Buffered locally in IndexedDB"
          icon={Clock}
          trend={{ value: `${pendingCount} queued`, isPositive: pendingCount === 0 }}
        />
      </div>

      {/* Course Academic Progress Breakdown Section */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
        <h3 className="text-base font-semibold font-heading text-foreground flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Enrolled Courses Academic Progress Breakdown
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {courses.map(c => {
            const pct = Math.round((c.completed / c.total) * 100);
            return (
              <div key={c.id} className="p-4 rounded-xl border border-border bg-background flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">{c.code}: {c.title}</span>
                  <span className="text-xs font-mono font-bold text-primary">{pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {c.completed} of {c.total} modules completed
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Pane: Submissions List & Receipts */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold font-heading text-foreground">
              Submitted Assignments
            </h3>
            <span className="text-xs text-muted-foreground">{submissions.length} total</span>
          </div>

          <div className="flex flex-col gap-3">
            {submissions.map(sub => (
              <div
                key={sub.id}
                className="p-4 rounded-xl border border-border bg-background flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground">{sub.assignmentTitle}</h4>
                  <StatusPill
                    label={sub.syncStatus}
                    variant={sub.syncStatus === 'synced' ? 'success' : 'warning'}
                  />
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{sub.content}</p>
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(sub.submittedAt).toLocaleTimeString()}
                  </span>
                  <button
                    onClick={() => handlePrintReceipt(sub)}
                    className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Transaction Log Queue Inspector & Sync Timeline */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-base font-semibold font-heading text-foreground">
              Offline Sync Transaction Queue ({txLogs.length})
            </h3>
            <StatusPill label="SRS 3.3 Protocol" variant="info" />
          </div>

          {/* Inspectable Transaction Log Queue List */}
          <div className="flex flex-col gap-2">
            {txLogs.length === 0 ? (
              <div className="p-4 rounded-xl border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                No active transaction logs in queue. All actions are synced.
              </div>
            ) : (
              txLogs.map(log => (
                <div key={log.id || log.timestamp} className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-2">
                  <div
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                  >
                    <div className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-primary" />
                      <span className="text-xs font-mono font-bold text-foreground">{log.action}</span>
                      <span className="text-[11px] text-muted-foreground font-mono">({log.entityType})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill label={log.status} variant={log.status === 'synced' ? 'success' : 'warning'} />
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                  {expandedLogId === log.id && (
                    <pre className="p-3 rounded-lg bg-card border border-border text-[10px] font-mono text-muted-foreground overflow-x-auto">
                      {JSON.stringify(log.payload || log, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 5-Stage Sync Timeline */}
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-4 relative pl-4 rtl:pl-0 rtl:pr-4 border-l rtl:border-l-0 rtl:border-r border-border">
            {timelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex items-start gap-4 group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      step.done
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      {step.title}
                      {step.done && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                    </h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
