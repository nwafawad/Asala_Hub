'use client';

import React from 'react';
import { useOverlay, type ToastType } from '@/context/OverlayContext';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  error: <AlertCircle className="w-5 h-5 text-rose-500" />,
  info: <Info className="w-5 h-5 text-sky-500" />,
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useOverlay();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 ltr:right-5 rtl:left-5 sm:bottom-5 sm:right-5 bottom-4 right-4 left-4 sm:left-auto sm:w-auto z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border border-border bg-card shadow-lg transition-all transform animate-in slide-in-from-bottom-5 duration-200'
          )}
        >
          <div className="shrink-0 mt-0.5">{iconMap[toast.type]}</div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-foreground">{toast.title}</h4>
            {toast.message && (
              <p className="mt-0.5 text-xs text-muted-foreground">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
