// Client-side encryption for the recovery-code backup feature. Everything
// here runs in the browser via the native Web Crypto API — no dependency,
// no third-party service. The server only ever sees ciphertext plus a
// one-way hash of the code used as a lookup key; it never sees the code
// itself or the decrypted profile.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // no 0/O, 1/I/L — easy to read and type
const CODE_LENGTH = 12 // grouped as XXXX-XXXX-XXXX

export function generateCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH))
  const chars = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length])
  return [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12)].map((g) => g.join('')).join('-')
}

/** Strips formatting so a code typed with or without dashes/spaces/case still matches. */
export function normalizeCode(code: string): string {
  return code.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
}

/** Re-groups a normalized code back into XXXX-XXXX-XXXX for display. */
export function formatCode(code: string): string {
  const normalized = normalizeCode(code)
  return [normalized.slice(0, 4), normalized.slice(4, 8), normalized.slice(8, 12)].filter(Boolean).join('-')
}

async function deriveKey(code: string, salt: Uint8Array): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(normalizeCode(code)), 'PBKDF2', false, [
    'deriveKey',
  ])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 210_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** SHA-256 of the normalized code, base64url — used only as a lookup key, never to decrypt anything. */
export async function hashCode(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalizeCode(code)))
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export interface EncryptedPayload {
  ciphertext: string // base64
  iv: string // base64
  salt: string // base64
}

export async function encryptProfile(profile: unknown, code: string): Promise<EncryptedPayload> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const key = await deriveKey(code, salt)
  const plaintext = new TextEncoder().encode(JSON.stringify(profile))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext)
  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
    salt: toBase64(salt),
  }
}

/** Throws if the code is wrong or the payload is corrupt — AES-GCM authenticates, so a bad key fails loudly rather than returning garbage. */
export async function decryptProfile<T>(payload: EncryptedPayload, code: string): Promise<T> {
  const salt = fromBase64(payload.salt)
  const iv = fromBase64(payload.iv)
  const key = await deriveKey(code, salt)
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv as BufferSource }, key, fromBase64(payload.ciphertext) as BufferSource)
  return JSON.parse(new TextDecoder().decode(plaintext)) as T
}

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}
