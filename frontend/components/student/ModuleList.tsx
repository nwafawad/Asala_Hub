"use client";

import React, { useState, memo, useCallback } from "react";
import { BookOpen, ChevronDown, CheckCircle2 } from "lucide-react";
import { useLang } from "@/lib/lang-context";
import { COPY } from "@/lib/copy";
import { ModuleSyllabusRead } from "@/lib/api";

interface ModuleItem {
  id: string;
  label: string;
  cached: boolean;
}

interface ModuleListProps {
  modules?: ModuleSyllabusRead[];
}

interface ModuleAccordionItemProps {
  item: ModuleItem;
  isOpen: boolean;
  onToggle: (id: string) => void;
  cachedLabel: string;
  notCachedLabel: string;
}

const ModuleAccordionItem = memo(function ModuleAccordionItem({
  item,
  isOpen,
  onToggle,
  cachedLabel,
  notCachedLabel,
}: ModuleAccordionItemProps) {
  const handleClick = useCallback(() => {
    onToggle(item.id);
  }, [item.id, onToggle]);

  return (
    <div className="rounded-lg border border-[#E4E7E4] overflow-hidden bg-white">
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between gap-2 px-3 py-3 text-start min-h-[44px] cursor-pointer hover:bg-[#F7F9F8] transition-colors"
      >
        <span className="text-[13.5px] text-[#1C2321] leading-snug font-medium">
          {item.label}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-[#7A847E] transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="px-3 pb-3 pt-0.5 border-t border-[#EDEFEC]/50">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E4EEEC] px-2 py-0.5 text-[11px] font-medium text-[#1F4E45]">
            <CheckCircle2 size={11} />
            {item.cached ? cachedLabel : notCachedLabel}
          </span>
        </div>
      )}
    </div>
  );
});

export function ModuleList({ modules: realModules }: ModuleListProps) {
  const { lang } = useLang();
  const t = COPY[lang];

  const defaultModules: ModuleItem[] = [
    { id: "m1", label: t.m1, cached: true },
    { id: "m2", label: t.m2, cached: true },
    { id: "m3", label: t.m3, cached: true },
  ];

  const displayModules: ModuleItem[] = realModules && realModules.length > 0
    ? realModules.map((m) => ({
        id: m.id,
        label: m.title,
        cached: true,
      }))
    : defaultModules;

  const [openModule, setOpenModule] = useState<string | null>("m3");

  const toggleModule = useCallback((id: string) => {
    setOpenModule((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div className="pb-2">
      <div className="flex items-center gap-1.5 mb-2 mt-2">
        <BookOpen size={14} className="text-[#5B6560]" />
        <p className="text-[12px] font-semibold text-[#5B6560] uppercase tracking-wide">
          {t.modulesLabel}
        </p>
      </div>

      <div className="space-y-2">
        {displayModules.map((m) => (
          <ModuleAccordionItem
            key={m.id}
            item={m}
            isOpen={openModule === m.id}
            onToggle={toggleModule}
            cachedLabel={t.cached}
            notCachedLabel={t.notCached}
          />
        ))}
      </div>
    </div>
  );
}
