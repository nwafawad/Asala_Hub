"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { CourseCard } from "../components/CourseCard";
import { useTranslation } from "@/lib/i18n/context";

export default function CoursesPage() {
  const { t } = useTranslation();
  const courses = useLiveQuery(() => db.courses.toArray(), []) || [];
  const modules = useLiveQuery(() => db.modules.toArray(), []) || [];

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark mb-2">
          {t('student.courses_title')}
        </h1>
        <p className="text-text-secondary dark:text-text-secondary-dark text-lg">
          {t('student.courses_subtitle')}
        </p>
      </header>

      {courses.length === 0 ? (
        <div className="text-center py-12 text-text-secondary">
          {t('student.courses_subtitle')}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => {
            const courseModules = modules.filter(m => m.courseId === course.id);
            const isFullyCached = courseModules.length > 0 && courseModules.every(m => m.isCached);
            return (
              <CourseCard
                key={course.id}
                course={course}
                modulesCount={courseModules.length}
                isFullyCached={isFullyCached}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
