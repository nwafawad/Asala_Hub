'use client';

import React, { useState, useRef, useEffect } from 'react';
import { CachedModule } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { cacheAudioLecture, revokeAudioObjectUrl } from '@/lib/audioCache';
import {
  X,
  Mic,
  Square,
  Upload,
  FileText,
  FileQuestion,
  BookMarked,
  Save,
  Play,
  Pause,
  AlertCircle,
  Volume2,
  CheckCircle2,
} from 'lucide-react';

interface ModuleEditorProps {
  courseId: string;
  initialModule: CachedModule | null;
  onSave: (moduleData: Partial<CachedModule>) => Promise<void>;
  onClose: () => void;
}

export const ModuleEditor: React.FC<ModuleEditorProps> = ({
  courseId,
  initialModule,
  onSave,
  onClose,
}) => {
  const { t } = useI18n();
  const { showToast } = useOverlay();

  const [title, setTitle] = useState(initialModule?.title || '');
  const [titleAr, setTitleAr] = useState(initialModule?.titleAr || '');
  const [type, setType] = useState<CachedModule['type']>(initialModule?.type || 'reading');
  const [content, setContent] = useState(initialModule?.content || '');
  const [durationMinutes, setDurationMinutes] = useState(initialModule?.durationMinutes || 15);
  const [points, setPoints] = useState(initialModule?.points || 100);
  const [dueDate, setDueDate] = useState(initialModule?.dueDate || '');
  const [audioUrl, setAudioUrl] = useState(initialModule?.audioUrl || '');
  const [isSaving, setIsSaving] = useState(false);

  // Audio Voice Recorder State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedAudioBlob, setRecordedAudioBlob] = useState<Blob | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);

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
      if (audioUrl && audioUrl.startsWith('blob:')) {
        revokeAudioObjectUrl(audioUrl);
      }
    };
  }, []);

  // Web Audio MediaRecorder Start
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
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudioBlob(audioBlob);
        const voiceUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(voiceUrl);
        // Stop stream tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingSeconds(0);

      timerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting audio recording:', err);
      showToast('Microphone Permission Error', 'error', 'Unable to access microphone.');
    }
  };

  // Web Audio MediaRecorder Stop
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  // Audio File Upload handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setAudioUrl(fileUrl);
    showToast('Audio File Loaded', 'info', `Loaded ${file.name} for lecture notes.`);
  };

  const togglePlayback = () => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showToast('Validation Error', 'error', 'Module title is required.');
      return;
    }

    try {
      setIsSaving(true);
      await onSave({
        id: initialModule?.id,
        courseId,
        title,
        titleAr: titleAr || undefined,
        type,
        content,
        durationMinutes: Number(durationMinutes),
        points: type === 'assignment' ? Number(points) : undefined,
        dueDate: type === 'assignment' ? dueDate : undefined,
        audioUrl: audioUrl || undefined,
      });
    } catch (err) {
      console.error('Error in ModuleEditor handleSubmit:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="max-w-2xl w-full p-6 rounded-2xl bg-card border border-border shadow-2xl max-h-[90vh] overflow-y-auto flex flex-col gap-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-foreground">
                {initialModule ? 'Edit Module' : t.educator?.curriculum?.addModule || 'Create Module'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Offline authoring view with IndexedDB persistence.
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

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Module Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              {t.educator?.curriculum?.moduleType || 'Module Type'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setType('reading')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'reading'
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Reading Lesson</span>
              </button>
              <button
                type="button"
                onClick={() => setType('audio')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'audio'
                    ? 'bg-purple-500/10 border-purple-500 text-purple-600 dark:text-purple-400'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>Audio Lecture</span>
              </button>
              <button
                type="button"
                onClick={() => setType('assignment')}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  type === 'assignment'
                    ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400'
                    : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                }`}
              >
                <FileQuestion className="w-4 h-4" />
                <span>Assignment Quiz</span>
              </button>
            </div>
          </div>

          {/* Title Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t.educator?.curriculum?.moduleTitle || 'Module Title (EN)'} *
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Binary Search Trees"
                required
                className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">
                {t.educator?.curriculum?.moduleTitleAr || 'Arabic Title (Optional)'}
              </label>
              <input
                type="text"
                value={titleAr}
                onChange={e => setTitleAr(e.target.value)}
                placeholder="مقدمة في أشجار البحث الثنائية"
                dir="rtl"
                className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>

          {/* Duration & Assignment Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-foreground">Estimated Duration (Mins)</label>
              <input
                type="number"
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
                min={1}
                className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>

            {type === 'assignment' && (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t.educator?.curriculum?.maxScore || 'Max Score (Points)'}
                  </label>
                  <input
                    type="number"
                    value={points}
                    onChange={e => setPoints(Number(e.target.value))}
                    min={1}
                    className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    {t.educator?.curriculum?.dueDate || 'Due Date'}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
                  />
                </div>
              </>
            )}
          </div>

          {/* Audio Lecture Recorder Section */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-purple-500" />
                {t.educator?.curriculum?.audioSection || 'Voice Lecture & Audio Notes'}
              </span>
              {audioUrl && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Audio Attached
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!isRecording ? (
                <button
                  type="button"
                  onClick={startRecording}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>{t.educator?.curriculum?.recordVoiceNote || 'Record Voice Note'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopRecording}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-destructive text-destructive-foreground text-xs font-semibold animate-pulse cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Recording ({formatSeconds(recordingSeconds)}) — Click to Stop</span>
                </button>
              )}

              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-muted-foreground" />
                <span>Upload Audio (.mp3/.wav)</span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {audioUrl && (
                <button
                  type="button"
                  onClick={togglePlayback}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer ms-auto"
                >
                  {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isPlayingAudio ? 'Pause Preview' : 'Play Audio Preview'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Lesson Content Textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Lesson Content & Instructions (Markdown Supported)
            </label>
            <textarea
              rows={6}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={t.educator?.curriculum?.contentPlaceholder || 'Enter content...'}
              className="p-3.5 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-mono leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
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
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Save Module Offline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
