import { useState, useEffect, useCallback } from 'react';
import { useAdminApi } from '@/hooks/useAdminApi';
import { useOverlay } from '@/context/OverlayContext';
import { useDebounce } from '@/hooks/useDebounce';
import { AdminUserRead, UserRoleType } from '@/types/admin';

export function useUserManagement() {
  const { getUsers, reactivateUser, forceLogout } = useAdminApi();
  const { showToast } = useOverlay();

  const [activeRoleTab, setActiveRoleTab] = useState<UserRoleType>('student');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [users, setUsers] = useState<AdminUserRead[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getUsers({
        role: activeRoleTab,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: debouncedSearchQuery.trim() || undefined,
      });
      setUsers(data);
    } catch (err) {
      console.error('Error fetching user directory:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getUsers, activeRoleTab, statusFilter, debouncedSearchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

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

  return {
    activeRoleTab,
    setActiveRoleTab,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    users,
    isLoading,
    fetchUsers,
    handleReactivate,
    handleForceLogout,
  };
}
