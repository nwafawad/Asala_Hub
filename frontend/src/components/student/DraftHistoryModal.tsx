'use client';

import React from 'react';
import { X, Clock, RotateCcw } from 'lucide-react';
import { DraftVersionItem } from '@/hooks/useAssignmentDraft';

interface DraftHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: DraftVersionItem[];
  onRestore: (version: DraftVersionItem) => void;
}

export const DraftHistoryModal: React.FC<DraftHistoryModalProps> = ({
  isOpen,
  onClose,
  history,
  onRestore,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold font-heading text-foreground">
              Draft Version History
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex flex-col gap-3 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-xs text-muted-foreground italic text-center py-6">
              No previous draft snapshots available.
            </div>
          ) : (
            history.map((ver, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-border bg-background flex items-center justify-between gap-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary uppercase">
                      v{ver.version} · {ver.source}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {new Date(ver.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {ver.content || '(Empty Draft)'}
                  </p>
                </div>

                <button
                  onClick={() => onRestore(ver)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
