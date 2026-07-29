'use client';

import { useState, useCallback } from 'react';
import { useOverlay } from '@/context/OverlayContext';
import { useI18n } from '@/context/I18nContext';
import { MSG, type MessageKey, type SystemMessageItem } from '@/lib/messages';

export interface BlockingSystemMessageState {
  isOpen: boolean;
  title: string;
  body: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export function useSystemMessage() {
  const { showToast } = useOverlay();
  const { language } = useI18n();
  const [blockingMessage, setBlockingMessage] = useState<BlockingSystemMessageState | null>(null);

  const showSystemMessage = useCallback(
    (keyOrMsg: MessageKey | SystemMessageItem, customBody?: string) => {
      const msgItem: SystemMessageItem =
        typeof keyOrMsg === 'string' ? (MSG[keyOrMsg] as SystemMessageItem) : keyOrMsg;

      if (!msgItem) return;

      const isAr = language === 'ar';
      const title = isAr ? msgItem.titleAr : msgItem.title;
      const body = customBody || (isAr ? msgItem.bodyAr : msgItem.body);

      if (msgItem.blocking) {
        setBlockingMessage({
          isOpen: true,
          title,
          body,
          type: msgItem.type,
        });
      } else {
        showToast(title, msgItem.type, body);
      }
    },
    [showToast, language]
  );

  const closeBlockingMessage = useCallback(() => {
    setBlockingMessage(null);
  }, []);

  return {
    showSystemMessage,
    blockingMessage,
    closeBlockingMessage,
  };
}
