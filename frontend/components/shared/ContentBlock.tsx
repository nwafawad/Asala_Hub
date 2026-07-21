"use client";

import React, { useState, useEffect } from "react";

interface ContentBlockProps {
  content?: string;
  contentType: "text" | "video";
}

export function ContentBlock({ content, contentType }: ContentBlockProps) {
  const [loadVideo, setLoadVideo] = useState(false);

  // Reset load state on content change
  useEffect(() => {
    setLoadVideo(false);
  }, [content]);

  // Guard: content may be undefined when loaded from the syllabus endpoint
  // which excludes the content payload for performance.
  if (!content) {
    return (
      <div className="p-6 text-center text-accent-muted">
        <p className="text-xs font-bold">Content not available</p>
        <p className="text-[10px] mt-1">This lesson's content could not be loaded.</p>
      </div>
    );
  }

  // If video format, try to extract and render embed
  if (contentType === "video") {
    // YouTube link patterns
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = content.match(ytReg);
    const embedId = match ? match[1] : null;

    if (embedId) {
      return (
        <div className="space-y-3">
          {!loadVideo ? (
            <div className="border border-accent-muted rounded bg-surface-base p-6 text-center">
              <p className="text-xs font-bold text-text-heading mb-3">🎬 YouTube Video Resource</p>
              <button
                type="button"
                onClick={() => setLoadVideo(true)}
                className="btn-primary py-1.5 px-4 text-xs font-bold"
              >
                ▶ Load Video Player (Saves Memory)
              </button>
              <p className="text-[10px] text-accent-muted mt-2">
                Clicking this loads the external video player into memory.
              </p>
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded overflow-hidden bg-black border border-accent-muted">
              <iframe
                src={`https://www.youtube.com/embed/${embedId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
          )}
          <p className="text-[10px] text-accent-muted break-all">
            Direct Link: <a href={content} target="_blank" rel="noopener noreferrer" className="underline">{content}</a>
          </p>
        </div>
      );
    }

    return (
      <div className="border border-accent-muted rounded p-4 bg-surface-base space-y-2">
        <p className="text-xs font-bold text-text-heading">🎬 Video Resource</p>
        <p className="text-[10px] text-text-body break-all">
          Link: <a href={content} target="_blank" rel="noopener noreferrer" className="underline font-bold">{content}</a>
        </p>
        <div className="p-3 bg-surface-card text-center text-xs text-accent-muted italic border border-accent-muted/10">
          This URL is not embeddable. Use the direct link above to open the video.
        </div>
      </div>
    );
  }

  // Simple Markdown Parsing Logic for Text Content
  const parseMarkdown = (markdown: string) => {
    if (!markdown) return [];
    const lines = markdown.split("\n");
    const parsed: React.ReactNode[] = [];
    
    let inList = false;
    let listItems: string[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        parsed.push(
          <ul key={`ul-${key}`} className="list-disc pl-5 mb-4 space-y-1 text-sm text-text-body leading-relaxed">
            {listItems.map((item, i) => (
              <li key={`li-${key}-${i}`}>{item}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Headers
      if (trimmed.startsWith("# ")) {
        flushList(index);
        inList = false;
        parsed.push(
          <h1 key={index} className="font-heading text-xl font-bold text-text-heading mt-6 mb-3 border-b border-accent-muted pb-1">
            {trimmed.replace("# ", "")}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList(index);
        inList = false;
        parsed.push(
          <h2 key={index} className="font-heading text-lg font-bold text-text-heading mt-5 mb-2.5">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList(index);
        inList = false;
        parsed.push(
          <h3 key={index} className="font-heading text-sm font-bold text-text-heading mt-4 mb-2">
            {trimmed.replace("### ", "")}
          </h3>
        );
      }
      // Bullet list items
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(trimmed.slice(2));
      }
      // Blockquotes
      else if (trimmed.startsWith("> ")) {
        flushList(index);
        inList = false;
        parsed.push(
          <blockquote key={index} className="border-l-4 border-accent-muted bg-surface-base px-4 py-2 my-4 text-xs font-semibold text-text-body rounded-r">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      }
      // Empty line
      else if (trimmed === "") {
        flushList(index);
        inList = false;
      }
      // Regular paragraphs
      else {
        flushList(index);
        inList = false;
        
        // Simple regex bold replacement **bold**
        let rawContent = trimmed;
        const boldParts = rawContent.split(/\*\*([^*]+)\*\*/g);
        const childrenNodes = boldParts.map((part, partIndex) => {
          if (partIndex % 2 === 1) {
            return <strong key={partIndex} className="font-bold text-text-heading">{part}</strong>;
          }
          return part;
        });

        parsed.push(
          <p key={index} className="text-sm text-text-body leading-relaxed mb-4">
            {childrenNodes}
          </p>
        );
      }
    });

    flushList(lines.length);
    return parsed;
  };

  return (
    <div className="prose prose-slate max-w-none">
      {parseMarkdown(content)}
    </div>
  );
}
