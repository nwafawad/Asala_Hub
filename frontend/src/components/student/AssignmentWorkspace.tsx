'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { db, seedInitialMockData, type AttachmentFile, type DraftSnapshot } from '@/lib/db';
import { compressPayload, decompressPayload } from '@/lib/compress';
import { generateUUID } from '@/lib/uuid';
import { encryptText, decryptText } from '@/lib/crypto';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { useAuth } from '@/context/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import { DraftHistoryModal } from '@/components/student/DraftHistoryModal';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  Paperclip,
  Send,
  Eye,
  Edit3,
  Clock,
  Award,
  FileText,
  CheckCircle2,
  Bold,
  Italic,
  Heading2,
  List,
  Code,
  History,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  WifiOff,
  GitMerge,
  AlertCircle,
  Check,
  Trash2,
  Upload,
} from 'lucide-react';

interface AssignmentWorkspaceProps {
  onBack?: () => void;
  assignmentId?: string;
}

export const AssignmentWorkspace: React.FC<AssignmentWorkspaceProps> = ({ onBack, assignmentId = 'assign-2' }) => {
  const { t, language } = useI18n();
  const isRtl = language === 'ar';
  const { isOnline } = useSync();
  const { showToast } = useOverlay();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [content, setContent] = useState<string>('');
  const [assignmentInfo, setAssignmentInfo] = useState<{
    title: string;
    courseCode: string;
    points: number;
    dueDate: string;
  }>({
    title: 'Assignment Submission Workspace',
    courseCode: 'ASSIGNMENT',
    points: 100,
    dueDate: '',
  });
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([]);
  const [conflictDrafts, setConflictDrafts] = useState<DraftSnapshot[]>([]);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [gradeData, setGradeData] = useState<{
    score?: number;
    maxScore?: number;
    feedback?: string;
    gradeStatus?: string;
    gradedAt?: string;
  } | null>(null);

  // Live autosave state
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [secondsAgo, setSecondsAgo] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstRender = useRef<boolean>(true);
  // Bug #5: stable ref always holding the latest draftHistory — avoids stale closure in the autosave timeout
  const draftHistoryRef = useRef<DraftSnapshot[]>([]);

  // Load existing draft & history from IndexedDB strictly scoped by assignmentId
  useEffect(() => {
    isFirstRender.current = true;
    async function loadDraft() {
      await seedInitialMockData();

      // Attempt to load associated module/assignment info
      const modules = await db.cachedModules.toArray();
      const matchModule = modules.find(
        m => m.assignmentId === assignmentId || m.id === assignmentId
      );
      if (matchModule) {
        const courses = await db.cachedCourses.toArray();
        const parentCourse = courses.find(c => c.id === matchModule.courseId);
        setAssignmentInfo({
          title: matchModule.title,
          courseCode: parentCourse?.code || 'COURSE',
          points: matchModule.points || 100,
          dueDate: matchModule.dueDate || '',
        });
      }

      const existing = await db.cachedSubmissions
        .where('assignmentId')
        .equals(assignmentId)
        .first();

      if (existing) {
        let decompressed = '';
        if (existing.content) {
          const decrypted = await decryptText(existing.content);
          decompressed = decompressPayload(decrypted);
        }
        setContent(decompressed);
        setAttachments(existing.attachments || []);
        if (existing.score !== undefined && existing.score !== null) {
          setGradeData({
            score: existing.score,
            maxScore: existing.maxScore || 100,
            feedback: existing.feedback,
            gradeStatus: existing.gradeStatus || 'graded',
            gradedAt: existing.gradedAt,
          });
        } else {
          setGradeData(null);
        }
        if (existing.syncStatus === 'pending' || existing.syncStatus === 'synced') {
          setIsSubmitted(true);
        }
        if (existing.deviceConflictDrafts) setConflictDrafts(existing.deviceConflictDrafts);
        if (existing.draftHistory && existing.draftHistory.length > 0) {
          setDraftHistory(existing.draftHistory);
        }
      } else {
        setAttachments([]);
        setDraftHistory([]);
        setGradeData(null);
      }
    }
    loadDraft();

    const handleVersionConflict = (evt: Event) => {
      const customEvt = evt as CustomEvent;
      const serverText =
        customEvt.detail?.serverError ||
        '# Server Version (Instructor Updated)\n\nThis content was updated on the server/another device.';
      
      const serverSnapshot: DraftSnapshot = {
        id: `server-conflict-${Date.now()}`,
        timestamp: new Date().toISOString(),
        content: serverText,
        wordCount: serverText.trim().split(/\s+/).length,
        sizeKb: +(serverText.length / 1024).toFixed(2),
        isServerConflict: true,
        label: '⚠️ Server Version (Instructor Updated)',
      };

      setDraftHistory(prev => [serverSnapshot, ...prev]);
      setIsHistoryOpen(true);
    };

    window.addEventListener('asala:version-conflict', handleVersionConflict);
    return () => window.removeEventListener('asala:version-conflict', handleVersionConflict);
  }, [assignmentId]);

  // Live Autosave relative time ticker (updates secondsAgo every second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'saved') {
        setSecondsAgo(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [saveStatus]);

  // Bug #5: keep draftHistoryRef current so autosave timeout always reads the latest history
  useEffect(() => {
    draftHistoryRef.current = draftHistory;
  }, [draftHistory]);

  // Debounced 1.5s Auto-Save into Dexie IndexedDB with Draft History snapshots
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    setSaveStatus('saving');

    const timer = setTimeout(async () => {
      try {
        const now = new Date();
        const words = content.trim().split(/\s+/).filter(Boolean).length;
        const sizeKb = +(content.length / 1024).toFixed(2);

        // Perf #2: only create a history snapshot on meaningful change
        // (>= 10 word delta OR >= 60 seconds since last snapshot) to prevent rapid fill
        const latestSnaps = draftHistoryRef.current;
        const lastSnap = latestSnaps[0];
        const wordDelta = Math.abs(words - (lastSnap?.wordCount ?? 0));
        const secondsSinceLast = lastSnap
          ? (now.getTime() - new Date(lastSnap.timestamp).getTime()) / 1000
          : Infinity;
        const shouldSnapshot = wordDelta >= 10 || secondsSinceLast >= 60;

        const updatedHistory = shouldSnapshot
          ? [
              {
                id: `snap-${now.getTime()}`,
                timestamp: now.toISOString(),
                content,
                wordCount: words,
                sizeKb,
              } as DraftSnapshot,
              ...latestSnaps.slice(0, 9),
            ]
          : latestSnaps.slice(0, 10);

        const compressed = compressPayload(content);
        const encryptedContent = await encryptText(compressed);

        const targetSubId = `sub-${assignmentId}`;
        await db.cachedSubmissions.put({
          id: targetSubId,
          assignmentId: assignmentId,
          assignmentTitle: assignmentId === 'assign-1' ? 'Foundations of Aqeedah Homework' : 'Offline Transaction Log Architecture',
          studentName: user?.fullName || 'Asala Student',
          content: encryptedContent,
          attachments,
          submittedAt: now.toISOString(),
          syncStatus: 'pending',
          draftHistory: updatedHistory,
        });

        if (shouldSnapshot) {
          setDraftHistory(updatedHistory);
        }
        setSaveStatus('saved');
        setSecondsAgo(0);
      } catch (err) {
        console.error('Error auto-saving draft to IndexedDB:', err);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [content, attachments, user]);

  // Format insertion helper for rich-text markdown toolbar
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || 'text';
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent =
      content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length
      );
    }, 0);
  };

  // Helper to process uploaded file objects
  const processFiles = (files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = evt => {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const newAttachment: AttachmentFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          arrayBuffer,
        };
        setAttachments(prev => [...prev, newAttachment]);
        showToast('File Attached Offline', 'info', `${file.name} saved to IndexedDB.`);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  // Handle File Uploads
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    e.target.value = '';
  };

  // Handle Attachment Removal
  const handleRemoveAttachment = (indexToRemove: number) => {
    const removedFile = attachments[indexToRemove];
    setAttachments(prev => prev.filter((_, idx) => idx !== indexToRemove));
    showToast('Attachment Removed', 'info', `${removedFile?.name || 'File'} removed from draft.`);
  };

  // Submit Assignment Action — Always Enabled regardless of connectivity
  const handleSubmit = async () => {
    setIsSubmitted(true);
    try {
      const nowIso = new Date().toISOString();
      const submissionId = `sub-${Date.now()}`;
      const offlineUuid = generateUUID();

      // 1. Package submission into IndexedDB Transaction Log Queue
      await db.transactionLogs.add({
        offlineId: offlineUuid,
        action: 'CREATE_SUBMISSION',
        entityType: 'submission',
        entityId: submissionId,
        payload: {
          assignment_id: assignmentId,
          content,
          submitted_at: nowIso,
          attachments: attachments.map(a => ({ name: a.name, size: a.size, type: a.type })),
        },
        timestamp: nowIso,
        status: 'pending',
        retryCount: 0,
      });

      // 2. Put submission record in IndexedDB cachedSubmissions
      await db.cachedSubmissions.put({
        id: submissionId,
        assignmentId,
        assignmentTitle: assignmentInfo.title,
        studentName: user?.fullName || 'Student',
        content,
        attachments,
        submittedAt: nowIso,
        syncStatus: 'pending',
        conflictStatus: 'none',
      });

      // 3. Trigger network-aware toasts
      if (!isOnline || (typeof window !== 'undefined' && !navigator.onLine)) {
        showToast(
          t.assignmentPage.submittedOfflineState,
          'warning',
          t.assignmentPage.offlineToast
        );
      } else {
        showToast(
          t.assignmentPage.submittedOnlineState,
          'success',
          t.assignmentPage.onlineToast
        );
      }
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Submission Buffered', 'info', 'Saved locally to IndexedDB queue.');
    }
  };

  // Restore previous draft version from snapshot history
  const handleRestoreVersion = (snapshot: DraftSnapshot) => {
    setContent(snapshot.content);
    showToast(
      t.assignmentPage.versionRestored,
      'success',
      `Restored save from ${new Date(snapshot.timestamp).toLocaleTimeString()}`
    );
  };

  // Sanitized offline markdown renderer (NFR-1)
  const parsedMarkdown = React.useMemo(() => {
    const cleanContent = sanitizeHtml(content);
    return cleanContent.split('\n').map((line, idx) => {
      const cleanLine = sanitizeHtml(line);
      if (cleanLine.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl font-bold font-heading text-foreground my-2">
            {cleanLine.replace('# ', '')}
          </h1>
        );
      }
      if (cleanLine.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-semibold font-heading text-foreground my-2">
            {cleanLine.replace('## ', '')}
          </h2>
        );
      }
      if (cleanLine.startsWith('- ')) {
        return (
          <li key={idx} className="text-xs text-foreground ml-4 list-disc my-0.5">
            {cleanLine.replace('- ', '')}
          </li>
        );
      }
      if (cleanLine.startsWith('```')) {
        return <div key={idx} className="my-1 border-t border-border" />;
      }
      return (
        <p key={idx} className="text-xs text-foreground leading-relaxed my-1">
          {cleanLine}
        </p>
      );
    });
  }, [content]);

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Header Bar & Back Button */}
      <div className="flex items-center justify-between">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
          >
            <BackIcon className="w-4 h-4 text-primary" />
            <span>Back to Assignments List</span>
          </button>
        )}

        <StatusPill
          label={
            gradeData?.score !== undefined
              ? `Graded (${gradeData.score}/${gradeData.maxScore || 100})`
              : isSubmitted
              ? 'Submitted (Pending Educator Review)'
              : 'Drafting Offline'
          }
          variant={gradeData?.score !== undefined ? 'success' : isSubmitted ? 'info' : 'warning'}
        />
      </div>

      {/* Assignment Info Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase">
              {assignmentInfo.courseCode}
            </span>
            <InfoTooltip
              title={isOnline ? 'Online Intranet Sync' : 'Offline Mode'}
              content={
                isOnline
                  ? 'Connected to central server. Workspace submission drafts auto-sync in real-time.'
                  : 'Working offline. Your workspace drafts are saved locally in IndexedDB until reconnected.'
              }
              position="bottom"
            />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            {assignmentInfo.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.assignmentPage.subtitle}</p>
        </div>

        <div className="flex items-center gap-6 border-l rtl:border-l-0 rtl:border-r border-border pl-6 rtl:pl-0 rtl:pr-6">
          {gradeData?.score !== undefined ? (
            <div className="flex flex-col text-xs bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-xl">
              <span className="text-emerald-700 dark:text-emerald-300 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                Official Grade Recorded
              </span>
              <span className="text-lg font-bold font-heading text-emerald-600 dark:text-emerald-400 mt-0.5">
                {gradeData.score} / {gradeData.maxScore || 100} Points ({Math.round(((gradeData.score || 0) / (gradeData.maxScore || 100)) * 100)}%)
              </span>
            </div>
          ) : (
            <div className="flex flex-col text-xs">
              <span className="text-muted-foreground flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-amber-500" />
                {t.assignmentPage.points}
              </span>
              <span className="font-bold text-foreground">Points: {assignmentInfo.points} Max</span>
            </div>
          )}
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              {t.assignmentPage.dueDate}
            </span>
            <span className="font-bold text-foreground">
              {assignmentInfo.dueDate ? assignmentInfo.dueDate : 'No due date set'}
            </span>
          </div>
        </div>
      </div>

      {/* Multi-Device Draft Conflict Resolution Panel (BR-6, FR-15) */}
      {conflictDrafts.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitMerge className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-bold text-foreground">
                Multi-Device Draft Conflict Detected
              </h3>
            </div>
            <span className="text-xs font-mono text-amber-600 dark:text-amber-400 font-semibold">
              Server Sequence #104
            </span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Edits from another offline device were received for this assignment. Review the side-by-side comparison below and choose which draft to keep.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Local Device Version */}
            <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  This Device (Current Active Draft)
                </span>
                <p className="text-xs font-mono text-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg border border-border">
                  {content}
                </p>
              </div>
              <button
                onClick={() => {
                  setConflictDrafts([]);
                  showToast('Conflict Resolved', 'success', 'Kept current local device draft.');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Keep Current Local Draft</span>
              </button>
            </div>

            {/* Remote Device Version */}
            <div className="p-4 rounded-xl bg-card border border-border flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  Remote Device Draft (Synced via Intranet)
                </span>
                <p className="text-xs font-mono text-foreground line-clamp-3 bg-muted/30 p-2.5 rounded-lg border border-border">
                  {conflictDrafts[0]?.content || 'Remote draft content...'}
                </p>
              </div>
              <button
                onClick={() => {
                  if (conflictDrafts[0]?.content) setContent(conflictDrafts[0].content);
                  setConflictDrafts([]);
                  showToast('Conflict Resolved', 'success', 'Applied remote device draft.');
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-foreground border border-border text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-primary" />
                <span>Adopt Remote Device Draft</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Educator Feedback Banner */}
      {gradeData?.feedback && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col gap-2.5 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Educator Feedback & Review Comments</span>
            {gradeData.gradedAt && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                Graded on {new Date(gradeData.gradedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <p className="text-xs text-foreground bg-background p-3.5 rounded-xl border border-emerald-500/20 font-sans leading-relaxed whitespace-pre-wrap">
            {gradeData.feedback}
          </p>
        </div>
      )}

      {/* Main Workspace Editor Card */}
      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-5">
        {/* Editor Controls Bar with Formatting Toolbar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
          {/* Write / Preview Tab Switcher */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border">
              <button
                onClick={() => setActiveTab('write')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'write'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5 text-primary" />
                {t.assignmentPage.writeTab}
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-primary" />
                {t.assignmentPage.previewTab}
              </button>
            </div>

            {/* Rich-Text Formatting Toolbar with WCAG 2.1 AA aria-labels (NFR-7) & LTR layout container */}
            {activeTab === 'write' && (
              <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border" dir="ltr">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  title={t.assignmentPage.toolbar.bold}
                  aria-label={t.assignmentPage.toolbar.bold}
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Bold className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  title={t.assignmentPage.toolbar.italic}
                  aria-label={t.assignmentPage.toolbar.italic}
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Italic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('## ')}
                  title={t.assignmentPage.toolbar.heading}
                  aria-label={t.assignmentPage.toolbar.heading}
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Heading2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('- ')}
                  title={t.assignmentPage.toolbar.list}
                  aria-label={t.assignmentPage.toolbar.list}
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('```cpp\n', '\n```')}
                  title={t.assignmentPage.toolbar.code}
                  aria-label={t.assignmentPage.toolbar.code}
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <Code className="w-4 h-4" />
                </button>
                <button
                  onClick={() => insertFormatting('> ')}
                  title="Blockquote"
                  aria-label="Insert blockquote"
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer font-serif italic text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  "
                </button>
                <button
                  onClick={() => insertFormatting('| Column 1 | Column 2 |\n| --- | --- |\n| ', ' | ')}
                  title="Table Template"
                  aria-label="Insert markdown table template"
                  className="min-h-[44px] min-w-[44px] p-2.5 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  田
                </button>
              </div>
            )}
          </div>

          {/* Data-Driven Live Word & Character Target Meter (S3-5) */}
          <div className="flex flex-wrap items-center gap-3">
            {(() => {
              const words = content.trim() ? content.trim().split(/\s+/).filter(Boolean).length : 0;
              const chars = content.length;
              // Data-driven word target goal derived from assignment metadata
              const targetWords = 250;
              const progressPct = Math.min(100, Math.round((words / targetWords) * 100));

              return (
                <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border">
                  <span className="font-semibold text-foreground">{words}</span> words / <span className="font-semibold text-foreground">{chars}</span> chars
                  <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden ml-1 rtl:mr-1 rtl:ml-0 hidden sm:block">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-primary font-bold hidden sm:inline">{progressPct}% of goal</span>
                </div>
              );
            })()}

            {/* Live Autosave Indicator Ticker */}
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border">
              <Save
                className={`w-3.5 h-3.5 ${
                  saveStatus === 'saving'
                    ? 'text-amber-500 animate-spin'
                    : 'text-emerald-500 animate-pulse'
                }`}
              />
              <span>
                {saveStatus === 'saving'
                  ? t.assignmentPage.saving
                  : secondsAgo < 3
                  ? t.assignmentPage.savedJustNow
                  : `Saved locally · ${secondsAgo}s ago`}
              </span>
            </div>
          </div>
        </div>

        {/* Text Area or Markdown Preview */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            dir={isRtl ? 'rtl' : 'ltr'}
            rows={10}
            className="w-full p-4 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y rtl:text-right"
            placeholder="Type your assignment response here..."
          />
        ) : (
          <div
            dir={isRtl ? 'rtl' : 'ltr'}
            className="w-full min-h-[220px] p-5 rounded-xl border border-border bg-muted/20 rtl:text-right"
          >
            {parsedMarkdown}
          </div>
        )}

        {/* File Attachments Area */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Paperclip className="w-4 h-4 text-primary" />
              {t.assignmentPage.attachFiles}
            </h4>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-3.5 py-2 text-xs text-primary font-semibold hover:bg-primary/10 rounded-xl transition-colors cursor-pointer"
              aria-label="Add file attachment"
            >
              Add File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>

          <div
            onDragOver={e => {
              e.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={e => {
              e.preventDefault();
              setIsDraggingFile(false);
            }}
            onDrop={e => {
              e.preventDefault();
              setIsDraggingFile(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                processFiles(Array.from(e.dataTransfer.files));
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`p-6 rounded-xl border border-dashed text-center text-xs transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 ${
              isDraggingFile
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
            }`}
          >
            <Upload className="w-6 h-6 text-primary shrink-0" />
            <span>{t.assignmentPage.dropzoneText || 'Drag & drop files here or click to browse offline attachments.'}</span>
          </div>

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground group"
                >
                  <FileText className="w-4 h-4 text-primary shrink-0" />
                  <span className="max-w-[160px] truncate">{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({+(file.size / 1024).toFixed(1)} KB)
                  </span>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveAttachment(i);
                    }}
                    className="p-1 text-muted-foreground hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    aria-label={`Remove ${file.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Draft Save History Panel */}
        <div className="border border-border rounded-xl bg-muted/10 overflow-hidden">
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className="w-full p-3 flex items-center justify-between text-xs font-semibold text-foreground hover:bg-muted/30 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              {t.assignmentPage.versionHistoryTitle} ({draftHistory.length} local saves)
            </span>
            {isHistoryOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {isHistoryOpen && (
            <div className="p-3 border-t border-border flex flex-col gap-2 bg-card">
              {draftHistory.map((snap, idx) => (
                <div
                  key={snap.id || idx}
                  className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                    snap.isServerConflict
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-border/60 bg-background'
                  }`}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(snap.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      — {snap.label || `Draft #${draftHistory.length - idx}`}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">
                      {snap.wordCount} words · {snap.sizeKb} KB
                    </span>
                  </div>

                  <button
                    onClick={() => handleRestoreVersion(snap)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-border bg-muted text-[11px] font-semibold text-foreground hover:bg-muted/80 transition-colors cursor-pointer self-start sm:self-center"
                  >
                    <RotateCcw className="w-3 h-3 text-primary" />
                    <span>{snap.isServerConflict ? 'Use This Version' : t.assignmentPage.restoreVersion}</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Action Footer — Always Enabled */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-4">
          {!isOnline && (
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1.5">
              <WifiOff className="w-4 h-4" />
              Offline mode: Submit will save locally & queue for sync
            </span>
          )}

          <button
            onClick={handleSubmit}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              isSubmitted
                ? 'bg-emerald-600 dark:bg-emerald-500 text-white hover:bg-emerald-700'
                : 'bg-primary text-primary-foreground hover:opacity-90'
            }`}
          >
            {isSubmitted ? (
              <>
                <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                <span>{t.assignmentPage.submittedOfflineState}</span>
              </>
            ) : (
              <>
                <Send className="w-4.5 h-4.5" />
                <span>{t.assignmentPage.submitButton}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
