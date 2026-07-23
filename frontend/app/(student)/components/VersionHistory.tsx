"use client";

import { useState } from "react";
import { History, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { useTranslation } from "@/lib/i18n/context";

export function VersionHistory({ versions, onRestore }: { versions: { content: string; savedAt: string }[]; onRestore: (content: string) => void }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-border dark:border-border-dark rounded-xl overflow-hidden bg-surface dark:bg-surface-dark mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark transition-colors"
      >
        <div className="flex items-center gap-2 text-text-primary dark:text-text-primary-dark font-medium">
          <History className="w-5 h-5" />
          <span>{t('student.version_history')}</span>
        </div>
        {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </button>
      {expanded && (
        <div className="divide-y divide-border dark:divide-border-dark border-t border-border dark:border-border-dark">
          {versions.length === 0 ? (
            <div className="p-4 text-sm text-text-secondary text-center">
              {t('student.version_history')}
            </div>
          ) : (
            versions.map((v, i) => (
              <div key={i} className="flex items-center justify-between p-4 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary dark:text-text-primary-dark">
                    {new Date(v.savedAt).toLocaleString()}
                  </div>
                  <div className="text-xs text-text-secondary dark:text-text-secondary-dark truncate">
                    {v.content.replace(/<[^>]+>/g, '').substring(0, 40) || '...'}
                  </div>
                </div>
                <button
                  onClick={() => onRestore(v.content)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {t('student.version_restore')}
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
