"use client";

import React, { useState, useEffect } from "react";
import { ModuleRead } from "@/lib/api";
import { ContentBlock } from "@/components/shared/ContentBlock";

interface ModuleEditorProps {
  module: ModuleRead;
  onSaveModule: (title: string, contentType: "text" | "video", content: string) => Promise<void>;
  isSubmitting: boolean;
  syncStatus: "synced" | "pending" | "syncing" | "error";
}

export function ModuleEditor({
  module,
  onSaveModule,
  isSubmitting,
  syncStatus,
}: ModuleEditorProps) {
  const [title, setTitle] = useState(module.title);
  const [contentType, setContentType] = useState(module.content_type);
  const [content, setContent] = useState(module.content);
  
  const [isDirty, setIsDirty] = useState(false);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "split">("split");

  // Keep state in sync with loaded module
  useEffect(() => {
    setTitle(module.title);
    setContentType(module.content_type);
    setContent(module.content);
    setIsDirty(false);
  }, [module]);

  const handleLocalChange = () => {
    setIsDirty(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    try {
      await onSaveModule(title.trim(), contentType, content.trim());
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to save module modifications", err);
    }
  };

  return (
    <div className="card h-full flex flex-col min-h-[500px]">
      {/* Editor Header */}
      <div className="flex items-center justify-between pb-4 border-b border-accent-muted/15 mb-6">
        <div>
          <h2 className="font-heading text-base font-bold text-text-heading">
            Module Content Editor
          </h2>
          <p className="text-[10px] text-accent-muted mt-0.5">
            Modify text formatting, Markdown files, or edit media endpoints.
          </p>
        </div>

        {/* Real-time sync visual indicators */}
        <div className="flex items-center gap-2">
          {syncStatus === "syncing" && (
            <span className="text-[10px] font-bold text-text-heading">
              ☁️ Syncing Changes...
            </span>
          )}
          {syncStatus === "synced" && !isDirty && (
            <span className="text-[10px] font-bold text-accent-muted flex items-center gap-1">
              ✓ Saved & Synced
            </span>
          )}
          {isDirty && (
            <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1">
              ● Unsaved changes locally
            </span>
          )}
        </div>
      </div>

      {/* Editor Core Form */}
      <form onSubmit={handleSave} className="space-y-6 flex-grow flex flex-col">
        {/* Title & Format Selector */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-8 space-y-1.5">
            <label htmlFor="modTitle" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
              Module Title
            </label>
            <input
              id="modTitle"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleLocalChange();
              }}
              className="input-field"
              placeholder="e.g. 1.2 Interactive Labs Setup"
              required
            />
          </div>

          <div className="md:col-span-4 space-y-1.5">
            <label htmlFor="modFormat" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
              Media Format
            </label>
            <select
              id="modFormat"
              value={contentType}
              onChange={(e) => {
                setContentType(e.target.value as "text" | "video");
                handleLocalChange();
              }}
              className="input-field"
            >
              <option value="text">Text (Markdown)</option>
              <option value="video">Video Resource</option>
            </select>
          </div>
        </div>

        {/* Tab Selection (For Document / Text content) */}
        {contentType === "text" && (
          <div className="flex border-b border-accent-muted/15 gap-2 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab("edit")}
              className={`pb-2 px-1 transition-all duration-200 border-b-2 font-bold cursor-pointer ${
                activeTab === "edit" ? "border-text-heading text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              Edit Document
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`pb-2 px-1 transition-all duration-200 border-b-2 font-bold cursor-pointer ${
                activeTab === "preview" ? "border-text-heading text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              Visual Preview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("split")}
              className={`hidden md:block pb-2 px-1 transition-all duration-200 border-b-2 font-bold cursor-pointer ${
                activeTab === "split" ? "border-text-heading text-text-heading" : "border-transparent text-accent-muted"
              }`}
            >
              Split Dual-Pane
            </button>
          </div>
        )}

        {/* Editing Surface Area */}
        <div className="flex-grow grid grid-cols-1 md:grid-cols-12 gap-6 min-h-[300px]">
          {/* Split / Write Pane */}
          {(contentType === "video" || contentType === "text" && (activeTab === "edit" || activeTab === "split")) && (
            <div className={`flex flex-col space-y-1.5 ${
              contentType === "text" && activeTab === "split" ? "md:col-span-6" : "md:col-span-12"
            }`}>
              <label htmlFor="modContent" className="text-xs font-bold text-text-heading uppercase tracking-wider block">
                {contentType === "video" ? "Video Resource URL" : "Document markdown contents"}
              </label>
              <textarea
                id="modContent"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  handleLocalChange();
                }}
                className="input-field flex-grow resize-none font-mono"
                rows={12}
                placeholder={
                  contentType === "video"
                    ? "Enter YouTube video link (e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ)..."
                    : "Write text here. Support basic Markdown, e.g. # Header, **bold**, - lists, > quotes..."
                }
                required
              />
            </div>
          )}

          {/* Render Pane */}
          {contentType === "text" && (activeTab === "preview" || activeTab === "split") && (
            <div className={`border border-accent-muted/15 rounded-lg p-4 bg-surface-base overflow-y-auto max-h-[400px] ${
              activeTab === "split" ? "md:col-span-6" : "md:col-span-12"
            }`}>
              <ContentBlock content={content} contentType="text" />
            </div>
          )}

          {/* Video preview pane */}
          {contentType === "video" && content.trim() !== "" && (
            <div className="md:col-span-12 space-y-2 border border-accent-muted/15 rounded-lg p-4 bg-surface-base">
              <span className="text-[10px] font-bold text-text-heading uppercase tracking-wider block">Video Embed Preview</span>
              <ContentBlock content={content} contentType="video" />
            </div>
          )}
        </div>

        {/* Save Button Action */}
        <div className="flex justify-end gap-3 pt-4 border-t border-accent-muted/15">
          <button
            type="submit"
            disabled={isSubmitting || !isDirty || !title.trim() || !content.trim()}
            className="btn-primary flex items-center gap-1.5"
          >
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
