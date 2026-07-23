"use client";

import { FileText, Video, Volume2, CheckCircle2, Download, CloudOff } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";
import type { LocalModule } from "@/lib/db";

export function ModuleRow({ module }: { module: LocalModule }) {
  const { t } = useTranslation();

  const Icon = module.contentType === 'video' ? Video : module.contentType === 'audio' ? Volume2 : FileText;

  return (
    <div className={`p-4 rounded-xl border mb-3 flex items-center justify-between transition-colors min-h-[56px] ${
      module.isCached
        ? 'bg-surface-elevated dark:bg-surface-elevated-dark border-border dark:border-border-dark hover:border-primary/50'
        : 'bg-surface/50 dark:bg-surface-dark/50 border-border/50 opacity-60'
    }`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-text-secondary" />
        <div>
          <h4 className="font-medium text-text-primary dark:text-text-primary-dark">{module.title}</h4>
          {!module.isCached && (
            <p className="text-xs text-text-secondary mt-0.5">
              {t('student.not_cached_msg')}
            </p>
          )}
        </div>
      </div>
      <div>
        {module.isCached ? (
          <span title="Downloaded"><CheckCircle2 className="w-5 h-5 text-success" /></span>
        ) : (
          <span title="Not Downloaded"><Download className="w-5 h-5 text-text-secondary" /></span>
        )}
      </div>
    </div>
  );
}
