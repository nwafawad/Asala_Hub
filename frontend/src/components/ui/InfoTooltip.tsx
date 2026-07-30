'use client';

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface InfoTooltipProps {
  content: string;
  title?: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  content,
  title,
  className = '',
  position = 'bottom',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    top: 'bottom-full mb-2 left-1/2 -translate-x-1/2',
    bottom: 'top-full mt-2 left-1/2 -translate-x-1/2',
    left: 'right-full mr-2 top-1/2 -translate-y-1/2',
    right: 'left-full ml-2 top-1/2 -translate-y-1/2',
  };

  return (
    <div
      className={`relative inline-flex items-center group ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onFocus={() => setIsOpen(true)}
      onBlur={() => setIsOpen(false)}
    >
      <button
        type="button"
        aria-label={title || 'More information'}
        className="p-1 rounded-full text-muted-foreground/70 hover:text-primary hover:bg-primary/10 transition-colors focus:outline-hidden cursor-pointer"
      >
        <HelpCircle className="w-4 h-4 shrink-0" />
      </button>

      {/* Tooltip Card */}
      <div
        role="tooltip"
        className={`absolute ${positionClasses[position]} z-50 min-w-64 max-w-xs p-3 rounded-xl bg-popover text-popover-foreground border border-border shadow-xl backdrop-blur-md transition-all duration-200 pointer-events-none ${
          isOpen
            ? 'opacity-100 visible scale-100'
            : 'opacity-0 invisible scale-95'
        }`}
      >
        {title && (
          <div className="font-bold text-xs text-foreground mb-1 flex items-center gap-1.5">
            <span>{title}</span>
          </div>
        )}
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          {content}
        </p>
      </div>
    </div>
  );
};
