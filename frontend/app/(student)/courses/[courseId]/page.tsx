"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTranslation } from "@/lib/i18n/context";
import { ModuleRow } from "../../components/ModuleRow";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { use } from "react";

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
  const { t, locale } = useTranslation();
  const resolvedParams = use(params);
  const courseId = resolvedParams.courseId;

  const course = useLiveQuery(() => db.courses.get(courseId), [courseId]);
  const modules = useLiveQuery(
    () => db.modules.where({ courseId }).sortBy('orderIndex'),
    [courseId]
  ) || [];

  if (!course) return null;

  const isRTL = locale === 'ar';
  const BackIcon = isRTL ? ArrowRight : ArrowLeft;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <Link href="/courses" className="inline-flex items-center gap-2 text-primary hover:underline mb-6 font-medium">
        <BackIcon className="w-4 h-4" />
        {t('student.back_to_courses')}
      </Link>

      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark mb-3">
          {course.title}
        </h1>
        <p className="text-text-secondary dark:text-text-secondary-dark text-lg leading-relaxed">
          {course.description}
        </p>
      </header>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-text-primary dark:text-text-primary-dark">
          {t('student.courses_title')}
        </h2>
        {modules.length === 0 ? (
          <p className="text-text-secondary italic">{t('student.courses_subtitle')}</p>
        ) : (
          <div className="flex flex-col gap-1">
            {modules.map(module => (
              <ModuleRow key={module.id} module={module} />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-surface-elevated dark:bg-surface-elevated-dark rounded-xl border border-border dark:border-border-dark flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-text-primary dark:text-text-primary-dark">{t('nav.assignments')}</h3>
          <p className="text-sm text-text-secondary">Ready to test your knowledge?</p>
        </div>
        <Link href={`/assignments/draft-${courseId}`} className="px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors whitespace-nowrap">
          {t('student.assignment_workspace')}
        </Link>
      </div>
    </div>
  );
}
