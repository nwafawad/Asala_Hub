'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { db, seedInitialMockData, type CachedCourse } from '@/lib/db';
import { api } from '@/lib/api';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { BookOpen, HardDrive, Download, Trash2, CheckCircle2, Search, User } from 'lucide-react';

export const CourseBrowser: React.FC = () => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();
  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [storageEstimate, setStorageEstimate] = useState<{ usedMb: number; quotaMb: number }>({
    usedMb: 18.4,
    quotaMb: 2048,
  });

  const loadCourses = useCallback(async () => {
    try {
      await seedInitialMockData();

      if (navigator.onLine) {
        try {
          const res = await api.get('/courses/');
          if (res.data && Array.isArray(res.data)) {
            const apiCourses: CachedCourse[] = res.data.map((c: any) => ({
              id: c.id,
              title: c.title,
              code: c.code || `CS${Math.floor(Math.random() * 899 + 100)}`,
              educatorName: c.educator_name || 'Asala Educator',
              moduleCount: c.module_count || 3,
              isCachedOffline: true,
              sizeMb: 14.5,
              updatedAt: c.updated_at || new Date().toISOString(),
            }));
            await db.cachedCourses.bulkPut(apiCourses);
          }
        } catch (apiErr) {
          console.warn('Backend courses API offline, reading from IndexedDB');
        }
      }

      const allCourses = await db.cachedCourses.toArray();
      setCourses(allCourses);

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
      console.error('Error loading courses:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const toggleCacheStatus = async (course: CachedCourse) => {
    const newStatus = !course.isCachedOffline;
    await db.cachedCourses.update(course.id, { isCachedOffline: newStatus });
    await loadCourses();

    if (newStatus) {
      showToast(t.coursesPage.cachedOffline, 'success', `${course.code} package saved to IndexedDB.`);
    } else {
      showToast('Cache Evicted', 'info', `${course.code} package removed to free space.`);
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

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
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

      {/* Search Input Bar */}
      <div className="relative w-full max-w-md">
        <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter courses by name or code..."
          className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
        />
      </div>

      {/* Course Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          filteredCourses.map(course => (
            <div
              key={course.id}
              className="p-5 rounded-2xl border border-border bg-card shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-5 group"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase tracking-wider">
                    {course.code}
                  </span>
                  <StatusPill
                    label={course.isCachedOffline ? `${course.sizeMb} MB Offline` : t.coursesPage.onlineOnly}
                    variant={course.isCachedOffline ? 'success' : 'neutral'}
                  />
                </div>

                <div>
                  <h3 className="text-base font-bold font-heading text-foreground group-hover:text-primary transition-colors">
                    {language === 'ar' && course.titleAr ? course.titleAr : course.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5" />
                    {course.educatorName}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">
                  {course.moduleCount} {t.coursesPage.modules}
                </span>

                <button
                  onClick={() => toggleCacheStatus(course)}
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
          ))
        )}
      </div>
    </div>
  );
};
