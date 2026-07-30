'use client';

import React from 'react';
import { type CachedCourse, type CachedModule, isAssignmentModule } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Headphones,
  FileText,
  Scroll,
  ClipboardList,
  Download,
  CheckCircle2,
  HardDrive,
  User,
  Layers,
  WifiOff,
  Sparkles,
  Calendar,
  Award,
} from 'lucide-react';

interface CourseDetailProps {
  course: CachedCourse;
  modules: CachedModule[];
  onBack: () => void;
  onSelectModule: (module: CachedModule) => void;
  onToggleModuleCache: (module: CachedModule) => void;
  onToggleCourseCache: (course: CachedCourse) => void;
}

export const CourseDetail: React.FC<CourseDetailProps> = ({
  course,
  modules,
  onBack,
  onSelectModule,
  onToggleModuleCache,
  onToggleCourseCache,
}) => {
  const { t, language } = useI18n();

  // Sort modules by sequence order
  const sortedModules = React.useMemo(() => {
    return [...modules].sort((a, b) => a.sequenceOrder - b.sequenceOrder);
  }, [modules]);

  const cachedCount = sortedModules.filter(m => m.isCachedOffline).length;
  const totalCount = sortedModules.length || course.moduleCount || 1;
  const cachePercentage = Math.round((cachedCount / totalCount) * 100);

  const getModuleIcon = (mod: CachedModule) => {
    if (isAssignmentModule(mod)) {
      return <ClipboardList className="w-5 h-5 text-amber-500" />;
    }
    switch (mod.type) {
      case 'audio':
        return <Headphones className="w-5 h-5 text-indigo-500" />;
      case 'syllabus':
        return <Scroll className="w-5 h-5 text-emerald-500" />;
      case 'reading':
      default:
        return <FileText className="w-5 h-5 text-sky-500" />;
    }
  };

  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Top Header Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-xs"
        >
          <BackIcon className="w-4 h-4 text-primary" />
          <span>{t.coursesPage.backToCourses}</span>
        </button>

        <InfoTooltip
          title={course.isCachedOffline ? t.coursesPage.cachedOffline : t.coursesPage.partiallySynced}
          content={
            course.isCachedOffline
              ? 'All modules and media resources in this course are fully downloaded and available offline.'
              : 'Some modules in this course are cached locally for offline study.'
          }
          position="bottom"
        />
      </div>

      {/* Course Title & Description Header Banner */}
      <div
        style={{ viewTransitionName: `course-card-${course.id}` }}
        className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col gap-6"
      >
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
                {course.code}
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-muted-foreground" />
                {course.educatorName}
              </span>
            </div>

            <h1 className="text-2xl font-bold font-heading text-foreground">
              {language === 'ar' && course.titleAr ? course.titleAr : course.title}
            </h1>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">
              Structured sequence of offline readings, audio lectures, syllabus materials, and offline-first assignments.
            </p>
          </div>

          <button
            onClick={() => onToggleCourseCache(course)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-background text-xs font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer self-start"
          >
            <Download className="w-4 h-4 text-primary" />
            <span>
              {course.isCachedOffline
                ? `${course.sizeMb} MB Cached`
                : t.coursesPage.downloadOffline}
            </span>
          </button>
        </div>

        {/* Dual Progress Meter (Offline Cache & Academic Completion) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
          {/* Offline Cache Progress Meter */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-primary" />
                {t.coursesPage.cacheProgress}
              </span>
              <span className="text-xs font-mono font-bold text-primary">
                {cachedCount} / {totalCount} {t.coursesPage.modules} ({cachePercentage}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${cachePercentage}%` }}
              />
            </div>
          </div>

          {/* Academic Completion Meter */}
          {(() => {
            const completedCount = sortedModules.filter(m => m.isCompleted).length;
            const completedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            return (
              <div className="p-4 rounded-xl bg-muted/30 border border-border flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                    {t.coursesPage.academicProgress}
                  </span>
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {completedCount} / {totalCount} Completed ({completedPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${completedPercentage}%` }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Module Sequence List Section */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold font-heading text-foreground flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            {t.coursesPage.modules} Sequence ({sortedModules.length})
          </h2>
          <span className="text-xs text-muted-foreground">
            Tap any row to view module content or workspace
          </span>
        </div>

        {/* Vertical Module List */}
        <div className="flex flex-col gap-3">
          {sortedModules.map((mod, idx) => {
            const isCached = mod.isCachedOffline;
            const isAssign = isAssignmentModule(mod);

            return (
              <div
                key={mod.id}
                onClick={() => onSelectModule(mod)}
                className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group ${
                  isAssign
                    ? 'bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50 hover:shadow-md'
                    : isCached
                    ? 'bg-card border-border hover:border-primary/40 hover:shadow-md'
                    : 'bg-muted/20 border-border/60 opacity-70 hover:opacity-90 hover:bg-muted/40'
                }`}
              >
                {/* Icon & Title Details */}
                <div className="flex items-center gap-4">
                  <div
                    className={`p-3 rounded-xl border shadow-xs transition-transform ${
                      isAssign
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500 group-hover:scale-105'
                        : isCached
                        ? 'bg-background border-border group-hover:scale-105'
                        : 'bg-muted/40 border-border/50'
                    }`}
                  >
                    {getModuleIcon(mod)}
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                          isAssign
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {isAssign ? 'Graded Assignment' : `Module #${mod.sequenceOrder || idx + 1}`}
                      </span>

                      {!isAssign && (
                        <span className="text-xs text-muted-foreground capitalize">
                          {(t.coursesPage?.moduleTypes as Record<string, string>)?.[mod.type] || mod.type}
                        </span>
                      )}

                      {isAssign && mod.dueDate && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(mod.dueDate).toLocaleDateString()}
                        </span>
                      )}

                      {mod.points && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 inline-flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          {mod.points} pts
                        </span>
                      )}

                      {mod.isCompleted && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Completed
                        </span>
                      )}
                    </div>

                    <h3
                      className={`text-sm font-bold font-heading transition-colors ${
                        isAssign
                          ? 'text-foreground group-hover:text-amber-600'
                          : isCached
                          ? 'text-foreground group-hover:text-primary'
                          : 'text-muted-foreground group-hover:text-foreground'
                      }`}
                    >
                      {language === 'ar' && mod.titleAr ? mod.titleAr : mod.title}
                    </h3>

                    {/* Uncached Inline Label */}
                    {!isCached && !isAssign && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium inline-flex items-center gap-1 mt-0.5">
                        <WifiOff className="w-3.5 h-3.5" />
                        {t.coursesPage.notYetDownloaded}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right Side Action Button */}
                <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40 w-full sm:w-auto">
                  {isAssign ? (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        onSelectModule(mod);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 shadow-xs transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-4 h-4" />
                      <span>Open Workspace</span>
                    </button>
                  ) : (
                    <>
                      <span className="text-xs font-mono text-muted-foreground">
                        {mod.sizeMb} MB
                      </span>

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onToggleModuleCache(mod);
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
                          isCached
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted'
                        }`}
                      >
                        {isCached ? (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>{t.coursesPage.cachedOfflineLabel}</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                            <span>{t.coursesPage.downloadModule}</span>
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
