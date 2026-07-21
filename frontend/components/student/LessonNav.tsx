"use client";

import React from "react";
import { ModuleSyllabusRead } from "@/lib/api";

interface LessonNavProps {
  modules: ModuleSyllabusRead[];
  selectedModule: ModuleSyllabusRead | null;
  completedModuleIds: string[];
  onSelectModule: (module: ModuleSyllabusRead) => void;
}

export function LessonNav({
  modules,
  selectedModule,
  completedModuleIds,
  onSelectModule,
}: LessonNavProps) {
  return (
    <div className="card h-full flex flex-col min-h-[400px]">
      <div className="border-b border-accent-muted/15 pb-4 mb-4">
        <h2 className="font-heading text-xs font-bold text-text-heading uppercase tracking-wider">
          Syllabus Content
        </h2>
        <p className="text-[10px] text-accent-muted mt-0.5">Navigate lessons & content formats.</p>
      </div>

      <div className="space-y-1.5 flex-grow overflow-y-auto max-h-[380px] pr-1">
        {modules.map((mod) => {
          const isActive = selectedModule?.id === mod.id;
          const isCompleted = completedModuleIds.includes(mod.id);

          return (
            <button
              key={mod.id}
              onClick={() => onSelectModule(mod)}
              className={`w-full text-left p-3 rounded-lg border text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-between gap-3 ${
                isActive
                  ? "border-text-heading bg-text-heading/5 text-text-heading"
                  : "border-accent-muted/10 bg-surface-card hover:bg-surface-base text-text-body"
              }`}
            >
              <div className="flex items-center gap-2 pr-2">
                <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-extrabold ${
                  isCompleted
                    ? "bg-accent-highlight text-text-on-highlight"
                    : "bg-accent-muted/10 text-accent-muted"
                }`}>
                  {isCompleted ? "✓" : mod.order_index}
                </span>
                <span className="line-clamp-1">{mod.title}</span>
              </div>
              <span className="badge-type shrink-0">{mod.content_type}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default LessonNav;
