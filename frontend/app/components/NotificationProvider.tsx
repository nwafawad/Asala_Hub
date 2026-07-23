"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastMessage, ModalConfig, NotificationType } from '@/lib/types';
import { Toast } from './Toast';
import { BlockingModal } from './BlockingModal';

interface NotificationContextType {
  showToast: (message: string, type?: NotificationType) => void;
  showModal: (config: ModalConfig) => void;
  dismissToast: (id: string) => void;
  dismissModal: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [modalConfig, setModalConfig] = useState<ModalConfig | null>(null);

  const showToast = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showModal = useCallback((config: ModalConfig) => {
    setModalConfig(config);
  }, []);

  const dismissModal = useCallback(() => {
    setModalConfig(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showToast, showModal, dismissToast, dismissModal }}>
      {children}
      
      {/* Toast Portal Area */}
      <div 
        className="fixed bottom-4 start-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 w-full max-w-[400px] px-4 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>

      {/* Blocking Modal */}
      {modalConfig && (
        <BlockingModal config={modalConfig} onDismiss={dismissModal} />
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
