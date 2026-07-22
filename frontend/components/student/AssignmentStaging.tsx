"use client";

import React, { useState, useEffect, useRef } from "react";
import { FileText, Clock, Lock, CheckCircle2 } from "lucide-react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { submitAssignmentOffline } from "@/lib/offline-store";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";
import { useLang } from "@/lib/lang-context";
import { COPY } from "@/lib/copy";
import { registerBackgroundSync } from "@/components/ServiceWorkerRegister";

interface AssignmentStagingProps {
  assignmentId?: string;
  assignmentTitle?: string;
  dueDate?: string;
}

export function AssignmentStaging({
  assignmentId = "m3-reflection",
  assignmentTitle,
  dueDate,
}: AssignmentStagingProps) {
  const { user } = useAuth();
  const { isOnline, triggerSync } = useConnectivity();
  const { lang, isRTL } = useLang();
  const t = COPY[lang];

  const title = assignmentTitle || t.assignmentTitle;
  const formattedDue = dueDate || t.dueDate;

  const [reflectionText, setReflectionText] = useState("");
  const [savedLocally, setSavedLocally] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Live query from IndexedDB for existing submission
  const existingSubmission = useLiveQuery(
    () => (typeof window !== "undefined" ? db.submissions.where("assignment_id").equals(assignmentId).first() : undefined),
    [assignmentId]
  );

  // Populate text area when loaded from IndexedDB
  useEffect(() => {
    if (existingSubmission && existingSubmission.content) {
      setReflectionText(existingSubmission.content);
    }
  }, [existingSubmission]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const handleSave = async () => {
    if (!reflectionText.trim()) return;

    setIsSaving(true);
    try {
      const studentId = user?.id || "demo-student-id";

      // Write to IndexedDB with UUID + timestamped transaction log entry (FR-3 / FR-4)
      await submitAssignmentOffline({
        assignmentId,
        studentId,
        content: reflectionText.trim(),
      });

      setSavedLocally(true);

      registerBackgroundSync();

      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        setSavedLocally(false);
      }, 2400);

      // Trigger background sync if online (FR-5, FR-16)
      // // TODO: wire to real sync engine background queue worker
      if (isOnline) {
        triggerSync();
      }
    } catch (err) {
      console.error("[AssignmentStaging] Local IndexedDB save failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-lg border border-[#E4E7E4] p-3 bg-white">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={14} className="text-[#5B6560]" />
        <p className="text-[12px] font-semibold text-[#5B6560] uppercase tracking-wide">
          {t.assignment}
        </p>
      </div>

      <p className="text-[14px] font-medium text-[#1C2321] leading-snug">
        {title}
      </p>

      <div className="flex items-center gap-1 mt-1 mb-3">
        <Clock size={12} className="text-[#7A847E]" />
        <span className="text-[11.5px] text-[#7A847E]">
          {t.due}: {formattedDue}
        </span>
      </div>

      <label className="block text-[11.5px] font-medium text-[#5B6560] mb-1">
        {t.reflectionLabel}
      </label>

      <textarea
        value={reflectionText}
        onChange={(e) => setReflectionText(e.target.value)}
        placeholder={t.placeholder}
        rows={4}
        className="w-full resize-none rounded-md border border-[#D6DCD9] px-2.5 py-2 text-[13.5px] text-[#1C2321] placeholder:text-[#9AA39D] focus:outline-none focus:ring-2 focus:ring-[#2F6F63] focus:border-[#2F6F63]"
      />

      <div className="flex items-center justify-between mt-2.5">
        <div className="flex items-center gap-1 text-[11px] text-[#9AA39D]">
          <Lock size={11} />
          <span>{t.savingLocal}</span>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving || !reflectionText.trim()}
          className="rounded-md bg-[#2F6F63] px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-[#265A50] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#2F6F63] transition-colors disabled:opacity-50 cursor-pointer"
        >
          {isSaving ? "Saving..." : savedLocally ? t.savedBtn : t.saveBtn}
        </button>
      </div>

      {savedLocally && (
        <p className="mt-2 text-[11.5px] text-[#1F4E45] flex items-center gap-1">
          <CheckCircle2 size={12} />
          {t.savedNote}
        </p>
      )}

      {existingSubmission && existingSubmission.sync_status === "synced" && (
        <p className="mt-2 text-[11px] text-[#5B6560] flex items-center gap-1">
          <CheckCircle2 size={11} className="text-[#2F6F63]" />
          <span>Synced with server</span>
        </p>
      )}
    </div>
  );
}
