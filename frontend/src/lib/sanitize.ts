import DOMPurify from 'isomorphic-dompurify';

/**
 * Universal XSS Sanitizer Utility (NFR-1)
 * Provides robust, zero-crash HTML/Markdown sanitization
 * for Next.js App Router across SSR and Client environments.
 */

export function sanitizeHtml(dirty: string): string {
  if (!dirty) return '';

  try {
    if (DOMPurify && typeof DOMPurify.sanitize === 'function') {
      return DOMPurify.sanitize(dirty);
    }
  } catch {
    // Fallback to regex sanitization
  }

  // Lightweight fallback regex sanitizer
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
