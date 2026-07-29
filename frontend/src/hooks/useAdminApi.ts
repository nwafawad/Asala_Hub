'use client';

import { useCallback } from 'react';
import { api } from '@/lib/api';
import {
  AdminUserRead,
  AdminUserDetail,
  AdminUserCreatePayload,
  AdminUserCreateResponse,
  BulkUserImportResponse,
  PasswordResetResponse,
  SuspendResponse,
  AdminDashboardStats,
  AuditEventRead,
  AdminHealthResponse,
} from '@/types/admin';

export function useAdminApi() {
  const getUsers = useCallback(
    async (params?: { role?: string; status?: string; search?: string; skip?: number; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.role) searchParams.append('role', params.role);
      if (params?.status) searchParams.append('status', params.status);
      if (params?.search) searchParams.append('search', params.search);
      if (params?.skip) searchParams.append('skip', String(params.skip));
      if (params?.limit) searchParams.append('limit', String(params.limit));

      const queryStr = searchParams.toString();
      const url = `/admin/users${queryStr ? `?${queryStr}` : ''}`;
      const res = await api.get<AdminUserRead[]>(url);
      return res.data;
    },
    []
  );

  const getUserDetail = useCallback(async (userId: string) => {
    const res = await api.get<AdminUserDetail>(`/admin/users/${userId}`);
    return res.data;
  }, []);

  const resetPassword = useCallback(
    async (userId: string, body: { mode: 'generate' | 'custom'; custom_password?: string }) => {
      const res = await api.post<PasswordResetResponse>(`/admin/users/${userId}/reset-password`, body);
      return res.data;
    },
    []
  );

  const suspendUser = useCallback(async (userId: string) => {
    const res = await api.post<SuspendResponse>(`/admin/users/${userId}/suspend`);
    return res.data;
  }, []);

  const reactivateUser = useCallback(async (userId: string) => {
    const res = await api.post<{ status: string; message: string }>(`/admin/users/${userId}/reactivate`);
    return res.data;
  }, []);

  const forceLogout = useCallback(async (userId: string) => {
    const res = await api.post<{ status: string; message: string }>(`/admin/users/${userId}/force-logout`);
    return res.data;
  }, []);

  const getDashboardStats = useCallback(async () => {
    const res = await api.get<AdminDashboardStats>('/admin/dashboard-stats');
    return res.data;
  }, []);

  const getAuditEvents = useCallback(async (limit = 50) => {
    const res = await api.get<AuditEventRead[]>(`/admin/audit-events?limit=${limit}`);
    return res.data;
  }, []);

  const getHealth = useCallback(async () => {
    const res = await api.get<AdminHealthResponse>('/admin/health');
    return res.data;
  }, []);

  const createUser = useCallback(async (payload: AdminUserCreatePayload) => {
    const res = await api.post<AdminUserCreateResponse>('/admin/users', payload);
    return res.data;
  }, []);

  const bulkImportUsers = useCallback(async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<BulkUserImportResponse>('/admin/users/bulk-import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  }, []);

  return {
    getUsers,
    getUserDetail,
    createUser,
    bulkImportUsers,
    resetPassword,
    suspendUser,
    reactivateUser,
    forceLogout,
    getDashboardStats,
    getAuditEvents,
    getHealth,
  };
}
