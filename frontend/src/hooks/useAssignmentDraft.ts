import { useState, useEffect, useCallback, useRef } from 'react';
import { db, seedInitialMockData, CachedSubmission } from '@/lib/db';
import { encryptText, decryptText } from '@/lib/crypto';
import { compressPayload, decompressPayload } from '@/lib/compress';
import { useOverlay } from '@/context/OverlayContext';
import { generateUUID } from '@/lib/uuid';

export interface DraftVersionItem {
  version: number;
  timestamp: string;
  content: string;
  source: 'auto_save' | 'manual' | 'server';
}

export function useAssignmentDraft(assignmentId: string, studentName = 'Student') {
  const { showToast } = useOverlay();

  const [content, setContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [draftHistory, setDraftHistory] = useState<DraftVersionItem[]>([]);
  const [currentSubmission, setCurrentSubmission] = useState<CachedSubmission | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);

  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load active draft from IndexedDB
  const loadDraft = useCallback(async () => {
    try {
      await seedInitialMockData();
      const existing = await db.cachedSubmissions
        .where('assignmentId')
        .equals(assignmentId)
        .first();

      if (existing) {
        setCurrentSubmission(existing);
        let rawContent = existing.content || '';
        if (rawContent.startsWith('enc:')) {
          rawContent = await decryptText(rawContent);
        }
        if (rawContent.startsWith('__ASALA_CMP__')) {
          rawContent = decompressPayload(rawContent);
        }
        setContent(rawContent);
        setLastSavedAt(existing.submittedAt || new Date().toISOString());

        // Initialize history with initial draft snapshot
        setDraftHistory([
          {
            version: existing.serverSeqNum || 1,
            timestamp: existing.submittedAt || new Date().toISOString(),
            content: rawContent,
            source: 'auto_save',
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading assignment draft:', err);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  // Save current draft with encryption and compression
  const saveDraft = useCallback(
    async (isManual = false) => {
      if (!assignmentId) return;
      setIsSaving(true);
      try {
        const compressed = compressPayload(content);
        const encryptedContent = await encryptText(compressed);
        const timestamp = new Date().toISOString();

        const existing = await db.cachedSubmissions
          .where('assignmentId')
          .equals(assignmentId)
          .first();

        const recordId = existing?.id || generateUUID();
        const submissionRecord: CachedSubmission = {
          id: recordId,
          assignmentId,
          assignmentTitle: existing?.assignmentTitle || 'Assignment',
          studentName,
          content: encryptedContent,
          submittedAt: timestamp,
          syncStatus: 'pending',
          score: existing?.score,
          gradeStatus: existing?.gradeStatus || 'pending',
          serverSeqNum: (existing?.serverSeqNum || 0) + 1,
        };

        await db.cachedSubmissions.put(submissionRecord);
        setCurrentSubmission(submissionRecord);
        setLastSavedAt(timestamp);

        // Append to history
        setDraftHistory(prev => [
          ...prev,
          {
            version: submissionRecord.serverSeqNum || prev.length + 1,
            timestamp,
            content,
            source: isManual ? 'manual' : 'auto_save',
          },
        ]);

        if (isManual) {
          showToast('Draft Saved', 'success', 'Assignment draft saved securely to local vault.');
        }
      } catch (err) {
        console.error('Error saving assignment draft:', err);
        showToast('Save Error', 'error', 'Unable to save assignment draft.');
      } finally {
        setIsSaving(false);
      }
    },
    [assignmentId, content, studentName, showToast]
  );

  // Auto-Save interval (debounced 30s)
  useEffect(() => {
    if (!content) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      saveDraft(false);
    }, 30000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [content, saveDraft]);

  const restoreVersion = (targetVersion: DraftVersionItem) => {
    setContent(targetVersion.content);
    setIsHistoryModalOpen(false);
    showToast('Version Restored', 'info', `Restored draft from ${new Date(targetVersion.timestamp).toLocaleTimeString()}`);
  };

  return {
    content,
    setContent,
    isSaving,
    lastSavedAt,
    draftHistory,
    currentSubmission,
    saveDraft,
    isHistoryModalOpen,
    setIsHistoryModalOpen,
    restoreVersion,
  };
}
