'use client';

import React, { useState, useRef } from 'react';
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
} from 'lucide-react';

interface ModuleViewerModalProps {
  module: CachedModule | null;
  isOpen: boolean;
  onClose: () => void;
  onDownloadModule?: (mod: CachedModule) => Promise<void>;
}

export const ModuleViewerModal: React.FC<ModuleViewerModalProps> = ({
  module,
  isOpen,
  onClose,
  onDownloadModule,
}) => {
  const { t, language } = useI18n();
  const { isOnline } = useSync();
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [isAudioCachedState, setIsAudioCachedState] = useState<boolean>(false);
  const [isCompletedState, setIsCompletedState] = useState<boolean>(module?.isCompleted || false);
  const [userNotesState, setUserNotesState] = useState<string>(module?.userNotes || '');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  // Bug #3: real HTML5 Audio state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);

  React.useEffect(() => {
    setIsCompletedState(module?.isCompleted || false);
    setUserNotesState(module?.userNotes || '');
    // Reset audio playback state when module changes
    setIsPlaying(false);
    setCurrentTime(0);
    setAudioDuration(0);

    async function checkAudio() {
      if (module && module.type === 'audio' && module.audioUrl) {
        const cached = await isAudioCached(module.audioUrl);
        setIsAudioCachedState(cached);
      }
    }
    checkAudio();
  }, [module]);

  // Bug #3: load/unload HTML5 Audio src whenever the module audio URL changes
  React.useEffect(() => {
    if (!module || module.type !== 'audio' || !module.audioUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      return;
    }

    let revokeUrl: string | null = null;

    async function loadAudio() {
      // Offline-first: try blob URL from CacheStorage
      const blobUrl = await getCachedAudioObjectUrl(module!.audioUrl!);
      if (blobUrl) {
        revokeUrl = blobUrl;
        if (audioRef.current) audioRef.current.src = blobUrl;
      } else if (module?.audioUrl && audioRef.current) {
        // Fallback: direct intranet URL
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
  }, [module?.audioUrl, module?.type]);

  const toggleCompleted = async () => {
    if (!module) return;
    const nextStatus = !isCompletedState;
    setIsCompletedState(nextStatus);
    await db.cachedModules.update(module.id, { isCompleted: nextStatus });

    // Assign UUID v4 transaction log entry for offline sync queue (FR-14)
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
    // Bug #2: keep raw string in textarea state to avoid live HTML entity corruption;
    // sanitize only when persisting to IndexedDB
    setUserNotesState(notes);
    await db.cachedModules.update(module.id, { userNotes: sanitizeHtml(notes) });
  };

  if (!isOpen || !module) return null;

  const getModuleIcon = () => {
    switch (module.type) {
      case 'audio':
        return <Headphones className="w-5 h-5 text-indigo-500" />;
      case 'syllabus':
        return <Scroll className="w-5 h-5 text-emerald-500" />;
      case 'reading':
      default:
        return <FileText className="w-5 h-5 text-sky-500" />;
    }
  };

  const moduleTypeLabel =
    t.coursesPage?.moduleTypes?.[module.type] || module.type.toUpperCase();

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="module-modal-title"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 ${isFullscreen ? 'p-0' : 'p-4'}`}
    >
      <div
        className={`relative w-full rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col transition-all ${
          isFullscreen ? 'h-full max-w-full rounded-none' : 'max-w-3xl max-h-[90vh]'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {/* Bug #3: hidden HTML5 Audio element — driven by audioRef */}
        <audio
          ref={audioRef}
          onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
          onDurationChange={() => setAudioDuration(audioRef.current?.duration ?? 0)}
          onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
          style={{ display: 'none' }}
        />
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between gap-4 bg-muted/30">
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
              </div>
              <h3 id="module-modal-title" className="text-base font-bold font-heading text-foreground mt-0.5">
                {language === 'ar' && module.titleAr ? module.titleAr : module.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Size Selector */}
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

            {/* Distraction-Free Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              aria-label="Toggle fullscreen reader"
              className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors cursor-pointer"
            >
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Reader'}
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

              {/* Audio Lecture Widget */}
              {module.type === 'audio' && (
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-500/10 via-background to-card border border-indigo-500/20 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
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
                        <Radio className="w-3 h-3 text-indigo-500" />
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
                        const totalSecs = audioDuration > 0
                          ? audioDuration
                          : (module.durationMinutes ?? 45) * 60;
                        const pct = totalSecs > 0 ? Math.min(100, (currentTime / totalSecs) * 100) : 0;
                        return (
                          <>
                            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                              <span>{fmtTime(currentTime)}</span>
                              <span>{fmtTime(totalSecs)}</span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <button
                      onClick={() => {
                        const next = playbackSpeed >= 2.0 ? 1.0 : playbackSpeed + 0.25;
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

              {/* Text / Markdown Content Body */}
              <div className={`prose dark:prose-invert max-w-none text-foreground bg-card p-6 rounded-xl border border-border ${fontSizeClasses[fontSize]}`}>
                <p className="whitespace-pre-line">
                  {module.content ||
                    'Detailed course material stored in local IndexedDB. Students can study this module completely offline.'}
                </p>
              </div>

              {/* Offline Personal Notes Section */}
              <div className="flex flex-col gap-2 p-4 rounded-xl bg-muted/30 border border-border">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-primary" />
                  Personal Study Notes (Saved Offline to IndexedDB)
                </label>
                <textarea
                  value={userNotesState}
                  onChange={e => handleNotesChange(e.target.value)}
                  placeholder="Type your notes or summaries for this module here..."
                  rows={3}
                  className="w-full p-3 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex items-center justify-between gap-4">
          <button
            onClick={toggleCompleted}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isCompletedState
                ? 'bg-emerald-500 text-white border-emerald-600 shadow-xs'
                : 'bg-background border-border text-foreground hover:bg-muted'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isCompletedState ? 'Module Completed ✓' : 'Mark as Read / Completed'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold hover:bg-muted/80 transition-colors cursor-pointer"
          >
            {t.actions.close}
          </button>
        </div>
      </div>
    </div>
  );
};
