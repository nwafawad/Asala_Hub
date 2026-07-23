"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/context";
import type { LocalCourse } from "@/lib/db";

const COLORS = ["#1F4B4A", "#2A6463", "#C97B3F", "#3F7A5C", "#163836", "#A86630"];

export function CourseCard({ course, modulesCount, isFullyCached }: { course: LocalCourse; modulesCount: number; isFullyCached: boolean }) {
  const { t } = useTranslation();
  const color = COLORS[(course.colorIndex || 0) % COLORS.length];
  const progress = 60; // Mock progress for UI

  return (
    <Link href={`/courses/${course.id}`} className="block rounded-xl border border-border dark:border-border-dark overflow-hidden hover:shadow-lg transition-shadow bg-surface dark:bg-surface-dark">
      <div style={{ backgroundColor: color }} className="h-24 rounded-t-xl p-4 flex justify-end items-start">
        {isFullyCached ? (
          <span className="bg-success/90 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
            {t('student.cached_badge')}
          </span>
        ) : (
          <span className="bg-black/40 text-white/90 text-xs px-2 py-1 rounded-full">
            {t('student.not_cached_badge')}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark mb-1">{course.title}</h3>
        <p className="text-sm text-text-secondary dark:text-text-secondary-dark line-clamp-2 mb-4">{course.description}</p>
        <div className="mb-2">
          <div className="h-2 bg-border dark:bg-border-dark rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="text-xs text-text-secondary dark:text-text-secondary-dark font-medium">
          {t('student.modules_count', { count: modulesCount })}
        </div>
      </div>
    </Link>
  );
}
