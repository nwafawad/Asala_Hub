/**
 * At-Rest AES-GCM Encryption Utility (NFR-11, BR-7)
 * Uses Web Crypto API with PBKDF2 (310,000 iterations) to derive an AES-256-GCM key from user credentials.
 * The derived CryptoKey resides solely in-memory and is zeroed upon logout.
 */

let activeInMemoryKey: CryptoKey | null = null;

export function setInMemoryKey(key: CryptoKey | null): void {
  activeInMemoryKey = key;
}

export function getInMemoryKey(): CryptoKey | null {
  return activeInMemoryKey;
}

export function zeroKey(): void {
  activeInMemoryKey = null;
}

const SALT_STRING = 'AsalaHub_Salt_v2_2026_Intranet_Sec';

/**
 * Derives an AES-GCM 256-bit CryptoKey using PBKDF2 with SHA-256 and 310,000 iterations.
 * If userEmail is provided it is mixed into the salt to produce per-user unique key material (Security #1).
 */
export async function deriveKeyFromPassword(
  password: string,
  customSalt?: string,
  userEmail?: string
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const passwordBytes = enc.encode(password);
  // Build per-user salt: base string + optional user-scoped discriminator
  const saltBase = customSalt || SALT_STRING;
  const saltString = userEmail
    ? `${saltBase}:${userEmail.toLowerCase().trim()}`
    : saltBase;
  const saltBytes = enc.encode(saltString);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBytes,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 310000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a UTF-8 string into an AES-GCM ciphertext payload format: "enc:<iv_b64>:<ciphertext_b64>"
 */
export async function encryptText(plaintext: string, key?: CryptoKey | null): Promise<string> {
  const targetKey = key || activeInMemoryKey;
  if (!targetKey) {
    // If no key active (e.g. unauthenticated or pre-login), return plaintext with fallback prefix or as-is
    return plaintext;
  }

  try {
    const enc = new TextEncoder();
    const encodedText = enc.encode(plaintext);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      targetKey,
      encodedText
    );

    const ivB64 = btoa(String.fromCharCode(...Array.from(iv)));
    const cipherB64 = btoa(String.fromCharCode(...Array.from(new Uint8Array(encryptedBuffer))));

    return `enc:${ivB64}:${cipherB64}`;
  } catch (err) {
    console.error('Encryption failed:', err);
    return plaintext;
  }
}

/**
 * Decrypts an encrypted payload formatted as "enc:<iv_b64>:<ciphertext_b64>".
 * If text is not encrypted or decryption fails, safely returns the input text.
 */
export async function decryptText(encryptedPayload: string, key?: CryptoKey | null): Promise<string> {
  if (!encryptedPayload || !encryptedPayload.startsWith('enc:')) {
    return encryptedPayload;
  }

  const targetKey = key || activeInMemoryKey;
  if (!targetKey) {
    return '[ENCRYPTED DATA - PLEASE SIGN IN TO DECRYPT]';
  }

  try {
    const parts = encryptedPayload.split(':');
    if (parts.length !== 3) return encryptedPayload;

    const ivB64 = parts[1];
    const cipherB64 = parts[2];

    const iv = new Uint8Array(atob(ivB64).split('').map(c => c.charCodeAt(0)));
    const cipherBuffer = new Uint8Array(atob(cipherB64).split('').map(c => c.charCodeAt(0)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      targetKey,
      cipherBuffer
    );

    const dec = new TextDecoder();
    return dec.decode(decryptedBuffer);
  } catch (err) {
    console.warn('Decryption failed (key mismatch or corrupt data):', err);
    return '[DECRYPTION FAILED - SECURE DATA LOCKED]';
  }
}
