'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CachedModule, QuizQuestion, QuizOption, QuizSchema, AssignmentSchema, AttachmentFile } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { cacheAudioLecture, revokeAudioObjectUrl } from '@/lib/audioCache';
import {
  X,
  Save,
  Eye,
  Edit3,
  FileText,
  Mic,
  Video,
  HelpCircle,
  FileQuestion,
  Upload,
  Plus,
  Trash2,
  Globe,
  Clock,
  Award,
  Calendar,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  FileDown,
  Layers,
  Languages,
} from 'lucide-react';

interface ModuleStudioProps {
  courseId: string;
  initialModule: CachedModule | null;
  onSave: (moduleData: Partial<CachedModule>) => Promise<void>;
  onClose: () => void;
}

export const ModuleStudio: React.FC<ModuleStudioProps> = ({
  courseId,
  initialModule,
  onSave,
  onClose,
}) => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();

  // Active Main Tab: Edit vs Live Preview
  const [activeStudioTab, setActiveStudioTab] = useState<'edit' | 'preview'>('edit');

  // Active Language Tab for Content Editing: EN vs AR
  const [activeLangTab, setActiveLangTab] = useState<'en' | 'ar'>('en');

  // Core Form State
  const [title, setTitle] = useState(initialModule?.title || '');
  const [titleAr, setTitleAr] = useState(initialModule?.titleAr || '');
  const [type, setType] = useState<CachedModule['type']>(initialModule?.type || 'reading');
  const [content, setContent] = useState(initialModule?.content || '');
  const [contentAr, setContentAr] = useState(initialModule?.userNotes || '');
  const [durationMinutes, setDurationMinutes] = useState(initialModule?.durationMinutes || 15);
  const [points, setPoints] = useState(initialModule?.points || 100);
  const [dueDate, setDueDate] = useState(initialModule?.dueDate || '');
  const [isSaving, setIsSaving] = useState(false);

  // Audio Voice Recorder & Media File State
  const [audioUrl, setAudioUrl] = useState(initialModule?.audioUrl || '');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

  // Video Lesson State (YouTube Link + Manual Offline Text)
  const [videoUrl, setVideoUrl] = useState(initialModule?.videoUrl || '');
  const [videoOfflineText, setVideoOfflineText] = useState(initialModule?.videoOfflineText || '');

  // PDF Document State
  const [attachmentFile, setAttachmentFile] = useState<AttachmentFile | undefined>(initialModule?.attachmentFile);

  // Interactive Quiz Builder State
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    initialModule?.quizSchema?.questions || [
      {
        id: 'q-1',
        type: 'multiple_choice',
        prompt: 'Sample Question 1',
        promptAr: 'السؤال الأول',
        options: [
          { id: 'opt-1', text: 'Option A', textAr: 'الخيار الأول', isCorrect: true },
          { id: 'opt-2', text: 'Option B', textAr: 'الخيار الثاني', isCorrect: false },
        ],
        points: 10,
        explanation: 'Detailed explanation for correct answer.',
      },
    ]
  );
  const [passingScore, setPassingScore] = useState(initialModule?.quizSchema?.passingScorePercentage || 70);
  const [quizTimeLimit, setQuizTimeLimit] = useState(initialModule?.quizSchema?.timeLimitMinutes || 15);

  // Assignment Builder State
  const [assignmentInstructions, setAssignmentInstructions] = useState(
    initialModule?.assignmentSchema?.instructions || ''
  );
  const [assignmentInstructionsAr, setAssignmentInstructionsAr] = useState(
    initialModule?.assignmentSchema?.instructionsAr || ''
  );
  const [allowedFileTypes, setAllowedFileTypes] = useState<string>(
    initialModule?.assignmentSchema?.allowedFileTypes?.join(', ') || 'pdf, docx, zip'
  );

  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioPlaybackRef.current) {
        audioPlaybackRef.current.pause();
        audioPlaybackRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  // Voice Recorder
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Microphone Not Supported', 'error', 'Your browser does not support audio recording.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const voiceUrl = URL.createObjectURL(blob);
        setAudioUrl(voiceUrl);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(prev => prev + 1), 1000);
    } catch (err) {
      console.error('Recording error:', err);
      showToast('Microphone Error', 'error', 'Unable to access microphone.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioUrl) return;
    if (!audioPlaybackRef.current) {
      audioPlaybackRef.current = new Audio(audioUrl);
      audioPlaybackRef.current.onended = () => setIsPlayingAudio(false);
    }
    if (isPlayingAudio) {
      audioPlaybackRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlaybackRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const handleAudioFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setAudioBlob(file);
    showToast('Audio Uploaded', 'success', `Loaded ${file.name}`);
  };

  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachmentFile({
        name: file.name,
        size: file.size,
        type: file.type,
        arrayBuffer: reader.result as ArrayBuffer,
      });
      showToast('PDF Attached', 'success', `Attached ${file.name}`);
    };
    reader.readAsArrayBuffer(file);
  };

  // Quiz Builder Handlers
  const addQuizQuestion = () => {
    const newId = `q-${Date.now()}`;
    setQuizQuestions([
      ...quizQuestions,
      {
        id: newId,
        type: 'multiple_choice',
        prompt: 'New Question',
        promptAr: 'سؤال جديد',
        options: [
          { id: `opt-${Date.now()}-1`, text: 'Choice 1', textAr: 'خيار 1', isCorrect: true },
          { id: `opt-${Date.now()}-2`, text: 'Choice 2', textAr: 'خيار 2', isCorrect: false },
        ],
        points: 10,
      },
    ]);
  };

  const removeQuizQuestion = (qId: string) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== qId));
  };

  const addQuizOption = (qId: string) => {
    setQuizQuestions(
      quizQuestions.map(q => {
        if (q.id !== qId) return q;
        const opts = q.options || [];
        return {
          ...q,
          options: [
            ...opts,
            { id: `opt-${Date.now()}`, text: `Option ${opts.length + 1}`, textAr: `خيار ${opts.length + 1}`, isCorrect: false },
          ],
        };
      })
    );
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setQuizQuestions(
      quizQuestions.map(q => {
        if (q.id !== qId) return q;
        return {
          ...q,
          options: (q.options || []).map(opt => ({
            ...opt,
            isCorrect: opt.id === optId,
          })),
        };
      })
    );
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    if (!title.trim()) {
      showToast('Validation Error', 'error', 'Module title is required.');
      return;
    }

    try {
      setIsSaving(true);
      let audioBuf: ArrayBuffer | undefined = initialModule?.audioArrayBuffer;
      if (audioBlob) {
        audioBuf = await audioBlob.arrayBuffer();
      }

      const quizSchema: QuizSchema | undefined =
        type === 'quiz'
          ? {
              questions: quizQuestions,
              passingScorePercentage: Number(passingScore),
              timeLimitMinutes: Number(quizTimeLimit),
              allowRetries: true,
            }
          : undefined;

      const assignmentSchema: AssignmentSchema | undefined =
        type === 'assignment'
          ? {
              instructions: assignmentInstructions || content,
              instructionsAr: assignmentInstructionsAr || contentAr,
              allowedFileTypes: allowedFileTypes.split(',').map(s => s.trim()),
              maxFileSizeMb: 10,
            }
          : undefined;

      await onSave({
        id: initialModule?.id,
        courseId,
        title,
        titleAr: titleAr || undefined,
        type,
        content,
        userNotes: contentAr || undefined,
        durationMinutes: Number(durationMinutes),
        points: type === 'assignment' || type === 'quiz' ? Number(points) : undefined,
        dueDate: type === 'assignment' ? dueDate : undefined,
        audioUrl: audioUrl || undefined,
        audioArrayBuffer: audioBuf,
        videoUrl: type === 'video' ? videoUrl : undefined,
        videoOfflineText: type === 'video' ? videoOfflineText : undefined,
        attachmentFile: type === 'pdf' ? attachmentFile : undefined,
        quizSchema,
        assignmentSchema,
      });
    } catch (err) {
      console.error('Error saving in ModuleStudio:', err);
      showToast('Save Error', 'error', 'Failed to save module.');
    } finally {
      setIsSaving(false);
    }
  };

  const formatSecs = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground flex flex-col overflow-hidden animate-in fade-in duration-200">
      {/* Studio Header Bar */}
      <header className="h-16 px-6 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold font-heading">
              {initialModule ? 'Edit Module Studio' : 'Create Module Studio'}
            </h2>
            <p className="text-xs text-muted-foreground">
              Offline-first authoring with IndexedDB & sync engine
            </p>
          </div>
        </div>

        {/* Tab Switcher: Edit vs Live Preview */}
        <div className="flex items-center bg-muted/50 p-1 rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setActiveStudioTab('edit')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeStudioTab === 'edit'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveStudioTab('preview')}
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeStudioTab === 'preview'
                ? 'bg-card text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Save & Exit Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl border border-border text-xs font-semibold hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save & Publish'}</span>
          </button>
        </div>
      </header>

      {/* Main Studio Body */}
      <div className="flex-1 overflow-y-auto p-6 max-w-6xl w-full mx-auto">
        {activeStudioTab === 'edit' ? (
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Top Bar: Language Selector & Basic Info */}
            <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold font-heading">Module Metadata</h3>
                </div>

                {/* Bilingual EN / AR Selector */}
                <div className="flex items-center bg-muted/40 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() => setActiveLangTab('en')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeLangTab === 'en'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Globe className="w-3 h-3" />
                    <span>English</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLangTab('ar')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeLangTab === 'ar'
                        ? 'bg-card text-foreground shadow-xs'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Languages className="w-3 h-3 text-emerald-500" />
                    <span>العربية</span>
                  </button>
                </div>
              </div>

              {/* Module Titles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Module Title (English) *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Introduction to Renewable Energy"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    العنوان بالعربية (Arabic Title)
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={titleAr}
                    onChange={e => setTitleAr(e.target.value)}
                    placeholder="مثال: مقدمة في الطاقة المتجددة"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 font-arabic"
                  />
                </div>
              </div>

              {/* Type Selector Grid */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-foreground">Module Content Type</label>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-2.5">
                  {[
                    { id: 'reading', label: 'Reading', icon: FileText, color: 'emerald' },
                    { id: 'audio', label: 'Audio Lecture', icon: Mic, color: 'purple' },
                    { id: 'video', label: 'Video Lesson', icon: Video, color: 'rose' },
                    { id: 'quiz', label: 'Interactive Quiz', icon: HelpCircle, color: 'blue' },
                    { id: 'assignment', label: 'Assignment', icon: FileQuestion, color: 'amber' },
                    { id: 'pdf', label: 'PDF Document', icon: FileDown, color: 'cyan' },
                  ].map(item => {
                    const Icon = item.icon;
                    const isSelected = type === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setType(item.id as CachedModule['type'])}
                        className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-primary/10 border-primary text-primary shadow-xs'
                            : 'bg-muted/20 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Duration & Points Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-border">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Estimated Duration (Minutes)</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {(type === 'assignment' || type === 'quiz') && (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-amber-500" />
                        <span>Total Points</span>
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={points}
                        onChange={e => setPoints(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        <span>Due Date</span>
                      </label>
                      <input
                        type="date"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* TYPE-SPECIFIC BUILDERS */}

            {/* 1. READING / MARKDOWN LESSON */}
            {type === 'reading' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-4">
                <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>Reading Article Content</span>
                </h3>

                {activeLangTab === 'en' ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Markdown Body (English)</label>
                    <textarea
                      rows={10}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="# Lesson Title&#10;&#10;Write lesson markdown content here..."
                      className="w-full p-4 rounded-xl border border-input bg-background font-mono text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">محتوى المقال بالعربية (Arabic Markdown)</label>
                    <textarea
                      rows={10}
                      dir="rtl"
                      value={contentAr}
                      onChange={e => setContentAr(e.target.value)}
                      placeholder="# عنوان الدرس&#10;&#10;اكتب محتوى الدرس هنا بالعربية..."
                      className="w-full p-4 rounded-xl border border-input bg-background font-mono text-sm text-foreground focus:outline-hidden focus:ring-2 focus:ring-primary/30 font-arabic"
                    />
                  </div>
                )}
              </div>
            )}

            {/* 2. AUDIO LECTURE (Voice Recorder & Audio Upload) */}
            {type === 'audio' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5">
                <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-500" />
                  <span>Audio Lecture & Voice Recorder</span>
                </h3>

                {/* Voice Recorder Block */}
                <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col items-center gap-4">
                  <div className="text-center">
                    <span className="text-2xl font-mono font-bold text-foreground">
                      {formatSecs(recordingSeconds)}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {isRecording ? 'Recording voice note...' : 'Record audio directly from your microphone'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors cursor-pointer"
                      >
                        <Mic className="w-4 h-4" />
                        <span>Start Recording</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition-colors cursor-pointer animate-pulse"
                      >
                        <Pause className="w-4 h-4" />
                        <span>Stop Recording</span>
                      </button>
                    )}

                    {audioUrl && (
                      <button
                        type="button"
                        onClick={toggleAudioPlayback}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-foreground text-xs font-bold hover:bg-muted transition-colors cursor-pointer"
                      >
                        {isPlayingAudio ? <Pause className="w-4 h-4 text-purple-500" /> : <Play className="w-4 h-4 text-purple-500" />}
                        <span>{isPlayingAudio ? 'Pause Preview' : 'Play Preview'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Or Audio File Upload */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Or Upload Audio File (MP3 / WAV)</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioFileUpload}
                    className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Lecture Notes / Transcript</label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Add text summary or transcript for this audio lecture..."
                    className="w-full p-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* 3. VIDEO LESSON (YouTube Embed & Manual Offline Text Fallback) */}
            {type === 'video' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5">
                <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-500" />
                  <span>Video Lesson (YouTube Link & Offline Text Fallback)</span>
                </h3>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">YouTube Video URL / Embed Link</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={e => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
                  />
                </div>

                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>Offline Connection Fallback Text</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Provide a text transcript or key takeaways for students who access this module offline without YouTube connectivity.
                  </p>
                  <textarea
                    rows={5}
                    value={videoOfflineText}
                    onChange={e => setVideoOfflineText(e.target.value)}
                    placeholder="Key concepts, summary points, and transcript for offline study..."
                    className="w-full p-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
                  />
                </div>
              </div>
            )}

            {/* 4. INTERACTIVE QUIZ BUILDER */}
            {type === 'quiz' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-6">
                <div className="flex items-center justify-between border-b border-border pb-4">
                  <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-blue-500" />
                    <span>Interactive Quiz Builder ({quizQuestions.length} Questions)</span>
                  </h3>
                  <button
                    type="button"
                    onClick={addQuizQuestion}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Question</span>
                  </button>
                </div>

                {/* Quiz Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-muted/20 border border-border">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Passing Score Percentage (%)</label>
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={passingScore}
                      onChange={e => setPassingScore(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Quiz Time Limit (Minutes)</label>
                    <input
                      type="number"
                      min={1}
                      value={quizTimeLimit}
                      onChange={e => setQuizTimeLimit(Number(e.target.value))}
                      className="px-3 py-2 rounded-xl border border-input bg-background text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Questions List */}
                <div className="flex flex-col gap-5">
                  {quizQuestions.map((q, qIndex) => (
                    <div key={q.id} className="p-5 rounded-xl border border-border bg-background flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">
                          Question #{qIndex + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeQuizQuestion(q.id)}
                          className="p-1 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Question Prompt */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={q.prompt}
                          onChange={e => {
                            const val = e.target.value;
                            setQuizQuestions(quizQuestions.map(item => (item.id === q.id ? { ...item, prompt: val } : item)));
                          }}
                          placeholder="Question prompt in English..."
                          className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-semibold"
                        />
                        <input
                          type="text"
                          dir="rtl"
                          value={q.promptAr || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setQuizQuestions(quizQuestions.map(item => (item.id === q.id ? { ...item, promptAr: val } : item)));
                          }}
                          placeholder="السؤال بالعربية..."
                          className="px-3.5 py-2 rounded-xl border border-input bg-background text-xs font-semibold font-arabic"
                        />
                      </div>

                      {/* Options List */}
                      <div className="flex flex-col gap-2 pl-2">
                        <label className="text-[11px] font-bold text-muted-foreground">Options (Select radio for correct answer)</label>
                        {(q.options || []).map(opt => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${q.id}`}
                              checked={opt.isCorrect}
                              onChange={() => setCorrectOption(q.id, opt.id)}
                              className="w-4 h-4 text-blue-600 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt.text}
                              onChange={e => {
                                const val = e.target.value;
                                setQuizQuestions(
                                  quizQuestions.map(item => {
                                    if (item.id !== q.id) return item;
                                    return {
                                      ...item,
                                      options: (item.options || []).map(o => (o.id === opt.id ? { ...o, text: val } : o)),
                                    };
                                  })
                                );
                              }}
                              placeholder="Option text EN"
                              className="flex-1 px-3 py-1.5 rounded-lg border border-input bg-background text-xs"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addQuizOption(q.id)}
                          className="self-start text-[11px] font-bold text-blue-500 hover:underline cursor-pointer pt-1"
                        >
                          + Add Choice Option
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. ASSIGNMENT BUILDER */}
            {type === 'assignment' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5">
                <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-amber-500" />
                  <span>Assignment Instructions & Rubrics</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">Instructions (English)</label>
                    <textarea
                      rows={6}
                      value={assignmentInstructions}
                      onChange={e => setAssignmentInstructions(e.target.value)}
                      placeholder="Detailed student assignment guidelines..."
                      className="w-full p-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-foreground">تعليمات التكليف (Arabic Instructions)</label>
                    <textarea
                      rows={6}
                      dir="rtl"
                      value={assignmentInstructionsAr}
                      onChange={e => setAssignmentInstructionsAr(e.target.value)}
                      placeholder="تعليمات التكليف للطلاب..."
                      className="w-full p-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden font-arabic"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Allowed Submission File Formats</label>
                  <input
                    type="text"
                    value={allowedFileTypes}
                    onChange={e => setAllowedFileTypes(e.target.value)}
                    placeholder="pdf, docx, zip"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-xs font-semibold"
                  />
                </div>
              </div>
            )}

            {/* 6. PDF / DOCUMENT ATTACHMENT */}
            {type === 'pdf' && (
              <div className="p-6 rounded-2xl bg-card border border-border flex flex-col gap-5">
                <h3 className="text-sm font-bold font-heading flex items-center gap-2">
                  <FileDown className="w-4 h-4 text-cyan-500" />
                  <span>PDF & Document Resource Attachment</span>
                </h3>

                <div className="p-6 rounded-xl border-2 border-dashed border-cyan-500/30 bg-cyan-500/5 flex flex-col items-center justify-center gap-3">
                  <Upload className="w-8 h-8 text-cyan-500" />
                  <div className="text-center">
                    <span className="text-xs font-bold text-foreground">
                      {attachmentFile ? attachmentFile.name : 'Upload PDF Document for Download'}
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      {attachmentFile
                        ? `${(attachmentFile.size / (1024 * 1024)).toFixed(2)} MB`
                        : 'Drag & drop or select a PDF document'}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf,.doc,.docx"
                    onChange={handlePdfUpload}
                    className="block w-full text-xs text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-cyan-500/10 file:text-cyan-600 hover:file:bg-cyan-500/20 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">Resource Notes & Overview</label>
                  <textarea
                    rows={4}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Overview of this PDF resource..."
                    className="w-full p-3.5 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-hidden"
                  />
                </div>
              </div>
            )}
          </form>
        ) : (
          /* LIVE PREVIEW TAB */
          <div className="p-8 rounded-3xl bg-card border border-border flex flex-col gap-6 shadow-xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider">
                  {type} Module
                </span>
                <h3 className="text-xl font-bold font-heading">{title || 'Untitled Module'}</h3>
              </div>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{durationMinutes} min</span>
              </span>
            </div>

            {/* Language Banner */}
            {activeLangTab === 'ar' && titleAr && (
              <div className="p-4 rounded-xl bg-muted/30 border border-border" dir="rtl">
                <h4 className="text-lg font-bold font-arabic text-foreground">{titleAr}</h4>
              </div>
            )}

            {/* Type Preview Renderers */}
            {type === 'reading' && (
              <div className="prose dark:prose-invert max-w-none text-sm leading-relaxed">
                {activeLangTab === 'ar' && contentAr ? (
                  <p dir="rtl" className="whitespace-pre-wrap font-arabic">{contentAr}</p>
                ) : (
                  <p className="whitespace-pre-wrap">{content || 'No content written yet.'}</p>
                )}
              </div>
            )}

            {type === 'audio' && (
              <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-600 dark:text-purple-400 flex items-center gap-2">
                    <Mic className="w-4 h-4" />
                    <span>Audio Lecture</span>
                  </span>
                  {audioUrl && (
                    <button
                      onClick={toggleAudioPlayback}
                      className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                    >
                      {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      <span>{isPlayingAudio ? 'Pause Audio' : 'Play Audio'}</span>
                    </button>
                  )}
                </div>
                {content && <p className="text-xs text-muted-foreground whitespace-pre-wrap">{content}</p>}
              </div>
            )}

            {type === 'video' && (
              <div className="flex flex-col gap-4">
                {videoUrl ? (
                  <div className="aspect-video w-full rounded-2xl bg-black overflow-hidden flex items-center justify-center">
                    <iframe
                      src={videoUrl.replace('watch?v=', 'embed/')}
                      className="w-full h-full border-0"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full rounded-2xl bg-muted/40 border border-border flex items-center justify-center text-xs text-muted-foreground">
                    No YouTube video URL configured
                  </div>
                )}
                {videoOfflineText && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <h5 className="text-xs font-bold text-amber-600 mb-1">Offline Study Summary</h5>
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap">{videoOfflineText}</p>
                  </div>
                )}
              </div>
            )}

            {type === 'quiz' && (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600">
                    Interactive Quiz ({quizQuestions.length} Questions)
                  </span>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Passing: {passingScore}% | Time: {quizTimeLimit} min
                  </span>
                </div>
                {quizQuestions.map((q, idx) => (
                  <div key={q.id} className="p-4 rounded-xl border border-border flex flex-col gap-2">
                    <span className="text-xs font-bold">Q{idx + 1}: {q.prompt}</span>
                    <div className="flex flex-col gap-1.5 pl-4">
                      {(q.options || []).map(opt => (
                        <div key={opt.id} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.isCorrect ? 'bg-emerald-500' : 'bg-muted'}`} />
                          <span>{opt.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {type === 'assignment' && (
              <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-600">Assignment Submission</span>
                  <span className="text-xs font-bold text-foreground">Points: {points}</span>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                  {assignmentInstructions || content || 'No instructions provided.'}
                </p>
                <div className="pt-3 border-t border-amber-500/20 text-[11px] text-muted-foreground">
                  Allowed file types: {allowedFileTypes}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
