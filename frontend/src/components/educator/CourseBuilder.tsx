'use client';

import React, { useState, useEffect } from 'react';
import { db, CachedCourse, CachedModule, TransactionLogItem } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { ModuleEditor } from './ModuleEditor';
import {
  BookOpen,
  Plus,
  FileText,
  Mic,
  FileQuestion,
  BookMarked,
  Edit,
  Trash2,
  CheckCircle2,
  Clock,
  HardDrive,
  Layers,
  Sparkles,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';

export const CourseBuilder: React.FC = () => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();
  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [modules, setModules] = useState<CachedModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeEditorModule, setActiveEditorModule] = useState<CachedModule | null | 'new'>(null);

  useEffect(() => {
    loadCoursesAndModules();
  }, []);

  const loadCoursesAndModules = async () => {
    try {
      setIsLoading(true);
      const courseList = await db.cachedCourses.toArray();
      setCourses(courseList);

      if (courseList.length > 0) {
        const activeId = selectedCourseId || courseList[0].id;
        setSelectedCourseId(activeId);
        const moduleList = await db.cachedModules.where('courseId').equals(activeId).sortBy('sequenceOrder');
        setModules(moduleList);
      }
    } catch (err) {
      console.error('Error loading course authoring data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCourse = async (courseId: string) => {
    setSelectedCourseId(courseId);
    try {
      const moduleList = await db.cachedModules.where('courseId').equals(courseId).sortBy('sequenceOrder');
      setModules(moduleList);
    } catch (err) {
      console.error('Error switching course:', err);
    }
  };

  const handleSaveModule = async (moduleData: Partial<CachedModule>) => {
    if (!selectedCourseId) return;

    try {
      const isNew = !moduleData.id;
      const moduleId = moduleData.id || `mod-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const newModule: CachedModule = {
        id: moduleId,
        courseId: selectedCourseId,
        title: moduleData.title || 'Untitled Module',
        titleAr: moduleData.titleAr,
        type: moduleData.type || 'reading',
        sequenceOrder: moduleData.sequenceOrder || modules.length + 1,
        isCachedOffline: true,
        sizeMb: moduleData.sizeMb || 0.5,
        content: moduleData.content || '',
        audioUrl: moduleData.audioUrl || '',
        durationMinutes: moduleData.durationMinutes || 10,
        assignmentId: moduleData.type === 'assignment' ? `assign-${moduleId}` : undefined,
        dueDate: moduleData.dueDate,
        points: moduleData.points || 100,
        isCompleted: false,
      };

      // Save to Dexie cachedModules
      await db.cachedModules.put(newModule);

      // Log Transaction Log (FR-9, FR-14)
      const actionType = isNew ? 'CREATE_MODULE' : 'UPDATE_MODULE';
      const logItem: TransactionLogItem = {
        offlineId: generateUUID(),
        action: actionType,
        entityType: 'module',
        entityId: moduleId,
        payload: newModule as unknown as Record<string, unknown>,
        timestamp,
        status: 'pending',
      };
      await db.transactionLogs.add(logItem);

      // Update local course module count
      const course = await db.cachedCourses.get(selectedCourseId);
      if (course) {
        course.moduleCount = await db.cachedModules.where('courseId').equals(selectedCourseId).count();
        await db.cachedCourses.put(course);
      }

      showToast(
        isNew ? 'Module Created' : 'Module Updated',
        'success',
        t.educator?.curriculum?.savedOfflineToast || 'Module saved locally to IndexedDB.'
      );

      setActiveEditorModule(null);
      await loadCoursesAndModules();
    } catch (err) {
      console.error('Error saving module:', err);
      showToast('Save Failed', 'error', 'Failed to save module to offline DB.');
    }
  };

  const activeCourse = courses.find(c => c.id === selectedCourseId);

  const getModuleIcon = (type: CachedModule['type']) => {
    switch (type) {
      case 'audio':
        return <Mic className="w-4 h-4 text-purple-500" />;
      case 'assignment':
        return <FileQuestion className="w-4 h-4 text-amber-500" />;
      case 'syllabus':
        return <BookMarked className="w-4 h-4 text-blue-500" />;
      case 'reading':
      default:
        return <FileText className="w-4 h-4 text-emerald-500" />;
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.educator?.curriculum?.title || 'Curriculum & Lesson Authoring'}
            </h2>
            <StatusPill label="Offline Authoring Mode" variant="info" />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.educator?.curriculum?.subtitle || 'Create course modules, quizzes, and voice note lectures offline.'}
          </p>
        </div>

        <button
          onClick={() => setActiveEditorModule('new')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shadow-xs shrink-0 self-start md:self-center"
        >
          <Plus className="w-4 h-4" />
          <span>{t.educator?.curriculum?.addModule || 'Create Module'}</span>
        </button>
      </div>

      {/* Main Grid: Left Course Selector, Right Module List */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Selection Column */}
        <div className="p-5 rounded-2xl bg-card border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold font-heading text-foreground flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>Assigned Courses</span>
            </h3>
            <span className="text-xs font-mono font-bold text-muted-foreground px-2 py-0.5 rounded bg-muted">
              {courses.length}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {courses.map(course => {
              const isSelected = course.id === selectedCourseId;
              const titleToShow = language === 'ar' && course.titleAr ? course.titleAr : course.title;
              return (
                <button
                  key={course.id}
                  onClick={() => handleSelectCourse(course.id)}
                  className={`p-3.5 rounded-xl text-start flex flex-col gap-1.5 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-primary/10 border-primary/30 text-foreground font-semibold shadow-xs'
                      : 'bg-muted/30 border-transparent hover:bg-muted text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-background text-primary font-mono border border-border">
                      {course.code}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Layers className="w-3 h-3 text-muted-foreground" />
                      {course.moduleCount} modules
                    </span>
                  </div>
                  <span className="text-xs font-bold text-foreground line-clamp-1">{titleToShow}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modules Hierarchy Column */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-card border border-border flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold font-heading text-foreground">
                {activeCourse ? activeCourse.title : 'Modules & Curriculum'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Drag or re-order course sequence. Offline drafts are queued for sync.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {modules.length} {t.coursesPage?.modules || 'Modules'}
            </span>
          </div>

          {modules.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center flex flex-col items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No modules added yet for this course.</p>
              <button
                onClick={() => setActiveEditorModule('new')}
                className="px-3.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
              >
                + Add First Module
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {modules.map((mod, idx) => {
                const titleToShow = language === 'ar' && mod.titleAr ? mod.titleAr : mod.title;
                return (
                  <div
                    key={mod.id}
                    className="p-4 rounded-xl bg-muted/20 border border-border flex items-center justify-between gap-4 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center font-mono text-xs font-bold text-muted-foreground shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0 gap-0.5">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(mod.type)}
                          <span className="text-xs font-bold text-foreground truncate">{titleToShow}</span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="capitalize">{mod.type}</span>
                          {mod.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {mod.durationMinutes} mins
                            </span>
                          )}
                          {mod.points && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              {mod.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setActiveEditorModule(mod)}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title="Edit Module"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Module Editor Modal */}
      {activeEditorModule !== null && (
        <ModuleEditor
          courseId={selectedCourseId || ''}
          initialModule={activeEditorModule === 'new' ? null : activeEditorModule}
          onSave={handleSaveModule}
          onClose={() => setActiveEditorModule(null)}
        />
      )}
    </div>
  );
};
