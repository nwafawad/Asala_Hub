'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { sanitizeHtml } from '@/lib/sanitize';
import { db, type CachedModule } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
import { isAudioCached, cacheAudioLecture, getCachedAudioObjectUrl, revokeAudioObjectUrl } from '@/lib/audioCache';
import {
  X,
  BookOpen,
  Headphones,
  FileText,
  Scroll,
  WifiOff,
  Download,
  Play,
  Pause,
  Volume2,
  CheckCircle2,
  Clock,
  HardDrive,
  Radio,
  Video,
  FileQuestion,
  HelpCircle,
  ClipboardList,
  FileDown,
  Globe,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Award,
  Calendar,
  Sparkles,
  Layers,
  Tv,
} from 'lucide-react';

/**
 * Helper to normalize and construct valid embed URLs for YouTube videos
 * Handles: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/shorts/ID, youtube.com/embed/ID
 */
export function getYouTubeEmbedUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.includes('youtube.com/embed/')) {
    return trimmed;
  }
  const watchMatch = trimmed.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
  if (watchMatch && watchMatch[1]) {
    return `https://www.youtube.com/embed/${watchMatch[1]}?autoplay=0&rel=0&enablejsapi=1`;
  }
  const shortMatch = trimmed.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
  if (shortMatch && shortMatch[1]) {
    return `https://www.youtube.com/embed/${shortMatch[1]}?autoplay=0&rel=0&enablejsapi=1`;
  }
  const shortsMatch = trimmed.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
  if (shortsMatch && shortsMatch[1]) {
    return `https://www.youtube.com/embed/${shortsMatch[1]}?autoplay=0&rel=0&enablejsapi=1`;
  }
  if (trimmed.includes('watch?v=')) {
    return trimmed.replace('watch?v=', 'embed/');
  }
  return trimmed;
}

interface ModuleViewerModalProps {
  module: CachedModule | null;
  modulesList?: CachedModule[];
  isOpen: boolean;
  onClose: () => void;
  onSelectModule?: (mod: CachedModule) => void;
  onDownloadModule?: (mod: CachedModule) => Promise<void>;
  onOpenAssignment?: (assignmentId: string) => void;
}

