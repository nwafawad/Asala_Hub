'use client';

import React, { useState } from 'react';
import { CachedSubmission } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import {
  X,
  ShieldCheck,
  Award,
  CheckCircle2,
  AlertTriangle,
  Save,
  Download,
  Paperclip,
  FileText,
  User,
  Clock,
} from 'lucide-react';

interface SubmissionGraderProps {
  submission: CachedSubmission;
  onSaveGrade: (
    submissionId: string,
    score: number,
    feedback: string,
    gradeStatus: 'graded' | 'pending' | 'needs_revision'
  ) => Promise<void>;
  onClose: () => void;
}

export const SubmissionGrader: React.FC<SubmissionGraderProps> = ({
  submission,
  onSaveGrade,
  onClose,
}) => {
  const { t } = useI18n();

  const [score, setScore] = useState<number>(submission.score !== undefined ? submission.score : 85);
  const [maxScore, setMaxScore] = useState<number>(submission.maxScore || 100);
  const [feedback, setFeedback] = useState<string>(submission.feedback || '');
  const [gradeStatus, setGradeStatus] = useState<'graded' | 'pending' | 'needs_revision'>(
    submission.gradeStatus || 'graded'
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmitGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await onSaveGrade(submission.id, Number(score), feedback, gradeStatus);
    } catch (err) {
      console.error('Error in handleSubmitGrade:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadAttachment = (attachment: any) => {
    if (attachment.dataUrl) {
      const link = document.createElement('a');
      link.href = attachment.dataUrl;
      link.download = attachment.name;
      link.click();
    } else if (attachment.arrayBuffer) {
      const blob = new Blob([attachment.arrayBuffer], { type: attachment.type || 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="max-w-3xl w-full p-6 rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-foreground">
                {t.educator?.gradeBook?.gradeModalTitle || 'Grade Student Submission'}
              </h3>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Student: <strong>{submission.studentName}</strong></span>
                <span>•</span>
                <span>Assignment: <strong>{submission.assignmentTitle}</strong></span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Educator Precedence Banner */}
        <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold leading-relaxed">
            Educator Priority Active: Educator grade records take priority over student cached state during batch sync.
          </span>
        </div>

        {/* Student Solution Text & Binary Attachments Preview */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-foreground flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Student Solution Content (Markdown)
            </span>
            <div className="p-4 rounded-xl bg-muted/30 border border-border text-xs font-mono text-foreground leading-relaxed whitespace-pre-wrap max-h-48 overflow-y-auto">
              {submission.content || '(No text content submitted)'}
            </div>
          </div>

          {/* Attachments Section */}
          {submission.attachments && submission.attachments.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" />
                Submitted Attachments ({submission.attachments.length})
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {submission.attachments.map((att, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-card border border-border flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-semibold truncate text-foreground">{att.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                        ({Math.round(att.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => handleDownloadAttachment(att)}
                      className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold shrink-0 transition-colors cursor-pointer"
                      title="Inspect / Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Grading Form */}
        <form onSubmit={handleSubmitGrade} className="flex flex-col gap-4 border-t border-border pt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Score Awarded</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={score}
                  onChange={e => setScore(Number(e.target.value))}
                  min={0}
                  max={maxScore}
                  required
                  className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-bold font-mono w-full"
                />
                <span className="text-xs text-muted-foreground font-mono font-bold">/ {maxScore}</span>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-foreground">
                {t.educator?.gradeBook?.passFailLabel || 'Evaluation Outcome'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setGradeStatus('graded')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gradeStatus === 'graded'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.educator?.gradeBook?.passed || 'Passed / Satisfactory'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGradeStatus('needs_revision')}
                  className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    gradeStatus === 'needs_revision'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400'
                      : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4" />
                  <span>{t.educator?.gradeBook?.needsRevision || 'Needs Revision'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Feedback Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.educator?.gradeBook?.feedbackLabel || 'Educator Feedback'}
            </label>
            <textarea
              rows={3}
              value={feedback}
              onChange={e => setFeedback(e.target.value)}
              placeholder={t.educator?.gradeBook?.feedbackPlaceholder || 'Enter feedback for the student...'}
              className="p-3 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving Grade...' : t.educator?.gradeBook?.saveGradeButton || 'Save Grade'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
