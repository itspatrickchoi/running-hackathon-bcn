import type { Config } from '@netlify/functions'
import { getStore } from '@netlify/blobs'
import type { WaitlistSource } from '../../shared/domain'

const WAITLIST_STORE = 'waitlist-signups'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function hashEmail(email: string) {
  const bytes = new TextEncoder().encode(email)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export default async (req: Request) => {
  const { name, email, source } = (await req.json()) as { name?: string; email?: string; source?: WaitlistSource }

  const trimmedName = name?.trim() ?? ''
  const normalizedEmail = email?.trim().toLowerCase() ?? ''

  if (!trimmedName) {
    return Response.json({ error: 'Missing name.' }, { status: 400 })
  }
  if (!EMAIL_RE.test(normalizedEmail)) {
    return Response.json({ error: 'That email doesn’t look right.' }, { status: 400 })
  }

  const store = getStore(WAITLIST_STORE)
  const key = await hashEmail(normalizedEmail)

  // Re-signing up with the same email overwrites rather than duplicates.
  await store.setJSON(key, {
    name: trimmedName,
    email: normalizedEmail,
    source: source ?? 'unknown',
    createdAt: new Date().toISOString(),
  })

  return Response.json({ ok: true })
}

export const config: Config = {
  path: '/api/waitlist',
  method: 'POST',
}
