"use client";

import React, { useState, useEffect } from "react";
import { api, CourseRead, ModuleRead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function StudentDashboard() {
  const { user } = useAuth();
  
  // Courses state
  const [courses, setCourses] = useState<CourseRead[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Selected course details
  const [selectedCourse, setSelectedCourse] = useState<CourseRead | null>(null);
  const [modules, setModules] = useState<ModuleRead[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);

  // Fetch all courses on mount
  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const allCourses = await api.getCourses();
      setCourses(allCourses);
    } catch (err: any) {
      setCoursesError(err.message || "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch modules for the selected course
  const fetchModules = async (courseId: string) => {
    setModulesLoading(true);
    setModulesError(null);
    try {
      const courseModules = await api.getCourseModules(courseId);
      // Sort modules by order_index
      const sorted = [...courseModules].sort((a, b) => a.order_index - b.order_index);
      setModules(sorted);
    } catch (err: any) {
      setModulesError(err.message || "Failed to load modules");
    } finally {
      setModulesLoading(false);
    }
  };

  const handleSelectCourse = (course: CourseRead) => {
    setSelectedCourse(course);
    fetchModules(course.id);
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white tracking-wide">
            Student Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Explore available courses and track your learning.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-[#12131a] px-3 py-1.5 rounded-lg border border-white/5">
          Logged in as <span className="text-indigo-400 font-semibold">{user?.full_name}</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        
        {/* Left Column: Courses list */}
        <div className="lg:col-span-4 flex flex-col min-h-[300px]">
          <div className="rounded-xl border border-white/5 bg-[#12131a]/60 p-6 flex flex-col flex-grow">
            <h2 className="font-outfit text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Available Courses
            </h2>

            {coursesLoading ? (
              <div className="flex-grow flex flex-col items-center justify-center space-y-2 py-8">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <span className="text-xs text-slate-500">Loading catalog...</span>
              </div>
            ) : coursesError ? (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 font-medium">
                {coursesError}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <svg className="h-8 w-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-xs font-semibold">No courses cataloged</p>
                <p className="text-[10px] opacity-75 mt-0.5">Please check back later once educators publish courses.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {courses.map((course) => (
                  <button
                    key={course.id}
                    onClick={() => handleSelectCourse(course)}
                    className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                      selectedCourse?.id === course.id
                        ? "border-indigo-500/35 bg-indigo-500/10 text-white"
                        : "border-white/5 bg-black/20 text-slate-300 hover:bg-black/30 hover:border-white/10"
                    }`}
                  >
                    <h3 className="font-semibold text-sm line-clamp-1">{course.title}</h3>
                    {course.description && (
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 font-normal leading-relaxed">
                        {course.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Course details & Read-only modules */}
        <div className="lg:col-span-8 flex flex-col min-h-[400px]">
          {selectedCourse ? (
            <div className="rounded-xl border border-white/5 bg-[#12131a]/60 p-6 flex flex-col flex-grow">
              
              {/* Course Title & Details */}
              <div className="pb-4 border-b border-white/5 space-y-1">
                <h2 className="font-outfit text-xl font-bold text-white tracking-wide">
                  {selectedCourse.title}
                </h2>
                {selectedCourse.description ? (
                  <p className="text-xs text-slate-400 leading-relaxed">{selectedCourse.description}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No description available.</p>
                )}
              </div>

              {/* Modules list section (Read Only) */}
              <div className="py-6 flex-grow flex flex-col">
                <h3 className="font-outfit text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Course Content
                </h3>

                {modulesLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center space-y-2 py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                    <span className="text-xs text-slate-500">Loading lessons...</span>
                  </div>
                ) : modulesError ? (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 font-medium">
                    {modulesError}
                  </div>
                ) : modules.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-slate-500 bg-black/10 rounded-xl border border-dashed border-white/5">
                    <svg className="h-6 w-6 mb-2 opacity-35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p className="text-xs font-semibold">No content available</p>
                    <p className="text-[10px] opacity-75 mt-0.5">The educator has not posted modules inside this course yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {modules.map((mod) => (
                      <div
                        key={mod.id}
                        className="p-4 rounded-xl border border-white/5 bg-black/15 hover:bg-black/25 transition-colors duration-150 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="flex items-center justify-center text-[10px] h-5 w-5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold">
                              {mod.order_index}
                            </span>
                            {mod.title}
                          </h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                            mod.content_type === "video"
                              ? "bg-purple-500/10 border border-purple-500/20 text-purple-400"
                              : "bg-teal-500/10 border border-teal-500/20 text-teal-400"
                          }`}>
                            {mod.content_type}
                          </span>
                        </div>
                        
                        {mod.content_type === "video" ? (
                          <div className="space-y-2">
                            <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                              Video link: <a href={mod.content} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline hover:text-indigo-300">{mod.content}</a>
                            </p>
                            {/* If it's embeddable or a youtube link, we can render a player helper in the future. For now, a clean link is perfect and safe. */}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                            {mod.content}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#12131a]/40 p-12 text-center text-slate-500 flex flex-col items-center justify-center flex-grow min-h-[400px]">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400/55 mb-4">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h3 className="font-outfit text-sm font-semibold text-white tracking-wide">Select a Course</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Choose a course from the catalog to see its lesson plan and study materials.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
