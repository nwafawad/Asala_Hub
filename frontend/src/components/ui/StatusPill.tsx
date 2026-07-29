import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  label?: string;
  status?: string;
  variant?: StatusVariant;
  className?: string;
  dotAnimation?: boolean;
  children?: React.ReactNode;
}

const variantStyles: Record<StatusVariant, { pill: string; dot: string }> = {
  success: {
    pill: 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold',
    dot: 'bg-emerald-500',
  },
  warning: {
    pill: 'bg-amber-500/15 text-amber-900 dark:text-amber-300 border-amber-500/30 font-semibold',
    dot: 'bg-amber-500',
  },
  danger: {
    pill: 'bg-rose-500/15 text-rose-900 dark:text-rose-300 border-rose-500/30 font-semibold',
    dot: 'bg-rose-500',
  },
  info: {
    pill: 'bg-sky-500/15 text-sky-900 dark:text-sky-300 border-sky-500/30 font-semibold',
    dot: 'bg-sky-500',
  },
  neutral: {
    pill: 'bg-stone-500/15 text-stone-800 dark:text-stone-300 border-stone-500/30 font-semibold',
    dot: 'bg-stone-500',
  },
};

export const StatusPill: React.FC<StatusPillProps> = React.memo(({
  label,
  status,
  variant,
  className,
  dotAnimation = false,
  children,
}) => {
  const text = label || children || status || '';
  const statusStr = String(status || label || children || '').toLowerCase();

  let computedVariant: StatusVariant = variant || 'neutral';
  if (!variant) {
    if (statusStr.includes('synced') || statusStr.includes('active') || statusStr.includes('healthy') || statusStr.includes('operational') || statusStr.includes('ok')) {
      computedVariant = 'success';
    } else if (statusStr.includes('pending') || statusStr.includes('warning') || statusStr.includes('stale')) {
      computedVariant = 'warning';
    } else if (statusStr.includes('error') || statusStr.includes('suspended') || statusStr.includes('degraded') || statusStr.includes('failed')) {
      computedVariant = 'danger';
    }
  }

  const styles = variantStyles[computedVariant];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
        styles.pill,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full',
          styles.dot,
          dotAnimation && 'animate-pulse'
        )}
      />
      {text}
    </span>
  );
});

StatusPill.displayName = 'StatusPill';
