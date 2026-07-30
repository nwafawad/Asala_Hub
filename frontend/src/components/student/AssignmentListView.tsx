'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { db, type CachedModule, type CachedCourse, type CachedSubmission } from '@/lib/db';
import { useI18n } from '@/context/I18nContext';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  BookOpen,
  Calendar,
  Award,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  Plus,
} from 'lucide-react';

interface AssignmentItem {
  id: string;
  assignmentId: string;
  title: string;
  courseCode: string;
  courseTitle: string;
  points: number;
  dueDate: string;
  status: 'drafting' | 'submitted' | 'graded';
  score?: number;
  submittedAt?: string;
  hasAttachments?: boolean;
}

interface AssignmentListViewProps {
  onSelectAssignment: (assignmentId: string) => void;
}

export const AssignmentListView: React.FC<AssignmentListViewProps> = ({ onSelectAssignment }) => {
  const { t, language } = useI18n();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'submitted'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const ChevronIcon = language === 'ar' ? ChevronLeft : ChevronRight;

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      setIsLoading(true);
      const [modules, courses, submissions] = await Promise.all([
        db.cachedModules.toArray(),
        db.cachedCourses.toArray(),
        db.cachedSubmissions.toArray(),
      ]);

      const coursesMap = new Map<string, CachedCourse>(courses.map(c => [c.id, c]));
      const submissionsMap = new Map<string, CachedSubmission>(
        submissions.map(s => [s.assignmentId, s])
      );

      // Extract assignment modules or default assignments
      const assignmentModules = modules.filter(
        m => m.type === 'assignment' || Boolean(m.assignmentId) || m.title.toLowerCase().includes('assignment')
      );

      const items: AssignmentItem[] = assignmentModules.map((m: any) => {
        const parentCourse = coursesMap.get(m.courseId);
        const sub = submissionsMap.get(m.assignmentId || m.id);

        let status: 'drafting' | 'submitted' | 'graded' = 'drafting';
        if (sub) {
          if (sub.score !== undefined) status = 'graded';
          else if (sub.syncStatus === 'pending' || sub.syncStatus === 'synced') status = 'submitted';
        }

        return {
          id: m.id,
          assignmentId: m.assignmentId || m.id,
          title: m.title,
          courseCode: parentCourse?.code || 'COURSE',
          courseTitle: parentCourse?.title || 'General Curriculum',
          points: m.points,
          dueDate: m.dueDate,
          status,
          score: sub?.score,
          submittedAt: sub?.submittedAt,
          hasAttachments: sub?.attachments && sub.attachments.length > 0,
        };
      });

      setAssignments(items);
    } catch (err) {
      console.error('Error loading assignments list:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAssignments = useMemo(() => {
    return assignments.filter(item => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.courseCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (filterTab === 'pending' && item.status !== 'drafting') return false;
      if (filterTab === 'submitted' && item.status === 'drafting') return false;

      return matchesSearch;
    });
  }, [assignments, searchQuery, filterTab]);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
              <FileText className="w-6 h-6 text-primary" />
              <span>Student Assignments & Workspaces</span>
            </h2>
            <InfoTooltip
              title="Assignment Selection Hub"
              content="Select an assignment to draft content, attach files, and submit offline. All progress auto-saves to IndexedDB."
              position="bottom"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Review assignment requirements, draft responses, and track submission sync statuses.
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl border border-border bg-card overflow-x-auto">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            All Assignments ({assignments.length})
          </button>
          <button
            onClick={() => setFilterTab('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'pending'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            In Progress / Drafts ({assignments.filter(a => a.status === 'drafting').length})
          </button>
          <button
            onClick={() => setFilterTab('submitted')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              filterTab === 'submitted'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Submitted & Graded ({assignments.filter(a => a.status !== 'drafting').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative sm:w-64">
          <Search className="w-4 h-4 absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search assignments..."
            className="w-full h-10 pl-9 rtl:pl-3 rtl:pr-9 pr-3 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>
      </div>

      {/* Assignment Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted/40 animate-pulse" />
        </div>
      ) : filteredAssignments.length === 0 ? (
        <div className="p-12 rounded-2xl bg-card border border-border flex flex-col items-center justify-center text-center gap-3">
          <FileText className="w-10 h-10 text-muted-foreground" />
          <h3 className="text-base font-bold text-foreground">No Assignments Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            No assignments match your search or filter selection.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredAssignments.map(item => {
            return (
              <div
                key={item.id}
                onClick={() => onSelectAssignment(item.assignmentId)}
                className="p-6 rounded-2xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between gap-5 group"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-primary/10 text-primary uppercase">
                      {item.courseCode}
                    </span>
                    {item.status === 'graded' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Graded ({item.score}/100)
                      </span>
                    ) : item.status === 'submitted' ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Submitted (Queued Sync)
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Drafting Offline
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg font-bold font-heading text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h3>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-primary" />
                      {item.dueDate ? `Due: ${item.dueDate}` : 'No due date set'}
                    </span>
                    {item.points != null && (
                      <span className="flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 text-primary" />
                        {item.points} Points
                      </span>
                    )}
                    {item.hasAttachments && (
                      <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                        <Paperclip className="w-3.5 h-3.5" />
                        Attachments Attached
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">
                    {item.submittedAt
                      ? `Submitted ${new Date(item.submittedAt).toLocaleDateString()}`
                      : 'Saved locally in IndexedDB'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-1 rtl:group-hover:-translate-x-1 transition-transform">
                    <span>{item.status === 'submitted' ? 'View Workspace' : 'Open Workspace'}</span>
                    <ChevronIcon className="w-4 h-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
