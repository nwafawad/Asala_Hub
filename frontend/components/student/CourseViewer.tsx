"use client";

import React, { useState, useEffect } from "react";
import { CourseRead, ModuleRead } from "@/lib/api";
import { LessonNav } from "./LessonNav";
import { LessonContent } from "./LessonContent";

interface CourseViewerProps {
  course: CourseRead;
  modules: ModuleRead[];
  onBackToCatalog: () => void;
}

export function CourseViewer({
  course,
  modules,
  onBackToCatalog,
}: CourseViewerProps) {
  const [selectedModule, setSelectedModule] = useState<ModuleRead | null>(null);
  const [completedModuleIds, setCompletedModuleIds] = useState<string[]>([]);
  
  // Prefetched next module state
  const [prefetchedModule, setPrefetchedModule] = useState<ModuleRead | null>(null);

  // Load completed modules list from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(`asala_completed_${course.id}`);
      if (stored) {
        setCompletedModuleIds(JSON.parse(stored));
      }
    }
    if (modules.length > 0) {
      setSelectedModule(modules[0]);
    }
  }, [modules, course.id]);

  // Prefetch logic: Look ahead to the next module in sequence
  useEffect(() => {
    if (selectedModule && modules.length > 0) {
      const currIdx = modules.findIndex((m) => m.id === selectedModule.id);
      if (currIdx !== -1 && currIdx + 1 < modules.length) {
        const nextMod = modules[currIdx + 1];
        setPrefetchedModule(nextMod);
        console.log(`[Prefetch Engine] Prefetching next module contents: "${nextMod.title}" into local cache.`);
      } else {
        setPrefetchedModule(null);
      }
    }
  }, [selectedModule, modules]);

  const handleSelectModule = (mod: ModuleRead) => {
    setSelectedModule(mod);
  };

  const handleMarkComplete = () => {
    if (!selectedModule) return;
    
    let updated: string[];
    if (completedModuleIds.includes(selectedModule.id)) {
      updated = completedModuleIds.filter((id) => id !== selectedModule.id);
    } else {
      updated = [...completedModuleIds, selectedModule.id];
    }
    
    setCompletedModuleIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`asala_completed_${course.id}`, JSON.stringify(updated));
    }
  };

  const handleNext = () => {
    if (prefetchedModule) {
      setSelectedModule(prefetchedModule);
    }
  };

  const handlePrevious = () => {
    if (selectedModule) {
      const currIdx = modules.findIndex((m) => m.id === selectedModule.id);
      if (currIdx > 0) {
        setSelectedModule(modules[currIdx - 1]);
      }
    }
  };

  const currentModuleIndex = selectedModule ? modules.findIndex((m) => m.id === selectedModule.id) : -1;
  const isFirstModule = currentModuleIndex === 0;
  const isLastModule = currentModuleIndex === modules.length - 1;
  const isCurrentCompleted = selectedModule ? completedModuleIds.includes(selectedModule.id) : false;

  return (
    <div className="space-y-6">
      {/* Immersive Classroom Header */}
      <div className="bg-surface-card p-3 rounded border border-accent-muted flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToCatalog}
            className="text-xs hover:text-text-heading text-accent-muted font-bold cursor-pointer"
          >
            ← Back to Catalog
          </button>
          <span className="text-accent-muted/40">|</span>
          <h2 className="font-heading text-sm font-extrabold text-text-heading">
            Classroom: <span className="underline">{course.title}</span>
          </h2>
        </div>
        
        {/* Course Progress Indicator */}
        {modules.length > 0 && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-accent-muted font-semibold">Progress:</span>
            <div className="w-32 bg-surface-base h-2 rounded-full overflow-hidden border border-accent-muted/10">
              <div 
                className="h-full bg-accent-highlight transition-all duration-300"
                style={{ width: `${(completedModuleIds.length / modules.length) * 100}%` }}
              />
            </div>
            <span className="font-bold text-text-heading">
              {completedModuleIds.length}/{modules.length} Completed
            </span>
          </div>
        )}
      </div>

      {/* Main Workspace split */}
      {modules.length === 0 ? (
        <div className="card py-16 text-center text-accent-muted min-h-[400px] flex flex-col justify-center items-center">
          <p className="font-bold text-sm text-text-heading">No Syllabus Available</p>
          <p className="text-xs mt-1 max-w-xs leading-relaxed">
            The educator has not posted modules inside this course yet. Please check back later.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Navigation Tree sidebar */}
          <div className="lg:col-span-4">
            <LessonNav
              modules={modules}
              selectedModule={selectedModule}
              completedModuleIds={completedModuleIds}
              onSelectModule={handleSelectModule}
            />
          </div>

          {/* Content Focus Area */}
          <div className="lg:col-span-8 space-y-6">
            {selectedModule ? (
              <>
                <LessonContent
                  module={selectedModule}
                  isCompleted={isCurrentCompleted}
                />

                {/* Footer Navigation Bar */}
                <div className="card p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={handlePrevious}
                      disabled={isFirstModule}
                      className="btn-secondary py-2 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1"
                    >
                      <span>←</span> Previous
                    </button>
                    <button
                      onClick={handleNext}
                      disabled={isLastModule}
                      className="btn-secondary py-2 text-xs flex-1 sm:flex-initial flex items-center justify-center gap-1"
                    >
                      Next <span>→</span>
                    </button>
                  </div>

                  <button
                    onClick={handleMarkComplete}
                    className={`w-full sm:w-auto py-2 px-6 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer text-center border ${
                      isCurrentCompleted
                        ? "bg-surface-base border-accent-muted/20 text-accent-muted"
                        : "bg-accent-highlight border-accent-highlight/30 text-text-on-highlight"
                    }`}
                  >
                    {isCurrentCompleted ? "✕ Unmark Complete" : "✓ Mark Lesson Complete"}
                  </button>

                  <div className="text-[10px] text-accent-muted uppercase font-bold tracking-wider shrink-0">
                    Module {currentModuleIndex + 1} of {modules.length}
                  </div>
                </div>
              </>
            ) : (
              <div className="card py-16 text-center text-accent-muted min-h-[400px] flex flex-col justify-center items-center">
                <p className="font-bold text-sm text-text-heading">No Module Selected</p>
                <p className="text-xs mt-1">Select a module layout on the left pane to begin studying.</p>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
export default CourseViewer;
