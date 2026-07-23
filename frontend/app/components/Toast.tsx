"use client";

import React, { useEffect, useState } from 'react';
import { ToastMessage } from '@/lib/types';
import { X } from 'lucide-react';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const Toast = ({ toast, onDismiss }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleDismiss();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 300); // Wait for exit animation to finish
  };

  const typeStyles = {
    info: 'border-s-primary bg-surface-elevated dark:bg-surface-elevated-dark',
    success: 'border-s-success bg-surface-elevated dark:bg-surface-elevated-dark',
    warning: 'border-s-warning bg-surface-elevated dark:bg-surface-elevated-dark',
    error: 'border-s-error bg-surface-elevated dark:bg-surface-elevated-dark',
  };

  return (
    <div
      role="status"
      className={`
        flex items-start justify-between p-4 rounded-lg shadow-lg border border-border dark:border-border-dark border-s-4
        ${typeStyles[toast.type || 'info']}
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-y-2' : 'animate-in slide-in-from-bottom-4 fade-in'}
      `}
    >
      <p className="text-sm text-text-primary dark:text-text-primary-dark break-words pe-3">
        {toast.message}
      </p>
      <button
        onClick={handleDismiss}
        className="p-1 min-h-[44px] min-w-[44px] flex items-center justify-center -m-1 ms-auto text-text-secondary dark:text-text-secondary-dark hover:text-text-primary dark:hover:text-text-primary-dark transition-colors"
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
};
