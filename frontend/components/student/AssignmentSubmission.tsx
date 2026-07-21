"use client";

import React, { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { submitAssignmentOffline } from "@/lib/offline-store";
import { useAuth } from "@/lib/auth-context";
import { useConnectivity } from "@/lib/connectivity-context";

interface AssignmentSubmissionProps {
  assignmentId: string;
  assignmentTitle: string;
  assignmentDescription?: string;
  dueDate?: string;
}

export function AssignmentSubmission({
  assignmentId,
  assignmentTitle,
  assignmentDescription,
  dueDate,
}: AssignmentSubmissionProps) {
  const { user } = useAuth();
  const { isOnline, triggerSync } = useConnectivity();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Live query automatically re-renders whenever this assignment's submission changes in Dexie
  const submission = useLiveQuery(
    () => (typeof window !== "undefined" ? db.submissions.where("assignment_id").equals(assignmentId).first() : undefined),
    [assignmentId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !user) return;

    setSubmitting(true);
    setNotice(null);

    try {
      await submitAssignmentOffline({
        assignmentId,
        studentId: user.id,
        content: content.trim(),
      });

      setNotice(
        isOnline
          ? "✓ Submission recorded locally — syncing with server..."
          : "📦 Saved locally — will automatically sync when connection is restored."
      );
      setContent("");

      if (isOnline) {
        triggerSync();
      }
    } catch (err: any) {
      console.error("Submission failed:", err);
      setNotice(`❌ Error saving submission: ${err.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-accent-muted/20 pb-3">
        <div>
          <h3 className="font-heading text-sm font-extrabold text-text-heading">
            Assignment: {assignmentTitle}
          </h3>
          {dueDate && (
            <p className="text-[11px] text-accent-muted mt-0.5">
              Due: {new Date(dueDate).toLocaleDateString()}
            </p>
          )}
        </div>

        {submission && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-accent-muted font-semibold">Status:</span>
            <span
              className={`px-2.5 py-0.5 text-[11px] rounded font-bold uppercase tracking-wider ${
                submission.sync_status === "synced"
                  ? "bg-accent-highlight text-text-on-highlight"
                  : "bg-surface-base border border-accent-muted text-text-heading"
              }`}
            >
              {submission.sync_status === "synced" ? "✓ Synced to Cloud" : "📦 Queued Offline"}
            </span>
          </div>
        )}
      </div>

      {assignmentDescription && (
        <p className="text-xs text-text-body leading-relaxed">{assignmentDescription}</p>
      )}

      {/* Existing submission viewer */}
      {submission && (
        <div className="p-3 bg-surface-base border border-accent-muted/30 rounded space-y-1">
          <p className="text-[11px] font-bold text-accent-muted uppercase tracking-wider">
            Your Active Submission
          </p>
          <p className="text-xs text-text-heading whitespace-pre-wrap">{submission.content}</p>
          <p className="text-[10px] text-accent-muted">
            Submitted: {new Date(submission.submitted_at).toLocaleString()}
          </p>
        </div>
      )}

      {/* Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor={`submission-${assignmentId}`} className="block text-xs font-bold text-text-heading mb-1">
            {submission ? "Update Submission Response:" : "Your Response:"}
          </label>
          <textarea
            id={`submission-${assignmentId}`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="Type your assignment submission text here..."
            className="input-field w-full text-xs"
            required
          />
        </div>

        {notice && (
          <div className="p-2.5 bg-surface-base border border-accent-muted text-xs text-text-heading font-bold rounded">
            {notice}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="btn-primary text-xs py-2 px-4 cursor-pointer font-bold disabled:opacity-50"
          >
            {submitting ? "Saving..." : submission ? "Update Submission" : "Submit Assignment"}
          </button>
        </div>
      </form>
    </div>
  );
}
