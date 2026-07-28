'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { startViewTransition } from '@/lib/view-transition';
import { db, seedInitialMockData, type CachedCourse, type CachedModule } from '@/lib/db';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { useStorage } from '@/context/StorageContext';
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
  const { usedMb, quotaMb, usagePercent, daysSinceLastSync, refreshStorageEstimate } = useStorage();
  const { isOfflineSession, token } = useAuth();

  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [modulesMap, setModulesMap] = useState<Record<string, CachedModule[]>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<CachedModule | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);

  const loadCourses = useCallback(async () => {
    try {
      await seedInitialMockData();

      const isOfflineToken = token ? token.startsWith('offline-token-') : false;
      if (typeof window !== 'undefined' && navigator.onLine && !isOfflineSession && !isOfflineToken) {
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
      await refreshStorageEstimate();
    } catch (err) {
      console.error('Error loading courses from IndexedDB:', err);
    } finally {
      setLoading(false);
    }
  }, [refreshStorageEstimate, isOfflineSession, token]);

  const [filterTab, setFilterTab] = useState<'all' | 'downloaded' | 'in_progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'code' | 'title' | 'progress' | 'size'>('code');

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);



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

  const filteredCourses = React.useMemo(() => {
    let list = courses.filter(c => {
      const titleMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.titleAr && c.titleAr.includes(searchQuery));
      if (!titleMatch) return false;

      const mods = modulesMap[c.id] || [];
      const cachedCount = mods.filter(m => m.isCachedOffline).length;
      const completedCount = mods.filter(m => m.isCompleted).length;
      const totalCount = mods.length || 1;

      if (filterTab === 'downloaded') return c.isCachedOffline || cachedCount > 0;
      if (filterTab === 'in_progress') return completedCount > 0 && completedCount < totalCount;
      if (filterTab === 'completed') return completedCount === totalCount && totalCount > 0;
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'size') return b.sizeMb - a.sizeMb;
      if (sortBy === 'progress') {
        const modsA = modulesMap[a.id] || [];
        const modsB = modulesMap[b.id] || [];
        const pctA = modsA.length ? (modsA.filter(m => m.isCompleted).length / modsA.length) : 0;
        const pctB = modsB.length ? (modsB.filter(m => m.isCompleted).length / modsB.length) : 0;
        return pctB - pctA;
      }
      return a.code.localeCompare(b.code);
    });
  }, [courses, modulesMap, searchQuery, filterTab, sortBy]);

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
            loadCourses();
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

        {/* IndexedDB Storage Quota Meter & 30-Day Offline Duration Warning (FR-18, NFR-13) */}
        <div className="p-3.5 rounded-xl bg-muted/40 border border-border flex flex-col gap-2 min-w-[260px]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-primary" />
              {t.coursesPage.storageUsage}
            </span>
            <span className="text-muted-foreground font-mono">
              {usedMb} MB / {quotaMb} MB
            </span>
          </div>
          <div
            className="w-full h-2 rounded-full bg-muted overflow-hidden"
            role="meter"
            aria-label="IndexedDB Storage Quota Meter"
            aria-valuenow={usedMb}
            aria-valuemin={0}
            aria-valuemax={quotaMb}
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                usagePercent > 90
                  ? 'bg-rose-500'
                  : usagePercent > 70
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          {daysSinceLastSync > 30 && (
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              ⚠️ Offline duration: {daysSinceLastSync} days (Limit: 30 days). Connect to intranet to sync.
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              onClick={async () => {
                await db.transactionLogs.where('status').equals('synced').delete();
                showToast('Storage Optimization', 'success', 'Purged synced logs to free space.');
                await refreshStorageEstimate();
                await loadCourses();
              }}
              className="text-[10px] font-mono text-muted-foreground hover:text-rose-500 underline cursor-pointer"
              aria-label="Purge stale synced storage"
            >
              Purge Stale Storage
            </button>
          </div>
        </div>
      </div>

      {/* Filter Tabs, Search & Sort Control Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto" role="tablist" aria-label="Course Filter Tabs">
          <button
            role="tab"
            aria-selected={filterTab === 'all'}
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Courses ({courses.length})
          </button>
          <button
            role="tab"
            aria-selected={filterTab === 'downloaded'}
            onClick={() => setFilterTab('downloaded')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'downloaded'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Downloaded ({courses.filter(c => c.isCachedOffline || (modulesMap[c.id] || []).some(m => m.isCachedOffline)).length})
          </button>
          <button
            role="tab"
            aria-selected={filterTab === 'in_progress'}
            onClick={() => setFilterTab('in_progress')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'in_progress'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            In Progress
          </button>
          <button
            role="tab"
            aria-selected={filterTab === 'completed'}
            onClick={() => setFilterTab('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'completed'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Completed
          </button>
        </div>

        {/* Search & Sort Input Controls */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <label htmlFor="course-search-input" className="sr-only">Search courses</label>
            <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              id="course-search-input"
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search within enrolled courses & modules..."
              aria-label="Search courses"
              className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
          </div>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            aria-label="Sort courses by"
            className="h-10 px-3 rounded-xl border border-border bg-card text-xs text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
          >
            <option value="code">Sort by Code</option>
            <option value="title">Sort by Title</option>
            <option value="progress">Sort by Progress</option>
            <option value="size">Sort by Size</option>
          </select>
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
                  onClick={() => {
                    startViewTransition(() => {
                      setSelectedCourseId(course.id);
                    });
                  }}
                  style={{ viewTransitionName: `course-card-${course.id}` }}
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

                    {/* Partial Offline Cache & Academic Progress Meters on Card */}
                    <div className="flex flex-col gap-2 pt-2">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-primary" />
                            {cachedModsCount} of {totalModsCount} Cached Offline
                          </span>
                          <span className="font-mono">{cachePct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-primary/70 rounded-full transition-all duration-300"
                            style={{ width: `${cachePct}%` }}
                          />
                        </div>
                      </div>

                      {(() => {
                        const completedCount = mods.filter(m => m.isCompleted).length;
                        const compPct = Math.round((completedCount / totalModsCount) * 100);
                        return (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                Academic Progress ({completedCount}/{totalModsCount})
                              </span>
                              <span className="font-mono font-bold text-foreground">{compPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                                style={{ width: `${compPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {totalModsCount} {t.coursesPage.modules}
                    </span>

                    <div className="flex items-center gap-2">
                      {cachePct < 100 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            toggleCourseCache(course);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
                          title="Cache all remaining modules for offline access"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>
                            {cachePct > 0
                              ? `Download Remaining (${totalModsCount - cachedModsCount})`
                              : t.coursesPage.downloadOffline}
                          </span>
                        </button>
                      )}

                      {cachedModsCount > 0 && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            // Evict cache for this course
                            db.cachedCourses.update(course.id, { isCachedOffline: false }).then(async () => {
                              const courseMods = modulesMap[course.id] || [];
                              await Promise.all(
                                courseMods.map(m => db.cachedModules.update(m.id, { isCachedOffline: false }))
                              );
                              await loadCourses();
                              showToast('Cache Evicted', 'info', `${course.code} offline package evicted.`);
                            });
                          }}
                          className="p-1.5 rounded-xl bg-muted text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                          title="Evict local offline package"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
