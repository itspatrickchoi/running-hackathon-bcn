// Server-only helper: a per-IP, per-day request cap backed by Netlify Blobs,
// so a single visitor (or script) can't run up the Anthropic / ElevenLabs
// bill. Only imported from netlify/functions/*, never from the frontend.
import { getStore } from '@netlify/blobs'

const RATE_LIMIT_STORE = 'rate-limits'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
}

/**
 * Counts requests per (scope, ip, UTC day). Get-then-set isn't atomic, so a
 * burst of concurrent requests can slip a couple over the limit — fine for
 * blunt abuse protection, not a hard guarantee. Old day-buckets are small
 * JSON docs and are left in place rather than cleaned up.
 */
export async function checkRateLimit(scope: string, ip: string, limit: number): Promise<RateLimitResult> {
  const store = getStore(RATE_LIMIT_STORE)
  const day = new Date().toISOString().slice(0, 10)
  const key = `${scope}:${ip}:${day}`

  const existing = (await store.get(key, { type: 'json' })) as { count: number } | null
  const count = existing?.count ?? 0

  if (count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  await store.setJSON(key, { count: count + 1 })
  return { allowed: true, remaining: limit - count - 1 }
}

/** Best-effort client IP from the headers Netlify's edge sets. */
export function clientIp(req: Request): string {
  return (
    req.headers.get('x-nf-client-connection-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

export function rateLimitedResponse() {
  return Response.json(
    { error: "You've hit today's limit for this. Please try again tomorrow." },
    { status: 429 },
  )
}
