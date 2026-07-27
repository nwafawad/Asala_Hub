'use client';

import React, { useState } from 'react';
import { type CachedModule } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { useSync } from '@/context/SyncContext';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
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
              <h3 className="text-base font-bold font-heading text-foreground mt-0.5">
                {language === 'ar' && module.titleAr ? module.titleAr : module.title}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex flex-col gap-6">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <Volume2 className="w-4 h-4" />
                      <span>Audio Lecture Player (Offline Intranet Stream)</span>
                    </div>
                    {module.durationMinutes && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {module.durationMinutes} mins
                      </span>
                    )}
                  </div>

                  {/* Audio Controls */}
                  <div className="flex items-center gap-4 bg-card/80 p-3 rounded-xl border border-border">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="p-3 rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5 rtl:rotate-180" />
                      )}
                    </button>

                    <div className="flex-1 flex flex-col gap-1">
                      <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                        <span>{isPlaying ? '04:12' : '00:00'}</span>
                        <span>{module.durationMinutes ? `${module.durationMinutes}:00` : '45:00'}</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                          style={{ width: isPlaying ? '15%' : '0%' }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        setPlaybackSpeed(prev => (prev >= 2.0 ? 1.0 : prev + 0.25))
                      }
                      className="px-2.5 py-1 rounded-lg border border-border bg-background text-[11px] font-mono font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {playbackSpeed}x
                    </button>
                  </div>
                </div>
              )}

              {/* Text / Markdown Body */}
              <div className="prose dark:prose-invert max-w-none text-sm text-foreground leading-relaxed bg-card p-5 rounded-xl border border-border">
                <p className="whitespace-pre-line">
                  {module.content ||
                    'Detailed course material stored in local IndexedDB. Students can study this module completely offline.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-muted/20 flex justify-end">
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
