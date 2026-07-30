/**
 * Universal XSS Sanitizer Utility (NFR-1)
 * Provides robust, zero-crash HTML/Markdown sanitization
 * for Next.js 15 App Router with Turbopack across SSR and Client environments.
 */

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  // 1. Client-Side Browser Environment: Use DOMPurify if available or browser DOMParser
  if (typeof window !== 'undefined') {
    try {
      // Try importing or using DOMPurify if loaded
      const DOMPurify = require('isomorphic-dompurify');
      if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
        return DOMPurify.sanitize(dirty);
      }
    } catch {
      // Fallback: Browser DOMParser sanitization
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(dirty, 'text/html');
        // Remove script, iframe, object, embed tags
        const unsafeElements = doc.querySelectorAll('script, iframe, object, embed, style, form');
        unsafeElements.forEach(el => el.remove());

        // Remove inline event handlers (e.g. onclick, onerror)
        const allElements = doc.querySelectorAll('*');
        allElements.forEach(el => {
          Array.from(el.attributes).forEach(attr => {
            if (attr.name.startsWith('on') || attr.value.trim().toLowerCase().startsWith('javascript:')) {
              el.removeAttribute(attr.name);
            }
          });
        });

        return doc.body.innerHTML;
      } catch {
        // Simple regex fallback
      }
    }
  }

  // 2. Server-Side SSR Environment (Next.js Node worker): Lightweight regex sanitizer
  return dirty
    .replace(/<script\b[^<]*>([\s\S]*?)<\/script>/gi, '')
    .replace(/<iframe\b[^<]*>([\s\S]*?)<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '')
    .replace(/href="javascript:[^"]*"/gi, 'href="#"')
    // Security #2: strip inline style attributes (CSS injection / exfiltration vector)
    .replace(/\s*style\s*=\s*"[^"]*"/gi, '')
    .replace(/\s*style\s*=\s*'[^']*'/gi, '')
    // Security #2: neutralise srcdoc and data: protocol URIs
    .replace(/srcdoc\s*=\s*"[^"]*"/gi, '')
    .replace(/srcdoc\s*=\s*'[^']*'/gi, '')
    .replace(/(href|src|action)\s*=\s*"\s*data:[^"]*"/gi, '$1="#"')
    .replace(/(href|src|action)\s*=\s*'\s*data:[^']*'/gi, "$1='#'");
}
