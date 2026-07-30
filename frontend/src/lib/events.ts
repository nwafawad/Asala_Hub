export const ASALA_STORAGE_UPDATED_EVENT = 'asala:storage-updated';

/**
 * Dispatches a global event across the application whenever IndexedDB or session data
 * is updated, ensuring all React views immediately re-query and reflect fresh data.
 */
export function notifyStorageUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(ASALA_STORAGE_UPDATED_EVENT));
}
