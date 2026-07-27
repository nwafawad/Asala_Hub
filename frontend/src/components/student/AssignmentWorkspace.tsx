'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db, seedInitialMockData, type AttachmentFile, type DraftSnapshot } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { useAuth } from '@/context/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
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
} from 'lucide-react';

interface AssignmentWorkspaceProps {
  onBack?: () => void;
}

export const AssignmentWorkspace: React.FC<AssignmentWorkspaceProps> = ({ onBack }) => {
  const { t, language } = useI18n();
  const { isOnline, addMockOfflineTransaction } = useSync();
  const { showToast } = useOverlay();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [content, setContent] = useState<string>(
    '# Binary Search Tree Implementation\n\n## Overview\nI implemented BST insertion, deletion, and tree traversals in C++.\n\n```cpp\nvoid insert(Node*& root, int val) {\n    if (!root) root = new Node(val);\n    else if (val < root->val) insert(root->left, val);\n    else insert(root->right, val);\n}\n```\n\nAll tests pass locally.'
  );
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [draftHistory, setDraftHistory] = useState<DraftSnapshot[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // Live autosave state
  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved'>('saved');
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isFirstRender = useRef<boolean>(true);

  // Load existing draft & history from IndexedDB
  useEffect(() => {
    async function loadDraft() {
      await seedInitialMockData();
      const existing = await db.cachedSubmissions.get('sub-102');
      if (existing) {
        if (existing.content) setContent(existing.content);
        if (existing.attachments) setAttachments(existing.attachments);
        if (existing.draftHistory && existing.draftHistory.length > 0) {
          setDraftHistory(existing.draftHistory);
        } else {
          // Initialize default history snapshot if none exists
          const initialSnapshot: DraftSnapshot = {
            id: `snap-${Date.now()}`,
            timestamp: new Date().toISOString(),
            content: existing.content || content,
            wordCount: (existing.content || content).trim().split(/\s+/).length,
            sizeKb: +((existing.content || content).length / 1024).toFixed(2),
          };
          setDraftHistory([initialSnapshot]);
        }
      }
    }
    loadDraft();
  }, []);

  // Live Autosave relative time ticker (updates secondsAgo every second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (saveStatus === 'saved') {
        setSecondsAgo(prev => prev + 1);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [saveStatus]);

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

        const newSnapshot: DraftSnapshot = {
          id: `snap-${now.getTime()}`,
          timestamp: now.toISOString(),
          content,
          wordCount: words,
          sizeKb,
        };

        const updatedHistory = [newSnapshot, ...draftHistory.slice(0, 9)];

        await db.cachedSubmissions.put({
          id: 'sub-102',
          assignmentId: 'assign-2',
          assignmentTitle: 'Offline Transaction Log Architecture',
          studentName: user?.fullName || 'Asala Student',
          content,
          attachments,
          submittedAt: now.toISOString(),
          syncStatus: 'pending',
          draftHistory: updatedHistory,
        });

        setDraftHistory(updatedHistory);
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

  // Handle File Uploads & Conversion to IndexedDB Base64 DataUrl
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = evt => {
        const dataUrl = evt.target?.result as string;
        const newAttachment: AttachmentFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          dataUrl,
        };
        setAttachments(prev => [...prev, newAttachment]);
        showToast('File Attached Offline', 'info', `${file.name} saved to IndexedDB.`);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  // Submit Assignment Action — Always Enabled regardless of connectivity
  const handleSubmit = async () => {
    setIsSubmitted(true);
    try {
      // 1. Package submission into IndexedDB Transaction Log Queue
      await addMockOfflineTransaction('CREATE_SUBMISSION');

      // 2. Update submission status in IndexedDB
      await db.cachedSubmissions.update('sub-102', {
        syncStatus: 'pending',
        submittedAt: new Date().toISOString(),
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

  // Simple offline markdown renderer
  const parsedMarkdown = React.useMemo(() => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl font-bold font-heading text-foreground my-2">
            {line.replace('# ', '')}
          </h1>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg font-semibold font-heading text-foreground my-2">
            {line.replace('## ', '')}
          </h2>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="text-xs text-foreground ml-4 list-disc my-0.5">
            {line.replace('- ', '')}
          </li>
        );
      }
      if (line.startsWith('```')) {
        return <div key={idx} className="my-1 border-t border-border" />;
      }
      return (
        <p key={idx} className="text-xs text-foreground leading-relaxed my-1">
          {line}
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
            <span>{t.assignmentPage.backToModules}</span>
          </button>
        )}

        <StatusPill
          label={isSubmitted ? t.assignmentPage.submittedOfflineState : 'Drafting Offline'}
          variant={isSubmitted ? 'success' : 'warning'}
        />
      </div>

      {/* Assignment Info Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase">
              CS101 — Task #2
            </span>
            <StatusPill
              label={isOnline ? 'Online Intranet Sync' : 'Offline Mode'}
              variant={isOnline ? 'info' : 'warning'}
            />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            {t.assignmentPage.title}: Offline Transaction Log Architecture
          </h2>
          <p className="text-xs text-muted-foreground">{t.assignmentPage.subtitle}</p>
        </div>

        <div className="flex items-center gap-6 border-l rtl:border-l-0 rtl:border-r border-border pl-6 rtl:pl-0 rtl:pr-6">
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              {t.assignmentPage.points}
            </span>
            <span className="font-bold text-foreground">100 / 100</span>
          </div>
          <div className="flex flex-col text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-sky-500" />
              {t.assignmentPage.dueDate}
            </span>
            <span className="font-bold text-foreground">Tomorrow, 23:59</span>
          </div>
        </div>
      </div>

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

            {/* Rich-Text Formatting Toolbar */}
            {activeTab === 'write' && (
              <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl border border-border">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  title={t.assignmentPage.toolbar.bold}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  title={t.assignmentPage.toolbar.italic}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('## ')}
                  title={t.assignmentPage.toolbar.heading}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                >
                  <Heading2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('- ')}
                  title={t.assignmentPage.toolbar.list}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                >
                  <List className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => insertFormatting('```cpp\n', '\n```')}
                  title={t.assignmentPage.toolbar.code}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background transition-colors cursor-pointer"
                >
                  <Code className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Live Autosave Indicator Ticker */}
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-xl border border-border">
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

        {/* Text Area or Markdown Preview */}
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            className="w-full p-4 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
            placeholder="Type your assignment response here..."
          />
        ) : (
          <div className="w-full min-h-[220px] p-5 rounded-xl border border-border bg-muted/20">
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
              className="text-xs text-primary font-semibold hover:underline cursor-pointer"
            >
              + Add File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              multiple
            />
          </div>

          {attachments.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-6 rounded-xl border border-dashed border-border bg-muted/20 text-center text-xs text-muted-foreground hover:bg-muted/40 transition-colors cursor-pointer"
            >
              {t.assignmentPage.dropzoneText}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-background text-xs font-medium text-foreground"
                >
                  <FileText className="w-4 h-4 text-primary" />
                  <span>{file.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({+(file.size / 1024).toFixed(1)} KB)
                  </span>
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
                  className="p-2.5 rounded-lg border border-border/60 bg-background flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(snap.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}{' '}
                      — Draft #{draftHistory.length - idx}
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
                    <span>{t.assignmentPage.restoreVersion}</span>
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
