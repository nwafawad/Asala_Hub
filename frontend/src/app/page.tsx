'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { AppShellSkeleton } from '@/components/ui/Skeletons';

const HomeContent = dynamic(() => import('@/components/HomeContent').then(m => m.HomeContent), {
  ssr: false,
  loading: () => <AppShellSkeleton />,
});

export default function Home() {
  return <HomeContent />;
}
