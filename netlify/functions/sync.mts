import type { Config, Context } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import { checkRateLimit, clientIp, rateLimitedResponse } from '../../shared/rateLimit'

const SYNC_STORE = 'encrypted-backups'
// Generous — a push happens after every check-in and onboarding, plus manual "back up now".
const DAILY_LIMIT = 60
// The server never inspects the ciphertext, but a size cap keeps one blob from growing unbounded.
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024

interface EncryptedPayload {
  codeHash?: string
  ciphertext?: string
  iv?: string
  salt?: string
}

function isSafeKey(codeHash: string) {
  // base64url from hashCode() in src/lib/crypto.ts — bound the shape before using it as a blob key.
  return /^[A-Za-z0-9_-]{20,64}$/.test(codeHash)
}

export default async (req: Request, context: Context) => {
  const { allowed } = await checkRateLimit('sync', clientIp(req), DAILY_LIMIT)
  if (!allowed) return rateLimitedResponse()

  const store = getStore(SYNC_STORE)

  if (req.method === 'GET') {
    const codeHash = context.params.codeHash
    if (!codeHash || !isSafeKey(codeHash)) {
      return Response.json({ error: 'Missing or malformed code.' }, { status: 400 })
    }
    const entry = await store.get(codeHash, { type: 'json' })
    return Response.json({ found: Boolean(entry), backup: entry ?? null })
  }

  if (req.method === 'POST') {
    const body = (await req.json()) as EncryptedPayload
    const { codeHash, ciphertext, iv, salt } = body

    if (!codeHash || !isSafeKey(codeHash)) {
      return Response.json({ error: 'Missing or malformed code.' }, { status: 400 })
    }
    if (!ciphertext || !iv || !salt) {
      return Response.json({ error: 'Malformed backup payload.' }, { status: 400 })
    }
    const size = ciphertext.length + iv.length + salt.length
    if (size > MAX_PAYLOAD_BYTES) {
      return Response.json({ error: 'That backup is too large.' }, { status: 413 })
    }

    await store.setJSON(codeHash, { ciphertext, iv, salt, updatedAt: new Date().toISOString() })
    return Response.json({ ok: true })
  }

  return new Response('Method not allowed', { status: 405 })
}

export const config: Config = {
  path: ['/api/sync', '/api/sync/:codeHash'],
  method: ['GET', 'POST'],
}
