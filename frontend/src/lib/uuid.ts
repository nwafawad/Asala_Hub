/**
 * Generates a collision-safe UUID v4 for offline records per FR-14.
 * Uses native Web Crypto API crypto.randomUUID() when available,
 * with an RFC4122-compliant fallback for legacy browser environments.
 */
export function generateUUID(): string {
  if (typeof window !== 'undefined' && window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }

  // RFC4122 version 4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
