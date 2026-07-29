'use client';

import React, { useEffect, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { useAdminApi } from '@/hooks/useAdminApi';
import { AdminUserDetail } from '@/types/admin';
import { StatusPill } from '@/components/ui/StatusPill';
import {
  X,
  User,
  BookOpen,
  FileCheck,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  LogOut,
  Clock,
  Loader2,
} from 'lucide-react';

interface UserDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  onTriggerReset: () => void;
  onTriggerSuspend: () => void;
  onTriggerReactivate: () => void;
  onTriggerForceLogout: () => void;
}

export const UserDetailDrawer: React.FC<UserDetailDrawerProps> = ({
  isOpen,
  onClose,
  userId,
  onTriggerReset,
  onTriggerSuspend,
  onTriggerReactivate,
  onTriggerForceLogout,
}) => {
  const { getUserDetail } = useAdminApi();
  const [detail, setDetail] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen && userId) {
      setIsLoading(true);
      getUserDetail(userId)
        .then(data => setDetail(data))
        .catch(err => console.error('Failed to load user detail:', err))
        .finally(() => setIsLoading(false));
    } else {
      setDetail(null);
    }
  }, [isOpen, userId, getUserDetail]);

  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs animate-in fade-in-0" />
        <Dialog.Content className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-card border-l border-border shadow-2xl p-6 flex flex-col gap-6 overflow-y-auto animate-in slide-in-from-right duration-300">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <Dialog.Title className="text-base font-bold font-heading text-foreground">
                Account Details & Operations
              </Dialog.Title>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {isLoading ? (
            <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            </div>
          ) : detail ? (
            <div className="flex flex-col gap-6">
              {/* Profile Card Header */}
              <div className="p-4 rounded-2xl bg-muted/40 border border-border flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center text-lg font-bold uppercase shrink-0">
                  {detail.full_name.charAt(0)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-foreground truncate">{detail.full_name}</h3>
                    <StatusPill status={detail.status === 'active' ? 'synced' : 'error'}>
                      {detail.status.toUpperCase()}
                    </StatusPill>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{detail.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300">
                      {detail.role}
                    </span>
                    {detail.must_change_password && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/15 text-amber-700 dark:text-amber-300">
                        Must Reset Pass
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions Panel */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Administrative Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={onTriggerReset}
                    className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-semibold text-foreground transition-colors cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4 text-amber-500" />
                    <span>Reset Password</span>
                  </button>

                  {detail.status === 'active' ? (
                    <button
                      onClick={onTriggerSuspend}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                    >
                      <UserX className="w-4 h-4" />
                      <span>Suspend</span>
                    </button>
                  ) : (
                    <button
                      onClick={onTriggerReactivate}
                      className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-semibold text-emerald-600 dark:text-emerald-400 transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-4 h-4" />
                      <span>Reactivate</span>
                    </button>
                  )}

                  <button
                    onClick={onTriggerForceLogout}
                    className="col-span-2 flex items-center justify-center gap-1.5 p-2 rounded-xl border border-border bg-background hover:bg-muted text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Force Logout (Revoke All Active JWT Sessions)</span>
                  </button>
                </div>
              </div>

              {/* Course List Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                  {detail.role === 'educator' ? 'Assigned Courses' : 'Enrolled Courses'} ({detail.courses.length})
                </span>
                <div className="flex flex-col gap-1.5">
                  {detail.courses.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
                      No courses associated with this account.
                    </div>
                  ) : (
                    detail.courses.map(c => (
                      <div key={c.id} className="p-2.5 rounded-xl border border-border bg-background flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground truncate">{c.title}</span>
                        <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground font-bold shrink-0">
                          {c.code}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Submission History Section */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-3.5 h-3.5 text-purple-600" />
                  Recent Submissions ({detail.recent_submissions.length})
                </span>
                <div className="flex flex-col gap-1.5">
                  {detail.recent_submissions.length === 0 ? (
                    <div className="p-3 rounded-xl border border-dashed border-border text-xs text-muted-foreground text-center">
                      No recent submissions recorded.
                    </div>
                  ) : (
                    detail.recent_submissions.map(s => (
                      <div key={s.id} className="p-2.5 rounded-xl border border-border bg-background flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground truncate">{s.assignment_title}</span>
                          <StatusPill status={s.sync_status === 'synced' ? 'synced' : 'pending'}>
                            {s.sync_status}
                          </StatusPill>
                        </div>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Submitted: {new Date(s.submitted_at).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Active Sessions Metadata */}
              <div className="p-3 rounded-xl bg-muted/30 border border-border text-xs flex items-center justify-between font-mono">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-purple-600" />
                  Active JWT Refresh Sessions
                </span>
                <span className="font-bold text-foreground">{detail.active_session_count} Active</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground italic text-center py-8">
              User details unavailable.
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
