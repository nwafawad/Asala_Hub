import { useEffect } from 'react';
import { ASALA_STORAGE_UPDATED_EVENT } from '@/lib/events';

/**
 * Custom React hook that subscribes to storage update events.
 * Executes the provided callback whenever local IndexedDB or session data changes,
 * allowing components to instantly update their rendered state.
 */
export function useStorageUpdateListener(onUpdate: () => void): void {
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleUpdate = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        onUpdate();
      }, 300);
    };

    window.addEventListener(ASALA_STORAGE_UPDATED_EVENT, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    return () => {
      if (timeout) clearTimeout(timeout);
      window.removeEventListener(ASALA_STORAGE_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [onUpdate]);
}
