'use client';

import { Suspense } from 'react';
import { AdminContent } from '@/components/admin/AdminContent';
import { AppShellSkeleton } from '@/components/ui/Skeletons';

export default function AdminPage() {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AdminContent />
    </Suspense>
  );
}
