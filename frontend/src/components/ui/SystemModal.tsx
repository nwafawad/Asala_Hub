'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';

interface SystemModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  body: string;
  type?: 'info' | 'warning' | 'error' | 'success';
}

export const SystemModal: React.FC<SystemModalProps> = ({
  isOpen,
  onClose,
  title,
  body,
  type = 'error',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-6 h-6 text-rose-500 shrink-0" />;
      case 'success':
        return <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />;
      default:
        return <Info className="w-6 h-6 text-primary shrink-0" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/40 border border-border">
          {getIcon()}
          <p className="text-xs text-muted-foreground leading-relaxed font-sans">{body}</p>
        </div>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer focus-visible:outline-2 focus-visible:outline-primary"
            aria-label="Acknowledge system message"
          >
            I Understand
          </button>
        </div>
      </div>
    </Modal>
  );
};
