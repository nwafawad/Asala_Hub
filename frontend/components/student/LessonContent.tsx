"use client";

import React from "react";
import { ModuleRead } from "@/lib/api";
import { ContentBlock } from "@/components/shared/ContentBlock";

interface LessonContentProps {
  module: ModuleRead;
  isCompleted: boolean;
}

export function LessonContent({ module, isCompleted }: LessonContentProps) {
  return (
    <div className="card h-full flex flex-col min-h-[400px]">
      {/* Lesson Heading Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-accent-muted/15 mb-6 gap-3">
        <div>
          <span className="text-[10px] font-bold text-accent-muted uppercase tracking-wider block">
            Lesson {module.order_index}
          </span>
          <h2 className="font-heading text-lg font-extrabold text-text-heading mt-0.5">
            {module.title}
          </h2>
        </div>

        {/* Completion badge */}
        <div className="flex items-center gap-2">
          {isCompleted ? (
            <span className="badge-success">
              ✓ Completed
            </span>
          ) : (
            <span className="text-[10px] font-bold text-accent-muted uppercase tracking-wider bg-surface-base px-2.5 py-1 rounded border border-accent-muted/15">
              Pending completion
            </span>
          )}
        </div>
      </div>

      {/* Renders Content Blocks (Videos, Rich document text) */}
      <div className="flex-grow bg-surface-card rounded-lg overflow-y-auto">
        <ContentBlock content={module.content} contentType={module.content_type} />
      </div>
    </div>
  );
}
export default LessonContent;
