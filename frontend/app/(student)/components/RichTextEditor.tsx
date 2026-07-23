"use client";

import { useRef, useEffect } from "react";
import { Bold, Italic, List, ListOrdered } from "lucide-react";

export function RichTextEditor({ content, onChange }: { content: string; onChange: (newContent: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.innerHTML) {
      if (editorRef.current.innerHTML === '' && content) {
        editorRef.current.innerHTML = content;
      }
    }
  }, [content]);

  const execCmd = (cmd: string) => {
    document.execCommand(cmd, false, undefined);
    editorRef.current?.focus();
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex gap-2 p-2 bg-surface dark:bg-surface-dark border border-b-0 border-border dark:border-border-dark rounded-t-xl">
        <button type="button" onClick={() => execCmd('bold')} className="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark border border-transparent hover:border-border dark:hover:border-border-dark flex items-center justify-center text-text-primary dark:text-text-primary-dark">
          <Bold className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => execCmd('italic')} className="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark border border-transparent hover:border-border dark:hover:border-border-dark flex items-center justify-center text-text-primary dark:text-text-primary-dark">
          <Italic className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => execCmd('insertUnorderedList')} className="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark border border-transparent hover:border-border dark:hover:border-border-dark flex items-center justify-center text-text-primary dark:text-text-primary-dark">
          <List className="w-5 h-5" />
        </button>
        <button type="button" onClick={() => execCmd('insertOrderedList')} className="min-h-[44px] min-w-[44px] p-2 rounded hover:bg-surface-elevated dark:hover:bg-surface-elevated-dark border border-transparent hover:border-border dark:hover:border-border-dark flex items-center justify-center text-text-primary dark:text-text-primary-dark">
          <ListOrdered className="w-5 h-5" />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onBlur={handleInput}
        className="min-h-[240px] p-4 bg-surface-elevated dark:bg-surface-elevated-dark border border-border dark:border-border-dark rounded-b-xl focus:outline-none focus:ring-2 focus:ring-primary/50 text-text-primary dark:text-text-primary-dark"
        dir="auto"
      />
    </div>
  );
}
