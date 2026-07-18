"use client";

import React, { useState, useEffect } from "react";
import { api, CourseRead, ModuleRead, ContentType } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

export function EducatorDashboard() {
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

  // Create Course form state
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newCourseDesc, setNewCourseDesc] = useState("");
  const [courseSubmitError, setCourseSubmitError] = useState<string | null>(null);
  const [courseSubmitting, setCourseSubmitting] = useState(false);

  // Create Module form state
  const [newModuleTitle, setNewModuleTitle] = useState("");
  const [newModuleType, setNewModuleType] = useState<ContentType>("text");
  const [newModuleContent, setNewModuleContent] = useState("");
  const [moduleSubmitError, setModuleSubmitError] = useState<string | null>(null);
  const [moduleSubmitting, setModuleSubmitting] = useState(false);

  // Fetch all courses on mount and filter client-side
  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const allCourses = await api.getCourses();
      // Filter to only courses owned by this educator
      const owned = allCourses.filter((c) => c.educator_id === user?.id);
      setCourses(owned);
    } catch (err: any) {
      setCoursesError(err.message || "Failed to load courses");
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  // Fetch modules for the selected course
  const fetchModules = async (courseId: string) => {
    setModulesLoading(true);
    setModulesError(null);
    try {
      const courseModules = await api.getCourseModules(courseId);
      // Sort by order_index just to be safe
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
    // Reset module creation form
    setNewModuleTitle("");
    setNewModuleType("text");
    setNewModuleContent("");
    setModuleSubmitError(null);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseTitle.trim()) return;

    setCourseSubmitting(true);
    setCourseSubmitError(null);
    try {
      const created = await api.createCourse({
        title: newCourseTitle.trim(),
        description: newCourseDesc.trim(),
      });
      // Refresh course list
      await fetchCourses();
      // Auto-select the newly created course
      handleSelectCourse(created);
      // Reset form
      setNewCourseTitle("");
      setNewCourseDesc("");
    } catch (err: any) {
      setCourseSubmitError(err.message || "Failed to create course");
    } finally {
      setCourseSubmitting(false);
    }
  };

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;
    if (!newModuleTitle.trim() || !newModuleContent.trim()) return;

    setModuleSubmitting(true);
    setModuleSubmitError(null);
    try {
      // Auto-calculate order_index based on the length of current modules list + 1
      const orderIndex = modules.length + 1;
      
      await api.createModule(selectedCourse.id, {
        title: newModuleTitle.trim(),
        content_type: newModuleType,
        content: newModuleContent.trim(),
        order_index: orderIndex,
      });

      // Refresh modules list
      await fetchModules(selectedCourse.id);

      // Reset form
      setNewModuleTitle("");
      setNewModuleType("text");
      setNewModuleContent("");
    } catch (err: any) {
      setModuleSubmitError(err.message || "Failed to create module");
    } finally {
      setModuleSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 flex-grow flex flex-col">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-white/5 gap-4">
        <div>
          <h1 className="font-outfit text-2xl font-bold text-white tracking-wide">
            Educator Dashboard
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your courses and learning materials.
          </p>
        </div>
        <div className="text-xs text-slate-500 font-medium bg-[#12131a] px-3 py-1.5 rounded-lg border border-white/5">
          Logged in as <span className="text-indigo-400 font-semibold">{user?.full_name}</span>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        
        {/* Left Column: Courses list and creation */}
        <div className="lg:col-span-4 space-y-6 flex flex-col">
          
          {/* Courses List Card */}
          <div className="rounded-xl border border-white/5 bg-[#12131a]/60 p-6 flex flex-col flex-grow min-h-[300px]">
            <h2 className="font-outfit text-sm font-semibold text-white uppercase tracking-wider mb-4">
              My Courses
            </h2>

            {coursesLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-8">
                <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                <span className="text-xs text-slate-500">Loading courses...</span>
              </div>
            ) : coursesError ? (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 font-medium">
                {coursesError}
              </div>
            ) : courses.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <svg className="h-8 w-8 mb-2 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <p className="text-xs font-semibold">No courses created yet</p>
                <p className="text-[10px] opacity-75 mt-0.5">Use the form below to publish your first course.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
                      <p className="text-xs text-slate-400 line-clamp-1 mt-1 font-normal">
                        {course.description}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Create Course Card */}
          <div className="rounded-xl border border-white/5 bg-[#12131a]/60 p-6">
            <h2 className="font-outfit text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Create New Course
            </h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              {courseSubmitError && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-medium">
                  {courseSubmitError}
                </div>
              )}
              
              <div className="space-y-1">
                <label htmlFor="courseTitle" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Course Title
                </label>
                <input
                  id="courseTitle"
                  type="text"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  disabled={courseSubmitting}
                  placeholder="e.g. Introduction to Physics"
                  className="w-full px-3 py-2 rounded-lg border border-white/5 bg-black/30 text-white font-sans text-xs focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="courseDesc" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  id="courseDesc"
                  value={newCourseDesc}
                  onChange={(e) => setNewCourseDesc(e.target.value)}
                  disabled={courseSubmitting}
                  placeholder="Summarize course goals..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-white/5 bg-black/30 text-white font-sans text-xs focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={courseSubmitting || !newCourseTitle.trim()}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/15 cursor-pointer transition-colors duration-150"
              >
                {courseSubmitting ? "Creating..." : "Create Course"}
              </button>
            </form>
          </div>

        </div>

        {/* Right Column: Selected Course details, modules, and module creation */}
        <div className="lg:col-span-8 space-y-6 flex flex-col">
          
          {selectedCourse ? (
            <div className="rounded-xl border border-white/5 bg-[#12131a]/60 p-6 flex flex-col flex-grow">
              
              {/* Course Title & Details */}
              <div className="pb-4 border-b border-white/5 space-y-1">
                <h2 className="font-outfit text-xl font-bold text-white tracking-wide">
                  {selectedCourse.title}
                </h2>
                {selectedCourse.description ? (
                  <p className="text-xs text-slate-400">{selectedCourse.description}</p>
                ) : (
                  <p className="text-xs text-slate-500 italic">No description provided.</p>
                )}
              </div>

              {/* Modules list section */}
              <div className="py-6 flex-grow flex flex-col">
                <h3 className="font-outfit text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                  Course Modules
                </h3>

                {modulesLoading ? (
                  <div className="flex-grow flex flex-col items-center justify-center space-y-2 py-12">
                    <div className="h-6 w-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                    <span className="text-xs text-slate-500">Loading modules...</span>
                  </div>
                ) : modulesError ? (
                  <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-xs text-rose-400 font-medium">
                    {modulesError}
                  </div>
                ) : modules.length === 0 ? (
                  <div className="flex-grow flex flex-col items-center justify-center text-center p-8 text-slate-500 bg-black/10 rounded-xl border border-dashed border-white/5">
                    <svg className="h-6 w-6 mb-2 opacity-35" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-xs font-semibold">No modules inside this course</p>
                    <p className="text-[10px] opacity-75 mt-0.5">Add reading content or video modules below.</p>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
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
                        <p className="text-xs text-slate-400 leading-relaxed font-sans whitespace-pre-wrap">
                          {mod.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Create Module Section */}
              <div className="pt-6 border-t border-white/5">
                <h3 className="font-outfit text-xs font-semibold text-white uppercase tracking-wider mb-4">
                  Add New Module
                </h3>
                <form onSubmit={handleCreateModule} className="space-y-4">
                  {moduleSubmitError && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400 font-medium">
                      {moduleSubmitError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-8 space-y-1">
                      <label htmlFor="modTitle" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Module Title
                      </label>
                      <input
                        id="modTitle"
                        type="text"
                        value={newModuleTitle}
                        onChange={(e) => setNewModuleTitle(e.target.value)}
                        disabled={moduleSubmitting}
                        placeholder="e.g. 1.1 Welcome and Setup"
                        className="w-full px-3 py-2 rounded-lg border border-white/5 bg-black/30 text-white font-sans text-xs focus:outline-none focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div className="md:col-span-4 space-y-1">
                      <label htmlFor="modType" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Media Type
                      </label>
                      <select
                        id="modType"
                        value={newModuleType}
                        onChange={(e) => setNewModuleType(e.target.value as ContentType)}
                        disabled={moduleSubmitting}
                        className="w-full px-3 py-2 rounded-lg border border-white/5 bg-[#12131a] text-slate-300 font-sans text-xs focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="text">Text (Markdown)</option>
                        <option value="video">Video URL / Embed</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="modContent" className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Module Content
                    </label>
                    <textarea
                      id="modContent"
                      value={newModuleContent}
                      onChange={(e) => setNewModuleContent(e.target.value)}
                      disabled={moduleSubmitting}
                      placeholder={
                        newModuleType === "video"
                          ? "Enter the video url (e.g. https://www.youtube.com/embed/...)"
                          : "Write the text lesson or markdown contents here..."
                      }
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border border-white/5 bg-black/30 text-white font-sans text-xs focus:outline-none focus:border-indigo-500 resize-none"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                      Position: <span className="text-slate-400 font-bold">#{modules.length + 1}</span> (Auto-calculated)
                    </span>
                    <button
                      type="submit"
                      disabled={moduleSubmitting || !newModuleTitle.trim() || !newModuleContent.trim()}
                      className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-indigo-600/15 cursor-pointer transition-colors duration-150"
                    >
                      {moduleSubmitting ? "Adding..." : "Add Module"}
                    </button>
                  </div>
                </form>
              </div>

            </div>
          ) : (
            <div className="rounded-xl border border-white/5 bg-[#12131a]/40 p-12 text-center text-slate-500 flex flex-col items-center justify-center flex-grow min-h-[400px]">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-center text-indigo-400/55 mb-4 animate-bounce">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                </svg>
              </div>
              <h3 className="font-outfit text-sm font-semibold text-white tracking-wide">No course selected</h3>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Select a course from the left pane to view its modules and publish new content.
              </p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
