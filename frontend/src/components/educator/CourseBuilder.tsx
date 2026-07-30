'use client';

import React, { useState, useEffect } from 'react';
import { db, CachedCourse, CachedModule, TransactionLogItem, isAssignmentModule } from '@/lib/db';
import { api } from '@/lib/api';
import { generateUUID } from '@/lib/uuid';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import { useSync } from '@/context/SyncContext';
import { ModuleEditor } from './ModuleEditor';
import { ModuleStudio } from './ModuleStudio';
import { AssignmentStudio } from './AssignmentStudio';
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
  ClipboardList,
  Calendar,
  Award,
  AlertCircle,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export const CourseBuilder: React.FC = () => {
  const { t, language } = useI18n();
  const { showToast } = useOverlay();
  const { isOnline, syncNow } = useSync();
  const [courses, setCourses] = useState<CachedCourse[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState<boolean>(false);

  const handleSaveCourse = async (courseTitle: string, courseCode: string, titleAr?: string) => {
    try {
      const courseId = generateUUID();
      const timestamp = new Date().toISOString();

      const newCourse: CachedCourse = {
        id: courseId,
        title: courseTitle,
        titleAr: titleAr || undefined,
        code: courseCode,
        educatorName: 'Prof. Educator',
        moduleCount: 0,
        isCachedOffline: true,
        sizeMb: 0.1,
        updatedAt: timestamp,
      };

      await db.cachedCourses.put(newCourse);

      // Log UPDATE_COURSE transaction (FR-9, FR-14)
      const logItem: TransactionLogItem = {
        offlineId: generateUUID(),
        action: 'UPDATE_COURSE',
        entityType: 'course',
        entityId: courseId,
        payload: {
          ...newCourse,
          description: courseCode ? `[${courseCode}] ${courseTitle}` : courseTitle,
        } as unknown as Record<string, unknown>,
        timestamp,
        status: 'pending',
      };
      await db.transactionLogs.add(logItem);

      // Trigger sync engine if connected online
      if (isOnline) {
        syncNow().catch(err => console.error('Course sync publish error:', err));
      }

      showToast('Course Created', 'success', 'New course saved locally and queued for backend sync.');
      setIsCreatingCourse(false);
      setSelectedCourseId(courseId);
      await loadCoursesAndModules();
    } catch (err) {
      console.error('Error creating new course:', err);
      showToast('Course Creation Error', 'error', 'Failed to save course locally.');
    }
  };
  const [modules, setModules] = useState<CachedModule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeEditorState, setActiveEditorState] = useState<{
    mode: 'module' | 'assignment';
    module: CachedModule | null | 'new';
  } | null>(null);

  useEffect(() => {
    loadCoursesAndModules();
  }, []);

  const loadCoursesAndModules = async () => {
    try {
      setIsLoading(true);
      // 1. Instant load from IndexedDB
      const courseList = await db.cachedCourses.toArray();
      setCourses(courseList);

      if (courseList.length > 0) {
        const activeId = selectedCourseId || courseList[0].id;
        setSelectedCourseId(activeId);
        const moduleList = await db.cachedModules.where('courseId').equals(activeId).sortBy('sequenceOrder');
        setModules(moduleList);
      }

      // 2. Fetch server-authoritative courses + modules from API when online
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await api.get('/courses/', { headers: { 'X-Suppress-401-Event': 'true' } });
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const apiCourses: CachedCourse[] = res.data.map((c: any) => ({
              id: c.id,
              title: c.title,
              code: c.code || `[${c.id.substring(0, 6).toUpperCase()}]`,
              educatorName: c.educator_name || 'Prof. Educator',
              moduleCount: c.module_count || 0,
              isCachedOffline: true,
              sizeMb: 0.5,
              updatedAt: c.updated_at || new Date().toISOString(),
            }));

            await db.cachedCourses.bulkPut(apiCourses);
            const freshCourseList = await db.cachedCourses.toArray();
            setCourses(freshCourseList);

            // Fetch modules for every course in parallel and cache them
            const moduleResponses = await Promise.all(
              res.data.map((c: any) =>
                api
                  .get(`/courses/${c.id}/modules`, { headers: { 'X-Suppress-401-Event': 'true' } })
                  .then(r => ({ courseId: c.id, data: r.data }))
                  .catch(() => null)
              )
            );

            const allServerModules: CachedModule[] = [];
            for (const mr of moduleResponses) {
              if (mr?.data && Array.isArray(mr.data)) {
                for (const m of mr.data) {
                  allServerModules.push({
                    id: m.id,
                    courseId: mr.courseId,
                    title: m.title,
                    titleAr: m.title_ar,
                    type: m.content_type,
                    sequenceOrder: m.order_index || 1,
                    isCachedOffline: true,
                    sizeMb: 0.2,
                    content: m.content || '',
                    durationMinutes: m.duration_minutes,
                    points: m.points,
                    dueDate: m.due_date,
                  });
                }
              }
            }

            if (allServerModules.length > 0) {
              await db.cachedModules.bulkPut(allServerModules);
            }

            const activeId = selectedCourseId || (freshCourseList.length > 0 ? freshCourseList[0].id : null);
            if (activeId) {
              setSelectedCourseId(activeId);
              const freshModules = await db.cachedModules.where('courseId').equals(activeId).sortBy('sequenceOrder');
              setModules(freshModules);
            }
          }
        } catch (apiErr) {
          // Fall back gracefully to local IndexedDB records on offline/error
        }
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
    const targetCourseId = selectedCourseId || (courses.length > 0 ? courses[0].id : null);
    if (!targetCourseId) {
      showToast('No Course Selected', 'error', 'Please create or select a course before saving modules.');
      return;
    }

    try {
      const isNew = !moduleData.id;
      const moduleId = moduleData.id || generateUUID();
      const timestamp = new Date().toISOString();

      const isAssignment = moduleData.type === 'assignment' || Boolean(moduleData.quizSchema?.isGradedAssignment);

      const newModule: CachedModule = {
        id: moduleId,
        courseId: targetCourseId,
        title: moduleData.title || (isAssignment ? 'Untitled Assignment' : 'Untitled Module'),
        titleAr: moduleData.titleAr,
        type: moduleData.type || (isAssignment ? 'assignment' : 'reading'),
        sequenceOrder: moduleData.sequenceOrder || modules.length + 1,
        isCachedOffline: true,
        sizeMb: moduleData.sizeMb || 0.5,
        content: moduleData.content || '',
        audioUrl: moduleData.audioUrl || '',
        audioArrayBuffer: moduleData.audioArrayBuffer,
        videoUrl: moduleData.videoUrl,
        videoOfflineText: moduleData.videoOfflineText,
        attachmentFile: moduleData.attachmentFile,
        durationMinutes: moduleData.durationMinutes || 10,
        assignmentId: isAssignment ? `assign-${moduleId}` : undefined,
        dueDate: moduleData.dueDate,
        points: moduleData.points || (isAssignment ? 100 : undefined),
        quizSchema: moduleData.quizSchema,
        assignmentSchema: moduleData.assignmentSchema,
        userNotes: moduleData.userNotes,
        isCompleted: false,
      };

      // 1. Save full record to Dexie cachedModules table
      await db.cachedModules.put(newModule);

      // 2. Prepare clean JSON payload for sync transaction log (omit raw ArrayBuffers)
      const { audioArrayBuffer, attachmentFile, ...cleanPayload } = newModule;
      const cleanAttachment = attachmentFile
        ? { name: attachmentFile.name, size: attachmentFile.size, type: attachmentFile.type }
        : undefined;

      const actionType: TransactionLogItem['action'] = isAssignment
        ? (isNew ? 'CREATE_ASSIGNMENT' : 'UPDATE_ASSIGNMENT')
        : (isNew ? 'CREATE_MODULE' : 'UPDATE_MODULE');

      const logItem: TransactionLogItem = {
        offlineId: generateUUID(),
        action: actionType,
        entityType: isAssignment ? 'assignment' : 'module',
        entityId: moduleId,
        payload: {
          ...cleanPayload,
          attachmentFile: cleanAttachment,
        } as Record<string, unknown>,
        timestamp,
        status: 'pending',
      };
      await db.transactionLogs.add(logItem);

      // 3. Trigger sync engine if connected online
      if (isOnline) {
        syncNow().catch(err => console.error('Sync publish error:', err));
      }

      // 4. Update local course module count
      const course = await db.cachedCourses.get(targetCourseId);
      if (course) {
        course.moduleCount = await db.cachedModules.where('courseId').equals(targetCourseId).count();
        await db.cachedCourses.put(course);
      }

      showToast(
        isAssignment
          ? (isNew ? 'Assignment Created & Published' : 'Assignment Updated')
          : (isNew ? 'Module Created & Published' : 'Module Updated'),
        'success',
        'Saved locally and queued for offline sync.'
      );

      setActiveEditorState(null);
      await loadCoursesAndModules();
    } catch (err) {
      console.error('Error saving module:', err);
      showToast('Save Failed', 'error', 'Failed to save curriculum item. Please try again.');
    }
  };

  const getModuleIcon = (mod: CachedModule) => {
    if (isAssignmentModule(mod)) {
      return <ClipboardList className="w-4 h-4 text-primary" />;
    }
    switch (mod.type) {
      case 'audio':
        return <Mic className="w-4 h-4 text-primary" />;
      case 'video':
        return <FileText className="w-4 h-4 text-primary" />;
      case 'syllabus':
        return <BookMarked className="w-4 h-4 text-primary" />;
      case 'quiz':
        return <FileQuestion className="w-4 h-4 text-primary" />;
    }
  };

  const activeCourse = courses.find(c => c.id === selectedCourseId);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.educator?.curriculum?.title || 'Curriculum & Lesson Authoring'}
            </h2>
            <InfoTooltip
              title="Offline Authoring Mode"
              content="Create and edit course modules and assignments locally. Changes auto-save to IndexedDB and sync when online."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Author learning modules (readings, lectures, voice notes) and graded assignments (essays, file submissions, quizzes).
          </p>

          {/* Course Selection Awareness Badge */}
          {activeCourse ? (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-foreground">Active Target Course:</span>
              <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-primary" />
                <span>[{activeCourse.code}] {language === 'ar' && activeCourse.titleAr ? activeCourse.titleAr : activeCourse.title}</span>
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-lg flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>No Course Selected — Select an assigned course on the left to start authoring</span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <button
            onClick={() => setIsCreatingCourse(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-primary/30 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>New Course</span>
          </button>
          
          <button
            disabled={!activeCourse}
            onClick={() => {
              if (!activeCourse) {
                showToast('No Course Selected', 'error', 'Please select or create a course before adding modules.');
                return;
              }
              setActiveEditorState({ mode: 'module', module: 'new' });
            }}
            title={!activeCourse ? 'Select or create a course first' : 'Add Learning Module'}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              !activeCourse ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Learning Module</span>
          </button>

          <button
            disabled={!activeCourse}
            onClick={() => {
              if (!activeCourse) {
                showToast('No Course Selected', 'error', 'Please select or create a course before adding assignments.');
                return;
              }
              setActiveEditorState({ mode: 'assignment', module: 'new' });
            }}
            title={!activeCourse ? 'Select or create a course first' : 'Add Assignment'}
            className={`inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer ${
              !activeCourse ? 'opacity-40 cursor-not-allowed' : 'hover:bg-amber-600'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Add Assignment</span>
          </button>
        </div>
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
            <button
              onClick={() => setIsCreatingCourse(true)}
              className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
            >
              Course
            </button>
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
                      {course.moduleCount} items
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
                {activeCourse ? activeCourse.title : 'Curriculum Sequence'}
              </h3>
              <p className="text-xs text-muted-foreground">
                Manage learning materials and graded assignment tasks in chronological sequence.
              </p>
            </div>
            <span className="text-xs text-muted-foreground font-mono">
              {modules.length} {t.coursesPage?.modules || 'Items'}
            </span>
          </div>

          {!activeCourse ? (
            <div className="p-8 rounded-xl border border-amber-500/30 bg-amber-500/5 text-center flex flex-col items-center justify-center gap-3">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <h4 className="text-sm font-bold text-foreground">No Active Course Selected</h4>
              <p className="text-xs text-muted-foreground max-w-sm">
                Select an assigned course from the list on the left or create a new course to start authoring learning modules and assignments.
              </p>
              <button
                onClick={() => setIsCreatingCourse(true)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 transition-opacity"
              >
                Create New Course
              </button>
            </div>
          ) : modules.length === 0 ? (
            <div className="p-8 rounded-xl border border-dashed border-border text-center flex flex-col items-center justify-center gap-4">
              <FileText className="w-8 h-8 text-muted-foreground/50" />
              <p className="text-xs text-muted-foreground">No content items added yet for this course.</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveEditorState({ mode: 'module', module: 'new' })}
                  className="px-3.5 py-2 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors"
                >
                  Add Learning Module
                </button>
                <button
                  onClick={() => setActiveEditorState({ mode: 'assignment', module: 'new' })}
                  className="px-3.5 py-2 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-semibold hover:bg-amber-500/20 transition-colors"
                >
                  Add Assignment
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {modules.map((mod, idx) => {
                const titleToShow = language === 'ar' && mod.titleAr ? mod.titleAr : mod.title;
                const isAssign = isAssignmentModule(mod);

                return (
                  <div
                    key={mod.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition-all ${
                      isAssign
                        ? 'bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40'
                        : 'bg-muted/20 border-border hover:border-primary/20'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg border flex items-center justify-center font-mono text-xs font-bold shrink-0 ${
                          isAssign
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-card text-muted-foreground border-border'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex flex-col min-w-0 gap-1">
                        <div className="flex items-center gap-2">
                          {getModuleIcon(mod)}
                          <span className="text-xs font-bold text-foreground truncate">{titleToShow}</span>
                          {isAssign && (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                              Graded Assignment
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="capitalize">{isAssign ? 'Assignment' : mod.type}</span>
                          {!isAssign && mod.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-muted-foreground" />
                              {mod.durationMinutes} mins
                            </span>
                          )}
                          {isAssign && mod.dueDate && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <Calendar className="w-3 h-3" />
                              Due: {new Date(mod.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {mod.points && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                              <Award className="w-3 h-3" />
                              {mod.points} pts
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() =>
                          setActiveEditorState({
                            mode: isAssign ? 'assignment' : 'module',
                            module: mod,
                          })
                        }
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        title={isAssign ? 'Edit Assignment' : 'Edit Module'}
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

      {/* Course Creator Modal */}
      {isCreatingCourse && (
        <CreateCourseModal
          onSave={handleSaveCourse}
          onClose={() => setIsCreatingCourse(false)}
        />
      )}

      {/* Learning Module Studio Overlay */}
      {activeEditorState?.mode === 'module' && (
        <ModuleStudio
          courseId={selectedCourseId || ''}
          courseTitle={activeCourse?.title}
          courseCode={activeCourse?.code}
          initialModule={activeEditorState.module === 'new' ? null : activeEditorState.module}
          onSave={handleSaveModule}
          onClose={() => setActiveEditorState(null)}
        />
      )}

      {/* Assignment Studio Overlay */}
      {activeEditorState?.mode === 'assignment' && (
        <AssignmentStudio
          courseId={selectedCourseId || ''}
          courseTitle={activeCourse?.title}
          courseCode={activeCourse?.code}
          initialModule={activeEditorState.module === 'new' ? null : activeEditorState.module}
          onSave={handleSaveModule}
          onClose={() => setActiveEditorState(null)}
        />
      )}
    </div>
  );
};

interface CreateCourseModalProps {
  onSave: (title: string, code: string, titleAr?: string) => Promise<void>;
  onClose: () => void;
}

const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ onSave, onClose }) => {
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    setIsSaving(true);
    await onSave(title, code, titleAr);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-base font-bold font-heading text-foreground">Author New Course</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Course Code *</label>
            <input
              type="text"
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="e.g. CS301"
              required
              className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground font-mono uppercase"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Course Title (EN) *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Advanced Operating Systems"
              required
              className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Arabic Title (Optional)</label>
            <input
              type="text"
              value={titleAr}
              onChange={e => setTitleAr(e.target.value)}
              placeholder="أنظمة التشغيل المتقدمة"
              dir="rtl"
              className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? 'Creating...' : 'Create Course Offline'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
