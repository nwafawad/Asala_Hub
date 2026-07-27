'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { db, seedInitialMockData, type CachedCourse, type CachedModule } from '@/lib/db';
import { api } from '@/lib/api';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { CourseDetail } from '@/components/student/CourseDetail';
import { ModuleViewerModal } from '@/components/student/ModuleViewerModal';
import {
  BookOpen,
  HardDrive,
  Download,
  Trash2,
  Search,
  User,
  FolderOpen,
  RefreshCw,
  Layers,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';

interface CourseBrowserProps {
  onOpenAssignment?: (assignmentId: string) => void;
}

export const CourseBrowser: React.FC<CourseBrowserProps> = ({ onOpenAssignment }) => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();
  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [modulesMap, setModulesMap] = useState<Record<string, CachedModule[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<CachedModule | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: number; quotaMb: number }>({
    usedMb: 18.4,
    quotaMb: 2048,
  });

  const loadCourses = useCallback(async () => {
    try {
      await seedInitialMockData();

      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await api.get('/courses/');
          if (res.data && Array.isArray(res.data)) {
            const apiCourses: CachedCourse[] = res.data.map((c: any) => ({
              id: c.id,
              title: c.title,
              code: c.code || `CS${Math.floor(Math.random() * 899 + 100)}`,
              educatorName: c.educator_name || 'Asala Educator',
              moduleCount: c.module_count || 4,
              isCachedOffline: false,
              sizeMb: 14.5,
              updatedAt: c.updated_at || new Date().toISOString(),
            }));
            await db.cachedCourses.bulkPut(apiCourses);
          }
        } catch (apiErr) {
          console.warn('Backend courses API offline, using IndexedDB local store');
        }
      }

      // Offline Cold Start: Read instantly from IndexedDB cache
      const [allCourses, allModules] = await Promise.all([
        db.cachedCourses.toArray(),
        db.cachedModules.toArray(),
      ]);

      const grouped: Record<string, CachedModule[]> = {};
      allModules.forEach(mod => {
        if (!grouped[mod.courseId]) grouped[mod.courseId] = [];
        grouped[mod.courseId].push(mod);
      });

      setCourses(allCourses);
      setModulesMap(grouped);

      if (typeof window !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        if (estimate.usage && estimate.quota) {
          setStorageEstimate({
            usedMb: +(estimate.usage / (1024 * 1024)).toFixed(1),
            quotaMb: +(estimate.quota / (1024 * 1024)).toFixed(0),
          });
        }
      }
    } catch (err) {
      console.error('Error loading courses from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  // "/" Keyboard shortcut listener for focusing search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleCourseCache = async (course: CachedCourse) => {
    const newStatus = !course.isCachedOffline;
    await db.cachedCourses.update(course.id, { isCachedOffline: newStatus });

    // Also update all modules for this course
    const courseMods = modulesMap[course.id] || [];
    await Promise.all(
      courseMods.map(m => db.cachedModules.update(m.id, { isCachedOffline: newStatus }))
    );

    await loadCourses();

    if (newStatus) {
      showToast(t.coursesPage.cachedOffline, 'success', `${course.code} package and modules saved to IndexedDB.`);
    } else {
      showToast('Cache Evicted', 'info', `${course.code} package removed to free local space.`);
    }
  };

  const toggleModuleCache = async (moduleItem: CachedModule) => {
    const newStatus = !moduleItem.isCachedOffline;
    await db.cachedModules.update(moduleItem.id, { isCachedOffline: newStatus });

    // Update active module state if currently open in modal
    if (activeModule && activeModule.id === moduleItem.id) {
      setActiveModule({ ...activeModule, isCachedOffline: newStatus });
    }

    await loadCourses();

    if (newStatus) {
      showToast('Module Downloaded', 'success', `${moduleItem.title} cached offline.`);
    } else {
      showToast('Module Evicted', 'info', `${moduleItem.title} removed from offline cache.`);
    }
  };

  const handleSelectModule = (mod: CachedModule) => {
    if (mod.type === 'assignment') {
      if (onOpenAssignment) {
        onOpenAssignment(mod.assignmentId || 'assign-1');
      } else {
        showToast('Assignment Selected', 'info', `Navigating to ${mod.title}`);
      }
    } else {
      setActiveModule(mod);
      setIsViewerOpen(true);
    }
  };

  const filteredCourses = React.useMemo(
    () =>
      courses.filter(
        c =>
          c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (c.titleAr && c.titleAr.includes(searchQuery))
      ),
    [courses, searchQuery]
  );

  const selectedCourse = courses.find(c => c.id === selectedCourseId);
  const selectedCourseModules = selectedCourseId ? modulesMap[selectedCourseId] || [] : [];

  // Detail View Mode
  if (selectedCourse) {
    return (
      <>
        <CourseDetail
          course={selectedCourse}
          modules={selectedCourseModules}
          onBack={() => setSelectedCourseId(null)}
          onSelectModule={handleSelectModule}
          onToggleModuleCache={toggleModuleCache}
          onToggleCourseCache={toggleCourseCache}
        />
        <ModuleViewerModal
          module={activeModule}
          isOpen={isViewerOpen}
          onClose={() => {
            setIsViewerOpen(false);
            setActiveModule(null);
          }}
          onDownloadModule={toggleModuleCache}
        />
      </>
    );
  }

  // Grid View Mode
  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner & Storage Meter */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold font-heading text-foreground flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            {t.coursesPage.title}
          </h2>
          <p className="text-xs text-muted-foreground">{t.coursesPage.subtitle}</p>
        </div>

        {/* IndexedDB Storage Quota Meter */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col gap-2 min-w-[260px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              {t.coursesPage.storageUsage}
            </span>
            <span className="text-muted-foreground font-mono">
              {storageEstimate.usedMb} MB / {storageEstimate.quotaMb} MB
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, (storageEstimate.usedMb / storageEstimate.quotaMb) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Search Input Bar & Refresh */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Zero Enrolled Courses Empty State */}
      {!loading && filteredCourses.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center gap-4 my-8">
          <div className="p-4 rounded-full bg-muted text-muted-foreground">
            <FolderOpen className="w-10 h-10" />
          </div>
          <div className="flex flex-col gap-1 max-w-sm">
            <h3 className="text-lg font-bold font-heading text-foreground">
              {t.coursesPage.emptyTitle}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t.coursesPage.emptySubtitle}
            </p>
          </div>
          <button
            onClick={() => loadCourses()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs mt-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Re-Sync Enrolled Courses</span>
          </button>
        </div>
      ) : (
        /* Course Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            filteredCourses.map(course => {
              const mods = modulesMap[course.id] || [];
              const cachedModsCount = mods.filter(m => m.isCachedOffline).length;
              const totalModsCount = mods.length || course.moduleCount || 1;
              const cachePct = Math.round((cachedModsCount / totalModsCount) * 100);

              const ChevronIcon = language === 'ar' ? ChevronLeft : ChevronRight;

              return (
                <div
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between gap-5 group cursor-pointer"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
                        {course.code}
                      </span>
                      <StatusPill
                        label={
                          cachePct === 100
                            ? t.coursesPage.cachedOffline
                            : cachePct > 0
                            ? `${cachedModsCount}/${totalModsCount} ${t.coursesPage.partiallySynced}`
                            : t.coursesPage.onlineOnly
                        }
                        variant={
                          cachePct === 100
                            ? 'success'
                            : cachePct > 0
                            ? 'warning'
                            : 'neutral'
                        }
                      />
                    </div>

                    <div>
                      <h3 className="text-base font-bold font-heading text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{language === 'ar' && course.titleAr ? course.titleAr : course.title}</span>
                        <ChevronIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" />
                        {course.educatorName}
                      </p>
                    </div>

                    {/* Partial Offline Cache Progress Meter on Card */}
                    <div className="flex flex-col gap-1.5 pt-2">
                      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-primary" />
                          {cachedModsCount} of {totalModsCount} Modules Ready
                        </span>
                        <span className="font-mono">{cachePct}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-300"
                          style={{ width: `${cachePct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {totalModsCount} {t.coursesPage.modules}
                    </span>

                    <button
                      onClick={e => {
                        e.stopPropagation();
                        toggleCourseCache(course);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {course.isCachedOffline ? (
                        <>
                          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                          <span>{t.coursesPage.evictCache}</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span>{t.coursesPage.downloadOffline}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Module Viewer Modal when opened from Grid or Detail */}
      <ModuleViewerModal
        module={activeModule}
        isOpen={isViewerOpen}
        onClose={() => {
          setIsViewerOpen(false);
          setActiveModule(null);
        }}
        onDownloadModule={toggleModuleCache}
      />
    </div>
  );
};
