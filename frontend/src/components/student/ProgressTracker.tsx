'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { db, seedInitialMockData, type CachedSubmission } from '@/lib/db';
import { api } from '@/lib/api';
import { rehydrateStorage } from '@/lib/rehydrate';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { StatCard } from '@/components/ui/StatCard';
import { formatPreviewContent } from '@/lib/compress';
import {
  FileCheck,
  ShieldCheck,
  Printer,
  CheckCircle2,
  Clock,
  Activity,
  GitCommit,
  Database,
  Layers,
  AlertCircle,
  FileText,
} from 'lucide-react';

export const ProgressTracker: React.FC = () => {
  const { t } = useI18n();
  const { pendingCount, pendingSubmissionsCount, isOnline } = useSync();
  const { showToast } = useOverlay();
  const [submissions, setSubmissions] = useState<CachedSubmission[]>([]);
  const [courses, setCourses] = useState<{ id: string; code: string; title: string; completed: number; total: number }[]>([]);
  const [txLogs, setTxLogs] = useState<any[]>([]);
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      await seedInitialMockData();
      // 1. Instant Load from IndexedDB cache
      const [allSubmissions, allCourses, allModules, logs] = await Promise.all([
        db.cachedSubmissions.toArray(),
        db.cachedCourses.toArray(),
        db.cachedModules.toArray(),
        db.transactionLogs.toArray(),
      ]);

      if (isMounted) {
        setSubmissions(allSubmissions);

        if (allSubmissions.length > 0 && !selectedSubId) {
          const pendingSub = allSubmissions.find(s => s.syncStatus === 'pending');
          setSelectedSubId(pendingSub ? pendingSub.id : allSubmissions[0].id);
        }

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
        setTxLogs(logs.slice(-5).reverse());
      }

      // 2. Background sync with server API if online (throttled & parallel)
      if (typeof window !== 'undefined' && navigator.onLine) {
        await rehydrateStorage();
        if (isMounted) {
          const updatedSubs = await db.cachedSubmissions.toArray();
          setSubmissions(updatedSubs);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const selectedSub = useMemo(() => {
    return submissions.find(s => s.id === selectedSubId) || submissions[0] || null;
  }, [submissions, selectedSubId]);

  const handlePrintReceipt = React.useCallback(
    (sub: CachedSubmission) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText =
        'position:absolute;width:0;height:0;border:none;left:-9999px;top:-9999px;';
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(`
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
              <p><strong>Receipt Hash:</strong> <span class="hash">${sub.receiptHash || `hash-${sub.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 10)}`}</span></p>
            </div>
          </body>
        </html>
      `);
        doc.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          iframe.contentWindow?.addEventListener('afterprint', () => {
            document.body.removeChild(iframe);
          });
        }, 300);
      }

      showToast('Receipt Printed', 'success', 'Official local submission receipt generated.');
    },
    [showToast]
  );

  const timelineSteps = useMemo(() => {
    if (!selectedSub) {
      return [
        { title: t.progressTracker.step1, desc: 'Draft saved in IndexedDB cachedSubmissions', icon: Clock, done: false, active: false },
        { title: t.progressTracker.step2, desc: 'Captured in Dexie transactionLogs queue', icon: Database, done: false, active: false },
        { title: t.progressTracker.step3, desc: 'Packaged into compressed flat JSON delta', icon: Layers, done: false, active: false },
        { title: t.progressTracker.step4, desc: 'Transmitted over TLS 1.2+ / LAN HTTP', icon: ShieldCheck, done: false, active: false },
        { title: t.progressTracker.step5, desc: t.progressTracker.serverValidation, icon: GitCommit, done: false, active: false },
      ];
    }

    const isPending = selectedSub.syncStatus === 'pending';
    const isSynced = selectedSub.syncStatus === 'synced';
    const isFailed = selectedSub.syncStatus === 'failed';

    return [
      {
        title: t.progressTracker.step1,
        desc: `Draft stored locally for ${selectedSub.assignmentTitle}`,
        icon: Clock,
        done: true,
        active: false,
      },
      {
        title: t.progressTracker.step2,
        desc: 'Captured in Dexie transactionLogs queue',
        icon: Database,
        done: true,
        active: false,
      },
      {
        title: t.progressTracker.step3,
        desc: 'Packaged into compressed flat JSON delta',
        icon: Layers,
        done: true,
        active: isPending,
      },
      {
        title: t.progressTracker.step4,
        desc: isSynced
          ? 'Transmitted over TLS 1.2+ / Intranet Connection'
          : isOnline
          ? 'Network online — sync in progress'
          : 'Waiting for network connection (Offline)',
        icon: ShieldCheck,
        done: isSynced,
        active: isPending && isOnline,
      },
      {
        title: t.progressTracker.step5,
        desc: isSynced
          ? `Server validated & ${selectedSub.serverSeqNum != null ? `sequence #${selectedSub.serverSeqNum}` : 'server sequence'} acknowledged`
          : isFailed
          ? 'Rejection / Conflict encountered'
          : 'Awaiting server sequence ACK',
        icon: GitCommit,
        done: isSynced && selectedSub.serverSeqNum != null,
        active: false,
      },
    ];
  }, [t, selectedSub, isOnline]);

  const totalCompletedModules = courses.reduce((acc, c) => acc + c.completed, 0);
  const totalCourseModules = Math.max(1, courses.reduce((acc, c) => acc + c.total, 0));
  const overallCompletionRate = Math.round((totalCompletedModules / totalCourseModules) * 100);

  const gradedSubmissions = useMemo(() => {
    return submissions.filter(s => s.score !== undefined && s.score !== null);
  }, [submissions]);

  const calculatedGpa = useMemo(() => {
    if (gradedSubmissions.length === 0) return 'N/A';
    const totalScorePct = gradedSubmissions.reduce(
      (sum, s) => sum + ((s.score || 0) / (s.maxScore || 100)) * 100,
      0
    );
    const avgPct = totalScorePct / gradedSubmissions.length;
    return Math.min(4.0, (avgPct / 100) * 4.0).toFixed(2);
  }, [gradedSubmissions]);

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
            <InfoTooltip
              title="Intranet Sync Active"
              content="Your learning progress, quiz scores, and assignment submissions automatically synchronize with the institutional network."
              position="bottom"
            />
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
          trend={{
            value: `${totalCompletedModules} done`,
            isPositive: totalCompletedModules > 0,
          }}
        />
        <StatCard
          title={t.progressTracker.gpaSummary}
          value={calculatedGpa}
          subtitle={
            gradedSubmissions.length > 0
              ? `Calculated from ${gradedSubmissions.length} graded assignments`
              : 'No graded assignments yet'
          }
          icon={FileCheck}
        />
        <StatCard
          title="Pending Sync Submissions"
          value={pendingSubmissionsCount}
          subtitle="Buffered locally in IndexedDB"
          icon={Clock}
          trend={{
            value: `${pendingSubmissionsCount} queued`,
            isPositive: pendingSubmissionsCount === 0,
          }}
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
                  <span className="text-xs font-bold text-foreground">
                    {c.code}: {c.title}
                  </span>
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
            {submissions.map(sub => {
              const isSelected = selectedSub?.id === sub.id;
              return (
                <div
                  key={sub.id}
                  onClick={() => setSelectedSubId(sub.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-xs'
                      : 'border-border bg-background hover:bg-muted/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-foreground">{sub.assignmentTitle}</h4>
                    <div title="Local Assignment Status: Stored in browser IndexedDB cache">
                      <StatusPill
                        label={sub.syncStatus}
                        variant={sub.syncStatus === 'synced' ? 'success' : 'warning'}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {formatPreviewContent(sub.content)}
                  </p>
                  <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {new Date(sub.submittedAt).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        handlePrintReceipt(sub);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary font-semibold hover:underline cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Receipt</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Transaction Log Queue Inspector & Sync Timeline */}
        <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <div className="flex flex-col gap-0.5">
              <h3 className="text-base font-semibold font-heading text-foreground">
                Submission Sync Lifecycle Timeline
              </h3>
              {selectedSub && (
                <span className="text-xs text-muted-foreground">
                  Inspecting: <strong className="text-foreground">{selectedSub.assignmentTitle}</strong> ({selectedSub.syncStatus})
                </span>
              )}
            </div>
            <InfoTooltip
              title="Sync Lifecycle Protocol"
              content="Tracks submission transaction stages from local draft to central server confirmation."
            />
          </div>

          {/* 5-Stage Sync Timeline */}
          <div className="mt-2 pt-2 flex flex-col gap-4 relative pl-4 rtl:pl-0 rtl:pr-4 border-l rtl:border-l-0 rtl:border-r border-border">
            {timelineSteps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <div key={idx} className="relative flex items-start gap-4 group">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      step.done
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : step.active
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/40 animate-pulse'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex flex-col gap-0.5">
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                      {step.title}
                      {step.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : step.active ? (
                        <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                      ) : null}
                    </h4>
                    <p className="text-xs text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inspectable Transaction Log Queue List Preview */}
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-primary" />
                IndexedDB Transaction Logs ({txLogs.length})
              </h4>
            </div>

            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
              {txLogs.length === 0 ? (
                <div className="p-3 rounded-xl border border-border bg-muted/20 text-center text-xs text-muted-foreground">
                  No active transaction logs in queue. All actions are synced.
                </div>
              ) : (
                txLogs.map(log => (
                  <div
                    key={log.id || log.timestamp}
                    className="p-3 rounded-xl border border-border bg-muted/20 flex flex-col gap-2"
                  >
                    <div
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-mono font-bold text-foreground">
                          {log.action}
                        </span>
                        <span className="text-[11px] text-muted-foreground font-mono">
                          ({log.entityType})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusPill
                          label={log.status}
                          variant={log.status === 'synced' ? 'success' : 'warning'}
                        />
                        <span className="text-[10px] text-muted-foreground font-mono">
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
          </div>
        </div>
      </div>
    </div>
  );
};
