"use client";

import React, { useState, useEffect } from "react";
import { useConnectivity } from "@/lib/connectivity-context";

interface ContentBlockProps {
  content?: string;
  contentType: "text" | "video";
}

export function ContentBlock({ content, contentType }: ContentBlockProps) {
  const [loadVideo, setLoadVideo] = useState(false);
  const { isOnline } = useConnectivity();

  // Reset load state on content change
  useEffect(() => {
    setLoadVideo(false);
  }, [content]);

  // Guard: content may be undefined when loaded from the syllabus endpoint
  if (!content) {
    return (
      <div className="p-6 text-center text-[#7A847E]">
        <p className="text-xs font-bold">Content not available</p>
        <p className="text-[10px] mt-1">This lesson's content could not be loaded.</p>
      </div>
    );
  }

  // If video format, try to extract and render embed
  if (contentType === "video") {
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = content.match(ytReg);
    const embedId = match ? match[1] : null;

    if (!isOnline) {
      return (
        <div className="border border-[#E4E7E4] rounded-lg p-5 bg-[#FBF1DE] text-[#8A5A05] space-y-2">
          <p className="text-xs font-bold flex items-center gap-1.5">
            🎬 Offline Video Resource
          </p>
          <p className="text-[11.5px] leading-relaxed">
            Streaming external video content is paused while offline. Video player will load automatically when internet connection is restored.
          </p>
          <p className="text-[10px] opacity-80 break-all pt-1">
            Target URL: {content}
          </p>
        </div>
      );
    }

    if (embedId) {
      return (
        <div className="space-y-3">
          {!loadVideo ? (
            <div className="border border-[#E4E7E4] rounded-lg bg-white p-6 text-center">
              <p className="text-xs font-bold text-[#1C2321] mb-3">🎬 YouTube Video Resource</p>
              <button
                type="button"
                onClick={() => setLoadVideo(true)}
                className="btn-primary py-1.5 px-4 text-xs font-bold cursor-pointer"
              >
                ▶ Load Video Player (Saves Memory)
              </button>
              <p className="text-[10px] text-[#7A847E] mt-2">
                Clicking this loads the external video player into memory.
              </p>
            </div>
          ) : (
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#E4E7E4]">
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
          <p className="text-[10px] text-[#7A847E] break-all">
            Direct Link: <a href={content} target="_blank" rel="noopener noreferrer" className="underline">{content}</a>
          </p>
        </div>
      );
    }

    return (
      <div className="border border-[#E4E7E4] rounded-lg p-4 bg-white space-y-2">
        <p className="text-xs font-bold text-[#1C2321]">🎬 Video Resource</p>
        <p className="text-[10px] text-[#5B6560] break-all">
          Link: <a href={content} target="_blank" rel="noopener noreferrer" className="underline font-bold">{content}</a>
        </p>
        <div className="p-3 bg-[#EFF2F0] text-center text-xs text-[#7A847E] italic border border-[#E4E7E4]">
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
    
    let listItems: string[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        parsed.push(
          <ul key={`ul-${key}`} className="list-disc pl-5 mb-4 space-y-1 text-sm text-[#5B6560] leading-relaxed">
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

      if (trimmed.startsWith("# ")) {
        flushList(index);
        parsed.push(
          <h1 key={index} className="font-heading text-xl font-bold text-[#1C2321] mt-6 mb-3 border-b border-[#E4E7E4] pb-1">
            {trimmed.replace("# ", "")}
          </h1>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList(index);
        parsed.push(
          <h2 key={index} className="font-heading text-lg font-bold text-[#1C2321] mt-5 mb-2.5">
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("### ")) {
        flushList(index);
        parsed.push(
          <h3 key={index} className="font-heading text-sm font-bold text-[#1C2321] mt-4 mb-2">
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        listItems.push(trimmed.slice(2));
      } else if (trimmed.startsWith("> ")) {
        flushList(index);
        parsed.push(
          <blockquote key={index} className="border-l-4 border-[#2F6F63] bg-[#E4EEEC] px-4 py-2 my-4 text-xs font-semibold text-[#1F4E45] rounded-r">
            {trimmed.replace("> ", "")}
          </blockquote>
        );
      } else if (trimmed === "") {
        flushList(index);
      } else {
        flushList(index);
        let rawContent = trimmed;
        const boldParts = rawContent.split(/\*\*([^*]+)\*\*/g);
        const childrenNodes = boldParts.map((part, partIndex) => {
          if (partIndex % 2 === 1) {
            return <strong key={partIndex} className="font-bold text-[#1C2321]">{part}</strong>;
          }
          return part;
        });

        parsed.push(
          <p key={index} className="text-sm text-[#5B6560] leading-relaxed mb-4">
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
