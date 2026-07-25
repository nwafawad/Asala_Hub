'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ModalOptions {
  title: string;
  description?: string;
  content: React.ReactNode;
}

interface OverlayContextType {
  toasts: ToastItem[];
  showToast: (title: string, type?: ToastType, message?: string) => void;
  removeToast: (id: string) => void;
  activeModal: ModalOptions | null;
  openModal: (options: ModalOptions) => void;
  closeModal: () => void;
}

const OverlayContext = createContext<OverlayContextType | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeModal, setActiveModal] = useState<ModalOptions | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback((title: string, type: ToastType = 'info', message?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const newToast: ToastItem = { id, type, title, message };
    
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const openModal = useCallback((options: ModalOptions) => {
    setActiveModal(options);
  }, []);

  const closeModal = useCallback(() => {
    setActiveModal(null);
  }, []);

  return (
    <OverlayContext.Provider
      value={{
        toasts,
        showToast,
        removeToast,
        activeModal,
        openModal,
        closeModal,
      }}
    >
      {children}
    </OverlayContext.Provider>
  );
};

export const useOverlay = () => {
  const context = useContext(OverlayContext);
  if (!context) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return context;
};