export const ModuleViewerModal: React.FC<ModuleViewerModalProps> = ({
  module,
  modulesList = [],
  isOpen,
  onClose,
  onSelectModule,
  onDownloadModule,
  onOpenAssignment,
}) => {
  const { t, language } = useI18n();
  const { isOnline } = useSync();

  // Active module language mode (EN vs AR) override
  const [modalLang, setModalLang] = useState<'en' | 'ar'>(language === 'ar' ? 'ar' : 'en');

  // Video view mode tab (YouTube portal vs offline transcript)
  const [videoTabMode, setVideoTabMode] = useState<'portal' | 'transcript'>('portal');

  // General controls
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [isAudioCachedState, setIsAudioCachedState] = useState<boolean>(false);
  const [isCompletedState, setIsCompletedState] = useState<boolean>(module?.isCompleted || false);
  const [userNotesState, setUserNotesState] = useState<string>(module?.userNotes || '');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');

  // HTML5 Audio playback state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  // PDF blob object URL state for preview
  const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

  // Synchronize modal language with global app language changes
  useEffect(() => {
    setModalLang(language === 'ar' ? 'ar' : 'en');
  }, [language]);

  // Sync state when active module changes
  useEffect(() => {
    setIsCompletedState(module?.isCompleted || false);
    setUserNotesState(module?.userNotes || '');
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);
    setVideoTabMode('portal');

    async function checkAudio() {
      if (module && module.type === 'audio' && module.audioUrl) {
        const cached = await isAudioCached(module.audioUrl);
        setIsAudioCachedState(cached);
      }
    }
    checkAudio();

    // Prepare PDF Object URL if available
    if (module?.type === 'pdf' && module.attachmentFile?.arrayBuffer) {
      const blob = new Blob([module.attachmentFile.arrayBuffer], { type: 'application/pdf' });
      const objUrl = URL.createObjectURL(blob);
      setPdfObjectUrl(objUrl);
      return () => {
        URL.revokeObjectURL(objUrl);
        setPdfObjectUrl(null);
      };
    } else {
      setPdfObjectUrl(null);
    }
  }, [module]);

  // Load/unload HTML5 audio lecture
  useEffect(() => {
    if (!module || module.type !== 'audio' || !module.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }

    let revokeUrl: string | null = null;

    async function loadAudio() {
      if (module?.audioArrayBuffer) {
        const blob = new Blob([module.audioArrayBuffer], { type: 'audio/webm' });
        const objUrl = URL.createObjectURL(blob);
        revokeUrl = objUrl;
        if (audioRef.current) audioRef.current.src = objUrl;
        return;
      }
      const blobUrl = await getCachedAudioObjectUrl(module!.audioUrl!);
      if (blobUrl) {
        revokeUrl = blobUrl;
        if (audioRef.current) audioRef.current.src = blobUrl;
      } else if (module?.audioUrl && audioRef.current) {
        audioRef.current.src = module.audioUrl;
      }
    }

    loadAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      if (revokeUrl) revokeAudioObjectUrl(revokeUrl);
      setIsPlaying(false);
      setCurrentTime(0);
    };
  }, [module?.audioUrl, module?.type, module?.audioArrayBuffer]);

  // Sequence sorting for Next/Previous module navigation
  const sortedModulesList = useMemo(() => {
    if (!modulesList || modulesList.length === 0) return [];
    return [...modulesList].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [modulesList]);

  const currentIndex = module ? sortedModulesList.findIndex(m => m.id === module.id) : -1;
  const prevModule = currentIndex > 0 ? sortedModulesList[currentIndex - 1] : null;
  const nextModule =
    currentIndex >= 0 && currentIndex < sortedModulesList.length - 1
      ? sortedModulesList[currentIndex + 1]
      : null;

  if (!isOpen || !module) return null;

  const getModuleIcon = () => {
    switch (module.type) {
      case 'video':
        return <Video className="w-5 h-5 text-primary" />;
      case 'audio':
        return <Headphones className="w-5 h-5 text-primary" />;
      case 'quiz':
        return <FileQuestion className="w-5 h-5 text-primary" />;
      case 'assignment':
        return <ClipboardList className="w-5 h-5 text-primary" />;
      case 'pdf':
        return <FileDown className="w-5 h-5 text-primary" />;
      case 'syllabus':
        return <Scroll className="w-5 h-5 text-primary" />;
      case 'reading':
      default:
        return <BookOpen className="w-5 h-5 text-primary" />;
    }
  };

  const moduleTypeLabel =
    (t.coursesPage?.moduleTypes as Record<string, string>)?.[module.type] ||
    module.type.toUpperCase();

  const toggleCompleted = async () => {
    if (!module) return;
    const nextStatus = !isCompletedState;
    setIsCompletedState(nextStatus);
    await db.cachedModules.update(module.id, { isCompleted: nextStatus });

    const offlineUuid = generateUUID();
    await db.transactionLogs.add({
      offlineId: offlineUuid,
      action: 'COMPLETE_MODULE',
      entityType: 'Module',
      entityId: module.id,
      payload: {
        courseId: module.courseId,
        moduleId: module.id,
        isCompleted: nextStatus,
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
    });
  };

  const handleNotesChange = async (notes: string) => {
    if (!module) return;
    setUserNotesState(notes);
    await db.cachedModules.update(module.id, { userNotes: sanitizeHtml(notes) });
  };

  const handleDownload = async () => {
    if (!onDownloadModule) return;
    setDownloading(true);
    try {
      await onDownloadModule(module);
    } finally {
      setDownloading(false);
    }
  };

  const fontSizeClasses = {
    sm: 'text-xs leading-relaxed',
    base: 'text-sm leading-relaxed',
    lg: 'text-base leading-relaxed',
    xl: 'text-lg leading-relaxed',
  };

  const formattedYouTubeEmbedUrl = getYouTubeEmbedUrl(module.videoUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 ${
        isFullscreen ? 'p-0' : 'p-4'
      }`}
    >
      <div
        className={`relative w-full rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-4xl max-h-[92vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Hidden HTML5 Audio element */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onDurationChange={() => setAudioDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
          style={{ display: 'none' }}
        />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-background border border-border shadow-xs">
              {getModuleIcon()}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
                  {moduleTypeLabel}
                </span>
                <span className="text-xs text-muted-foreground font-mono">
                  Module #{module.sequenceOrder}
                </span>
                {module.durationMinutes && (
                  <span className="text-xs text-muted-foreground font-mono hidden sm:inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {module.durationMinutes} min
                  </span>
                )}
              </div>
              <h3 id="module-modal-title" className="text-base font-bold font-heading text-foreground mt-0.5">
                {modalLang === 'ar' && module.titleAr ? module.titleAr : module.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bilingual Language Switcher */}
            {(module.titleAr || module.assignmentSchema?.instructionsAr || module.videoOfflineText) && (
              <div className="flex items-center border border-border rounded-lg bg-background p-0.5">
                <button
                  onClick={() => setModalLang('en')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    modalLang === 'en' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => setModalLang('ar')}
                  className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    modalLang === 'ar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                  }`}
                >
                  العربية
                </button>
              </div>
            )}

            {/* Font Size Selector (for Reading/Text views) */}
            <div className="hidden sm:flex items-center border border-border rounded-lg bg-background p-0.5" aria-label="Adjust font size">
              <button
                onClick={() => setFontSize('sm')}
                aria-label="Small font size"
                className={`px-2 py-0.5 text-xs font-mono rounded ${fontSize === 'sm' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                A-
              </button>
              <button
                onClick={() => setFontSize('base')}
                aria-label="Normal font size"
                className={`px-2 py-0.5 text-xs font-mono rounded ${fontSize === 'base' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                A
              </button>
              <button
                onClick={() => setFontSize('lg')}
                aria-label="Large font size"
                className={`px-2 py-0.5 text-xs font-mono rounded ${fontSize === 'lg' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              >
                A+
              </button>
            </div>

            {/* Fullscreen Reader Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label="Toggle fullscreen reader"
              className="hidden md:block px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>

            <button
              onClick={onClose}
              aria-label="Close module viewer"
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {!module.isCachedOffline ? (
            /* Uncached Offline State Banner inside Modal */
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col items-center text-center gap-4">
              <div className="p-4 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <WifiOff className="w-8 h-8" />
              </div>
              <div className="flex flex-col gap-1 max-w-md">
                <h4 className="text-base font-bold text-foreground">
                  {t.coursesPage.offlineNoticeTitle}
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {t.coursesPage.offlineNoticeDesc}
                </p>
                <div className="inline-flex items-center justify-center gap-1.5 mt-2 text-xs font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 py-1.5 px-3 rounded-lg border border-amber-500/20">
                  <span>{t.coursesPage.notYetDownloaded}</span>
                </div>
              </div>

              {onDownloadModule && (
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="mt-2 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{downloading ? 'Caching...' : t.coursesPage.downloadModule}</span>
                </button>
              )}
            </div>
          ) : (
            /* Cached Content View */
            <div className="flex flex-col gap-6">
              {/* Content Header Meta */}
              <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/40 p-3 rounded-xl border border-border">
                <span className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  {t.coursesPage.cachedOfflineLabel}
                </span>
                <span className="flex items-center gap-1 font-mono">
                  <HardDrive className="w-3.5 h-3.5" />
                  {module.sizeMb} MB
                </span>
              </div>

              {/* 1. YOUTUBE VIDEO PLAYBACK PORTAL */}
              {module.type === 'video' && (
                <div className="flex flex-col gap-4">
                  {/* Mode Navigation Bar for Video: Online YouTube Player vs Offline Transcript */}
                  <div className="flex items-center justify-between bg-muted/30 p-1.5 rounded-xl border border-border">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setVideoTabMode('portal')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          videoTabMode === 'portal'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <Tv className="w-4 h-4" />
                        <span>YouTube Video Portal</span>
                      </button>
                      <button
                        onClick={() => setVideoTabMode('transcript')}
                        className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          videoTabMode === 'transcript'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        <FileText className="w-4 h-4" />
                        <span>Offline Transcript & Summary</span>
                        {module.videoOfflineText && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        )}
                      </button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-muted-foreground">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{module.durationMinutes || 15} min video lesson</span>
                    </div>
                  </div>

                  {/* YouTube Portal Mode */}
                  {videoTabMode === 'portal' && (
                    <div className="flex flex-col gap-3">
                      {formattedYouTubeEmbedUrl ? (
                        <div className="relative aspect-video w-full rounded-2xl bg-black overflow-hidden border border-border shadow-xl group">
                          <iframe
                            src={formattedYouTubeEmbedUrl}
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            allowFullScreen
                            title={module.title}
                          />

                          {/* Offline Overlay banner if student loses connection while in portal */}
                          {!isOnline && (
                            <div className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-amber-500/90 text-white backdrop-blur-md text-[11px] font-bold flex items-center gap-1.5 shadow-md">
                              <WifiOff className="w-3.5 h-3.5" />
                              <span>Offline Mode: Switch to Transcript if video doesn't buffer</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="aspect-video w-full rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center gap-2 p-6 text-center text-xs text-muted-foreground">
                          <Video className="w-8 h-8 text-muted-foreground/50" />
                          <p className="font-semibold">No YouTube Video URL specified by educator.</p>
                          <p className="text-[11px]">Check the Offline Transcript tab below for lesson summaries.</p>
                        </div>
                      )}

                      {/* YouTube Portal Information Bar */}
                      <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 rounded-lg bg-primary/10 text-primary">
                            <Sparkles className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-foreground">
                              {modalLang === 'ar' && module.titleAr ? module.titleAr : module.title}
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                              YouTube Video Lecture • Intranet Streaming Portal
                            </p>
                          </div>
                        </div>

                        {module.videoOfflineText && (
                          <button
                            onClick={() => setVideoTabMode('transcript')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Read Video Transcript</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Offline Transcript Mode */}
                  {videoTabMode === 'transcript' && (
                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col gap-3">
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400">
                          <WifiOff className="w-4 h-4" />
                          <span>Offline Video Transcript & Key Concepts</span>
                        </div>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Available Offline
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed p-2">
                        {module.videoOfflineText ||
                          module.content ||
                          'No offline video transcript provided for this lesson. You can take personal study notes below while watching.'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 2. Audio Lecture Player Widget */}
              {module.type === 'audio' && (
                <div className="p-5 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                      <Volume2 className="w-4 h-4" />
                      <span>Audio Lecture Player (Offline Intranet Stream)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          if (module.audioUrl) {
                            const success = await cacheAudioLecture(module.audioUrl);
                            if (success) setIsAudioCachedState(true);
                          }
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                          isAudioCachedState
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-background border-border text-foreground hover:bg-muted'
                        }`}
                      >
                        <Radio className="w-3 h-3 text-primary" />
                        <span>{isAudioCachedState ? 'Audio Cached in SW' : 'Prefetch Audio'}</span>
                      </button>

                      {module.durationMinutes && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5" />
                          {module.durationMinutes} mins
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-4 bg-card/80 p-3 rounded-xl border border-border">
                    <button
                      onClick={async () => {
                        if (!audioRef.current) return;
                        if (isPlaying) {
                          audioRef.current.pause();
                          setIsPlaying(false);
                        } else {
                          audioRef.current.playbackRate = playbackSpeed;
                          await audioRef.current.play().catch(() => {});
                          setIsPlaying(true);
                        }
                      }}
                      className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 rtl:rotate-180" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      {(() => {
                        const fmtTime = (s: number) => {
                          if (!isFinite(s) || isNaN(s)) return '00:00';
                          const m = Math.floor(s / 60);
                          const sec = Math.floor(s % 60);
                          return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
                        };
                        const totalSecs =
                          audioDuration > 0
                            ? audioDuration
                            : (module.durationMinutes ?? 15) * 60;
                        const pct = totalSecs > 0 ? Math.min(100, (currentTime / totalSecs) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                              <span>{fmtTime(currentTime)}</span>
                              <span>{fmtTime(totalSecs)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <button
                      onClick={() => {
                        const speeds = [0.75, 1.0, 1.25, 1.5, 2.0];
                        const idx = speeds.indexOf(playbackSpeed);
                        const next = idx >= 0 && idx < speeds.length - 1 ? speeds[idx + 1] : speeds[0];
                        setPlaybackSpeed(next);
                        if (audioRef.current) audioRef.current.playbackRate = next;
                      }}
                      className="px-2.5 py-1 rounded-lg border border-border bg-background text-[11px] font-mono font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Interactive Quiz Runner */}
              {module.type === 'quiz' && module.quizSchema && (
                <QuizRunnerWidget module={module} modalLang={modalLang} />
              )}

              {/* 4. Assignment Guidelines & Direct Action */}
              {module.type === 'assignment' && (
                <div className="p-6 rounded-2xl bg-card border border-amber-500/20 shadow-xs flex flex-col gap-5">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-5 h-5 text-amber-500" />
                      <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">
                        Assignment Overview & Instructions
                      </span>
                    </div>
                    {module.points && (
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-600 font-mono flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" />
                        {module.points} Points
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                    {modalLang === 'ar' && module.assignmentSchema?.instructionsAr
                      ? module.assignmentSchema.instructionsAr
                      : module.assignmentSchema?.instructions || module.content}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-amber-500/20 text-xs">
                    {module.dueDate && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Due Date</span>
                          <span className="font-semibold text-foreground">{module.dueDate}</span>
                        </div>
                      </div>
                    )}

                    {module.assignmentSchema?.allowedFileTypes && (
                      <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-2">
                        <FileDown className="w-4 h-4 text-amber-500" />
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Allowed File Types</span>
                          <span className="font-mono font-semibold text-foreground">
                            {module.assignmentSchema.allowedFileTypes.join(', ')}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {onOpenAssignment && (
                    <button
                      onClick={() => onOpenAssignment(module.assignmentId || `assign-${module.id}`)}
                      className="mt-2 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open Assignment Workspace & Submit Solution</span>
                    </button>
                  )}
                </div>
              )}

              {/* 5. PDF Document Resource Widget */}
              {module.type === 'pdf' && (
                <div className="p-6 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-cyan-500/20 text-cyan-600">
                        <FileDown className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold font-heading">
                          {module.attachmentFile?.name || 'PDF Document Resource'}
                        </h4>
                        <p className="text-xs text-muted-foreground font-mono">
                          {module.attachmentFile
                            ? `${(module.attachmentFile.size / (1024 * 1024)).toFixed(2)} MB`
                            : `${module.sizeMb} MB Downloadable Document`}
                        </p>
                      </div>
                    </div>

                    {module.attachmentFile?.arrayBuffer && (
                      <button
                        onClick={() => {
                          const blob = new Blob([module.attachmentFile!.arrayBuffer!], { type: 'application/pdf' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = module.attachmentFile!.name;
                          a.click();
                        }}
                        className="px-4 py-2 rounded-xl bg-cyan-600 text-white text-xs font-bold hover:bg-cyan-700 transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download PDF</span>
                      </button>
                    )}
                  </div>

                  {pdfObjectUrl && (
                    <div className="mt-2 w-full h-[450px] rounded-xl overflow-hidden border border-cyan-500/30 bg-background shadow-inner">
                      <iframe src={pdfObjectUrl} className="w-full h-full border-0" title={module.title} />
                    </div>
                  )}
                </div>
              )}

              {/* Text / Markdown Reading / Syllabus Body */}
              {(module.type === 'reading' || module.type === 'syllabus' || module.content) && (
                <div
                  className={`prose dark:prose-invert max-w-none text-foreground bg-card p-6 rounded-xl border border-border ${fontSizeClasses[fontSize]}`}
                >
                  <p className="whitespace-pre-line">
                    {module.content ||
                      'Detailed course material stored in local IndexedDB. Students can study this module completely offline.'}
                  </p>
                </div>
              )}

              {/* Offline Personal Study Notes Section */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Personal Study Notes (Saved Offline to IndexedDB)
                </label>
                <textarea
                  value={userNotesState}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Type your personal study notes, reminders, or summaries for this module here..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer with Module Navigation & Completion */}
        <div className="p-4 border-t border-border bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              onClick={toggleCompleted}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isCompletedState
                  ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                  : 'bg-background border-border text-foreground hover:bg-muted'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isCompletedState ? 'Module Completed ✓' : 'Mark as Completed'}</span>
            </button>
          </div>

          {/* Next / Previous Module Controls */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {prevModule && onSelectModule && (
              <button
                onClick={() => onSelectModule(prevModule)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={`Previous: ${prevModule.title}`}
              >
                <ChevronLeft className="w-4 h-4 text-primary" />
                <span className="truncate max-w-[100px] sm:max-w-[140px]">Prev</span>
              </button>
            )}

            {nextModule && onSelectModule && (
              <button
                onClick={() => onSelectModule(nextModule)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                title={`Next: ${nextModule.title}`}
              >
                <span className="truncate max-w-[100px] sm:max-w-[140px]">Next</span>
                <ChevronRight className="w-4 h-4 text-primary" />
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
            >
              {t.actions.close}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface QuizRunnerWidgetProps {
  module: CachedModule;
  modalLang?: 'en' | 'ar';
}

const QuizRunnerWidget: React.FC<QuizRunnerWidgetProps> = ({ module, modalLang = 'en' }) => {
  const quizSchema = module.quizSchema;
  const questions = quizSchema?.questions || [];

  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [scorePercentage, setScorePercentage] = useState<number>(0);

  if (!quizSchema || questions.length === 0) return null;

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (submitted) return;
    setUserAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const handleCalculateScore = async () => {
    let earnedPoints = 0;
    let totalPoints = 0;

    questions.forEach(q => {
      totalPoints += q.points || 10;
      const selectedOptId = userAnswers[q.id];
      const correctOpt = (q.options || []).find(opt => opt.isCorrect);
      if (selectedOptId && correctOpt && selectedOptId === correctOpt.id) {
        earnedPoints += q.points || 10;
      }
    });

    const pct = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    setScorePercentage(pct);
    setSubmitted(true);

    await db.transactionLogs.add({
      offlineId: generateUUID(),
      action: 'SUBMIT_ASSIGNMENT',
      entityType: 'quiz_attempt',
      entityId: module.id,
      payload: {
        moduleId: module.id,
        courseId: module.courseId,
        scorePercentage: pct,
        earnedPoints,
        totalPoints,
        answers: userAnswers,
        submittedAt: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
      status: 'pending',
    });
  };

  const isPassed = scorePercentage >= (quizSchema.passingScorePercentage || 70);

  return (
    <div className="p-6 rounded-2xl bg-card border border-primary/20 flex flex-col gap-5 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">
            Interactive Quiz Runner
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            ({questions.length} Questions)
          </span>
        </div>
        {quizSchema.passingScorePercentage && (
          <span className="text-xs text-muted-foreground font-mono">
            Passing: {quizSchema.passingScorePercentage}%
          </span>
        )}
      </div>

      {/* Questions List */}
      <div className="flex flex-col gap-6">
        {questions.map((q, idx) => {
          const promptText = modalLang === 'ar' && q.promptAr ? q.promptAr : q.prompt;
          const selectedOptionId = userAnswers[q.id];

          return (
            <div key={q.id} className="p-4 rounded-xl border border-border bg-muted/20 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-foreground">
                  Q{idx + 1}. {promptText}
                </h5>
                <span className="text-[11px] font-mono text-muted-foreground">{q.points || 10} pts</span>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2 pl-2">
                {(q.options || []).map(opt => {
                  const optText = modalLang === 'ar' && opt.textAr ? opt.textAr : opt.text;
                  const isSelected = selectedOptionId === opt.id;
                  const isCorrectAnswer = opt.isCorrect;

                  let borderClass = 'border-border bg-card';
                  if (submitted) {
                    if (isCorrectAnswer)
                      borderClass =
                        'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold';
                    else if (isSelected && !isCorrectAnswer)
                      borderClass = 'border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300';
                  } else if (isSelected) {
                    borderClass = 'border-primary bg-primary/10 text-primary font-semibold';
                  }

                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectOption(q.id, opt.id)}
                      disabled={submitted}
                      className={`p-3 rounded-xl border text-xs text-start transition-all cursor-pointer flex items-center justify-between ${borderClass}`}
                    >
                      <span>{optText}</span>
                      {submitted && isCorrectAnswer && (
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Correct ✓</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Submission Footer */}
      {!submitted ? (
        <button
          type="button"
          onClick={handleCalculateScore}
          disabled={Object.keys(userAnswers).length === 0}
          className="self-end px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90 transition-colors cursor-pointer disabled:opacity-50"
        >
          Submit Quiz Answers
        </button>
      ) : (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between ${
            isPassed
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
          }`}
        >
          <div>
            <h4 className="text-sm font-bold">{isPassed ? 'Quiz Passed! 🎉' : 'Quiz Failed'}</h4>
            <p className="text-xs text-muted-foreground">
              Your Score: <span className="font-bold">{scorePercentage}%</span> (Passing score:{' '}
              {quizSchema.passingScorePercentage}%)
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSubmitted(false);
              setUserAnswers({});
            }}
            className="px-3 py-1.5 rounded-lg border border-current text-xs font-semibold hover:opacity-80 transition-opacity cursor-pointer"
          >
            Retry Quiz
          </button>
        </div>
      )}
    </div>
  );
};
