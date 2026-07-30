'use client';

import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  className,
}) => {
  return (
    <Dialog.Root open={isOpen} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in-0" />
        <Dialog.Content
          onOpenAutoFocus={e => e.preventDefault()}
          className={cn(
            'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-card p-6 shadow-xl rounded-2xl transition-all duration-200 animate-in fade-in-0 zoom-in-95',
            className
          )}
        >
          <div className="flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold font-heading text-foreground">
              {title}
            </Dialog.Title>
            <Dialog.Close
              onClick={onClose}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </Dialog.Close>
          </div>
          {description && (
            <Dialog.Description className="text-xs text-muted-foreground -mt-2">
              {description}
            </Dialog.Description>
          )}
          <div className="mt-2">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
