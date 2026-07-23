"use client";

import { CheckCircle2, Clock, Circle } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

type Status = 'draft' | 'saved' | 'queued' | 'synced' | 'graded';
const STEPS: Status[] = ['draft', 'saved', 'queued', 'synced', 'graded'];

export function StatusTimeline({ status, grade, gradedBy }: { status: Status; grade?: number | null; gradedBy?: 'instructor' | 'system' | null }) {
  const { t } = useTranslation();
  const currentIndex = STEPS.indexOf(status);

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full mt-4">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={step} className="flex md:flex-col items-center gap-3 md:gap-2 flex-1 relative min-w-0 w-full">
            {/* Line connector desktop */}
            {index > 0 && (
              <div className={`hidden md:block absolute top-3 start-0 h-[2px] -z-10 w-full -ms-[50%] transition-colors ${
                index <= currentIndex ? 'bg-primary' : 'bg-border dark:bg-border-dark'
              }`} />
            )}
            {/* Line connector mobile */}
            {index > 0 && (
              <div className={`md:hidden absolute top-0 start-3 w-[2px] h-full -mt-[50%] -z-10 transition-colors ${
                index <= currentIndex ? 'bg-primary' : 'bg-border dark:bg-border-dark'
              }`} />
            )}

            <div className="bg-surface dark:bg-surface-dark">
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6 text-success" />
              ) : isCurrent ? (
                <div className="relative flex h-6 w-6 items-center justify-center">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-20"></span>
                  <Clock className="relative inline-flex rounded-full h-5 w-5 text-warning" />
                </div>
              ) : (
                <Circle className="w-6 h-6 text-border dark:text-border-dark" />
              )}
            </div>
            <div className="flex flex-col items-start md:items-center text-start md:text-center w-full">
              <span className={`text-sm font-medium ${
                isCompleted || isCurrent ? 'text-text-primary dark:text-text-primary-dark' : 'text-text-secondary dark:text-text-secondary-dark'
              }`}>
                {t(`student.step_${step}`)}
              </span>
              {step === 'graded' && status === 'graded' && grade != null && (
                <div className="mt-1 flex flex-col items-start md:items-center gap-1">
                  <span className="font-bold text-sm">Score: {grade}/100</span>
                  {gradedBy === 'instructor' && (
                    <span className="bg-accent/10 text-accent font-semibold text-xs px-2 py-1 rounded-md border border-accent/20">
                      {t('student.updated_by_instructor')}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
