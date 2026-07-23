"use client";

import React from 'react';

export const SkeletonLine = ({ width = '100%', height = '16px', className = '' }: { width?: string; height?: string; className?: string }) => {
  return (
    <div
      className={`rounded bg-surface-elevated dark:bg-surface-elevated-dark overflow-hidden relative ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent skeleton-shimmer" />
    </div>
  );
};

export const SkeletonBlock = ({ width = '100%', height = '120px', className = '' }: { width?: string; height?: string; className?: string }) => {
  return (
    <div
      className={`rounded-lg bg-surface-elevated dark:bg-surface-elevated-dark overflow-hidden relative ${className}`}
      style={{ width, height }}
    >
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 dark:via-white/5 to-transparent skeleton-shimmer" />
    </div>
  );
};

export const SkeletonCard = ({ className = '' }: { className?: string }) => {
  return (
    <div className={`flex flex-col gap-4 p-4 rounded-xl border border-border dark:border-border-dark bg-surface dark:bg-surface-dark w-full ${className}`}>
      <SkeletonBlock height="80px" className="w-full rounded-md" />
      <div className="flex flex-col gap-2 mt-2">
        <SkeletonLine width="80%" height="20px" />
        <SkeletonLine width="60%" height="16px" />
        <SkeletonLine width="40%" height="16px" />
      </div>
    </div>
  );
};
