"use client";

import { useEffect, useState, use } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTranslation } from "@/lib/i18n/context";
import { useNotification } from "@/app/components/NotificationProvider";
import { RichTextEditor } from "../../components/RichTextEditor";
import { AutosaveIndicator } from "../../components/AutosaveIndicator";
import { VersionHistory } from "../../components/VersionHistory";
import { Send, ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AssignmentWorkspace({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { t, locale } = useTranslation();
  const { showToast } = useNotification();
  const resolvedParams = use(params);
  const assignmentId = resolvedParams.assignmentId;

  const submission = useLiveQuery(() => db.submissions.where({ assignmentId }).first(), [assignmentId]);

  const [content, setContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  const isRTL = locale === 'ar';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (submission && !lastSavedAt) {
      setContent(submission.content);
      setLastSavedAt(new Date(submission.updatedAt));
    }
  }, [submission, lastSavedAt]);

  useEffect(() => {
    if (!content || !submission) return;
    if (content === submission.content) return;

    setIsSaving(true);
    const timer = setTimeout(async () => {
      const now = new Date().toISOString();
      const newVersions = [...(submission.versions || []), { content, savedAt: now }].slice(-10);

      await db.submissions.update(submission.id, {
        content,
        updatedAt: now,
        versions: newVersions
      });
      setLastSavedAt(new Date());
      setIsSaving(false);
    }, 3000);

    return () => { clearTimeout(timer); };
  }, [content, submission]);

  const handleSubmit = async () => {
    if (!submission) return;
    await db.submissions.update(submission.id, {
      syncStatus: 'pending',
      content,
      updatedAt: new Date().toISOString()
    });
    showToast(t('toast.offline_saved'), 'info');
  };

  const handleRestore = (restoredContent: string) => {
    setContent(restoredContent);
    showToast(t('toast.offline_saved'), 'info');
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/courses" className="inline-flex items-center gap-2 text-primary hover:underline font-medium">
          <BackIcon className="w-4 h-4" />
          {t('student.back_to_courses')}
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary dark:text-text-primary-dark">
            {submission?.id ? t('student.assignment_workspace') : '...'}
          </h1>
          <AutosaveIndicator lastSavedAt={lastSavedAt} isSaving={isSaving} />
        </div>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 bg-primary hover:bg-primary-light text-white font-semibold min-h-[44px] px-6 rounded-lg shadow-sm transition-colors"
        >
          <Send className="w-5 h-5" />
          {t('student.submit_btn')}
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-surface dark:bg-surface-dark rounded-xl shadow-sm border border-border dark:border-border-dark mb-6">
        <RichTextEditor content={content} onChange={setContent} />
      </div>

      <VersionHistory
        versions={submission?.versions || []}
        onRestore={handleRestore}
      />
    </div>
  );
}
