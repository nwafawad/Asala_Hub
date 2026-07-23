"use client";

import { useEffect, useState } from "react";
import { RefreshCw, Check } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function AutosaveIndicator({ lastSavedAt, isSaving }: { lastSavedAt: Date | null; isSaving: boolean }) {
  const { t } = useTranslation();
  const [secondsAgo, setSecondsAgo] = useState(0);

  useEffect(() => {
    if (!lastSavedAt || isSaving) return;
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastSavedAt.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastSavedAt, isSaving]);

  useEffect(() => {
    if (!isSaving && lastSavedAt) {
      setSecondsAgo(Math.floor((Date.now() - lastSavedAt.getTime()) / 1000));
    }
  }, [isSaving, lastSavedAt]);

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary dark:text-text-secondary-dark">
      {isSaving ? (
        <>
          <RefreshCw className="w-[14px] h-[14px] animate-spin" />
          <span>{t('student.autosave_saving')}</span>
        </>
      ) : lastSavedAt ? (
        <>
          <Check className="w-[14px] h-[14px] text-success" />
          <span>{t('student.autosave_saved', { time: secondsAgo + 's' })}</span>
        </>
      ) : null}
    </div>
  );
}
