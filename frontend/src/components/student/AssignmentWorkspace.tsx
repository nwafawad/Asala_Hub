'use client';

import React, { useState, useEffect, useRef } from 'react';
import { db, seedInitialMockData, type AttachmentFile } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { useOverlay } from '@/context/OverlayContext';
import { useAuth } from '@/context/AuthContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { FileCheck, Save, Paperclip, Send, Eye, Edit3, Clock, Award, FileText, CheckCircle } from 'lucide-react';

export const AssignmentWorkspace: React.FC = () => {
  const { t } = useI18n();
  const { addMockOfflineTransaction } = useSync();
  const { showToast } = useOverlay();

  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [content, setContent] = useState<string>(
    '# Binary Search Tree Implementation\n\n## Overview\nI implemented BST insertion, deletion, and tree traversals in C++.\n\n```cpp\nvoid insert(Node*& root, int val) {\n    if (!root) root = new Node(val);\n    else if (val < root->val) insert(root->left, val);\n    else insert(root->right, val);\n}\n```\n\nAll tests pass locally.'
  );
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing draft from IndexedDB
  useEffect(() => {
    async function loadDraft() {
      await seedInitialMockData();
      const existing = await db.cachedSubmissions.get('sub-102');
      if (existing) {
        if (existing.content) setContent(existing.content);
        if (existing.attachments) setAttachments(existing.attachments);
      }
    }
    loadDraft();
  }, []);

  // 2-second Auto-Save Timer into Dexie IndexedDB
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        await db.cachedSubmissions.put({
          id: 'sub-102',
          assignmentId: 'assign-2',
          assignmentTitle: 'Offline Transaction Log Architecture',
          studentName: user?.fullName || 'Asala Student',
          content,
          attachments,
          submittedAt: new Date().toISOString(),
          syncStatus: 'pending',
        });
        setLastSavedAt(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Error auto-saving draft to IndexedDB:', err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [content, attachments, user]);

  // Handle File Uploads & Conversion to IndexedDB Base64 / Blob DataUrl
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

  // Submit Assignment Action
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Packaging submission into IndexedDB Transaction Log Queue
      await addMockOfflineTransaction('CREATE_SUBMISSION');

      // Update submission status in IndexedDB
      await db.cachedSubmissions.update('sub-102', {
        syncStatus: 'pending',
        submittedAt: new Date().toISOString(),
      });

      // Register Web BackgroundSync if supported by browser
      if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
        const reg = await navigator.serviceWorker.ready;
        // @ts-ignore
        if (reg.sync) await reg.sync.register('asala-delta-sync');
      }

      showToast('Assignment Submitted Offline!', 'success', 'Packaged into IndexedDB queue. Ready for backend sync.');
    } catch (err) {
      console.error('Submission error:', err);
      showToast('Submission Failed', 'error', 'Unable to write to IndexedDB queue.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Simple offline markdown parser helper
  const parsedMarkdown = React.useMemo(() => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-xl font-bold font-heading text-foreground my-2">{line.replace('# ', '')}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-lg font-semibold font-heading text-foreground my-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('```')) {
        return <div key={idx} className="my-1 border-t border-border" />;
      }
      return <p key={idx} className="text-xs text-foreground leading-relaxed my-1">{line}</p>;
    });
  }, [content]);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Assignment Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase">
              CS101 — Task #2
            </span>
            <StatusPill label="Saved Offline — Queued" variant="warning" dotAnimation />
          </div>
          <h2 className="text-xl font-bold font-heading text-foreground">
            {t.assignmentPage.title}: Offline Transaction Log Architecture
          </h2>
          <p className="text-xs text-muted-foreground">{t.assignmentPage.subtitle}</p>
        </div>

        <div className="flex items-center gap-4 border-l rtl:border-l-0 rtl:border-r border-border pl-6 rtl:pl-0 rtl:pr-6">
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
        {/* Editor Controls Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
          <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-xl border border-border">
            <button
              onClick={() => setActiveTab('write')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'write' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Edit3 className="w-3.5 h-3.5 text-primary" />
              {t.assignmentPage.writeTab}
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === 'preview' ? 'bg-card text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary" />
              {t.assignmentPage.previewTab}
            </button>
          </div>

          {/* Real-time Auto-Save Status */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Save className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>
              {t.assignmentPage.autoSaveActive}
              {lastSavedAt && ` (${t.assignmentPage.autoSavedAt} ${lastSavedAt})`}
            </span>
          </div>
        </div>

        {/* Text Area or Preview */}
        {activeTab === 'write' ? (
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={10}
            className="w-full p-4 rounded-xl border border-border bg-background text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-y"
            placeholder="Type solution markdown..."
          />
        ) : (
          <div className="w-full min-h-[220px] p-4 rounded-xl border border-border bg-muted/20">
            {parsedMarkdown}
          </div>
        )}

        {/* File Attachments Dropzone */}
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

        {/* Submit Action Footer */}
        <div className="pt-4 border-t border-border flex items-center justify-end">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? t.assignmentPage.submitting : t.assignmentPage.submitButton}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
