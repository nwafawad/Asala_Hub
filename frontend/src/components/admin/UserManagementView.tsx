'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { AdminUserRead, UserRoleType } from '@/types/admin';
import { StatusPill } from '@/components/ui/StatusPill';
import { SkeletonCard } from '@/components/ui/Skeletons';
import { PasswordResetModal } from './PasswordResetModal';
import { SuspendConfirmModal } from './SuspendConfirmModal';
import { UserDetailDrawer } from './UserDetailDrawer';
import { CreateUserModal } from './CreateUserModal';
import { BulkUserImportModal } from './BulkUserImportModal';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {
  Users,
  GraduationCap,
  BookOpen,
  Search,
  Filter,
  MoreVertical,
  KeyRound,
  UserX,
  UserCheck,
  Eye,
  LogOut,
  RefreshCw,
  UserPlus,
  FileSpreadsheet,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { getUsers, reactivateUser, forceLogout } = useAdminApi();
  const { showToast } = useOverlay();

  // Directory filter state
  const [activeRoleTab, setActiveRoleTab] = useState<UserRoleType>('student');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Data & loading state
  const [users, setUsers] = useState<AdminUserRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal & Drawer control state
  const [selectedUser, setSelectedUser] = useState<AdminUserRead | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isSuspendModalOpen, setIsSuspendModalOpen] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers({
        role: activeRoleTab,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery.trim() || undefined,
      });
      setUsers(data);
    } catch (err) {
      console.error('Error fetching user directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getUsers, activeRoleTab, statusFilter, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleResetPassword = (targetUser: AdminUserRead) => {
    setSelectedUser(targetUser);
    setIsPasswordModalOpen(true);
  };

  const handleSuspend = (targetUser: AdminUserRead) => {
    setSelectedUser(targetUser);
    setIsSuspendModalOpen(true);
  };

  const handleReactivate = async (targetUser: AdminUserRead) => {
    try {
      await reactivateUser(targetUser.id);
      showToast('Account Reactivated', 'success', `Reactivated ${targetUser.full_name}.`);
      fetchUsers();
    } catch (err: any) {
      showToast('Reactivation Failed', 'error', err?.response?.data?.detail || 'Unable to reactivate account.');
    }
  };

  const handleForceLogout = async (userItem: AdminUserRead) => {
    try {
      await forceLogout(userItem.id);
      showToast('Sessions Revoked', 'info', `Revoked all active JWT sessions for ${userItem.full_name}.`);
      fetchUsers();
    } catch (err: any) {
      showToast('Action Failed', 'error', 'Unable to force logout user.');
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold font-heading text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            User & Account Management
          </h2>
          <p className="text-xs text-muted-foreground">
            Manage student and educator profiles, reset credentials, configure account suspensions, and inspect offline work flags.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-center">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Account</span>
          </button>

          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Bulk Import CSV</span>
          </button>

          <button
            onClick={fetchUsers}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-card border border-border text-xs font-semibold hover:bg-muted text-foreground transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-600 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Directory</span>
          </button>
        </div>
      </div>

      {/* Role Toggle Tabs */}
      <div className="flex items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveRoleTab('student')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeRoleTab === 'student'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Students Directory</span>
        </button>

        <button
          onClick={() => setActiveRoleTab('educator')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeRoleTab === 'educator'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Educators Directory</span>
        </button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-card border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeRoleTab}s by name or email address...`}
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-xl border border-border bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all cursor-pointer"
          >
            <option value="all">All Account Statuses</option>
            <option value="active">Active Only</option>
            <option value="suspended">Suspended Only</option>
          </select>
        </div>
      </div>

      {/* Main User Directory Table */}
      <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
            <Users className="w-10 h-10 text-muted-foreground opacity-40" />
            <span className="text-sm font-semibold text-foreground">No accounts found</span>
            <span className="text-xs text-muted-foreground">
              No {activeRoleTab} records matched your search or status filter criteria.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <th className="py-3.5 px-4">User Name</th>
                  <th className="py-3.5 px-4">Email Address</th>
                  <th className="py-3.5 px-4">
                    {activeRoleTab === 'educator' ? 'Assigned Courses' : 'Enrolled Courses'}
                  </th>
                  <th className="py-3.5 px-4">Account Status</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                          {u.full_name.charAt(0)}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="truncate">{u.full_name}</span>
                          {u.must_change_password && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                              Password Reset Required
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground font-mono">{u.email}</td>

                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px] font-mono">
                        {u.course_count} {u.course_count === 1 ? 'course' : 'courses'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <StatusPill status={u.status === 'active' ? 'synced' : 'error'}>
                        {u.status.toUpperCase()}
                      </StatusPill>
                    </td>

                    <td className="py-3.5 px-4 text-muted-foreground text-[11px]">
                      {new Date(u.updated_at).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </DropdownMenu.Trigger>

                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            align="end"
                            className="z-50 min-w-[160px] p-1 rounded-xl border border-border bg-card shadow-xl text-xs flex flex-col gap-0.5 animate-in fade-in-0 zoom-in-95"
                          >
                            <DropdownMenu.Item
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDetailDrawerOpen(true);
                              }}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted cursor-pointer outline-none"
                            >
                              <Eye className="w-3.5 h-3.5 text-purple-600" />
                              <span>View Detail</span>
                            </DropdownMenu.Item>

                            <DropdownMenu.Item
                              onClick={() => handleResetPassword(u)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-foreground hover:bg-muted cursor-pointer outline-none"
                            >
                              <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                              <span>Reset Password</span>
                            </DropdownMenu.Item>

                            {u.status === 'active' ? (
                              <DropdownMenu.Item
                                onClick={() => handleSuspend(u)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer outline-none font-semibold"
                              >
                                <UserX className="w-3.5 h-3.5" />
                                <span>Suspend Account</span>
                              </DropdownMenu.Item>
                            ) : (
                              <DropdownMenu.Item
                                onClick={() => handleReactivate(u)}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer outline-none font-semibold"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Reactivate Account</span>
                              </DropdownMenu.Item>
                            )}

                            <DropdownMenu.Separator className="h-px bg-border my-1" />

                            <DropdownMenu.Item
                              onClick={() => handleForceLogout(u)}
                              className="flex items-center gap-2 px-3 py-2 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer outline-none"
                            >
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Force Logout</span>
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      <PasswordResetModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      {/* Suspend Confirmation Modal */}
      <SuspendConfirmModal
        isOpen={isSuspendModalOpen}
        onClose={() => setIsSuspendModalOpen(false)}
        user={selectedUser}
        onSuccess={fetchUsers}
      />

      {/* User Detail Slide-over Drawer */}
      <UserDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        userId={selectedUser?.id || null}
        onTriggerReset={() => {
          if (selectedUser) {
            setIsDetailDrawerOpen(false);
            handleResetPassword(selectedUser);
          }
        }}
        onTriggerSuspend={() => {
          if (selectedUser) {
            setIsDetailDrawerOpen(false);
            handleSuspend(selectedUser);
          }
        }}
        onTriggerReactivate={() => {
          if (selectedUser) {
            setIsDetailDrawerOpen(false);
            handleReactivate(selectedUser);
          }
        }}
        onTriggerForceLogout={() => {
          if (selectedUser) {
            handleForceLogout(selectedUser);
          }
        }}
      />

      {/* Create Account Modal */}
      <CreateUserModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchUsers}
      />

      {/* Bulk Account Import Modal */}
      <BulkUserImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSuccess={fetchUsers}
      />
    </div>
  );
};
