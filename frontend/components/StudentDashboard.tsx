"use client";

import React, { useState, useEffect } from "react";
import { api, CourseRead, ModuleSyllabusRead } from "@/lib/api";
import { cacheCoursesLocally, cacheSyllabusLocally, getLocalCourses, getLocalSyllabus } from "@/lib/offline-store";
import { useAuth } from "@/lib/auth-context";
import { CourseCatalog } from "./student/CourseCatalog";
import { CourseViewer } from "./student/CourseViewer";

export function StudentDashboard() {
  const { user } = useAuth();

  // View states: catalog vs classroom
  const [activeCourse, setActiveCourse] = useState<CourseRead | null>(null);
  const [modules, setModules] = useState<ModuleSyllabusRead[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Courses state
  const [courses, setCourses] = useState<CourseRead[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Fetch all courses on mount
  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const allCourses = await api.getCourses();
      setCourses(allCourses);
      cacheCoursesLocally(allCourses);
    } catch (err: any) {
      // Fallback read from local Dexie storage
      const cached = await getLocalCourses();
      if (cached.length > 0) {
        setCourses(cached);
        setCoursesError(null);
      } else {
        setCoursesError(err.message || "Failed to load courses");
      }
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleSelectCourse = async (course: CourseRead) => {
    setActiveCourse(course);
    setModulesLoading(true);
    setModulesError(null);
    try {
      const courseModules = await api.getCourseModules(course.id);
      const sorted = [...courseModules].sort((a, b) => a.order_index - b.order_index);
      setModules(sorted);
      cacheSyllabusLocally(course.id, sorted);
    } catch (err: any) {
      const cachedModules = await getLocalSyllabus(course.id);
      if (cachedModules.length > 0) {
        setModules(cachedModules);
        setModulesError(null);
      } else {
        setModulesError(err.message || "Failed to load lessons");
      }
    } finally {
      setModulesLoading(false);
    }
  };

  const handleBackToCatalog = () => {
    setActiveCourse(null);
    setModules([]);
    fetchCourses();
  };

  return (
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Welcome Banner */}
      {!activeCourse && (
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-accent-muted/15 gap-4">
          <div>
            <h1 className="font-heading text-2xl font-extrabold text-text-heading tracking-wide">
              Student Catalog
            </h1>
            <p className="text-xs text-accent-muted mt-0.5">
              Browse available course modules and mark your progress offline.
            </p>
          </div>
          <div className="text-xs font-bold text-accent-muted bg-surface-card px-3.5 py-1.5 rounded-lg border border-accent-muted/15">
            Signed in as: <span className="text-text-heading underline">{user?.full_name}</span>
          </div>
        </div>
      )}

      {/* Conditional render views */}
      {activeCourse ? (
        modulesLoading ? (
          <div className="flex-grow flex justify-center items-center py-24">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-accent-muted/20 border-t-text-heading animate-spin"></div>
              <p className="text-xs text-accent-muted font-semibold tracking-wide uppercase">Preparing Classroom...</p>
            </div>
          </div>
        ) : modulesError ? (
          <div className="space-y-4">
            <div className="bg-accent-danger/10 border border-accent-danger/25 p-4 rounded text-xs text-accent-danger">
              {modulesError}
            </div>
            <button onClick={handleBackToCatalog} className="btn-secondary text-xs py-2">
              ← Return to Catalog
            </button>
          </div>
        ) : (
          <CourseViewer
            course={activeCourse}
            modules={modules}
            onBackToCatalog={handleBackToCatalog}
          />
        )
      ) : (
        <CourseCatalog
          courses={courses}
          loading={coursesLoading}
          error={coursesError}
          onSelectCourse={handleSelectCourse}
        />
      )}
    </div>
  );
}

export default StudentDashboard;
