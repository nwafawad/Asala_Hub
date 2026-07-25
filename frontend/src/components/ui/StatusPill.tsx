import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusPillProps {
  label: string;
  variant?: StatusVariant;
  className?: string;
  dotAnimation?: boolean;
}

const variantStyles: Record<StatusVariant, { pill: string; dot: string }> = {
  success: {
    pill: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    pill: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  danger: {
    pill: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
  },
  info: {
    pill: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20',
    dot: 'bg-sky-500',
  },
  neutral: {
    pill: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-500/20',
    dot: 'bg-stone-500',
  },
};

export const StatusPill: React.FC<StatusPillProps> = ({
  label,
  variant = 'neutral',
  className,
  dotAnimation = false,
}) => {
  const styles = variantStyles[variant];
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
      {label}
    </span>
  );
};
