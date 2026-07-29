'use client';

import React from 'react';
import { LucideIcon, Clock, Sparkles } from 'lucide-react';

interface ComingSoonStubProps {
  title: string;
  description: string;
  icon: LucideIcon;
  plannedFeatures: string[];
}

export const ComingSoonStub: React.FC<ComingSoonStubProps> = ({
  title,
  description,
  icon: Icon,
  plannedFeatures,
}) => {
  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6 animate-in fade-in duration-200">
      <div className="p-8 rounded-2xl bg-card border border-border shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="p-4 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 shrink-0">
            <Icon className="w-8 h-8" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                PHASE 2 ROADMAP
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" /> Planned Operational View
              </span>
            </div>
            <h2 className="text-2xl font-bold font-heading text-foreground">{title}</h2>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl border border-border bg-card shadow-xs flex flex-col gap-4">
        <h3 className="text-sm font-semibold font-heading text-foreground flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          Planned System Specifications & Deliverables
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {plannedFeatures.map((feat, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl border border-border bg-background flex items-center gap-3 text-xs"
            >
              <span className="w-6 h-6 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-[11px] shrink-0 font-mono">
                {idx + 1}
              </span>
              <span className="text-muted-foreground font-medium">{feat}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
