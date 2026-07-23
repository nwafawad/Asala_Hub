"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { useTranslation } from "@/lib/i18n/context";
import { StatusTimeline } from "../components/StatusTimeline";
import Link from "next/link";
import { FileEdit } from "lucide-react";

export default function ProgressPage() {
  const { t } = useTranslation();
  const submissions = useLiveQuery(() => db.submissions.toArray(), []) || [];
  const assignments = useLiveQuery(() => db.assignments.toArray(), []) || [];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary dark:text-text-primary-dark mb-2">
          {t('student.progress_tracker_title')}
        </h1>
        <p className="text-text-secondary dark:text-text-secondary-dark text-lg">
          {t('student.progress_tracker_subtitle')}
        </p>
      </header>

      {submissions.length === 0 ? (
        <div className="text-center py-12 text-text-secondary bg-surface dark:bg-surface-dark rounded-xl border border-border dark:border-border-dark">
          {t('student.courses_subtitle')}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {submissions.map(sub => {
            const assignment = assignments.find(a => a.id === sub.assignmentId);
            const title = assignment?.title || sub.assignmentId;
            return (
              <div key={sub.id} className="bg-surface dark:bg-surface-dark p-6 rounded-xl border border-border dark:border-border-dark shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-text-primary dark:text-text-primary-dark">{title}</h2>
                    {assignment?.dueDate && (
                      <p className="text-sm text-text-secondary mt-1">
                        Due: {new Date(assignment.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/assignments/${sub.assignmentId}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark hover:border-primary/50 text-text-primary dark:text-text-primary-dark rounded-lg transition-colors font-medium text-sm"
                  >
                    <FileEdit className="w-4 h-4 text-primary" />
                    <span>Open</span>
                  </Link>
                </div>
                <StatusTimeline
                  status={sub.syncStatus as any}
                  grade={sub.grade}
                  gradedBy={sub.gradedBy}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
