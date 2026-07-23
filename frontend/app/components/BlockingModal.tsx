"use client";

import React, { useEffect, useRef } from 'react';
import { ModalConfig } from '@/lib/types';
import { useTranslation } from '@/lib/i18n/context';

interface BlockingModalProps {
  config: ModalConfig;
  onDismiss: () => void;
}

export const BlockingModal = ({ config, onDismiss }: BlockingModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // Trap focus and handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
      
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    // Auto focus first element
    if (modalRef.current) {
      const firstFocusable = modalRef.current.querySelector('button') as HTMLElement;
      firstFocusable?.focus();
    }

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const isError = config.type === 'error';

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby="modal-desc"
    >
      <div 
        ref={modalRef}
        className="w-full max-w-md bg-surface-elevated dark:bg-surface-elevated-dark rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
      >
        <div className={`h-1.5 w-full ${isError ? 'bg-error' : 'bg-warning'}`} />
        
        <div className="p-6 flex flex-col gap-4">
          <h2 id="modal-title" className="text-xl font-bold text-text-primary dark:text-text-primary-dark">
            {config.title}
          </h2>
          
          <p id="modal-desc" className="text-base text-text-secondary dark:text-text-secondary-dark">
            {config.message}
          </p>

          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => {
                config.primaryAction.onClick();
                onDismiss();
              }}
              className={`
                min-h-[44px] w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white transition-colors
                ${isError ? 'bg-error hover:bg-error/90' : 'bg-primary hover:bg-primary-light'}
              `}
            >
              {config.primaryAction.label}
            </button>

            {config.secondaryAction && (
              <button
                onClick={() => {
                  config.secondaryAction?.onClick();
                  onDismiss();
                }}
                className="min-h-[44px] w-full flex items-center justify-center px-4 py-2 rounded-lg font-medium text-text-secondary dark:text-text-secondary-dark hover:bg-surface dark:hover:bg-surface-dark transition-colors"
              >
                {config.secondaryAction.label}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
