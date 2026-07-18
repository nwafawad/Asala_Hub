"use client";

import React, { useState, useEffect } from "react";
import { api, CourseRead, ModuleRead } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { CourseOutline } from "./educator/CourseOutline";
import { ModuleEditor } from "./educator/ModuleEditor";
import { CourseConfig } from "./educator/CourseConfig";

export function EducatorDashboard() {
  const { user } = useAuth();
  const { syncStatus } = useConnectivity();
  
  // List of courses
  const [courses, setCourses] = useState<CourseRead[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [coursesError, setCoursesError] = useState<string | null>(null);

  // Selected course context
  const [selectedCourse, setSelectedCourse] = useState<CourseRead | null>(null);
  const [modules, setModules] = useState<ModuleRead[]>([]);
  const [modulesLoading, setModulesLoading] = useState(false);
  const [modulesError, setModulesError] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleRead | null>(null);

  // Tab switching state to reduce DOM nodes on low-power devices
  const [activeTab, setActiveTab] = useState<"structure" | "editor" | "settings">("structure");

  // Course Creation Dialog/Toggle
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Fetch all courses owned by educator
  const fetchCourses = async () => {
    setCoursesLoading(true);
    setCoursesError(null);
    try {
      const allCourses = await api.getCourses();
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

  // Fetch modules for selected course
  const fetchModules = async (courseId: string, selectFirst = false) => {
    setModulesLoading(true);
    setModulesError(null);
    try {
      const courseModules = await api.getCourseModules(courseId);
      const sorted = [...courseModules].sort((a, b) => a.order_index - b.order_index);
      setModules(sorted);
      
      if (selectFirst && sorted.length > 0) {
        setSelectedModule(sorted[0]);
      } else if (sorted.length === 0) {
        setSelectedModule(null);
      } else if (selectedModule) {
        const updated = sorted.find((m) => m.id === selectedModule.id);
        setSelectedModule(updated || sorted[0]);
      }
    } catch (err: any) {
      setModulesError(err.message || "Failed to load modules");
    } finally {
      setModulesLoading(false);
    }
  };

  const handleSelectCourse = (course: CourseRead) => {
    setSelectedCourse(course);
    setSelectedModule(null);
    setActiveTab("structure");
    fetchModules(course.id, true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const created = await api.createCourse({
        title: newTitle.trim(),
        description: newDesc.trim(),
      });
      await fetchCourses();
      handleSelectCourse(created);
      setNewTitle("");
      setNewDesc("");
      setShowCreateForm(false);
    } catch (err: any) {
      setSubmitError(err.message || "Failed to create course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCourse = async (title: string, description: string) => {
    if (!selectedCourse) return;
    setIsSubmitting(true);
    try {
      const updated = await api.updateCourse(selectedCourse.id, { title, description });
      setSelectedCourse(updated);
      setCourses(courses.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      alert(err.message || "Failed to update course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;
    setIsSubmitting(true);
    try {
      await api.deleteCourse(selectedCourse.id);
      setSelectedCourse(null);
      setSelectedModule(null);
      setModules([]);
      await fetchCourses();
    } catch (err: any) {
      alert(err.message || "Failed to delete course");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Module Actions
  const handleAddModule = async (title: string, type: "text" | "video") => {
    if (!selectedCourse) return;
    setIsSubmitting(true);
    try {
      const nextIndex = modules.length + 1;
      const created = await api.createModule(selectedCourse.id, {
        title,
        content_type: type,
        content: type === "video" ? "" : "## New Section\nWrite lesson details here...",
        order_index: nextIndex,
      });
      await fetchModules(selectedCourse.id);
      setSelectedModule(created);
      setActiveTab("editor"); // Switch to editor directly
    } catch (err: any) {
      alert(err.message || "Failed to add module");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveModule = async (title: string, contentType: "text" | "video", content: string) => {
    if (!selectedCourse || !selectedModule) return;
    setIsSubmitting(true);
    try {
      const updated = await api.updateModule(selectedCourse.id, selectedModule.id, {
        title,
        content_type: contentType,
        content,
      });
      await fetchModules(selectedCourse.id);
      setSelectedModule(updated);
    } catch (err: any) {
      alert(err.message || "Failed to save module");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!selectedCourse) return;
    setIsSubmitting(true);
    try {
      await api.deleteModule(selectedCourse.id, moduleId);
      if (selectedModule?.id === moduleId) {
        setSelectedModule(null);
      }
      await fetchModules(selectedCourse.id, true);
    } catch (err: any) {
      alert(err.message || "Failed to delete module");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveModule = async (mod: ModuleRead, direction: "up" | "down") => {
    if (!selectedCourse) return;
    const currIndex = modules.findIndex((m) => m.id === mod.id);
    if (currIndex === -1) return;

    const targetIndex = direction === "up" ? currIndex - 1 : currIndex + 1;
    if (targetIndex < 0 || targetIndex >= modules.length) return;

    setIsSubmitting(true);
    try {
      const targetMod = modules[targetIndex];
      
      // Swap order_indexes
      await api.updateModule(selectedCourse.id, mod.id, { order_index: targetMod.order_index });
      await api.updateModule(selectedCourse.id, targetMod.id, { order_index: mod.order_index });
      
      await fetchModules(selectedCourse.id);
    } catch (err: any) {
      alert("Failed to change module sorting order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectModuleFromOutline = (mod: ModuleRead) => {
    setSelectedModule(mod);
    setActiveTab("editor"); // Auto focus on editor tab
  };

  return (
    <div className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-accent-muted gap-4">
        <div>
          <h1 className="font-heading text-xl font-extrabold text-text-heading tracking-wide">
            Educator Workspace
          </h1>
          <p className="text-xs text-accent-muted mt-0.5 font-bold">
            Create syllabus templates, documentations, and upload links.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="btn-primary text-xs"
          >
            + Create New Course
          </button>
        </div>
      </div>

      {/* Course Creation Form (Popup/Toggle) */}
      {showCreateForm && (
        <div className="card max-w-lg mx-auto">
          <h3 className="font-heading text-xs font-bold text-text-heading mb-3 uppercase tracking-wider border-b border-accent-muted pb-1">
            Create Course
          </h3>
          <form onSubmit={handleCreateCourse} className="space-y-4">
            {submitError && (
              <div className="border border-accent-danger bg-surface-base p-3 rounded text-xs text-accent-danger font-bold">
                {submitError}
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="courseTitleIn" className="text-xs font-bold text-text-heading block uppercase tracking-wider">
                Course Title
              </label>
              <input
                id="courseTitleIn"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="input-field"
                placeholder="e.g. Science foundations"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="courseDescIn" className="text-xs font-bold text-text-heading block uppercase tracking-wider">
                Course Description
              </label>
              <textarea
                id="courseDescIn"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                rows={3}
                className="input-field resize-none"
                placeholder="Summarize course goals..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary py-1 px-3 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="btn-primary py-1 px-3 text-xs"
              >
                Create Course
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Course Selector Dropdown (Shown if no course selected or list loaded) */}
      {!selectedCourse && (
        <div className="card space-y-4">
          <h3 className="font-heading text-xs font-bold text-text-heading uppercase tracking-wider border-b border-accent-muted pb-1">
            Select Course to Edit
          </h3>
          {coursesLoading ? (
            <div className="space-y-2">
              <div className="h-8 w-full skeleton"></div>
              <div className="h-8 w-full skeleton"></div>
            </div>
          ) : coursesError ? (
            <div className="border border-accent-danger bg-surface-base p-3 rounded text-xs text-accent-danger font-bold">
              {coursesError}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-8 text-accent-muted">
              <p className="font-bold text-sm">No courses found</p>
              <p className="text-xs mt-1">Create a new course scaffolding using the button above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {courses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course)}
                  className="card text-left p-4 hover:border-accent-focus cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <h4 className="font-heading text-xs font-bold text-text-heading line-clamp-1 mb-1">
                      {course.title}
                    </h4>
                    <p className="text-[10px] text-accent-muted line-clamp-2 leading-relaxed">
                      {course.description || "No description provided."}
                    </p>
                  </div>
                  <span className="text-[10px] text-text-heading font-extrabold underline mt-3 block self-start">
                    Edit Syllabus →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Primary Workspace (Shown when course selected) */}
      {selectedCourse && (
        <div className="space-y-4">
          {/* Active Course Banner */}
          <div className="bg-surface-card p-3 rounded border border-accent-muted flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedCourse(null)}
                className="text-xs hover:text-accent-focus text-accent-muted font-bold cursor-pointer"
              >
                ← Back to Course list
              </button>
              <span className="text-accent-muted/40">|</span>
              <h2 className="font-heading text-xs font-extrabold text-text-heading">
                Editing: <span className="underline">{selectedCourse.title}</span>
              </h2>
            </div>
            <div className="text-[10px] font-bold text-accent-muted uppercase bg-surface-base px-2 py-0.5 rounded border border-accent-muted">
              ID: {selectedCourse.id.slice(0, 8)}
            </div>
          </div>

          {/* Dynamic Tab Selector for Low Power / Older CPU support */}
          <div className="flex border-b border-accent-muted gap-2 text-xs font-bold">
            <button
              onClick={() => setActiveTab("structure")}
              className={`pb-2 px-2 border-b-2 cursor-pointer ${
                activeTab === "structure" ? "border-accent-focus text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              1. Syllabus Outline ({modules.length})
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`pb-2 px-2 border-b-2 cursor-pointer ${
                activeTab === "editor" ? "border-accent-focus text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              2. Module content editor {selectedModule ? `(${selectedModule.order_index})` : ""}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-2 px-2 border-b-2 cursor-pointer ${
                activeTab === "settings" ? "border-accent-focus text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              3. Course settings
            </button>
          </div>

          {/* Render only active tab component to keep memory footprint and redraws minimal */}
          <div className="grid grid-cols-1 gap-6">
            {activeTab === "structure" && (
              <div className="max-w-xl mx-auto w-full">
                <CourseOutline
                  modules={modules}
                  selectedModule={selectedModule}
                  onSelectModule={handleSelectModuleFromOutline}
                  onAddModule={handleAddModule}
                  onDeleteModule={handleDeleteModule}
                  onMoveModule={handleMoveModule}
                  isSubmitting={isSubmitting}
                />
              </div>
            )}

            {activeTab === "editor" && (
              <div className="w-full">
                {selectedModule ? (
                  <ModuleEditor
                    module={selectedModule}
                    onSaveModule={handleSaveModule}
                    isSubmitting={isSubmitting}
                    syncStatus={syncStatus}
                  />
                ) : (
                  <div className="card py-12 text-center text-accent-muted min-h-[300px] flex flex-col justify-center items-center">
                    <p className="font-bold text-sm text-text-heading">No Module Selected</p>
                    <p className="text-xs mt-1 max-w-xs leading-relaxed">
                      Select a module from the "Syllabus Outline" tab first to load details into this editor.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div className="max-w-xl mx-auto w-full">
                <CourseConfig
                  course={selectedCourse}
                  onUpdateCourse={handleUpdateCourse}
                  onDeleteCourse={handleDeleteCourse}
                  isSubmitting={isSubmitting}
                  totalModules={modules.length}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
export default EducatorDashboard;
