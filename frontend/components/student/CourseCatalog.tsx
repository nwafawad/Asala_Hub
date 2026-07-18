"use client";

import React, { useState } from "react";
import { CourseRead } from "@/lib/api";

interface CourseCatalogProps {
  courses: CourseRead[];
  loading: boolean;
  error: string | null;
  onSelectCourse: (course: CourseRead) => void;
}

export function CourseCatalog({
  courses,
  loading,
  error,
  onSelectCourse,
}: CourseCatalogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"title" | "newest">("title");

  // Client-side filtering & sorting
  const filtered = courses.filter((course) => {
    const query = searchQuery.toLowerCase();
    return (
      course.title.toLowerCase().includes(query) ||
      (course.description && course.description.toLowerCase().includes(query))
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    } else {
      // Sort by newest created timestamp
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
  });

  return (
    <div className="space-y-6">
      {/* Search and Filters panel */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 Search available courses by title or description..."
            className="input-field"
          />
        </div>

        <div className="flex gap-4 w-full md:w-auto shrink-0 justify-end">
          <div className="flex items-center gap-2">
            <label htmlFor="sortBy" className="text-xs font-bold text-text-heading uppercase tracking-wider">
              Sort By:
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "title" | "newest")}
              className="input-field py-1.5 px-3 text-xs w-36"
            >
              <option value="title">Alphabetical</option>
              <option value="newest">Newest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Course Grid view */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="h-44 skeleton"></div>
          <div className="h-44 skeleton"></div>
          <div className="h-44 skeleton"></div>
        </div>
      ) : error ? (
        <div className="bg-accent-danger/10 border border-accent-danger/25 p-4 rounded text-xs text-accent-danger font-semibold">
          {error}
        </div>
      ) : sorted.length === 0 ? (
        <div className="card py-16 text-center text-accent-muted flex flex-col items-center justify-center">
          <span className="text-2xl block mb-2">📚</span>
          <p className="font-bold text-sm text-text-heading">No Courses Cataloged</p>
          <p className="text-xs mt-1 max-w-xs leading-relaxed">
            There are no courses found matching your query. Check back later once educators publish courses.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sorted.map((course) => (
            <div
              key={course.id}
              className="card flex flex-col justify-between hover:border-text-heading cursor-pointer"
              onClick={() => onSelectCourse(course)}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-heading text-base font-bold text-text-heading line-clamp-2">
                    {course.title}
                  </h3>
                </div>
                <p className="text-xs text-text-body line-clamp-3 leading-relaxed mb-4">
                  {course.description || "No description provided."}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-accent-muted/10 pt-3 mt-4 text-[10px]">
                <span className="font-bold text-accent-muted uppercase tracking-wider">
                  Educator owned
                </span>
                <span className="font-extrabold text-text-heading underline">
                  Explore Syllabus →
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
export default CourseCatalog;
