"use client";

import React, { useState, useEffect } from "react";
import { CourseRead } from "@/lib/api";

interface CourseConfigProps {
  course: CourseRead;
  onUpdateCourse: (title: string, description: string) => Promise<void>;
  onDeleteCourse: () => Promise<void>;
  isSubmitting: boolean;
  totalModules: number;
}

export function CourseConfig({
  course,
  onUpdateCourse,
  onDeleteCourse,
  isSubmitting,
  totalModules,
}: CourseConfigProps) {
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description);
  const [isDirty, setIsDirty] = useState(false);

  // Sync back state on course changes
  useEffect(() => {
    setTitle(course.title);
    setDescription(course.description);
    setIsDirty(false);
  }, [course]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      await onUpdateCourse(title.trim(), description.trim());
      setIsDirty(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card space-y-6">
      <div className="border-b border-accent-muted/15 pb-4">
        <h2 className="font-heading text-sm font-bold text-text-heading uppercase tracking-wider">
          Course Parameters
        </h2>
        <p className="text-[10px] text-accent-muted mt-0.5">Manage meta values & configurations.</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4">
        {/* Title Input */}
        <div className="space-y-1.5">
          <label htmlFor="courseTitle" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
            Course Title
          </label>
          <input
            id="courseTitle"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setIsDirty(true);
            }}
            className="input-field"
            required
            disabled={isSubmitting}
          />
        </div>

        {/* Description Input */}
        <div className="space-y-1.5">
          <label htmlFor="courseDesc" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
            Description
          </label>
          <textarea
            id="courseDesc"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setIsDirty(true);
            }}
            rows={4}
            className="input-field resize-none"
            disabled={isSubmitting}
            placeholder="Summarize course goals..."
          />
        </div>

        {/* Save Param Button */}
        <button
          type="submit"
          disabled={isSubmitting || !isDirty || !title.trim()}
          className="btn-primary w-full py-2 text-xs"
        >
          {isSubmitting ? "Updating..." : "Update parameters"}
        </button>
      </form>

      {/* Analytics stats */}
      <div className="border-t border-accent-muted/15 pt-4 space-y-3">
        <span className="text-xs font-bold text-text-heading uppercase tracking-wider block">Analytics Summary</span>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-surface-base p-3 rounded-lg border border-accent-muted/10">
            <span className="text-[10px] text-accent-muted uppercase block">Total Modules</span>
            <span className="text-base font-extrabold text-text-heading">{totalModules}</span>
          </div>
          <div className="bg-surface-base p-3 rounded-lg border border-accent-muted/10">
            <span className="text-[10px] text-accent-muted uppercase block">Publish Status</span>
            <span className="text-xs font-extrabold text-text-heading flex items-center gap-1.5 mt-1">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-highlight"></span> Draft Mode
            </span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t border-accent-muted/15 pt-4 space-y-3">
        <span className="text-xs font-bold text-accent-danger uppercase tracking-wider block">Danger Zone</span>
        <button
          onClick={() => {
            if (confirm("Are you sure you want to permanently delete this course and all its modules? This action cannot be undone.")) {
              onDeleteCourse();
            }
          }}
          disabled={isSubmitting}
          className="btn-secondary w-full py-2 text-xs border-accent-danger/30 text-accent-danger hover:bg-accent-danger/5 cursor-pointer"
        >
          Delete Course
        </button>
      </div>
    </div>
  );
}
