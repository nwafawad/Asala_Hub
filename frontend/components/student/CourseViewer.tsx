"use client";

import React, { useState, useEffect } from "react";
import { api, CourseRead, ModuleRead, ModuleSyllabusRead } from "@/lib/api";
import { LessonNav } from "./LessonNav";
import { LessonContent } from "./LessonContent";

interface CourseViewerProps {
  course: CourseRead;
  modules: ModuleSyllabusRead[];
  onBackToCatalog: () => void;
}

export function CourseViewer({
  course,
  modules,
  onBackToCatalog,
}: CourseViewerProps) {
  // The sidebar list uses lightweight syllabus data (no content)
  // The selected module is fetched with full content from the detail endpoint
  const [selectedSyllabusItem, setSelectedSyllabusItem] = useState<ModuleSyllabusRead | null>(null);
  const [selectedModuleFull, setSelectedModuleFull] = useState<ModuleRead | null>(null);
  const [moduleLoading, setModuleLoading] = useState(false);
  const [moduleError, setModuleError] = useState<string | null>(null);
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
      setSelectedSyllabusItem(modules[0]);
    }
  }, [modules, course.id]);

  // Fetch full module content whenever the selected syllabus item changes
  useEffect(() => {
    if (!selectedSyllabusItem) {
      setSelectedModuleFull(null);
      return;
    }

    let cancelled = false;

    async function fetchFullModule() {
      setModuleLoading(true);
      setModuleError(null);
      try {
        const full = await api.getModule(course.id, selectedSyllabusItem!.id);
        if (!cancelled) {
          setSelectedModuleFull(full);
        }
      } catch (err: any) {
        if (!cancelled) {
          setModuleError(err.message || "Failed to load lesson content");
          setSelectedModuleFull(null);
        }
      } finally {
        if (!cancelled) {
          setModuleLoading(false);
        }
      }
    }

    fetchFullModule();

    return () => {
      cancelled = true;
    };
  }, [selectedSyllabusItem, course.id]);

  // Prefetch logic: Look ahead to the next module in sequence
  useEffect(() => {
    if (selectedSyllabusItem && modules.length > 0) {
      const currIdx = modules.findIndex((m) => m.id === selectedSyllabusItem.id);
      if (currIdx !== -1 && currIdx + 1 < modules.length) {
        const nextSyllabus = modules[currIdx + 1];
        // Prefetch the next module's full content
        api.getModule(course.id, nextSyllabus.id)
          .then((full) => {
            setPrefetchedModule(full);
            console.log(`[Prefetch Engine] Prefetched next module contents: "${full.title}" into local cache.`);
          })
          .catch(() => {
            setPrefetchedModule(null);
          });
      } else {
        setPrefetchedModule(null);
      }
    }
  }, [selectedSyllabusItem, modules, course.id]);

  const handleSelectModule = (mod: ModuleSyllabusRead) => {
    setSelectedSyllabusItem(mod);
  };

  const handleMarkComplete = () => {
    if (!selectedSyllabusItem) return;
    
    let updated: string[];
    if (completedModuleIds.includes(selectedSyllabusItem.id)) {
      updated = completedModuleIds.filter((id) => id !== selectedSyllabusItem.id);
    } else {
      updated = [...completedModuleIds, selectedSyllabusItem.id];
    }
    
    setCompletedModuleIds(updated);
    if (typeof window !== "undefined") {
      localStorage.setItem(`asala_completed_${course.id}`, JSON.stringify(updated));
    }
  };

  const handleNext = () => {
    if (selectedSyllabusItem) {
      const currIdx = modules.findIndex((m) => m.id === selectedSyllabusItem.id);
      if (currIdx !== -1 && currIdx + 1 < modules.length) {
        const nextSyllabus = modules[currIdx + 1];
        // If we already prefetched this module, use it directly
        if (prefetchedModule && prefetchedModule.id === nextSyllabus.id) {
          setSelectedSyllabusItem(nextSyllabus);
          setSelectedModuleFull(prefetchedModule);
          setModuleLoading(false);
          setModuleError(null);
        } else {
          setSelectedSyllabusItem(nextSyllabus);
        }
      }
    }
  };

  const handlePrevious = () => {
    if (selectedSyllabusItem) {
      const currIdx = modules.findIndex((m) => m.id === selectedSyllabusItem.id);
      if (currIdx > 0) {
        setSelectedSyllabusItem(modules[currIdx - 1]);
      }
    }
  };

  const currentModuleIndex = selectedSyllabusItem ? modules.findIndex((m) => m.id === selectedSyllabusItem.id) : -1;
  const isFirstModule = currentModuleIndex === 0;
  const isLastModule = currentModuleIndex === modules.length - 1;
  const isCurrentCompleted = selectedSyllabusItem ? completedModuleIds.includes(selectedSyllabusItem.id) : false;

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
              selectedModule={selectedSyllabusItem}
              completedModuleIds={completedModuleIds}
              onSelectModule={handleSelectModule}
            />
          </div>

          {/* Content Focus Area */}
          <div className="lg:col-span-8 space-y-6">
            {selectedSyllabusItem ? (
              moduleLoading ? (
                <div className="card py-16 text-center min-h-[400px] flex flex-col justify-center items-center">
                  <div className="h-10 w-10 rounded-full border-4 border-accent-muted/20 border-t-text-heading animate-spin"></div>
                  <p className="text-xs text-accent-muted font-semibold tracking-wide uppercase mt-3">Loading Lesson...</p>
                </div>
              ) : moduleError ? (
                <div className="card py-16 text-center min-h-[400px] flex flex-col justify-center items-center">
                  <p className="text-xs text-accent-danger font-bold">{moduleError}</p>
                  <button
                    onClick={() => setSelectedSyllabusItem({ ...selectedSyllabusItem })}
                    className="btn-secondary text-xs py-1.5 mt-3"
                  >
                    Retry
                  </button>
                </div>
              ) : selectedModuleFull ? (
                <>
                  <LessonContent
                    module={selectedModuleFull}
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
              ) : null
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
