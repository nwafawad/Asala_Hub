'use client';

import React, { useState } from 'react';
import { CachedModule, QuizQuestion, QuizSchema, AssignmentSchema } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { QuizBuilder } from './studio/QuizBuilder';
import {
  X,
  Save,
  Eye,
  Edit3,
  Calendar,
  Award,
  Upload,
  Languages,
  CheckCircle2,
  ClipboardList,
  BookOpen,
} from 'lucide-react';

interface AssignmentStudioProps {
  courseId: string;
  courseTitle?: string;
  courseCode?: string;
  initialModule: CachedModule | null;
  onSave: (moduleData: Partial<CachedModule>) => Promise<void>;
  onClose: () => void;
}

export const AssignmentStudio: React.FC<AssignmentStudioProps> = ({
  courseId,
  courseTitle,
  courseCode,
  initialModule,
  onSave,
  onClose,
}) => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();

  // Active Main Tab: Edit vs Live Student Preview
  const [activeStudioTab, setActiveStudioTab] = useState<'edit' | 'preview'>('edit');

  // Active Language Tab for Content Editing: EN vs AR
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'ar'>('en');

  // Core Form State
  const [title, setTitle] = useState(initialModule?.title || '');
  const [titleAr, setTitleAr] = useState(initialModule?.titleAr || '');
  const [submissionMethod, setSubmissionMethod] = useState<'online_text' | 'file_upload' | 'graded_quiz'>(
    initialModule?.type === 'quiz' ? 'graded_quiz' : (initialModule?.assignmentSchema?.submissionMethod || 'online_text')
  );
  const [dueDate, setDueDate] = useState(initialModule?.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 16));
  const [points, setPoints] = useState(initialModule?.points || 100);
  const [isSaving, setIsSaving] = useState(false);

  // Instructions State
  const [instructions, setInstructions] = useState(initialModule?.assignmentSchema?.instructions || initialModule?.content || '');
  const [instructionsAr, setInstructionsAr] = useState(initialModule?.assignmentSchema?.instructionsAr || initialModule?.userNotes || '');

  // File Upload Criteria State
  const [maxFileSizeMb, setMaxFileSizeMb] = useState(initialModule?.assignmentSchema?.maxFileSizeMb || 10);
  const [allowedFormatsStr, setAllowedFormatsStr] = useState(
    (initialModule?.assignmentSchema?.allowedFileTypes || ['.pdf', '.docx', '.zip', '.png']).join(', ')
  );

  // Graded Quiz Builder State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    initialModule?.quizSchema?.questions || [
      {
        id: 'q-1',
        type: 'multiple_choice',
        prompt: 'Sample Graded Question 1',
        promptAr: 'السؤال المقيّم الأول',
        options: [
          { id: 'opt-1', text: 'Correct Answer', textAr: 'الإجابة الصحيحة', isCorrect: true },
          { id: 'opt-2', text: 'Incorrect Answer', textAr: 'إجابة خاطئة', isCorrect: false },
        ],
        points: 50,
        explanation: 'Detailed explanation for the correct answer.',
      },
    ]
  );
  const [passingScore, setPassingScore] = useState(initialModule?.quizSchema?.passingScorePercentage || 70);
  const [quizTimeLimit, setQuizTimeLimit] = useState(initialModule?.quizSchema?.timeLimitMinutes || 30);

  const handleSave = async () => {
    if (!title.trim()) {
      showToast('Validation Error', 'error', 'Please enter an assignment title.');
      return;
    }

    if (!dueDate) {
      showToast('Validation Error', 'error', 'Please specify a valid due date for this assignment.');
      return;
    }

    try {
      setIsSaving(true);

      const isQuiz = submissionMethod === 'graded_quiz';
      const targetType: CachedModule['type'] = isQuiz ? 'quiz' : 'assignment';

      const quizSchemaData: QuizSchema | undefined = isQuiz
        ? {
            questions: quizQuestions,
            passingScorePercentage: passingScore,
            timeLimitMinutes: quizTimeLimit,
            allowRetries: true,
            isGradedAssignment: true,
          }
        : undefined;

      const assignmentSchemaData: AssignmentSchema = {
        instructions: instructions,
        instructionsAr: instructionsAr || undefined,
        submissionMethod: submissionMethod,
        allowedFileTypes: allowedFormatsStr.split(',').map(s => s.trim()).filter(Boolean),
        maxFileSizeMb: maxFileSizeMb,
      };

      const updatedModulePayload: Partial<CachedModule> = {
        courseId,
        title: title.trim(),
        titleAr: titleAr.trim() || undefined,
        type: targetType,
        content: instructions,
        dueDate: dueDate,
        points: points,
        assignmentSchema: assignmentSchemaData,
        quizSchema: quizSchemaData,
      };

      await onSave(updatedModulePayload);
      showToast('Assignment Saved', 'success', `Saved '${title}' as a graded assignment.`);
      onClose();
    } catch (err) {
      console.error('Error saving assignment studio data:', err);
      showToast('Save Failed', 'error', 'Failed to save assignment details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/30 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  {initialModule ? 'Edit Graded Assignment' : 'Create Graded Assignment'}
                </h2>
                {courseTitle && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold border border-primary/20">
                    <BookOpen className="w-3 h-3 text-primary" />
                    <span>Target: {courseCode ? `[${courseCode}] ` : ''}{courseTitle}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Configure due dates, submission criteria, points, and grading rubrics.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* View Switcher: Edit vs Preview */}
            <div className="flex items-center bg-muted p-1 rounded-xl border border-border">
              <button
                onClick={() => setActiveStudioTab('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeStudioTab === 'edit'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Authoring</span>
              </button>
              <button
                onClick={() => setActiveStudioTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeStudioTab === 'preview'
                    ? 'bg-card text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Student Preview</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Content Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {activeStudioTab === 'edit' ? (
            <>
              {/* Language Switcher Bar */}
              <div className="flex items-center justify-between bg-muted/40 p-2 rounded-xl border border-border">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground px-2">
                  <Languages className="w-4 h-4 text-primary" />
                  <span>Content Localization:</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setActiveLangTab('en')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeLangTab === 'en'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    English
                  </button>
                  <button
                    onClick={() => setActiveLangTab('ar')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeLangTab === 'ar'
                        ? 'bg-primary text-primary-foreground shadow-xs'
                        : 'bg-card text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    العربية (Arabic)
                  </button>
                </div>
              </div>

              {/* Title & Core Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeLangTab === 'en' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-foreground">Assignment Title (English) *</label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      placeholder="e.g. Midterm Essay Submission"
                      className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5" dir="rtl">
                    <label className="text-xs font-bold text-foreground">عنوان الواجب (بالعربية)</label>
                    <input
                      type="text"
                      value={titleAr}
                      onChange={e => setTitleAr(e.target.value)}
                      placeholder="مثال: تسليم المقال المنتصف"
                      className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-foreground">Submission Format</label>
                  <select
                    value={submissionMethod}
                    onChange={e => setSubmissionMethod(e.target.value as any)}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="online_text">Online Text Submission</option>
                    <option value="file_upload">File Upload (PDF/Doc/Zip)</option>
                    <option value="graded_quiz">Graded Quiz Assessment</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Max Points Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span>Due Date & Deadline *</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Award className="w-4 h-4" />
                    <span>Maximum Grade Points</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={points}
                    onChange={e => setPoints(Number(e.target.value))}
                    className="px-3.5 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              </div>

              {/* Instructions Section */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-foreground">
                  {activeLangTab === 'en' ? 'Submission Instructions (English)' : 'تعليمات التسليم (بالعربية)'}
                </label>
                {activeLangTab === 'en' ? (
                  <textarea
                    rows={5}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Provide clear step-by-step instructions and rubric guidelines for students..."
                    className="p-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
                  />
                ) : (
                  <textarea
                    rows={5}
                    dir="rtl"
                    value={instructionsAr}
                    onChange={e => setInstructionsAr(e.target.value)}
                    placeholder="اكتب التعليمات وإرشادات التقييم بالتفصيل للطلاب..."
                    className="p-3.5 rounded-xl border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed resize-y"
                  />
                )}
              </div>

              {/* Conditional Panel: File Upload Criteria */}
              {submissionMethod === 'file_upload' && (
                <div className="flex flex-col gap-4 p-4 rounded-xl bg-card border border-border">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Upload className="w-4 h-4 text-primary" />
                    <span>File Upload Settings</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Allowed File Formats (comma separated)</label>
                      <input
                        type="text"
                        value={allowedFormatsStr}
                        onChange={e => setAllowedFormatsStr(e.target.value)}
                        placeholder=".pdf, .docx, .zip, .jpg"
                        className="px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-muted-foreground">Max File Size (MB)</label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={maxFileSizeMb}
                        onChange={e => setMaxFileSizeMb(Number(e.target.value))}
                        className="px-3.5 py-2 rounded-xl border border-border bg-background text-xs text-foreground"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Conditional Panel: Graded Quiz Builder */}
              {submissionMethod === 'graded_quiz' && (
                <div className="flex flex-col gap-4 p-4 rounded-xl bg-card border border-border">
                  <QuizBuilder
                    quizQuestions={quizQuestions}
                    setQuizQuestions={setQuizQuestions}
                    passingScore={passingScore}
                    setPassingScore={setPassingScore}
                    quizTimeLimit={quizTimeLimit}
                    setQuizTimeLimit={setQuizTimeLimit}
                  />
                </div>
              )}
            </>
          ) : (
            /* Student Preview Mode */
            <div className="flex flex-col gap-6 p-6 rounded-2xl bg-card border border-border shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-bold uppercase tracking-wider">
                    Graded Assignment
                  </span>
                  <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    {points} Points
                  </span>
                </div>
                <div className="text-xs font-bold text-amber-600 bg-amber-500/10 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due: {dueDate ? new Date(dueDate).toLocaleString() : 'No Deadline'}</span>
                </div>
              </div>

              <h1 className="text-xl font-bold text-foreground">{title || 'Untitled Assignment'}</h1>
              {titleAr && <h2 className="text-base text-muted-foreground" dir="rtl">{titleAr}</h2>}

              <div className="p-4 rounded-xl bg-muted/30 border border-border text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                {instructions || 'No instructions provided yet.'}
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs font-medium text-foreground">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                  <span>Format: {submissionMethod.replace('_', ' ').toUpperCase()}</span>
                </div>
                <button
                  disabled
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold opacity-80"
                >
                  Submit Assignment (Preview)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Assignment...' : 'Save Assignment'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
