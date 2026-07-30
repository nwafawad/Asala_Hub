'use client';

import React, { useState, useEffect } from 'react';
import { db, CachedCohort, CohortEnrollment, TransactionLogItem } from '@/lib/db';
import { generateUUID } from '@/lib/uuid';
import { api } from '@/lib/api';
import { useI18n } from '@/context/I18nContext';
import { useOverlay } from '@/context/OverlayContext';
import {
  Users,
  UserCheck,
  UserX,
  Award,
  Search,
  Filter,
  ShieldAlert,
  Edit2,
  CheckCircle2,
  AlertCircle,
  HardDrive,
  Tag,
} from 'lucide-react';
import { StatusPill } from '@/components/ui/StatusPill';
import { InfoTooltip } from '@/components/ui/InfoTooltip';

export const CohortRoster: React.FC = () => {
  const { t } = useI18n();
  const { showToast } = useOverlay();
  const [cohorts, setCohorts] = useState<CachedCohort[]>([]);
  const [selectedCohortId, setSelectedCohortId] = useState<string | null>(null);
  const [enrollments, setEnrollments] = useState<CohortEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingStudent, setEditingStudent] = useState<CohortEnrollment | null>(null);

  useEffect(() => {
    loadCohortsAndEnrollments();
  }, []);

  const loadCohortsAndEnrollments = async () => {
    try {
      setIsLoading(true);
      // 1. Instant Load from IndexedDB cache
      const cohortList = await db.cachedCohorts.toArray();
      setCohorts(cohortList);

      if (cohortList.length > 0) {
        const activeId = selectedCohortId || cohortList[0].id;
        setSelectedCohortId(activeId);
        const enrollmentList = await db.cohortEnrollments.where('cohortId').equals(activeId).toArray();
        setEnrollments(enrollmentList);
      }
      setIsLoading(false);

      // 2. Background sync with server API if online
      if (typeof window !== 'undefined' && navigator.onLine) {
        try {
          const res = await api.get('/courses/', { headers: { 'X-Suppress-401-Event': 'true' } }).catch(() => null);
          if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
            const updatedCohorts = await db.cachedCohorts.toArray();
            if (updatedCohorts.length > 0) {
              setCohorts(updatedCohorts);
            }
          }
        } catch (syncErr) {
          // Suppress sync errors in background
        }
      }
    } catch (err) {
      console.error('Error loading cohort roster:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectCohort = async (cohortId: string) => {
    setSelectedCohortId(cohortId);
    try {
      const enrollmentList = await db.cohortEnrollments.where('cohortId').equals(cohortId).toArray();
      setEnrollments(enrollmentList);
    } catch (err) {
      console.error('Error switching cohort:', err);
    }
  };

  const handleUpdateStudentStatus = async (
    enrollmentId: string,
    newStatus: CohortEnrollment['status'],
    newFlags: string[]
  ) => {
    try {
      const enrollment = await db.cohortEnrollments.get(enrollmentId);
      if (!enrollment) return;

      const timestamp = new Date().toISOString();
      const updatedEnrollment: CohortEnrollment = {
        ...enrollment,
        status: newStatus,
        adminFlags: newFlags,
        lastActiveAt: timestamp,
      };

      // Put into Dexie cohortEnrollments
      await db.cohortEnrollments.put(updatedEnrollment);

      // Write UPDATE_ROSTER transaction log (FR 2.2 Transaction Log Queueing & FR 5.2 Asynchronous Grade Updating)
      const logItem: TransactionLogItem = {
        offlineId: generateUUID(),
        action: 'UPDATE_ROSTER',
        entityType: 'cohort_enrollment',
        entityId: enrollmentId,
        payload: {
          enrollmentId,
          studentId: enrollment.studentId,
          studentName: enrollment.studentName,
          cohortId: enrollment.cohortId,
          status: newStatus,
          adminFlags: newFlags,
          updatedAt: timestamp,
        },
        timestamp,
        status: 'pending',
      };
      await db.transactionLogs.add(logItem);

      showToast(
        'Roster Updated',
        'success',
        t.educator?.roster?.rosterUpdatedToast || 'Roster record updated locally. Logged UPDATE_ROSTER transaction.'
      );

      setEditingStudent(null);
      await loadCohortsAndEnrollments();
    } catch (err) {
      console.error('Error updating student roster:', err);
      showToast('Update Failed', 'error', 'Failed to update roster record.');
    }
  };

  const filteredEnrollments = React.useMemo(() => {
    return enrollments.filter(
      e =>
        e.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.studentEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [enrollments, searchQuery]);

  const activeCohort = cohorts.find(c => c.id === selectedCohortId);

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold font-heading text-foreground">
              {t.educator?.roster?.title || 'Assigned Cohorts & Student Register'}
            </h2>
            <InfoTooltip
              title="Role-Restricted Scope"
              content="Displays student registers and enrollment statuses scoped to your assigned educator role."
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {t.educator?.roster?.subtitle || 'Manage enrollment statuses and administrative flags offline.'}
          </p>
        </div>
      </div>

      {/* Cohort Selector & Search Header */}
      <div className="p-5 rounded-2xl bg-card border border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <label className="text-xs font-bold text-foreground shrink-0">
            {t.educator?.roster?.cohortLabel || 'Select Cohort'}:
          </label>
          <select
            value={selectedCohortId || ''}
            onChange={e => handleSelectCohort(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer w-full md:w-72"
          >
            {cohorts.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.studentCount} Students)
              </option>
            ))}
          </select>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground rtl:left-auto rtl:right-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search student name or email..."
            className="w-full pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          />
        </div>
      </div>

      {/* Student Roster Table */}
      <div className="p-5 rounded-2xl bg-card border border-border overflow-hidden">
        {filteredEnrollments.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
            <Users className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">No students found in this cohort.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start border-collapse">
              <thead>
                <tr className="border-b border-border text-muted-foreground font-semibold">
                  <th className="py-3 px-4 text-start">Student Details</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-start">Administrative Flags</th>
                  <th className="py-3 px-4 text-center">Grade Average</th>
                  <th className="py-3 px-4 text-end">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEnrollments.map(student => (
                  <tr key={student.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-foreground">{student.studentName}</span>
                        <span className="text-[11px] text-muted-foreground font-mono">{student.studentEmail}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          student.status === 'active'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : student.status === 'suspended'
                            ? 'bg-destructive/15 text-destructive'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {student.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {student.adminFlags.map((flag, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {flag}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-foreground font-mono">
                      {student.gradeAverage ? `${student.gradeAverage}%` : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 text-end">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Student Status Modal */}
      {editingStudent && (
        <EditStudentModal
          student={editingStudent}
          onSave={handleUpdateStudentStatus}
          onClose={() => setEditingStudent(null)}
        />
      )}
    </div>
  );
};

interface EditStudentModalProps {
  student: CohortEnrollment;
  onSave: (enrollmentId: string, status: CohortEnrollment['status'], flags: string[]) => Promise<void>;
  onClose: () => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, onSave, onClose }) => {
  const [status, setStatus] = useState<CohortEnrollment['status']>(student.status);
  const [flagText, setFlagText] = useState(student.adminFlags.join(', '));
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const flags = flagText
      .split(',')
      .map(f => f.trim())
      .filter(Boolean);

    await onSave(student.id, status, flags);
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="max-w-md w-full p-6 rounded-2xl bg-card border border-border shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold font-heading text-foreground">
            Update Student Enrollment Record
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <span className="text-xs font-bold text-foreground block">{student.studentName}</span>
            <span className="text-[11px] text-muted-foreground font-mono block">{student.studentEmail}</span>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">Enrollment Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as CohortEnrollment['status'])}
              className="px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="completed">Completed</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-foreground">
              Administrative Flags (Comma-separated)
            </label>
            <input
              type="text"
              value={flagText}
              onChange={e => setFlagText(e.target.value)}
              placeholder="e.g. Scholarship Grantee, Honor Roll"
              className="px-3 py-2 rounded-xl bg-background border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Register Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
