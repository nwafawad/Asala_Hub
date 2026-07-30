'use client';

import React from 'react';
import { X, Save, Eye, Edit3, Sparkles, BookOpen } from 'lucide-react';
import { CachedModule } from '@/lib/db';

interface StudioToolbarProps {
  title: string;
  setTitle: (val: string) => void;
  courseTitle?: string;
  courseCode?: string;
  type: CachedModule['type'];
  setType: (val: CachedModule['type']) => void;
  activeStudioTab: 'edit' | 'preview';
  setActiveStudioTab: (tab: 'edit' | 'preview') => void;
  activeLangTab: 'en' | 'ar';
  setActiveLangTab: (lang: 'en' | 'ar') => void;
  isSaving: boolean;
  onSave: () => void;
  onClose: () => void;
}

export const StudioToolbar: React.FC<StudioToolbarProps> = ({
  title,
  setTitle,
  courseTitle,
  courseCode,
  type,
  setType,
  activeStudioTab,
  setActiveStudioTab,
  activeLangTab,
  setActiveLangTab,
  isSaving,
  onSave,
  onClose,
}) => {
  return (
    <div className="p-6 border-b border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary">
            Curriculum Authoring Studio
          </span>
          {courseTitle && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-3 h-3" />
              <span>Target: {courseCode ? `[${courseCode}] ` : ''}{courseTitle}</span>
            </span>
          )}
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Offline Sync Auto-Saving Enabled
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Enter Module Title (English)..."
            className="text-xl font-bold font-heading bg-transparent text-foreground placeholder:text-muted-foreground border-b border-transparent hover:border-border focus:border-primary focus:outline-none transition-colors w-full max-w-xl"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {/* Language Switcher Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted border border-border">
          <button
            onClick={() => setActiveLangTab('en')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeLangTab === 'en'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            EN (Primary)
          </button>
          <button
            onClick={() => setActiveLangTab('ar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeLangTab === 'ar'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            AR (العربية)
          </button>
        </div>

        {/* Edit vs Preview Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-muted border border-border">
          <button
            onClick={() => setActiveStudioTab('edit')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeStudioTab === 'edit'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>
          <button
            onClick={() => setActiveStudioTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeStudioTab === 'preview'
                ? 'bg-card text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Eye className="w-3.5 h-3.5 text-primary" />
            <span>Student Preview</span>
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={onSave}
          disabled={isSaving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-accent-hover text-primary-foreground text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'Saving…' : 'Save Module'}</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-muted hover:bg-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
