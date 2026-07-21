"use client";

import React, { useState } from "react";
import { ModuleRead, ModuleSyllabusRead } from "@/lib/api";

interface CourseOutlineProps {
  modules: ModuleSyllabusRead[];
  selectedModule: ModuleRead | null;
  onSelectModule: (module: ModuleSyllabusRead) => void;
  onAddModule: (title: string, type: "text" | "video") => Promise<void>;
  onDeleteModule: (moduleId: string) => Promise<void>;
  onMoveModule: (module: ModuleSyllabusRead, direction: "up" | "down") => Promise<void>;
  isSubmitting: boolean;
}

export function CourseOutline({
  modules,
  selectedModule,
  onSelectModule,
  onAddModule,
  onDeleteModule,
  onMoveModule,
  isSubmitting,
}: CourseOutlineProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<"text" | "video">("text");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      await onAddModule(newTitle.trim(), newType);
      setNewTitle("");
      setShowAddForm(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="card h-full flex flex-col min-h-[400px]">
      <div className="flex items-center justify-between pb-4 border-b border-accent-muted/15 mb-4">
        <h2 className="font-heading text-sm font-bold text-text-heading uppercase tracking-wider">
          Course Structure
        </h2>
        <span className="badge-type">
          {modules.length} {modules.length === 1 ? "Module" : "Modules"}
        </span>
      </div>

      {/* Modules List */}
      <div className="flex-grow overflow-y-auto space-y-2 max-h-[400px] pr-1">
        {modules.length === 0 ? (
          <div className="text-center py-8 text-accent-muted">
            <p className="text-xs font-semibold">No modules inside course</p>
            <p className="text-[10px] opacity-75 mt-1">Click the button below to add your first module.</p>
          </div>
        ) : (
          modules.map((mod, index) => {
            const isSelected = selectedModule?.id === mod.id;
            return (
              <div
                key={mod.id}
                className={`w-full group flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                  isSelected
                    ? "border-text-heading bg-text-heading/5 text-text-heading font-bold"
                    : "border-accent-muted/10 bg-surface-card hover:bg-surface-base text-text-body"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelectModule(mod)}
                  className="flex-grow text-left text-xs font-bold flex items-center gap-2 pr-2"
                >
                  <span className="h-5 w-5 rounded bg-accent-muted/10 flex items-center justify-center text-[10px] text-text-heading font-extrabold">
                    {mod.order_index}
                  </span>
                  <span className="line-clamp-1">{mod.title}</span>
                  <span className="badge-type shrink-0">{mod.content_type}</span>
                </button>

                {/* Move & Actions UI */}
                <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onMoveModule(mod, "up")}
                    disabled={index === 0 || isSubmitting}
                    className="p-1 hover:bg-accent-muted/10 rounded disabled:opacity-30 cursor-pointer"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => onMoveModule(mod, "down")}
                    disabled={index === modules.length - 1 || isSubmitting}
                    className="p-1 hover:bg-accent-muted/10 rounded disabled:opacity-30 cursor-pointer"
                    title="Move Down"
                  >
                    ▼
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to delete this module?")) {
                        onDeleteModule(mod.id);
                      }
                    }}
                    disabled={isSubmitting}
                    className="p-1 hover:bg-accent-danger/10 hover:text-accent-danger rounded transition-colors cursor-pointer text-xs font-bold ml-1"
                    title="Delete Module"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Module Button & Form */}
      <div className="mt-4 pt-4 border-t border-accent-muted/15">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-secondary w-full py-2 text-xs flex items-center justify-center gap-1.5"
          >
            <span>+</span> Add Module
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="newTitle" className="text-[10px] font-bold text-text-heading uppercase tracking-wider block mb-1">
                Module Title
              </label>
              <input
                id="newTitle"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Introduction to Physics"
                className="input-field py-1.5 text-xs"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="newType" className="text-[10px] font-bold text-text-heading uppercase tracking-wider block mb-1">
                Content Format
              </label>
              <select
                id="newType"
                value={newType}
                onChange={(e) => setNewType(e.target.value as "text" | "video")}
                className="input-field py-1.5 text-xs"
              >
                <option value="text">Text (Markdown)</option>
                <option value="video">Video URL / Embed</option>
              </select>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn-secondary py-1 px-3 text-[10px]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !newTitle.trim()}
                className="btn-primary py-1 px-3 text-[10px]"
              >
                Save Module
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
