'use client';

import React, { useState, useEffect } from 'react';
import { db, CachedSubmission, TransactionLogItem } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { api } from '@/lib/api';
import { rehydrateStorage } from '@/lib/rehydrate';
import { mapSubmissionReadToCached } from '@/lib/mappers';
import { SubmissionReadDTO } from '@/types/api';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { useAuth } from '@/context/AuthContext';
import { SubmissionGrader } from './SubmissionGrader';
import {
  FileCheck,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Search,
  Filter,
  Eye,
  Award,
  User,
  Paperclip,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export const GradeBook: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { showToast } = useOverlay();
  const [submissions, setSubmissions] = useState<CachedSubmission[]>([]);
  const [moduleMetrics, setModuleMetrics] = useState({ avgCompletion: 0, cacheReadiness: 0 });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'assignments' | 'modules'>('assignments');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'graded'>('all');
  const [activeGraderSubmission, setActiveGraderSubmission] = useState<CachedSubmission | null>(null);

  const loadSubmissions = async () => {
    const subList = await db.cachedSubmissions.toArray();
    setSubmissions(subList);
  };

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setIsLoading(true);
        // 1. Instant Load from IndexedDB cache
        const [subList, moduleList] = await Promise.all([
          db.cachedSubmissions.toArray(),
          db.cachedModules.toArray(),
        ]);
        if (isMounted) {
          setSubmissions(subList);

          const totalModules = moduleList.length;
          if (totalModules > 0) {
            const completedCount = moduleList.filter(m => m.isCompleted).length;
            const cachedCount = moduleList.filter(m => m.isCachedOffline).length;
            setModuleMetrics({
              avgCompletion: Math.round((completedCount / totalModules) * 100),
              cacheReadiness: Math.round((cachedCount / totalModules) * 100),
            });
          } else {
            setModuleMetrics({ avgCompletion: 0, cacheReadiness: 0 });
          }
          setIsLoading(false);
        }

        // 2. Throttled & Parallel Background sync with server API if online
        if (typeof window !== 'undefined' && navigator.onLine) {
          await rehydrateStorage();
          if (isMounted) {
            const [updatedSubList, updatedModules] = await Promise.all([
              db.cachedSubmissions.toArray(),
              db.cachedModules.toArray(),
            ]);
            setSubmissions(updatedSubList);
            const total = updatedModules.length;
            if (total > 0) {
              setModuleMetrics({
                avgCompletion: Math.round((updatedModules.filter(m => m.isCompleted).length / total) * 100),
                cacheReadiness: Math.round((updatedModules.filter(m => m.isCachedOffline).length / total) * 100),
              });
            }
          }
        }
      } catch (err) {
        console.error('Error loading submissions for GradeBook:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveGrade = async (
    submissionId: string,
    score: number,
    feedback: string,
    gradeStatus: 'graded' | 'pending' | 'needs_revision'
  ) => {
    try {
      const sub = await db.cachedSubmissions.get(submissionId);
      if (!sub) return;

      const timestamp = new Date().toISOString();

      const updatedSub: CachedSubmission = {
        ...sub,
        score,
        maxScore: sub.maxScore || 100,
        feedback,
        gradeStatus,
        gradedAt: timestamp,
        educatorId: user?.id || 'user-educator-1',
        syncStatus: 'pending', // Re-queued for sync to send grade delta to central server
      };

      // Save updated submission in Dexie
      await db.cachedSubmissions.put(updatedSub);

      // Write GRADE_ASSIGNMENT transaction log (BR-4, FR-7, FR-14, FR-15)
      const logItem: TransactionLogItem = {
        offlineId: generateUUID(),
        action: 'GRADE_ASSIGNMENT',
        entityType: 'submission',
        entityId: submissionId,
        payload: {
          submissionId,
          assignmentId: sub.assignmentId,
          studentName: sub.studentName,
          grade: score, // Standard backend key for GradePayload validation
          score,
          feedback,
          gradeStatus,
          gradedAt: timestamp,
          serverPrecedenceOverride: true, // BR-4 Educator precedence flag
        },
        timestamp,
        status: 'pending',
      };
      await db.transactionLogs.add(logItem);

      showToast(
        'Grade Saved Offline',
        'success',
        t.educator?.gradeBook?.gradeSavedToast || 'Grade saved locally. Logged for server sync.'
      );

      setActiveGraderSubmission(null);
      await loadSubmissions();
    } catch (err) {
      console.error('Error saving grade:', err);
      showToast('Grading Error', 'error', 'Failed to save grade to local storage.');
    }
  };

  const filteredSubmissions = React.useMemo(() => {
    return submissions.filter(sub => {
      const matchesSearch =
        sub.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sub.assignmentTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const isGraded = sub.gradeStatus === 'graded' || sub.score !== undefined;
      if (statusFilter === 'pending' && isGraded) return false;
      if (statusFilter === 'graded' && !isGraded) return false;

      return matchesSearch;
    });
  }, [submissions, searchQuery, statusFilter]);

  const totalCount = submissions.length;
  const gradedCount = submissions.filter(s => s.gradeStatus === 'graded' || s.score !== undefined).length;
  const pendingCount = totalCount - gradedCount;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.educator?.gradeBook?.title || 'Offline Grade Book & Submissions Grader'}
            </h2>
            <InfoTooltip
              title="Educator Priority Active"
              content="Your assigned grades take absolute priority during server synchronization and lock the submission once saved."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.educator?.gradeBook?.subtitle ||
              'Review student submissions and record authoritative grades locally.'}
          </p>
        </div>
      </div>

      {/* Sub-tab Navigation Bar */}
      <div className="flex items-center gap-3 p-1.5 rounded-2xl bg-muted border border-border self-start">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'assignments'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileCheck className="w-4 h-4 text-amber-500" />
          <span>Assignments & Graded Work</span>
        </button>

        <button
          onClick={() => setActiveTab('modules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'modules'
              ? 'bg-card text-foreground shadow-xs'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span>Module Completion & Reading Progress</span>
        </button>
      </div>

      {activeTab === 'assignments' ? (
        <>
          {/* Prominent Educator Precedence Banner */}
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium leading-relaxed">
              {t.educator?.gradeBook?.precedenceBanner ||
                'Educator Priority Active: Your grades override student cached states upon central sync.'}
            </span>
          </div>

          {/* Stats Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total Submissions</span>
                <span className="text-2xl font-bold font-heading text-foreground">{totalCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-primary">
                <FileCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Pending Review</span>
                <span className="text-2xl font-bold font-heading text-amber-600 dark:text-amber-400">
                  {pendingCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-card border border-border flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Graded & Verified</span>
                <span className="text-2xl font-bold font-heading text-emerald-600 dark:text-emerald-400">
                  {gradedCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Module Completion & Reading Progress Sub-view */
        <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-foreground">Learning Content Reading & Consumption Progress</h3>
              <p className="text-xs text-muted-foreground">
                Track offline caching readiness and reading/listening completion across all enrolled students.
              </p>
            </div>
            <span className="px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 text-xs font-bold">
              Completion Tracking Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Average Module Completion Rate</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">{moduleMetrics.avgCompletion}%</span>
                <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${moduleMetrics.avgCompletion}%` }} />
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Offline Audio & Media Cache Readiness</span>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-foreground">{moduleMetrics.cacheReadiness}%</span>
                <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-300" style={{ width: `${moduleMetrics.cacheReadiness}%` }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by student or assignment..."
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            All Submissions
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-amber-500 text-white'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Needs Grading
          </button>
          <button
            onClick={() => setStatusFilter('graded')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
              statusFilter === 'graded'
                ? 'bg-emerald-600 text-white'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted'
            }`}
          >
            Graded
          </button>
        </div>
      </div>

      {/* Submissions Master Table */}
      <div className="p-5 rounded-2xl bg-card border border-border overflow-hidden">
        {filteredSubmissions.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <FileCheck className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No submissions found matching your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 px-4 text-start">{t.educator?.gradeBook?.studentName || 'Student Name'}</th>
                  <th className="py-3 px-4 text-start">{t.educator?.gradeBook?.assignment || 'Assignment'}</th>
                  <th className="py-3 px-4 text-start">{t.educator?.gradeBook?.submittedAt || 'Submitted At'}</th>
                  <th className="py-3 px-4 text-center">Attachments</th>
                  <th className="py-3 px-4 text-center">{t.educator?.gradeBook?.score || 'Score'}</th>
                  <th className="py-3 px-4 text-center">{t.educator?.gradeBook?.gradeStatus || 'Status'}</th>
                  <th className="py-3 px-4 text-end">{t.educator?.gradeBook?.actions || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubmissions.map(sub => {
                  const isGraded = sub.score !== undefined;
                  const hasAttachments = sub.attachments && sub.attachments.length > 0;

                  return (
                    <tr key={sub.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-foreground flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>{sub.studentName}</span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-foreground">{sub.assignmentTitle}</td>
                      <td className="py-3.5 px-4 text-muted-foreground font-mono text-[11px]">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono">
                        {hasAttachments ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold">
                            <Paperclip className="w-3 h-3" />
                            {sub.attachments?.length} files
                          </span>
                        ) : (
                          <span className="text-muted-foreground/60">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-foreground">
                        {isGraded ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                            {sub.score} / {sub.maxScore || 100}
                          </span>
                        ) : (
                          <span className="text-muted-foreground font-normal">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isGraded ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            Graded
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                            Needs Review
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-end">
                        <button
                          onClick={() => setActiveGraderSubmission(sub)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t.educator?.gradeBook?.gradeAction || 'Inspect & Grade'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Grader Drawer / Modal */}
      {activeGraderSubmission && (
        <SubmissionGrader
          submission={activeGraderSubmission}
          onSaveGrade={handleSaveGrade}
          onClose={() => setActiveGraderSubmission(null)}
        />
      )}
    </div>
  );
};
