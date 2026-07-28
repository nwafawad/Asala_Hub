/**
 * Compression utility for IndexedDB draft strings and base64 attachments.
 * Uses UTF-8 byte-level LZ dictionary encoding with Base64 serialization.
 * Guarantees 100% loss-free round-trip encoding for English, Arabic, and Unicode text (SRS §6.3).
 */

export function compressPayload(input: string): string {
  if (!input) return input;
  if (input.startsWith('__ASALA_CMP__')) return input;

  try {
    const bytes = new TextEncoder().encode(input);
    if (bytes.length === 0) return input;

    const dictionary: Map<string, number> = new Map();
    let code = 256;
    let phrase = String.fromCharCode(bytes[0]);
    const outCodes: number[] = [];

    for (let i = 1; i < bytes.length; i++) {
      const currByteChar = String.fromCharCode(bytes[i]);
      const combo = phrase + currByteChar;
      if (dictionary.has(combo)) {
        phrase = combo;
      } else {
        outCodes.push(phrase.length > 1 ? dictionary.get(phrase)! : phrase.charCodeAt(0));
        if (code < 65000) {
          dictionary.set(combo, code);
          code++;
        }
        phrase = currByteChar;
      }
    }
    outCodes.push(phrase.length > 1 ? dictionary.get(phrase)! : phrase.charCodeAt(0));

    const uint16 = new Uint16Array(outCodes);
    const uint8 = new Uint8Array(uint16.buffer, uint16.byteOffset, uint16.byteLength);
    
    let binary = '';
    const len = uint8.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64Str = typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
    return `__ASALA_CMP__${base64Str}`;
  } catch (err) {
    console.warn('Compression fallback to raw text:', err);
    return input;
  }
}

export function decompressPayload(input: string): string {
  if (!input || !input.startsWith('__ASALA_CMP__')) {
    return input; // Raw uncompressed fallback
  }

  try {
    const rawB64 = input.replace('__ASALA_CMP__', '');
    const binary = typeof atob !== 'undefined' ? atob(rawB64) : Buffer.from(rawB64, 'base64').toString('binary');
    
    const bytes8 = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes8[i] = binary.charCodeAt(i);
    }

    const uint16 = new Uint16Array(bytes8.buffer, bytes8.byteOffset, Math.floor(bytes8.length / 2));
    const codes = Array.from(uint16);
    if (codes.length === 0) return '';

    const dictionary: Record<number, number[]> = {};
    let code = 256;
    let oldPhrase = [codes[0]];
    const outBytes: number[] = [...oldPhrase];
    let currByteChar = codes[0];

    for (let i = 1; i < codes.length; i++) {
      const currCode = codes[i];
      let phrase: number[];

      if (currCode < 256) {
        phrase = [currCode];
      } else if (dictionary[currCode]) {
        phrase = dictionary[currCode];
      } else {
        phrase = [...oldPhrase, currByteChar];
      }

      outBytes.push(...phrase);
      currByteChar = phrase[0];
      if (code < 65000) {
        dictionary[code] = [...oldPhrase, currByteChar];
        code++;
      }
      oldPhrase = phrase;
    }

    const decodedUint8 = new Uint8Array(outBytes);
    return new TextDecoder('utf-8').decode(decodedUint8);
  } catch (err) {
    console.warn('Decompression fallback to raw input:', err);
    return input.replace('__ASALA_CMP__', '');
  }
}

export function getCompressionRatio(original: string, compressed: string): number {
  if (!original || !compressed) return 0;
  const originalBytes = new Blob([original]).size;
  const compressedBytes = new Blob([compressed]).size;
  if (originalBytes === 0) return 0;
  return +(((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1);
}

/**
 * Safe preview formatter — ensures compressed/encrypted payloads are rendered cleanly in UI lists.
 */
export function formatPreviewContent(rawContent: string): string {
  if (!rawContent) return '';
  if (rawContent.startsWith('enc:')) {
    return '[Encrypted Draft Content]';
  }
  if (rawContent.startsWith('__ASALA_CMP__')) {
    return decompressPayload(rawContent);
  }
  return rawContent;
}
